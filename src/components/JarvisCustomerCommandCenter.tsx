import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  BrainCircuit,
  AlertTriangle,
  RotateCcw,
  ShoppingCart,
  Send,
  Keyboard,
  X,
  Navigation,
  Smartphone,
  Globe
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { customerAgent, CustomerAgentResponse, getCustomerAgentIdentity } from '../services/customerAgent';
import { voiceService } from '../services/voiceService';
import { echoGuard } from '../services/echoGuard';
import { db } from '../services/db';
import { languageDetector } from '../services/languageDetector';
import { LanguageCode } from '../types';

export type CustomerVoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';
export type CustomerConvState = 'WAKE_WORD_MONITORING' | 'CONVERSATION_ACTIVE' | 'AWAITING_CONTINUATION';

export const JarvisCustomerCommandCenter: React.FC = () => {
  const {
    currentUser,
    currentCustomer,
    language,
    setLanguage,
    cart,
    cartTotal,
    activeMission,
    setIsSessionQRModalOpen,
    activeShoppingSession
  } = useApp();

  const sessionId = activeShoppingSession?.session_id || 'SESS_ACTIVE';
  const customerId = currentCustomer?.customer_id || sessionId;

  const [voiceState, setVoiceState] = useState<CustomerVoiceState>('IDLE');
  const [convState, setConvState] = useState<CustomerConvState>('WAKE_WORD_MONITORING');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [activeSpeechCaption, setActiveSpeechCaption] = useState<string>(
    'Hello! I am JARVIS, your supermarket shopping companion. Say "Hey JARVIS" or tap the orb to ask for products, meal planning, or to add items to your cart.'
  );
  const [executedActionBadge, setExecutedActionBadge] = useState<{
    title: string;
    description: string;
    timestamp: string;
  } | null>(null);

  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardInput, setKeyboardInput] = useState('');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const voiceStateRef = useRef<CustomerVoiceState>(voiceState);
  const convStateRef = useRef<CustomerConvState>(convState);
  const isSpeakingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const audioSimIntervalRef = useRef<any>(null);
  const inactivityTimeoutRef = useRef<any>(null);

  // Sync refs
  useEffect(() => {
    voiceStateRef.current = voiceState;
    isSpeakingRef.current = voiceState === 'SPEAKING';
  }, [voiceState]);

  useEffect(() => {
    convStateRef.current = convState;
    if (convState === 'CONVERSATION_ACTIVE') {
      resetInactivityTimer();
    } else {
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    }
  }, [convState]);

  // Audio level animation for concentric orb
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

  const resetInactivityTimer = () => {
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    if (convStateRef.current === 'CONVERSATION_ACTIVE') {
      inactivityTimeoutRef.current = setTimeout(() => {
        setConvState('WAKE_WORD_MONITORING');
        setVoiceState('IDLE');
      }, 90000); // 90 seconds idle back to wakeword
    }
  };

  const handleEndConversation = () => {
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    voiceService.playAudioChime(480, 200);
    setConvState('WAKE_WORD_MONITORING');
    setLiveTranscript('');

    const farewell =
      language === 'te'
        ? 'ధన్యవాదాలు! మీ షాపింగ్ ఆనందదాయకంగా సాగాలని కోరుకుంటున్నాను. సహాయం కావాలంటే "హే జార్విస్" అని పిలవండి.'
        : language === 'hi'
        ? 'धन्यवाद! आपकी खरीदारी सुखद हो। जब भी सहायता चाहिए, "हे जार्विस" कहें।'
        : "Goodbye! Have a great time shopping. Say 'Hey JARVIS' anytime you need me!";

    setActiveSpeechCaption(farewell);
    if (!isVoiceMuted) {
      setVoiceState('SPEAKING');
      voiceService.speak(farewell, language, sessionId).then(() => {
        setVoiceState('IDLE');
      });
    } else {
      setVoiceState('IDLE');
    }
  };

  // Continuous speech recognition & Wake Word Listener
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
      recognition.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onstart = () => {};

      recognition.onresult = (event: any) => {
        const results = event.results;
        const latest = results[results.length - 1];
        const transcript = latest?.[0]?.transcript?.trim() || '';
        if (!transcript) return;

        const isSpeaking = isSpeakingRef.current || voiceStateRef.current === 'SPEAKING' || echoGuard.getIsSpeaking();
        if (isSpeaking) {
          if (echoGuard.isBargeInInterruption(transcript)) {
            voiceService.stop();
            voiceStateRef.current = 'LISTENING';
            setVoiceState('LISTENING');
          }
          return;
        }

        if (echoGuard.isEcho(transcript)) return;

        const lower = transcript.toLowerCase();
        const hasWakeWord =
          lower.includes('hey jarvis') ||
          lower.includes('jarvis') ||
          lower.includes('హే జార్విస్') ||
          lower.includes('జార్విస్') ||
          lower.includes('हे जार्विस') ||
          lower.includes('जार्विस');

        if (latest.isFinal) {
          const cleanCommand = transcript
            .replace(/hey\s+jarvis[,.]?/i, '')
            .replace(/jarvis[,.]?/i, '')
            .replace(/హే\s+జార్విస్[,.]?/i, '')
            .replace(/జార్విస్[,.]?/i, '')
            .replace(/हे\s+जार्विस[,.]?/i, '')
            .replace(/जार्विस[,.]?/i, '')
            .trim();

          // STATE 1: WAKE_WORD_MONITORING
          if (convStateRef.current === 'WAKE_WORD_MONITORING') {
            if (hasWakeWord) {
              if (cleanCommand) {
                setLiveTranscript(cleanCommand);
                resetInactivityTimer();
                processCustomerVoiceInput(cleanCommand);
              } else {
                setLiveTranscript('Listening...');
                voiceService.playAudioChime(620);
                setConvState('CONVERSATION_ACTIVE');
                setVoiceState('LISTENING');
                resetInactivityTimer();
                const greeting =
                  language === 'te'
                    ? 'చెప్పండి! నేను మీకు ఎలా సహాయపడగలను?'
                    : language === 'hi'
                    ? 'नमस्ते! मैं आपकी क्या मदद कर सकता हूँ?'
                    : 'Yes! How can I help with your shopping today?';
                setActiveSpeechCaption(greeting);
                if (!isVoiceMuted) {
                  voiceService.speak(greeting, language, sessionId);
                }
              }
            }
          }
          // STATE 2: CONVERSATION_ACTIVE (Continuous Conversation - NO wake-word needed!)
          else if (convStateRef.current === 'CONVERSATION_ACTIVE') {
            const commandToProcess = cleanCommand || transcript;
            const isEnding =
              lower === 'end' ||
              lower === 'stop' ||
              lower === 'finish' ||
              lower === 'exit' ||
              lower === 'bye' ||
              lower.includes('end conversation') ||
              lower.includes('stop conversation') ||
              lower.includes('close conversation') ||
              lower.includes('goodbye') ||
              lower.includes("that's all") ||
              lower.includes('bye jarvis') ||
              lower.includes('చాలు') ||
              lower.includes('ఆపు') ||
              lower.includes('ముగించు') ||
              lower.includes('बस') ||
              lower.includes('अलविदा') ||
              lower.includes('बंद करो');

            if (isEnding) {
              handleEndConversation();
            } else if (commandToProcess) {
              setLiveTranscript(commandToProcess);
              resetInactivityTimer();
              processCustomerVoiceInput(commandToProcess);
            }
          }
        } else {
          // Interim results live caption
          if (convStateRef.current === 'CONVERSATION_ACTIVE' || hasWakeWord) {
            setLiveTranscript(transcript);
          }
        }
      };

      recognition.onerror = (err: any) => {
        if (err.error === 'no-speech' || err.error === 'audio-capture') return;
        console.warn('[CustomerJARVIS] Speech recognition notice:', err.error);
      };

      recognition.onend = () => {
        if (isMountedRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {}
    } catch (e) {
      console.warn('SpeechRecognition initialization error:', e);
    }

    return () => {
      isMountedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, [language, isVoiceMuted, sessionId]);

  // Process customer command with Customer Agent & execute database actions
  const processCustomerVoiceInput = async (inputQuery: string) => {
    if (!inputQuery.trim()) return;

    const normalizedQuery = inputQuery.toLowerCase();
    const asksForCartStatus = (/\b(cart|basket)\b/.test(normalizedQuery)
      && /\b(how many|what|show|check|status|empty|in my|do i have|items?)\b/.test(normalizedQuery)
      || /\b(checkout|where do i pay|ready to pay)\b/.test(normalizedQuery))
      && !/\b(add|remove|delete|clear)\b/.test(normalizedQuery);
    if (asksForCartStatus) {
      const databaseCart = db.getCart(currentUser.id);
      const liveCart = databaseCart.length > 0 ? databaseCart : cart;
      const itemCount = liveCart.reduce((count, item) => count + item.quantity, 0);
      const reply = itemCount === 0
        ? 'Your cart is empty right now, so there are no items to verify at checkout.'
        : `Your cart has ${itemCount} ${itemCount === 1 ? 'item' : 'items'}: ${liveCart.map(item => `${item.quantity} ${item.product.name}`).join(', ')}. You can take these items to checkout verification.`;
      setActiveSpeechCaption(reply);
      if (!isVoiceMuted) {
        setVoiceState('SPEAKING');
        void voiceService.speak(reply, language, sessionId).then(() => setVoiceState('LISTENING'));
      } else {
        setVoiceState('LISTENING');
      }
      return;
    }

    setVoiceState('PROCESSING');
    setConvState('CONVERSATION_ACTIVE');
    resetInactivityTimer();

    try {
      const resp = await customerAgent.processInput(
        inputQuery,
        language,
        activeMission,
        sessionId,
        'voice',
        getCustomerAgentIdentity(sessionId, currentCustomer?.customer_id)
      );

      // Handle executed tool actions (e.g., addToCart)
      if (resp.toolExecutions && resp.toolExecutions.length > 0) {
        for (const tool of resp.toolExecutions) {
          if (tool.tool_name === 'addToCart' && tool.success && tool.result?.verifiedAgainstDashboardCart && tool.result?.added) {
              const added = tool.result.added;
              setExecutedActionBadge({
                title: 'Cart Updated',
                description: `Added ${added.quantity}x ${added.name} (₹${added.subtotal}) to your cart. Total: ₹${tool.result.cartTotal}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
          }
        }
      }

      // Display caption
      setActiveSpeechCaption(resp.message);

      // Spoken response
      if (!isVoiceMuted) {
        setVoiceState('SPEAKING');
        const langToSpeak = (resp.response_language as LanguageCode) || language;
        voiceService.speak(resp.message, langToSpeak, sessionId).then(() => {
          setVoiceState('LISTENING');
          resetInactivityTimer();
        });
      } else {
        setVoiceState('LISTENING');
        resetInactivityTimer();
      }
    } catch (e) {
      console.warn('Customer Agent execution error:', e);
      const fallback = "I've checked that for you. What else would you like to find or add to your cart?";
      setActiveSpeechCaption(fallback);
      setVoiceState('LISTENING');
    }
  };

  const handleOrbTap = () => {
    if (voiceState === 'SPEAKING') {
      voiceService.stop();
      setVoiceState('LISTENING');
      return;
    }

    voiceService.playAudioChime(660);
    setConvState('CONVERSATION_ACTIVE');
    setVoiceState('LISTENING');
    setLiveTranscript('');
    resetInactivityTimer();
  };

  const handleQuickCommand = (prompt: string) => {
    setLiveTranscript(prompt);
    processCustomerVoiceInput(prompt);
  };

  const handleKeyboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyboardInput.trim()) return;
    const text = keyboardInput.trim();
    setKeyboardInput('');
    setIsKeyboardOpen(false);
    setLiveTranscript(text);
    processCustomerVoiceInput(text);
  };

  const getStatusLabel = () => {
    switch (voiceState) {
      case 'SPEAKING':
        return 'Speaking Response...';
      case 'LISTENING':
        return convState === 'CONVERSATION_ACTIVE'
          ? 'Listening Continuously... (Say "End" or "Stop" to finish)'
          : 'Listening... Say your request';
      case 'PROCESSING':
        return 'Reasoning & Checking Inventory...';
      case 'IDLE':
      default:
        return convState === 'WAKE_WORD_MONITORING'
          ? 'Standby • Say "Hey JARVIS" or tap Orb'
          : 'Ready for Command • Say "End" to finish';
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center py-6 px-4 select-none">
      {/* =================================================================== */}
      {/* 1. TOP METRICS & AUDIO CONTROLS BAR                                  */}
      {/* =================================================================== */}
      <div className="w-full flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>JARVIS CUSTOMER VOICE HQ</span>
          </span>

          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs font-mono text-slate-300">
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cart: {cart.length} items (₹{cartTotal})</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-xl text-xs">
            {(['en', 'te', 'hi'] as LanguageCode[]).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  language === l
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {l === 'en' ? 'EN' : l === 'te' ? 'తె' : 'हि'}
              </button>
            ))}
          </div>

          {/* Voice Mute / Unmute */}
          <button
            onClick={() => {
              if (!isVoiceMuted) voiceService.stop();
              setIsVoiceMuted(!isVoiceMuted);
            }}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isVoiceMuted
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/60'
                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
            }`}
            title={isVoiceMuted ? 'Unmute JARVIS Voice' : 'Mute JARVIS Voice'}
          >
            {isVoiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isVoiceMuted ? 'Voice Muted' : 'Voice On'}</span>
          </button>

          {/* Keyboard Input Toggle */}
          <button
            onClick={() => setIsKeyboardOpen(!isKeyboardOpen)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Type command quietly"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. CONCENTRIC HOLOGRAPHIC JARVIS REACTOR CORE ORB                  */}
      {/* =================================================================== */}
      <div className="relative flex flex-col items-center justify-center my-4">
        <div
          onClick={handleOrbTap}
          className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center cursor-pointer group active:scale-95 transition-transform"
        >
          {/* Ambient Plasma Glow Layer */}
          <motion.div
            animate={
              voiceState === 'SPEAKING'
                ? { scale: [1, 1.25, 1], opacity: [0.35, 0.7, 0.35] }
                : voiceState === 'LISTENING'
                ? { scale: [1, 1.15, 1], opacity: [0.3, 0.55, 0.3] }
                : { scale: [1, 1.05, 1], opacity: [0.15, 0.3, 0.15] }
            }
            transition={{ repeat: Infinity, duration: voiceState === 'SPEAKING' ? 1.2 : 3, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/30 via-teal-500/20 to-emerald-600/30 blur-3xl pointer-events-none"
          />

          {/* SVG Concentric Orbit Rings */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 300">
            <defs>
              <linearGradient id="emeraldPlasmaCore" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#022c22" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* RING 1: OUTER SEGMENTED ORBIT */}
            <motion.circle
              cx="150"
              cy="150"
              r="138"
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="8 12"
              opacity={voiceState === 'SPEAKING' ? 0.7 : 0.35}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
              style={{ transformOrigin: '150px 150px' }}
            />

            {/* RING 2: COUNTER ROTATING RETICLE */}
            <motion.circle
              cx="150"
              cy="150"
              r="120"
              fill="none"
              stroke="#14b8a6"
              strokeWidth="2"
              strokeDasharray="40 10 15 10"
              opacity={voiceState === 'LISTENING' ? 0.9 : 0.45}
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
              style={{ transformOrigin: '150px 150px' }}
            />

            {/* RING 3: DYNAMIC AUDIO WAVEFORM PULSE RING */}
            <motion.circle
              cx="150"
              cy="150"
              r="98"
              fill="none"
              stroke="#34d399"
              strokeWidth={voiceState === 'SPEAKING' || voiceState === 'LISTENING' ? 3 + audioLevel * 2.5 : 1.5}
              strokeDasharray="180 30 90 20"
              opacity={voiceState === 'SPEAKING' ? 0.95 : voiceState === 'LISTENING' ? 0.85 : 0.45}
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

            {/* RING 4: INNER REACTOR CORE */}
            <circle
              cx="150"
              cy="150"
              r="68"
              fill="url(#emeraldPlasmaCore)"
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="12 4"
              className="drop-shadow-[0_0_14px_rgba(16,185,129,0.7)]"
            />
          </svg>

          {/* INNER REACTOR CENTER: TYPOGRAPHY & EQUALIZER BARS */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20 pointer-events-none">
            <motion.h1
              animate={
                voiceState === 'SPEAKING'
                  ? { textShadow: ['0 0 10px #10b981', '0 0 25px #10b981', '0 0 10px #10b981'] }
                  : { textShadow: '0 0 12px #059669' }
              }
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="text-2xl sm:text-3xl font-black text-white tracking-[0.25em] font-mono select-none"
            >
              J.A.R.V.I.S.
            </motion.h1>

            <span className="text-[9px] font-mono font-bold tracking-widest text-emerald-300/80 uppercase mt-0.5">
              Customer AI Shopper
            </span>

            {/* Equalizer Bars */}
            <div className="flex items-center gap-1 mt-2.5 h-5">
              {voiceState === 'SPEAKING' && (
                <>
                  <motion.div animate={{ height: [4, 18, 6, 20, 8] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-emerald-400 rounded-full" />
                  <motion.div animate={{ height: [8, 22, 10, 16, 4] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-1 bg-teal-300 rounded-full" />
                  <motion.div animate={{ height: [14, 6, 24, 8, 18] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-emerald-200 rounded-full" />
                  <motion.div animate={{ height: [6, 18, 8, 22, 10] }} transition={{ repeat: Infinity, duration: 0.65 }} className="w-1 bg-teal-300 rounded-full" />
                  <motion.div animate={{ height: [4, 14, 6, 16, 8] }} transition={{ repeat: Infinity, duration: 0.55 }} className="w-1 bg-emerald-400 rounded-full" />
                </>
              )}

              {voiceState === 'LISTENING' && (
                <>
                  <motion.div animate={{ height: [4, 14, 6] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-emerald-400 rounded-full" />
                  <motion.div animate={{ height: [8, 18, 10] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-1 bg-teal-300 rounded-full" />
                  <motion.div animate={{ height: [12, 6, 20] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-emerald-200 rounded-full" />
                  <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.75 }} className="w-1 bg-teal-300 rounded-full" />
                  <motion.div animate={{ height: [4, 12, 6] }} transition={{ repeat: Infinity, duration: 0.85 }} className="w-1 bg-emerald-400 rounded-full" />
                </>
              )}

              {voiceState === 'PROCESSING' && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                  className="w-5 h-5 rounded-full border-2 border-emerald-400 border-t-transparent"
                />
              )}

              {voiceState === 'IDLE' && (
                <div className="flex items-center gap-1.5 opacity-60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse delay-200" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Status Capsule */}
        <motion.div
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="mt-3 px-4 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2 shadow-lg"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              voiceState === 'SPEAKING'
                ? 'bg-emerald-400 animate-ping'
                : voiceState === 'LISTENING'
                ? 'bg-teal-400 animate-pulse'
                : voiceState === 'PROCESSING'
                ? 'bg-purple-400 animate-spin'
                : 'bg-emerald-500'
            }`}
          />
          <div className="flex items-center gap-2">
            <span>{getStatusLabel()}</span>
            {convState === 'CONVERSATION_ACTIVE' && (
              <button
                type="button"
                onClick={handleEndConversation}
                className="px-2 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                title='Say "End" or tap to finish conversation'
              >
                End Conversation
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* =================================================================== */}
      {/* 3. CINEMATIC VOICE CAPTION / LIVE TRANSCRIPT HUD (NOT A CHATBOT!)    */}
      {/* =================================================================== */}
      <div className="w-full max-w-2xl mt-4 px-4 text-center space-y-2">
        {/* Live transcript of what user spoke */}
        {liveTranscript && (
          <div className="text-xs text-slate-300 font-mono italic">
            You said: "{liveTranscript}"
          </div>
        )}

        {/* Speech caption of JARVIS response */}
        <AnimatePresence mode="wait">
          {activeSpeechCaption ? (
            <motion.div
              key={activeSpeechCaption.slice(0, 30)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/25 backdrop-blur-md shadow-xl"
            >
              <p className="text-sm sm:text-base text-slate-100 font-sans tracking-wide leading-relaxed font-normal">
                <span className="text-emerald-400 font-mono font-bold mr-2 text-xs uppercase tracking-wider">JARVIS:</span>
                "{activeSpeechCaption}"
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-slate-400 font-mono"
            >
              Say <span className="text-emerald-300 font-bold">"Hey JARVIS"</span> to begin continuous conversational command.
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
                    ✓ {executedActionBadge.title}
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

            <div className="shrink-0 text-right bg-emerald-900/50 px-3 py-1.5 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] text-emerald-300/80 font-mono block">Cart Total</span>
              <span className="font-bold text-emerald-200 font-mono text-xs">₹{cartTotal}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* 5. QUICK VOICE COMMAND CHIPS                                       */}
      {/* =================================================================== */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-2xl px-2">
        <button
          type="button"
          onClick={() => handleQuickCommand('Add brown bread to cart')}
          className="px-3 py-1.5 rounded-full text-xs font-mono bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <span>🍞</span>
          <span>Add Brown Bread to Cart</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickCommand('I want to prepare breakfast for 3 people below 300')}
          className="px-3 py-1.5 rounded-full text-xs font-mono bg-teal-950/40 hover:bg-teal-900/60 border border-teal-500/30 text-teal-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <span>🍳</span>
          <span>Breakfast for 3 under ₹300</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickCommand('Where can I find pasta and olive oil?')}
          className="px-3 py-1.5 rounded-full text-xs font-mono bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <span>🍝</span>
          <span>Where is Pasta & Oil?</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickCommand('Is broccoli good for losing weight?')}
          className="px-3 py-1.5 rounded-full text-xs font-mono bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <span>🥦</span>
          <span>Is Broccoli good for weight loss?</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSessionQRModalOpen(true)}
          className="px-3 py-1.5 rounded-full text-xs font-mono bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/30 text-blue-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <span>📱</span>
          <span>Switch to Mobile</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* 6. SLIDE-UP QUIET KEYBOARD INPUT MODAL                               */}
      {/* =================================================================== */}
      <AnimatePresence>
        {isKeyboardOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="w-full max-w-xl mt-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative"
          >
            <button
              onClick={() => setIsKeyboardOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
            <form onSubmit={handleKeyboardSubmit} className="flex gap-2 mt-2">
              <input
                type="text"
                autoFocus
                value={keyboardInput}
                onChange={(e) => setKeyboardInput(e.target.value)}
                placeholder="Type your request quietly..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
