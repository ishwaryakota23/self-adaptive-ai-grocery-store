import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  User,
  Car,
  Clock,
  CheckCircle2,
  Radio,
  AlertTriangle,
  Send
} from 'lucide-react';
import {
  jarvisEmergencyCallService,
  EmergencyCallState,
  EmergencyCallContext
} from '../services/jarvisEmergencyCallService';
import { managerService } from '../services/managerService';

export const JarvisEmergencyPhoneCallModal: React.FC = () => {
  const [callState, setCallState] = useState<EmergencyCallState>('IDLE');
  const [context, setContext] = useState<EmergencyCallContext>(jarvisEmergencyCallService.getContext());
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastUserSpeech, setLastUserSpeech] = useState('');
  const [micSupported, setMicSupported] = useState(true);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [realAudioLevel, setRealAudioLevel] = useState(0);
  const [textInput, setTextInput] = useState('');

  const recognitionRef = useRef<any>(null);
  const callStateRef = useRef<EmergencyCallState>(callState);
  const isJarvisSpeakingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const silenceTimerRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const restartRecognitionRef = useRef<(() => void) | null>(null);
  const allowRecognitionRestartRef = useRef(true);

  useEffect(() => {
    const unsub = jarvisEmergencyCallService.subscribe((state, ctx) => {
      setCallState(state);
      if (ctx) setContext(ctx);
    });
    return unsub;
  }, []);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    isJarvisSpeakingRef.current = Boolean(context.isJarvisSpeaking);
  }, [context.isJarvisSpeaking]);

  // Audio Analyser to read real microphone decibel levels
  const setupAudioAnalyser = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!isMountedRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setRealAudioLevel(avg / 128); // 0.0 to 1.0 range
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (e) {
      console.warn('Audio analyser init warning:', e);
    }
  };

  // Explicit user gesture to answer call and request microphone access
  const handleAnswerCall = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setupAudioAnalyser(stream);
      }
    } catch (e) {
      console.warn('Microphone permission notice:', e);
    }

    if (callState === 'RINGING') {
      await jarvisEmergencyCallService.answerCall();
    } else {
      await jarvisEmergencyCallService.answerCallback();
    }
  };

  // Continuous speech recognition
  useEffect(() => {
    isMountedRef.current = true;
    const isCallActive = callState === 'CONNECTED' || callState === 'CALLBACK_CONNECTED';

    if (!isCallActive || isMicMuted || typeof window === 'undefined') {
      restartRecognitionRef.current = null;
      const previousRecognition = recognitionRef.current;
      recognitionRef.current = null;
      if (previousRecognition) {
        try {
          previousRecognition.abort();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setMicSupported(false);
      setRecognitionError('Speech recognition is not supported by this browser. Use the text box below.');
      return;
    }

    setMicSupported(true);

    const initAndStart = () => {
      if (!isMountedRef.current || !callStateRef.current.includes('CONNECTED')) return;

      try {
        const previousRecognition = recognitionRef.current;
        recognitionRef.current = null;
        if (previousRecognition) {
          try {
            previousRecognition.abort();
          } catch {}
        }

        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        // Prioritize browser or regional Indian English
        recognition.lang =
          (navigator.languages && navigator.languages[0]) || navigator.language || 'en-IN';

        recognition.onstart = () => {
          if (recognitionRef.current !== recognition) return;
          setIsListening(true);
          setRecognitionError(null);
        };

        recognition.onresult = (event: any) => {
          if (recognitionRef.current !== recognition) return;
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            if (item.isFinal) {
              final += item[0].transcript;
            } else {
              interim += item[0].transcript;
            }
          }

          const rawCandidate = (final || interim).trim();
          if (!rawCandidate) return;

          // If Alexa+ is currently speaking, filter out self-echo of greeting
          if (isJarvisSpeakingRef.current && rawCandidate.toLowerCase().includes('hey manager')) {
            return;
          }

          setLiveTranscript(rawCandidate);

          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

          if (final) {
            submitSpokenSpeech(final.trim());
          } else {
            // Natural speech pause debouncer (1.2 seconds)
            silenceTimerRef.current = setTimeout(() => {
              if (rawCandidate.length >= 2) {
                submitSpokenSpeech(rawCandidate.trim());
              }
            }, 1200);
          }
        };

        const submitSpokenSpeech = async (speechText: string) => {
          if (!speechText || speechText.length < 2) return;
          setLastUserSpeech(speechText);
          setLiveTranscript('');
          await jarvisEmergencyCallService.processSpokenInput(speechText);
        };

        recognition.onerror = (e: any) => {
          // abort() is used during React cleanup/restarts; its delayed event
          // must not mark the replacement recognizer as stopped.
          if (recognitionRef.current !== recognition || e.error === 'aborted') return;
          if (e.error !== 'no-speech') console.warn('SpeechRecognition notice:', e.error);
          setIsListening(false);
          if (['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'].includes(e.error)) {
            allowRecognitionRestartRef.current = false;
          }
          const messages: Record<string, string> = {
            'not-allowed': 'Microphone access for speech recognition was denied. Allow microphone access for this site, then retry.',
            'service-not-allowed': 'The browser speech service is blocked. Use the text box below or check browser speech settings.',
            'audio-capture': 'The browser could not access the microphone for speech recognition.',
            network: 'Browser speech recognition is unavailable on the network. Retry or use the text box below.'
          };
          if (e.error !== 'no-speech') setRecognitionError(messages[e.error] || `Speech recognition stopped (${e.error}). Tap Retry Listening or use the text box.`);
        };

        recognition.onend = () => {
          if (recognitionRef.current !== recognition) return;
          setIsListening(false);
          // Auto-reconnect speech recognition during live telephone call
          if (
            isMountedRef.current &&
            callStateRef.current.includes('CONNECTED') &&
            !isMicMuted && allowRecognitionRestartRef.current
          ) {
            setTimeout(() => {
              if (
                isMountedRef.current &&
                callStateRef.current.includes('CONNECTED') &&
                !isMicMuted && allowRecognitionRestartRef.current
              ) {
                initAndStart();
              }
            }, 200);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        recognitionRef.current = null;
        console.warn('Speech recognition start issue:', err);
        setIsListening(false);
        setRecognitionError('Could not start browser speech recognition. Tap Retry Listening or use the text box.');
      }
    };

    restartRecognitionRef.current = () => {
      allowRecognitionRestartRef.current = true;
      setRecognitionError(null);
      initAndStart();
    };
    initAndStart();

    return () => {
      isMountedRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      const currentRecognition = recognitionRef.current;
      recognitionRef.current = null;
      if (currentRecognition) {
        try {
          currentRecognition.abort();
        } catch {}
      }
      restartRecognitionRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [callState, isMicMuted]);

  // Fallback submit function
  const handleManualSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const txt = textInput.trim();
    if (!txt) return;
    setTextInput('');
    setLastUserSpeech(txt);
    setLiveTranscript('');
    await jarvisEmergencyCallService.processSpokenInput(txt);
  };

  const handleManualAction = async (action: 'WHATS_UP' | 'UPDATES' | 'DISPATCH' | 'BYE') => {
    if (action === 'WHATS_UP') {
      setLastUserSpeech("What's up Alexa+?");
      await jarvisEmergencyCallService.managerAskWhatsUp();
    } else if (action === 'UPDATES') {
      setLastUserSpeech('What are the store updates?');
      await jarvisEmergencyCallService.managerAskForUpdates();
    } else if (action === 'DISPATCH') {
      setLastUserSpeech('I am stuck in traffic. Let Rahul handle it, keep me updated and hang up.');
      await jarvisEmergencyCallService.managerOrderEmployeeDispatch();
    } else if (action === 'BYE') {
      setLastUserSpeech('Ok bye');
      jarvisEmergencyCallService.managerSayByeAndHangUp();
    }
  };

  if (callState === 'IDLE' || callState === 'ENDED') {
    return null;
  }

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const managerPhone = managerService.getManagerPhone();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 backdrop-blur-xl animate-fade-in">
      {/* Smartphone Call Shell */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-slate-800 rounded-[2.5rem] shadow-2xl p-5 sm:p-7 overflow-hidden text-white flex flex-col justify-between min-h-[620px]">
        {/* Glow ambient ambient light */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* --- STATE 1 & 3: INCOMING CALL RINGING --- */}
        {(callState === 'RINGING' || callState === 'CALLBACK_RINGING') && (
          <div className="flex-1 flex flex-col items-center justify-between py-4 z-10 text-center animate-fade-in">
            {/* Top Badge */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold animate-pulse">
                <Radio className="w-3.5 h-3.5" />
                <span>
                  {callState === 'RINGING'
                    ? 'PRIORITY DISPATCH CALL'
                    : 'INCIDENT RESOLUTION CALLBACK'}
                </span>
              </div>
              <p className="text-xs text-slate-400">GrocerAI Automated Store Telephony</p>
            </div>

            {/* Pulsing Avatar Hologram */}
            <div className="my-8 relative">
              <div className="w-32 h-32 rounded-full border border-cyan-500/40 bg-gradient-to-tr from-cyan-950/60 to-slate-900 flex items-center justify-center relative shadow-2xl shadow-cyan-500/20">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-400/60 animate-ping opacity-75" />
                <Sparkles className="w-12 h-12 text-cyan-400 animate-pulse" />
              </div>
            </div>

            {/* Caller Information */}
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
                <span>J.A.R.V.I.S. STORE SENTINEL</span>
              </h2>
              <p className="text-sm text-cyan-400 font-mono">
                Calling Manager Direct: +91 {managerPhone}
              </p>
              <div className="pt-2 px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 max-w-xs mx-auto">
                <div className="text-amber-400 font-semibold mb-0.5">
                  {callState === 'RINGING'
                    ? '🚨 Unattended CCTV Concealment'
                    : '✅ Associate Resolution Complete'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {callState === 'RINGING'
                    ? 'Camera 4 (CAM-04B) · Aisle 2 · Manager In-Traffic Dispatch'
                    : 'Aisle 2 inspected & secured by Rahul Sen'}
                </div>
              </div>
            </div>

            {/* Call Action Controls */}
            <div className="w-full pt-8 flex items-center justify-around gap-6">
              {/* Decline */}
              <button
                type="button"
                onClick={() => jarvisEmergencyCallService.hangUpCall()}
                className="w-16 h-16 rounded-full bg-rose-600/90 hover:bg-rose-500 border border-rose-400 text-white flex flex-col items-center justify-center shadow-lg shadow-rose-900/40 transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Decline Call"
              >
                <PhoneOff className="w-6 h-6" />
                <span className="text-[9px] font-bold mt-1 uppercase">Decline</span>
              </button>

              {/* Answer Call (Requests Mic Access Explicitly) */}
              <button
                type="button"
                onClick={handleAnswerCall}
                className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 border-2 border-emerald-300 text-slate-950 flex flex-col items-center justify-center shadow-xl shadow-emerald-500/40 transition-all cursor-pointer hover:scale-110 active:scale-95 animate-bounce"
                title="Answer Call"
              >
                <PhoneCall className="w-8 h-8" />
                <span className="text-[10px] font-black mt-1 uppercase tracking-wider">Answer</span>
              </button>
            </div>
          </div>
        )}

        {/* --- STATE 2: ACTIVE IN-CALL CONVERSATION (INCIDENT ALERT) --- */}
        {callState === 'CONNECTED' && (
          <div className="flex-1 flex flex-col justify-between py-1 z-10 animate-fade-in space-y-3">
            {/* Header Telemetry */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>PHONE LINE CONNECTED · {formatDuration(context.callDurationSeconds)}</span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">J.A.R.V.I.S. Voice Telephony</h3>
              <p className="text-xs text-slate-400 font-mono">+91 {managerPhone} (In Traffic)</p>
            </div>

            {/* Live Audio Dialogue Box */}
            <div className="p-3.5 bg-slate-900/95 rounded-2xl border border-slate-800 space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                  <Volume2 className="w-3.5 h-3.5" /> GrocerAI Audio Channel
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  FULL DUPLEX VOICE
                </span>
              </div>

              {/* Assistant spoken message */}
              <div className="p-3 bg-slate-950/90 rounded-xl border border-cyan-500/20 text-xs leading-relaxed text-cyan-100 min-h-[58px] flex items-center">
                {context.dialogueStep === 1 && (
                  <p>
                    <span className="font-bold text-cyan-400">GROCERAI: </span>
                    "Hey Manager."
                  </p>
                )}
                {context.dialogueStep === 2 && (
                  <p>
                    <span className="font-bold text-cyan-400">GROCERAI: </span>
                    "Security Agent detected a critical incident: product concealment at Camera 4 in Aisle 2. You are marked away in traffic, so I reached you on your direct line. We need your immediate decision on this."
                  </p>
                )}
                {context.dialogueStep === 3 && (
                  <p>
                    <span className="font-bold text-cyan-400">GROCERAI: </span>
                    "Store operations are stable: 842 shoppers today, sales at ₹1,24,560 across 415 orders. Associate Rahul Sen is actively on floor duty near Aisle 2."
                  </p>
                )}
                {context.dialogueStep === 4 && (
                  <p>
                    <span className="font-bold text-cyan-400">GROCERAI: </span>
                    "Understood Manager. Alerting active floor associate Rahul Sen now. Disconnecting call."
                  </p>
                )}
              </div>

              {/* Live Manager Speech Recognition Display */}
              <div className="p-2.5 bg-emerald-950/20 rounded-xl border border-emerald-500/30 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <User className="w-3 h-3" /> Manager Line (You):
                  </span>
                  {context.isJarvisSpeaking ? (
                    <span className="text-[10px] text-cyan-400 animate-pulse">🔊 Assistant speaking...</span>
                  ) : isListening ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      🎙️ Microphone Listening
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400">Mic Ready</span>
                  )}
                </div>

                <div className="text-slate-200 italic min-h-[22px] text-[11px] flex items-center">
                  {liveTranscript ? (
                    <span className="text-emerald-300 font-medium">"{liveTranscript}"</span>
                  ) : lastUserSpeech ? (
                    <span className="text-slate-300">"{lastUserSpeech}"</span>
                  ) : (
                    <span className="text-slate-500 text-[10px]">
                      Speak naturally into phone (or say "Hey Alexa")...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Voice Mic HUD & Real Audio Level Waveforms */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMicMuted(!isMicMuted)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    isMicMuted
                      ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  }`}
                  title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <div className="text-[10px]">
                  <p className="font-bold text-white">
                    {isMicMuted ? 'Mic Muted' : 'Mic Active (Voice Open)'}
                  </p>
                  <p className="text-slate-400">
                    {realAudioLevel > 0.05
                      ? '🔊 Voice Sound Detected'
                      : 'Talk naturally into your device'}
                  </p>
                </div>
              </div>

              {/* Dynamic Sound Waveforms responding to Real Mic decibels */}
              <div className="flex items-center gap-1 h-5 pr-1">
                {[0.4, 0.8, 1.0, 0.6, 0.9, 0.5].map((scale, i) => {
                  const dynamicHeight = Math.max(
                    4,
                    context.isJarvisSpeaking
                      ? scale * 18
                      : realAudioLevel > 0.05
                      ? Math.min(22, 6 + realAudioLevel * 24 * scale)
                      : liveTranscript
                      ? scale * 16
                      : 4
                  );
                  return (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-100 ${
                        context.isJarvisSpeaking
                          ? 'bg-cyan-400'
                          : realAudioLevel > 0.05 || liveTranscript
                          ? 'bg-emerald-400 animate-pulse'
                          : 'bg-slate-700'
                      }`}
                      style={{ height: `${dynamicHeight}px` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Quick-Action Touch & Tap Buttons (100% Reliable Fallback) */}
            {!isMicMuted && !isListening && micSupported && (
              <button
                type="button"
                onClick={() => restartRecognitionRef.current?.()}
                className="w-full rounded-xl border border-emerald-500/40 bg-emerald-950/30 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40"
              >
                Start Listening / Retry Microphone
              </button>
            )}
            {recognitionError && (
              <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200">
                {recognitionError}
              </p>
            )}

            {/* Quick-Action Touch & Tap Buttons (100% Reliable Fallback) */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-center">
                🎙️ Speak with your voice or tap:
              </p>

              {context.dialogueStep === 1 && (
                <button
                  type="button"
                  onClick={() => handleManualAction('WHATS_UP')}
                  className="w-full p-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-[1.01]"
                >
                  <Mic className="w-3.5 h-3.5 text-cyan-200" />
                  <span>Say: "What's up?" (or "What happened?")</span>
                </button>
              )}

              {context.dialogueStep === 2 && (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleManualAction('UPDATES')}
                    className="w-full p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ask: "What are the store updates?"</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleManualAction('DISPATCH')}
                    className="w-full p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-[1.01]"
                  >
                    <Car className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                    <span className="text-left text-[11px] leading-tight">
                      Say: "I am stuck in traffic. Let Rahul handle it, keep me updated and hang up."
                    </span>
                  </button>
                </div>
              )}

              {context.dialogueStep === 3 && (
                <button
                  type="button"
                  onClick={() => handleManualAction('DISPATCH')}
                  className="w-full p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-[1.01]"
                >
                  <Car className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                  <span className="text-left text-[11px] leading-tight">
                    Say: "I am stuck in traffic. Let Rahul handle it, keep me updated and hang up."
                  </span>
                </button>
              )}
            </div>

            {/* Quick Text Input for Noisy Environments */}
            <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5 pt-0.5">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder='Type or say: "What happened?" or "Rahul handle it"'
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="p-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white cursor-pointer"
                title="Send instruction"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Hang up button */}
            <div className="pt-1 flex justify-center">
              <button
                type="button"
                onClick={() => jarvisEmergencyCallService.hangUpCall()}
                className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-950/60 transition-transform active:scale-95 cursor-pointer p-3"
                title="Hang up"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* --- STATE 4: CALLBACK CONNECTED (EMPLOYEE HAS RESOLVED) --- */}
        {callState === 'CALLBACK_CONNECTED' && (
          <div className="flex-1 flex flex-col justify-between py-1 z-10 animate-fade-in space-y-3">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>INCIDENT RESOLVED · {formatDuration(context.callDurationSeconds)}</span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">J.A.R.V.I.S. Callback Report</h3>
              <p className="text-xs text-slate-400 font-mono">+91 {managerPhone}</p>
            </div>

            {/* Transcript */}
            <div className="p-4 bg-slate-900/95 rounded-2xl border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" /> Floor Verification Succeeded
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                <span className="font-bold text-cyan-400">GROCERAI: </span>
                "Hey Manager, associate Rahul Sen has handled the situation in Aisle 2. Shelf verified and all secure. Have a safe drive, bye!"
              </p>

              {/* Manager Speech Feedback */}
              <div className="p-2.5 bg-emerald-950/30 rounded-xl border border-emerald-500/30 text-[11px] text-slate-300">
                <div className="text-emerald-400 font-semibold mb-0.5 flex items-center gap-1">
                  <Mic className="w-3 h-3" /> Manager Line:
                </div>
                {liveTranscript ? (
                  <span className="text-emerald-300 font-medium">"{liveTranscript}"</span>
                ) : lastUserSpeech ? (
                  <span className="text-slate-300 font-medium">"{lastUserSpeech}"</span>
                ) : (
                  <span className="text-slate-400 italic">
                    Say "Ok bye" or "Thanks bye" to finish...
                  </span>
                )}
              </div>
            </div>

            {/* Manager Final Response Suggestions */}
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-center">
                🎙️ Speak with your voice or tap:
              </p>

              <button
                type="button"
                onClick={() => handleManualAction('BYE')}
                className="w-full p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer hover:scale-[1.01]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Say: "Ok bye" (Cut Call & Complete Dispatch)</span>
              </button>
            </div>

            {/* Hang up icon */}
            <div className="pt-1 flex justify-center">
              <button
                type="button"
                onClick={() => jarvisEmergencyCallService.hangUpCall()}
                className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer p-3"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
