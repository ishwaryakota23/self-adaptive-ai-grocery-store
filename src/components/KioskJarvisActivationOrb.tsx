import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BrainCircuit, CheckCircle2, Volume2 } from 'lucide-react';
import { voiceService } from '../services/voiceService.js';

interface KioskJarvisActivationOrbProps {
  kioskNumber?: number;
  message?: string;
  onComplete: () => void;
}

export const KioskJarvisActivationOrb: React.FC<KioskJarvisActivationOrbProps> = ({
  kioskNumber = 3,
  message = 'Kiosk 3 is active. You can use it.',
  onComplete
}) => {
  const [hasStartedSpeech, setHasStartedSpeech] = useState(false);
  const [speechFinished, setSpeechFinished] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0.7);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const completionTriggeredRef = useRef(false);

  const triggerCompletionOnce = () => {
    if (completionTriggeredRef.current) return;
    completionTriggeredRef.current = true;
    setSpeechFinished(true);
    // Smooth transition delay to allow audio completion and visual fade
    setTimeout(() => {
      onComplete();
    }, 600);
  };

  useEffect(() => {
    // 1. Play startup chime sound
    try {
      voiceService.playAudioChime(660);
    } catch (e) {}

    // 2. Animate audio waveform
    const waveInterval = setInterval(() => {
      setAudioLevel(0.4 + Math.random() * 0.6);
    }, 120);

    // 3. Synthesize JARVIS Speech: "Kiosk 3 is active. You can use it."
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any pending utterances
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      // Pick a natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Daniel') || v.name.includes('David')) && v.lang.startsWith('en'));
      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onstart = () => {
        setHasStartedSpeech(true);
      };

      utterance.onend = () => {
        triggerCompletionOnce();
      };

      utterance.onerror = () => {
        // Fallback safely if browser speech was blocked
        triggerCompletionOnce();
      };

      speechUtteranceRef.current = utterance;
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        triggerCompletionOnce();
      }
    }

    // Safety fallback timer: auto-complete after 3.8s in case speech synthesis is blocked or silent
    const fallbackTimer = setTimeout(() => {
      triggerCompletionOnce();
    }, 3800);

    return () => {
      clearInterval(waveInterval);
      clearTimeout(fallbackTimer);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [message]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center selection:bg-cyan-500 selection:text-slate-950 animate-fade-in overflow-hidden">
      {/* Background Holographic Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/40 via-slate-950/80 to-slate-950 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Top Banner Tag */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold uppercase tracking-widest shadow-xl"
      >
        <Sparkles className="w-4 h-4 text-cyan-400 animate-spin-slow" />
        <span>REMOTE MANAGER AUTHORIZATION DETECTED</span>
      </motion.div>

      {/* Center Holographic Reactor Orb */}
      <div className="relative z-10 w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center my-4 select-none">
        {/* Outer Halo Glow */}
        <motion.div
          animate={{ scale: [1, 1.28, 1], opacity: [0.45, 0.8, 0.45] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full blur-2xl pointer-events-none bg-cyan-400/40"
        />

        {/* SVG Holographic Reactor Rings */}
        <svg
          viewBox="0 0 300 300"
          className="w-full h-full relative z-10 pointer-events-none drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]"
        >
          <defs>
            <linearGradient id="kioskCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.85" />
            </linearGradient>

            <radialGradient id="kioskPlasmaCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6" />
              <stop offset="55%" stopColor="#083344" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.98" />
            </radialGradient>
          </defs>

          {/* RING 1: Telemetry ticks ring */}
          <motion.circle
            cx="150"
            cy="150"
            r="138"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1.5"
            strokeDasharray="3 10"
            opacity="0.65"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
            style={{ transformOrigin: '150px 150px' }}
          />

          {/* Telemetry Dots */}
          <circle cx="150" cy="12" r="3.5" fill="#22d3ee" />
          <circle cx="288" cy="150" r="3.5" fill="#22d3ee" />
          <circle cx="150" cy="288" r="3.5" fill="#22d3ee" />
          <circle cx="12" cy="150" r="3.5" fill="#22d3ee" />

          {/* RING 2: Middle Gyroscopic Segmented Arcs */}
          <motion.circle
            cx="150"
            cy="150"
            r="122"
            fill="none"
            stroke="url(#kioskCyanGrad)"
            strokeWidth="4"
            strokeDasharray="75 25 110 20 40 30"
            strokeLinecap="round"
            animate={{ rotate: -360, strokeWidth: [3.5, 5.5, 3.5] }}
            transition={{
              rotate: { repeat: Infinity, duration: 16, ease: 'linear' },
              strokeWidth: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }
            }}
            style={{ transformOrigin: '150px 150px' }}
          />

          {/* RING 3: Concentric Internal Arcs */}
          <motion.circle
            cx="150"
            cy="150"
            r="104"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeDasharray="50 30 70 40"
            strokeLinecap="round"
            opacity="0.85"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 22, ease: 'linear' }}
            style={{ transformOrigin: '150px 150px' }}
          />

          {/* RING 4: Reactive Sonic Waveform Circle */}
          <motion.circle
            cx="150"
            cy="150"
            r={88 + audioLevel * 10}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="12 6"
            opacity="0.75"
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 26, ease: 'linear' }}
            style={{ transformOrigin: '150px 150px' }}
          />

          {/* Inner Plasma Core Sphere */}
          <circle
            cx="150"
            cy="150"
            r="72"
            fill="url(#kioskPlasmaCore)"
            stroke="#22d3ee"
            strokeWidth="2.5"
          />
        </svg>

        {/* Central JARVIS Symbol */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/30"
          >
            <BrainCircuit className="w-8 h-8 text-cyan-300 animate-pulse" />
          </motion.div>
          <span className="mt-2 text-[10px] font-mono font-bold tracking-widest text-cyan-300 uppercase">
            JARVIS
          </span>
        </div>
      </div>

      {/* Voice Announcement Caption */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="relative z-10 max-w-lg mx-auto space-y-3 mt-4"
      >
        <div className="flex items-center justify-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
          <Volume2 className="w-4 h-4 animate-bounce" />
          <span>Speaking Activation Notice</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-snug">
          &ldquo;{message}&rdquo;
        </h2>

        <p className="text-xs text-slate-400 font-mono">
          Terminal Status: <strong className="text-emerald-400 font-bold">ACTIVE</strong> • Routing to Shopper Welcome Screen...
        </p>
      </motion.div>

      {/* Progress Line */}
      <div className="relative z-10 w-64 h-1 bg-slate-800 rounded-full mt-8 overflow-hidden">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 3.5, ease: 'easeInOut' }}
          className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400"
        />
      </div>

      {/* Manual Continue Button fallback */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        type="button"
        onClick={triggerCompletionOnce}
        className="relative z-10 mt-6 px-5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-all cursor-pointer flex items-center gap-2"
      >
        <span>Continue to Welcome Page</span>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      </motion.button>
    </div>
  );
};
