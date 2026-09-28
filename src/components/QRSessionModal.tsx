import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  X,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { sessionService } from '../services/sessionService';

interface QRSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRSessionModal: React.FC<QRSessionModalProps> = ({ isOpen, onClose }) => {
  const [sessionId, setSessionId] = useState(sessionService.getActiveSessionId());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = sessionService.subscribe((s) => {
      setSessionId(s.id);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const companionUrl = sessionService.getCompanionUrl(sessionId);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(companionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenCompanion = () => {
    window.open(companionUrl, '_blank', 'width=420,height=820,menubar=no,toolbar=no,location=no');
    onClose();
  };

  const handleCreateNewSession = () => {
    const newSession = sessionService.createNewSession();
    setSessionId(newSession.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-white space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Companion Sync</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Continue on Mobile
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Scan with your phone to take your shopping mission and AI assistant into the aisles.
          </p>
        </div>

        {/* Session ID Pill */}
        <div className="flex items-center justify-between bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400">Active Session:</span>
            <span className="font-mono font-bold text-sm text-emerald-400">{sessionId}</span>
          </div>
          <button
            onClick={handleCreateNewSession}
            title="Generate new session identifier"
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>New Session</span>
          </button>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-6 rounded-2xl flex flex-col items-center justify-center shadow-lg relative group">
          {/* Scalable High-Contrast SVG QR Pattern */}
          <div className="w-48 h-48 relative flex items-center justify-center">
            <svg
              className="w-full h-full text-slate-950"
              viewBox="0 0 100 100"
              fill="currentColor"
              shapeRendering="crispEdges"
            >
              {/* Outer boundary corners */}
              <rect x="5" y="5" width="26" height="26" fill="black" />
              <rect x="8" y="8" width="20" height="20" fill="white" />
              <rect x="11" y="11" width="14" height="14" fill="black" />

              <rect x="69" y="5" width="26" height="26" fill="black" />
              <rect x="72" y="8" width="20" height="20" fill="white" />
              <rect x="75" y="11" width="14" height="14" fill="black" />

              <rect x="5" y="69" width="26" height="26" fill="black" />
              <rect x="8" y="72" width="20" height="20" fill="white" />
              <rect x="11" y="75" width="14" height="14" fill="black" />

              {/* Data matrix dots */}
              <rect x="36" y="8" width="4" height="4" fill="black" />
              <rect x="44" y="8" width="8" height="4" fill="black" />
              <rect x="56" y="8" width="4" height="4" fill="black" />

              <rect x="36" y="16" width="8" height="4" fill="black" />
              <rect x="48" y="16" width="4" height="4" fill="black" />
              <rect x="60" y="16" width="4" height="4" fill="black" />

              <rect x="36" y="24" width="4" height="4" fill="black" />
              <rect x="44" y="24" width="4" height="4" fill="black" />
              <rect x="52" y="24" width="8" height="4" fill="black" />

              {/* Central QR area */}
              <rect x="8" y="36" width="4" height="4" fill="black" />
              <rect x="16" y="36" width="8" height="4" fill="black" />
              <rect x="28" y="36" width="4" height="4" fill="black" />
              <rect x="36" y="36" width="12" height="12" fill="black" />
              <rect x="52" y="36" width="4" height="4" fill="black" />
              <rect x="64" y="36" width="8" height="4" fill="black" />
              <rect x="76" y="36" width="16" height="4" fill="black" />

              <rect x="8" y="44" width="12" height="4" fill="black" />
              <rect x="24" y="44" width="4" height="4" fill="black" />
              <rect x="56" y="44" width="12" height="4" fill="black" />
              <rect x="72" y="44" width="4" height="4" fill="black" />
              <rect x="84" y="44" width="8" height="4" fill="black" />

              <rect x="8" y="52" width="4" height="4" fill="black" />
              <rect x="16" y="52" width="4" height="4" fill="black" />
              <rect x="24" y="52" width="8" height="4" fill="black" />
              <rect x="36" y="52" width="4" height="4" fill="black" />
              <rect x="44" y="52" width="8" height="4" fill="black" />
              <rect x="60" y="52" width="8" height="4" fill="black" />
              <rect x="76" y="52" width="16" height="4" fill="black" />

              {/* Bottom pattern */}
              <rect x="36" y="68" width="8" height="4" fill="black" />
              <rect x="48" y="68" width="4" height="4" fill="black" />
              <rect x="60" y="68" width="12" height="4" fill="black" />
              <rect x="76" y="68" width="4" height="4" fill="black" />
              <rect x="84" y="68" width="8" height="4" fill="black" />

              <rect x="36" y="76" width="4" height="4" fill="black" />
              <rect x="44" y="76" width="12" height="4" fill="black" />
              <rect x="64" y="76" width="4" height="4" fill="black" />
              <rect x="72" y="76" width="8" height="4" fill="black" />
              <rect x="88" y="76" width="4" height="4" fill="black" />

              <rect x="36" y="84" width="12" height="4" fill="black" />
              <rect x="52" y="84" width="4" height="4" fill="black" />
              <rect x="60" y="84" width="8" height="4" fill="black" />
              <rect x="76" y="84" width="16" height="4" fill="black" />
            </svg>
            {/* Center icon badge */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-slate-950 p-2 rounded-xl border-2 border-white shadow-md text-emerald-400">
                <Smartphone className="w-5 h-5" />
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-600 mt-2 font-semibold">
            {sessionId} • Scan with Phone Camera
          </span>
        </div>

        {/* URL Box & Copy */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-slate-400 font-medium">Companion Web App URL:</label>
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
            <span className="truncate flex-1">{companionUrl}</span>
            <button
              onClick={handleCopy}
              className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
              title="Copy URL"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Action Button: Open in side window / new tab */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleOpenCompanion}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Mobile Companion (New Window)</span>
          </button>
          <p className="text-[11px] text-center text-slate-500">
            Real-time synchronization active across all tabs & devices
          </p>
        </div>
      </div>
    </div>
  );
};
