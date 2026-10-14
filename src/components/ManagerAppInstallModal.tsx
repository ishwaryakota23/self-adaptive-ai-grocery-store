import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Smartphone,
  Download,
  Share2,
  CheckCircle2,
  Radio,
  Car,
  Building,
  Sparkles,
  ExternalLink,
  Copy
} from 'lucide-react';
import { managerService } from '../services/managerService';

interface ManagerAppInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManagerAppInstallModal: React.FC<ManagerAppInstallModalProps> = ({
  isOpen,
  onClose
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [mobileUrl, setMobileUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchUrlAndGenQR = async () => {
      let targetUrl = `${window.location.origin}/manager/mobile`;

      try {
        const res = await fetch('/api/network-ip');
        if (res.ok) {
          const data = await res.json();
          if (data?.mobileUrlBase && data.lanIp !== 'localhost') {
            targetUrl = `${data.mobileUrlBase}/manager/mobile`;
          }
        }
      } catch {
        // Fallback to origin
      }

      setMobileUrl(targetUrl);

      try {
        const qr = await QRCode.toDataURL(targetUrl, {
          width: 320,
          margin: 1.5,
          color: {
            dark: '#020617',
            light: '#ffffff'
          }
        });
        setQrDataUrl(qr);
      } catch (e) {
        console.error('Failed to generate QR:', e);
      }
    };

    fetchUrlAndGenQR();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <Smartphone className="w-3.5 h-3.5" />
            <span>INSTALL STANDALONE MANAGER APP</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Install to Mobile Phone
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Scan this QR code with your phone camera to install the Manager Sentinel application directly to your home screen.
          </p>
        </div>

        {/* QR Code Frame */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="p-3 bg-white rounded-3xl shadow-2xl border-4 border-cyan-500/40">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Manager Mobile App QR"
                className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl object-contain"
              />
            ) : (
              <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-slate-400 text-xs font-mono">
                Generating QR...
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 max-w-xs w-full">
            <input
              type="text"
              readOnly
              value={mobileUrl}
              className="flex-1 bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 rounded-xl px-2.5 py-1.5 outline-none"
            />
            <button
              onClick={handleCopy}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
              title="Copy link"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Installation Instructions for Android & iOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>🤖 Android (Chrome)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              1. Open camera & scan QR code<br />
              2. Tap top-right <strong>⋮ (Menu)</strong><br />
              3. Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <span>🍏 iPhone (Safari)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              1. Open camera & scan QR code<br />
              2. Tap Safari <strong>Share icon (⎋)</strong><br />
              3. Tap <strong>"Add to Home Screen"</strong>
            </p>
          </div>
        </div>

        {/* Presence Policy Notice (Requirement) */}
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-400">
            <Radio className="w-3.5 h-3.5" />
            <span>Strict Presence Policy:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-300/90">
            Once installed, opening the mobile app logs you in automatically. However, your presence status remains <strong>ON-THE-GO / REMOTE STANDBY (NOT ACTIVE)</strong>. The <strong>ACTIVE ONLINE 🟢</strong> status is only enabled when you are logged in on the desktop computer in front of the system.
          </p>
        </div>

        {/* Direct Open Button (for local desktop preview) */}
        <div className="pt-1 flex gap-2">
          <button
            onClick={() => {
              onClose();
              window.open('/manager/mobile', '_blank');
            }}
            className="flex-1 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Mobile App View in New Tab</span>
          </button>
        </div>
      </div>
    </div>
  );
};
