import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  BrainCircuit,
  Eye,
  AlertTriangle,
  RotateCcw,
  Sliders,
  DollarSign,
  Boxes,
  Users,
  Radio,
  Send,
  Keyboard,
  X
} from 'lucide-react';
import {
  jarvisManagerService,
  JarvisMessage,
  JarvisVoiceState,
  JarvisConversationState,
  JarvisPrioritizedAlert,
  JarvisPendingAction
} from '../services/jarvisManagerService';
import { voiceService } from '../services/voiceService.js';
import { echoGuard } from '../services/echoGuard.js';
import { db } from '../services/db';

export const JarvisManagerCommandCenter: React.FC = () => {
  const [messages, setMessages] = useState<JarvisMessage[]>(() => jarvisManagerService.getMessages());
  const [voiceState, setVoiceState] = useState<JarvisVoiceState>(() => jarvisManagerService.getVoiceState());
  const [conversationState, setConversationState] = useState<JarvisConversationState>(() => jarvisManagerService.getConversationState());
  const [pendingAction, setPendingAction] = useState<JarvisPendingAction | null>(() => jarvisManagerService.getPendingAction());
  const [pendingContextQuestion, setPendingContextQuestion] = useState<string | null>(() => jarvisManagerService.getPendingContextQuestion());
  const [prioritizedAlerts, setPrioritizedAlerts] = useState<JarvisPrioritizedAlert[]>(() => jarvisManagerService.getPrioritizedAlerts());
  const [liveTranscript, setLiveTranscript] = useState('');
  const [activeSpeechCaption, setActiveSpeechCaption] = useState<string>('');
  const [executedActionBadge, setExecutedActionBadge] = useState<{
    title: string;
    description: string;
    roiImpact?: string;
    timestamp: string;
  } | null>(null);

  const [isVoiceMuted, setIsVoiceMuted] = useState(jarvisManagerService.isMuted());
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardInput, setKeyboardInput] = useState('');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const voiceStateRef = useRef<JarvisVoiceState>(voiceState);
  const conversationStateRef = useRef<JarvisConversationState>(conversationState);
  const isSpeakingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const isRecognitionActiveRef = useRef<boolean>(false);
  const inactivityTimeoutRef = useRef<any>(null);
  const promptTimeoutRef = useRef<any>(null);
  const audioSimIntervalRef = useRef<any>(null);
  const hasTriggeredProactiveRef = useRef<boolean>(false);

  // Sync refs with voiceState and conversationState
  useEffect(() => {
    voiceStateRef.current = voiceState;
    isSpeakingRef.current = voiceState === 'SPEAKING';
    if (voiceState === 'IDLE' && conversationStateRef.current === 'WAKE_WORD_MONITORING') {
      setLiveTranscript('');
    }
  }, [voiceState]);

  useEffect(() => {
    conversationStateRef.current = conversationState;
    if (conversationState === 'CONVERSATION_ACTIVE') {
      resetInactivityTimer();
    } else {
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
    }
  }, [conversationState]);

  // Audio level simulation for realistic reactive holographic waveform
  useEffect(() => {
    if (voiceState === 'SPEAKING' || voiceState === 'LISTENING') {
      audioSimIntervalRef.current = setInterval(() => {
        setAudioLevel(0.4 + Math.random() * 0.6);
      }, 120);
    } else if (voiceState === 'PROCESSING') {
      audioSimIntervalRef.current = setInterval(() => {
        setAudioLevel(0.2 + Math.random() * 0.3);
      }, 200);
    } else {
      setAudioLevel(0);
      if (audioSimIntervalRef.current) clearInterval(audioSimIntervalRef.current);
    }
    return () => {
      if (audioSimIntervalRef.current) clearInterval(audioSimIntervalRef.current);
    };
  }, [voiceState]);

  // Inactivity timeout manager (5 minutes = 300,000 ms)
  const resetInactivityTimer = () => {
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);

    if (conversationStateRef.current === 'CONVERSATION_ACTIVE') {
      inactivityTimeoutRef.current = setTimeout(() => {
        if (conversationStateRef.current === 'CONVERSATION_ACTIVE') {
          jarvisManagerService.triggerInactivityPrompt();
          promptTimeoutRef.current = setTimeout(() => {
            if (conversationStateRef.current === 'AWAITING_CONTINUATION') {
              jarvisManagerService.endConversation("Ending conversation session due to inactivity. Say 'Hey Alexa' whenever you need me.");
            }
          }, 35000);
        }
      }, 5 * 60 * 1000);
    }
  };

  // Subscribe to Alexa+ service events
  useEffect(() => {
    const unsubMsg = jarvisManagerService.subscribe(() => {
      const msgs = jarvisManagerService.getMessages();
      setMessages([...msgs]);
      setPendingAction(jarvisManagerService.getPendingAction());
      setPendingContextQuestion(jarvisManagerService.getPendingContextQuestion());
      setPrioritizedAlerts(jarvisManagerService.getPrioritizedAlerts());

      const latest = msgs[msgs.length - 1];
      if (latest) {
        if (latest.sender === 'Alexa+') {
          setActiveSpeechCaption(latest.text);
        }
        if (latest.actionCard && latest.actionCard.status === 'EXECUTED') {
          setExecutedActionBadge({
            title: latest.actionCard.title,
            description: latest.actionCard.description,
            roiImpact: latest.roiBreakdown?.realizedImpact || '+₹1,090',
            timestamp: latest.timestamp
          });
        }
      }
    });

    const unsubVoice = jarvisManagerService.subscribeVoiceState((state) => {
      setVoiceState(state);
      voiceStateRef.current = state;
      isSpeakingRef.current = state === 'SPEAKING';
    });

    const unsubConv = jarvisManagerService.subscribeConversationState((state) => {
      setConversationState(state);
      conversationStateRef.current = state;
    });

    return () => {
      unsubMsg();
      unsubVoice();
      unsubConv();
    };
  }, []);

  // Proactive Stockout Exception Trigger on Mount (User Requirement 10)
  // When Amul Taaza Milk is out of stock (0 units), Alexa+ proactively reports it to the manager!
  useEffect(() => {
    if (hasTriggeredProactiveRef.current) return;
    const timer = setTimeout(() => {
      if (hasTriggeredProactiveRef.current) return;
      const milkInv = db.getInventory().find(i => i.product_id === 'prod-taaza-milk');
      if (milkInv && milkInv.quantity === 0) {
        hasTriggeredProactiveRef.current = true;
        jarvisManagerService.triggerProactiveStockoutAlert();
      }
    }, 850);
    return () => clearTimeout(timer);
  }, []);

  // Proactively start recognition whenever listening or conversation is active
  useEffect(() => {
    if ((voiceState === 'LISTENING' || conversationState === 'CONVERSATION_ACTIVE') && isMountedRef.current) {
      if (recognitionRef.current && !isRecognitionActiveRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    }
  }, [voiceState, conversationState]);

  // Web Speech API continuous wake-word & conversational listening
  useEffect(() => {
    isMountedRef.current = true;
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    setIsSpeechSupported(true);
    let recognition: any = null;

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isRecognitionActiveRef.current = true;
      };

      recognition.onresult = (event: any) => {
        const results = event.results;
        const latest = results[results.length - 1];
        const transcript = latest?.[0]?.transcript?.trim() || '';
        if (!transcript) return;

        const isSpeaking = isSpeakingRef.current || voiceStateRef.current === 'SPEAKING' || echoGuard.getIsSpeaking();

        // 1. While Alexa+ is actively speaking through computer speakers:
        if (isSpeaking) {
          // Check for intentional user barge-in (e.g. "stop", "wait", "cancel", "hey alexa")
          if (echoGuard.isBargeInInterruption(transcript)) {
            jarvisManagerService.stopSpeaking();
            voiceStateRef.current = 'LISTENING';
            setVoiceState('LISTENING');
          }
          // Discard all other audio while speaking as speaker feedback bleed
          return;
        }

        // 2. Post-speech reverberation check (speaker audio clearing from microphone buffer)
        if (echoGuard.isEcho(transcript)) {
          return;
        }

        const lower = transcript.toLowerCase();
        const hasWakeWord =
          lower.includes('hey alexa') ||
          lower.includes('alexa') ||
          lower.includes('service') ||
          lower.includes('hey service');

        if (latest.isFinal) {
          const cleanCommand = transcript
            .replace(/^(hey|hi|hello|ok|okay)?\s*(alexa|service)[,.!?]?\s*/i, '')
            .trim();

          const hasPendingQuestion =
            !!jarvisManagerService.getPendingAction() ||
            !!jarvisManagerService.getPendingContextQuestion();

          // STATE 1: WAKE_WORD_MONITORING
          if (conversationStateRef.current === 'WAKE_WORD_MONITORING') {
            // Priority Fail-Safe: If an urgent alert or pending confirmation is awaiting manager response,
            // process input directly without demanding the wake word!
            if (hasPendingQuestion) {
              setLiveTranscript(cleanCommand || transcript);
              resetInactivityTimer();
              jarvisManagerService.processManagerInput(cleanCommand || transcript);
            } else if (hasWakeWord) {
              if (cleanCommand) {
                setLiveTranscript(cleanCommand);
                resetInactivityTimer();
                jarvisManagerService.processManagerInput(cleanCommand);
              } else {
                setLiveTranscript('Starting conversation...');
                voiceService.playAudioChime(620);
                resetInactivityTimer();
                jarvisManagerService.startConversation("Yes, Manager. How can I assist you with store operations?");
              }
            }
          }
          // STATE 2: AWAITING_CONTINUATION
          else if (conversationStateRef.current === 'AWAITING_CONTINUATION') {
            if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);

            if (
              lower.includes('continue') ||
              lower.includes('keep going') ||
              lower === 'yes' ||
              lower === 'yeah' ||
              lower === 'sure' ||
              lower.includes('stay')
            ) {
              resetInactivityTimer();
              jarvisManagerService.continueConversation();
            } else if (
              lower.includes('end') ||
              lower.includes('stop') ||
              lower.includes('finish') ||
              lower === 'no' ||
              lower.includes('close')
            ) {
              jarvisManagerService.endConversation();
            } else {
              resetInactivityTimer();
              jarvisManagerService.processManagerInput(cleanCommand || transcript);
            }
          }
          // STATE 3: CONVERSATION_ACTIVE (Continuous conversation)
          else if (conversationStateRef.current === 'CONVERSATION_ACTIVE') {
            const commandToProcess = cleanCommand || transcript;

            if (
              lower === 'end' ||
              lower === 'stop' ||
              lower === 'finish' ||
              lower.includes('end conversation') ||
              lower.includes('stop conversation') ||
              lower.includes('goodbye') ||
              lower.includes("that's all") ||
              lower.includes('bye alexa') ||
              lower.includes('bye alexa')
            ) {
              jarvisManagerService.endConversation();
            } else {
              setLiveTranscript(commandToProcess);
              resetInactivityTimer();
              jarvisManagerService.processManagerInput(commandToProcess);
            }
          }
        } else {
          // Live interim speech caption
          const hasPendingQuestion =
            !!jarvisManagerService.getPendingAction() ||
            !!jarvisManagerService.getPendingContextQuestion();

          if (conversationStateRef.current === 'CONVERSATION_ACTIVE' || hasWakeWord || hasPendingQuestion) {
            setLiveTranscript(transcript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[Alexa+ Voice Error]:', event.error);
        }
      };

      recognition.onend = () => {
        isRecognitionActiveRef.current = false;
        if (isMountedRef.current) {
          setTimeout(() => {
            if (isMountedRef.current && !isRecognitionActiveRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {}
            }
          }, 250);
        }
      };

      recognition.recognition = recognition;
      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch (err) {}

      // Global user-gesture unlock listener
      const unlockAudioAndMic = () => {
        if (recognitionRef.current && !isRecognitionActiveRef.current && isMountedRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }
      };

      window.addEventListener('click', unlockAudioAndMic, { passive: true });
      window.addEventListener('pointerdown', unlockAudioAndMic, { passive: true });
      window.addEventListener('keydown', unlockAudioAndMic, { passive: true });

      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => {
            stream.getTracks().forEach(track => track.stop());
            if (recognitionRef.current && !isRecognitionActiveRef.current && isMountedRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {}
            }
          })
          .catch(() => {});
      }

      return () => {
        isMountedRef.current = false;
        if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
        if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
        window.removeEventListener('click', unlockAudioAndMic);
        window.removeEventListener('pointerdown', unlockAudioAndMic);
        window.removeEventListener('keydown', unlockAudioAndMic);
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {}
        }
      };
    } catch (e) {
      console.warn('[Alexa+] Speech recognition init failed:', e);
    }

    return () => {
      isMountedRef.current = false;
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const handleToggleVoiceMute = () => {
    const next = !isVoiceMuted;
    setIsVoiceMuted(next);
    jarvisManagerService.setVoiceMuted(next);
    if (next) {
      jarvisManagerService.stopSpeaking();
    }
  };

  // Direct tactile interaction when manager taps/clicks the Alexa+ Reactor Orb
  const handleOrbClick = () => {
    if (voiceState === 'SPEAKING') {
      jarvisManagerService.stopSpeaking();
      jarvisManagerService.setVoiceState('LISTENING');
    } else if (conversationState === 'CONVERSATION_ACTIVE') {
      // Toggle or keep active listening
      jarvisManagerService.processManagerInput('Hello Alexa');
    } else {
      voiceService.playAudioChime(620);
      jarvisManagerService.startConversation("Yes, Manager. I am listening.");
      resetInactivityTimer();
      if (recognitionRef.current && !isRecognitionActiveRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    }
  };

  const handleQuickCommand = async (cmd: string) => {
    setLiveTranscript(cmd);
    resetInactivityTimer();
    await jarvisManagerService.processManagerInput(cmd);
  };

  const handleSendKeyboardInput = async () => {
    if (!keyboardInput.trim()) return;
    const cmd = keyboardInput.trim();
    setKeyboardInput('');
    setLiveTranscript(cmd);
    resetInactivityTimer();
    await jarvisManagerService.processManagerInput(cmd);
  };

  // Visual status pill text
  const getStatusLabel = () => {
    if (voiceState === 'SPEAKING') return 'Assistant speaking...';
    if (voiceState === 'PROCESSING') return 'Synthesizing Store Telemetry & Hindsight...';
    if (pendingAction?.type === 'VIEW_SURVEILLANCE' || pendingContextQuestion === 'VIEW_SURVEILLANCE') {
      return liveTranscript
        ? `Hearing: "${liveTranscript}"`
        : 'Emergency Alert • Listening for response (Say "Yes" or "Show CCTV")...';
    }
    if (pendingAction?.type === 'APPROVE_RESTOCK' || pendingContextQuestion === 'APPROVE_RESTOCK_42') {
      return liveTranscript
        ? `Hearing: "${liveTranscript}"`
        : 'Restock Alert • Say "Yes" / "Approve" or "Modify to 40"...';
    }
    if (voiceState === 'LISTENING') return liveTranscript ? `Hearing: "${liveTranscript}"` : 'Listening to Manager...';
    if (conversationState === 'CONVERSATION_ACTIVE') return 'Conversation Active • Speak follow-up naturally';
    if (conversationState === 'AWAITING_CONTINUATION') return 'Inactivity Check • Say "Continue" or "End"';
    return 'Standby • Say "Hey Alexa" or tap to talk';
  };

  return (
    <div className="relative bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-950 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden backdrop-blur-2xl">
      {/* Background Holographic Grid Ambient Lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/25 via-slate-950/50 to-slate-950 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* =================================================================== */}
      {/* 1. TOP TELEMETRY HUD BAR                                            */}
      {/* =================================================================== */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-cyan-500/15">
        {/* Left: Active Multi-Agent Connectivity Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="font-bold tracking-wider">COMMAND LAYER</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Customer
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Store
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Security
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" /> Hindsight
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ROI
            </span>
          </div>
        </div>

        {/* Right: Audio Synthesis & Control Actions */}
        <div className="flex items-center gap-2">
          {/* Active Conversation Badge / End Button */}
          {conversationState === 'CONVERSATION_ACTIVE' && (
            <button
              type="button"
              onClick={() => jarvisManagerService.endConversation()}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 transition-all cursor-pointer flex items-center gap-1"
              title="End active session"
            >
              <X className="w-3 h-3 text-rose-400" />
              <span>End Session</span>
            </button>
          )}

          {/* Voice Audio Mute Toggle */}
          <button
            type="button"
            onClick={handleToggleVoiceMute}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
              isVoiceMuted
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/50'
            }`}
            title={isVoiceMuted ? 'Unmute speech output' : 'Mute speech output'}
          >
            {isVoiceMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="text-[11px]">{isVoiceMuted ? 'Muted' : 'Voice On'}</span>
          </button>

          {/* Silent Text Fallback Toggle */}
          <button
            type="button"
            onClick={() => setIsKeyboardOpen(!isKeyboardOpen)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isKeyboardOpen
                ? 'bg-cyan-900/50 border-cyan-400 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle silent text input"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. CENTERPIECE: STORE OPERATIONS VOICE ASSISTANT */}
      {/* =================================================================== */}
      <div className="relative z-10 flex flex-col items-center justify-center py-6 sm:py-8">
        {/* Holographic Orb Container */}
        <div
          onClick={handleOrbClick}
          className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center cursor-pointer select-none group"
          title="Tap to wake the GrocerAI assistant or toggle voice turn"
        >
          {/* Ambient Outer Halo Glow */}
          <motion.div
            animate={
              voiceState === 'SPEAKING'
                ? { scale: [1, 1.25, 1], opacity: [0.35, 0.65, 0.35] }
                : voiceState === 'LISTENING'
                ? { scale: [1, 1.15, 1], opacity: [0.3, 0.55, 0.3] }
                : voiceState === 'PROCESSING'
                ? { scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }
                : { scale: [1, 1.05, 1], opacity: [0.15, 0.28, 0.15] }
            }
            transition={{ repeat: Infinity, duration: voiceState === 'PROCESSING' ? 1.5 : 3, ease: 'easeInOut' }}
            className={`absolute inset-0 rounded-full blur-2xl pointer-events-none ${
              voiceState === 'SPEAKING'
                ? 'bg-cyan-400'
                : voiceState === 'LISTENING'
                ? 'bg-emerald-400'
                : voiceState === 'PROCESSING'
                ? 'bg-indigo-500'
                : 'bg-cyan-600'
            }`}
          />

          {/* SVG HOLOGRAPHIC REACTOR RINGS (REFERENCE IMAGE 2 INSPIRATION) */}
          <svg
            viewBox="0 0 300 300"
            className="w-full h-full relative z-10 pointer-events-none drop-shadow-[0_0_20px_rgba(6,182,212,0.45)]"
          >
            <defs>
              <linearGradient id="cyanRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0d9488" stopOpacity="0.8" />
              </linearGradient>

              <radialGradient id="plasmaCoreGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#083344" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
              </radialGradient>
            </defs>

            {/* RING 1: OUTER TELEMETRY TICK MARKS RING (Rotating slowly) */}
            <motion.circle
              cx="150"
              cy="150"
              r="138"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.5"
              strokeDasharray="2 12"
              opacity="0.5"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
              style={{ transformOrigin: '150px 150px' }}
            />

            {/* Telemetry Bracket Markers (Top, Right, Bottom, Left) */}
            <circle cx="150" cy="12" r="3" fill="#22d3ee" />
            <circle cx="288" cy="150" r="3" fill="#22d3ee" />
            <circle cx="150" cy="288" r="3" fill="#22d3ee" />
            <circle cx="12" cy="150" r="3" fill="#22d3ee" />

            {/* RING 2: MIDDLE GYROSCOPIC SEGMENTED ARCS (Counter-Rotating) */}
            <motion.circle
              cx="150"
              cy="150"
              r="122"
              fill="none"
              stroke="url(#cyanRingGrad)"
              strokeWidth="3.5"
              strokeDasharray="70 25 120 18 40 30"
              strokeLinecap="round"
              animate={{
                rotate: -360,
                strokeWidth: voiceState === 'SPEAKING' ? [3.5, 5, 3.5] : [3, 4, 3]
              }}
              transition={{
                rotate: { repeat: Infinity, duration: voiceState === 'PROCESSING' ? 4 : 20, ease: 'linear' },
                strokeWidth: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
              }}
              style={{ transformOrigin: '150px 150px' }}
            />

            {/* RING 3: SECONDARY CONCENTRIC SEGMENT ARCS */}
            <motion.circle
              cx="150"
              cy="150"
              r="104"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="40 40 80 30"
              strokeLinecap="round"
              opacity="0.75"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: voiceState === 'PROCESSING' ? 3 : 15, ease: 'linear' }}
              style={{ transformOrigin: '150px 150px' }}
            />

            {/* RING 4: DYNAMIC AUDIO WAVE ENERGY RIPPLE (Reacts to voice volume) */}
            <motion.circle
              cx="150"
              cy="150"
              r="86"
              fill="none"
              stroke={
                voiceState === 'SPEAKING'
                  ? '#22d3ee'
                  : voiceState === 'LISTENING'
                  ? '#34d399'
                  : voiceState === 'PROCESSING'
                  ? '#818cf8'
                  : '#06b6d4'
              }
              strokeWidth={voiceState === 'SPEAKING' || voiceState === 'LISTENING' ? 3 + audioLevel * 2.5 : 1.5}
              strokeDasharray="180 30 90 20"
              opacity={voiceState === 'SPEAKING' ? 0.9 : voiceState === 'LISTENING' ? 0.8 : 0.4}
              animate={
                voiceState === 'SPEAKING'
                  ? { scale: [1, 1.08, 1] }
                  : voiceState === 'LISTENING'
                  ? { scale: [1, 1.05, 1] }
                  : { scale: [1, 1.02, 1] }
              }
              transition={{ repeat: Infinity, duration: voiceState === 'SPEAKING' ? 0.8 : 2, ease: 'easeInOut' }}
              style={{ transformOrigin: '150px 150px' }}
            />

            {/* RING 5: INNER REACTOR CORE */}
            <circle
              cx="150"
              cy="150"
              r="68"
              fill="url(#plasmaCoreGrad)"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeDasharray="12 4"
              className="drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]"
            />
          </svg>

          {/* INNER REACTOR CENTER: TYPOGRAPHY & STATE WAVE */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20 pointer-events-none">
            {/* Holographic Logo Typography */}
            <motion.h1
              animate={
                voiceState === 'SPEAKING'
                  ? { textShadow: ['0 0 10px #22d3ee', '0 0 25px #22d3ee', '0 0 10px #22d3ee'] }
                  : { textShadow: '0 0 12px #06b6d4' }
              }
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="text-2xl sm:text-3xl font-black text-white tracking-[0.25em] font-mono select-none"
            >
              J.A.R.V.I.S.
            </motion.h1>

            <span className="text-[9px] font-mono font-bold tracking-widest text-cyan-300/80 uppercase mt-0.5">
              Command HQ
            </span>

            {/* Visual State Waveform / Reactor Equalizer Bars */}
            <div className="flex items-center gap-1 mt-2.5 h-5">
              {voiceState === 'SPEAKING' && (
                <>
                  <motion.div animate={{ height: [4, 18, 6, 20, 8] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-cyan-400 rounded-full" />
                  <motion.div animate={{ height: [8, 22, 10, 16, 4] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-1 bg-cyan-300 rounded-full" />
                  <motion.div animate={{ height: [14, 6, 24, 8, 18] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-cyan-200 rounded-full" />
                  <motion.div animate={{ height: [6, 18, 8, 22, 10] }} transition={{ repeat: Infinity, duration: 0.65 }} className="w-1 bg-cyan-300 rounded-full" />
                  <motion.div animate={{ height: [4, 14, 6, 16, 8] }} transition={{ repeat: Infinity, duration: 0.55 }} className="w-1 bg-cyan-400 rounded-full" />
                </>
              )}

              {voiceState === 'LISTENING' && (
                <>
                  <motion.div animate={{ height: [4, 14, 6] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-emerald-400 rounded-full" />
                  <motion.div animate={{ height: [8, 18, 10] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-1 bg-emerald-300 rounded-full" />
                  <motion.div animate={{ height: [12, 6, 20] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-emerald-200 rounded-full" />
                  <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.75 }} className="w-1 bg-emerald-300 rounded-full" />
                  <motion.div animate={{ height: [4, 12, 6] }} transition={{ repeat: Infinity, duration: 0.85 }} className="w-1 bg-emerald-400 rounded-full" />
                </>
              )}

              {voiceState === 'PROCESSING' && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                  className="w-5 h-5 rounded-full border-2 border-cyan-400 border-t-transparent"
                />
              )}

              {voiceState === 'IDLE' && (
                <div className="flex items-center gap-1.5 opacity-60">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse delay-200" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Status Capsule below Orb */}
        <motion.div
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="mt-4 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2 shadow-lg"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              voiceState === 'SPEAKING'
                ? 'bg-cyan-400 animate-ping'
                : voiceState === 'LISTENING'
                ? 'bg-emerald-400 animate-pulse'
                : voiceState === 'PROCESSING'
                ? 'bg-purple-400 animate-spin'
                : 'bg-cyan-500'
            }`}
          />
          <span>{getStatusLabel()}</span>
        </motion.div>

        {/* =================================================================== */}
        {/* 3. CINEMATIC VOICE CAPTION / SUBTITLE HUD (NOT A CHATBOT!)            */}
        {/* =================================================================== */}
        <div className="w-full max-w-2xl mt-5 px-4 text-center">
          <AnimatePresence mode="wait">
            {activeSpeechCaption ? (
              <motion.div
                key={activeSpeechCaption.slice(0, 30)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="p-4 rounded-2xl bg-slate-950/70 border border-cyan-500/20 backdrop-blur-md shadow-xl"
              >
                <p className="text-sm sm:text-base text-slate-100 font-sans tracking-wide leading-relaxed font-normal">
                  <span className="text-cyan-400 font-mono font-bold mr-2 text-xs uppercase tracking-wider">GROCERAI:</span>
                  "{activeSpeechCaption}"
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-slate-400 font-mono"
              >
                Say <span className="text-cyan-300 font-bold">"Hey Alexa"</span> to begin continuous conversation.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* =================================================================== */}
        {/* 4. REAL SYSTEM ACTION CONFIRMATION BADGE                            */}
        {/* =================================================================== */}
        <AnimatePresence>
          {executedActionBadge && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-4 max-w-xl w-full p-3.5 rounded-2xl bg-emerald-950/60 border-2 border-emerald-500/50 flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/40 text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-200 tracking-wide font-mono text-xs uppercase">
                      ✓ Database Action Executed
                    </span>
                    <span className="text-[10px] text-emerald-400/80 font-mono">
                      {executedActionBadge.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-200 font-sans text-xs mt-0.5">
                    {executedActionBadge.description}
                  </p>
                </div>
              </div>

              {executedActionBadge.roiImpact && (
                <div className="shrink-0 text-right bg-emerald-900/50 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-300/80 font-mono block">Realized Net ROI</span>
                  <span className="font-bold text-emerald-200 font-mono text-xs">{executedActionBadge.roiImpact}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* =================================================================== */}
        {/* 5. SUBTLE QUICK SPEECH WHISPER CHIPS (FAST TESTING / SHORTCUTS)      */}
        {/* =================================================================== */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-2xl px-2">
          <button
            type="button"
            onClick={() => handleQuickCommand('Why that quantity?')}
            className="px-3 py-1 rounded-full text-xs font-mono bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span>🥛</span>
            <span>Why 42 units?</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickCommand('Yes')}
            className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span>✓</span>
            <span>Yes (Approve)</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickCommand('Show me the surveillance')}
            className="px-3 py-1 rounded-full text-xs font-mono bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span>📹</span>
            <span>Show CCTV</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickCommand('What changed because of Hindsight?')}
            className="px-3 py-1 rounded-full text-xs font-mono bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span>🧠</span>
            <span>What changed in Hindsight?</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickCommand('What was the outcome?')}
            className="px-3 py-1 rounded-full text-xs font-mono bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 text-slate-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span>💰</span>
            <span>Financial ROI</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* 6. SILENT TEXT INPUT DRAWER (FALLBACK FOR QUIET / NO-MIC ENVIRONMENTS)*/}
        {/* =================================================================== */}
        <AnimatePresence>
          {isKeyboardOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-xl mt-4"
            >
              <div className="flex items-center gap-2 bg-slate-950/90 border border-cyan-500/40 rounded-2xl p-1.5 shadow-inner">
                <input
                  type="text"
                  value={keyboardInput}
                  onChange={(e) => setKeyboardInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendKeyboardInput();
                  }}
                  placeholder="Type natural command... (e.g. 'Why 42 units?', 'Yes', 'Show CCTV')"
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendKeyboardInput}
                  disabled={!keyboardInput.trim()}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
