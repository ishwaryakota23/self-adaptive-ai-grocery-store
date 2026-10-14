import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  X,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { sessionSyncService } from '../services/sessionSyncService';
import { fetchDetectedLanOrigin } from '../services/sessionHandoffService';
import { qrService } from '../services/qrService';

interface QRSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRSessionModal: React.FC<QRSessionModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, currentCustomer, customerIdentityToken, activeShoppingSession } = useApp();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrAttempt, setQrAttempt] = useState(0);
  const [lanIp, setLanIp] = useState<string | null>(null);
  const [useLanIp, setUseLanIp] = useState(true);
  const [handoffData, setHandoffData] = useState<{
    mobileUrl: string;
    token: string;
    expiresInMins: number;
  } | null>(null);

  const sessionId = activeShoppingSession?.session_id || currentUser.id;
  const customerId = currentCustomer?.customer_id || 'GUEST';

  // Detect local network IP for real physical phone scanning
  useEffect(() => {
    fetch('/api/network-ip')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.lanIp && d.lanIp !== 'localhost') {
          setLanIp(d.lanIp);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setQrDataUrl(null);
    setQrError(null);
    setHandoffData(null);
    if (isOpen) {
      void (async () => {
      try {
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        const currentUrl = new URL(currentOrigin);
        const effectiveOrigin = (useLanIp && lanIp)
          ? `${currentUrl.protocol}//${lanIp}${currentUrl.port ? `:${currentUrl.port}` : ''}`
          : currentOrigin;

        const activeSessionId = sessionId;
        const activeSession = db.getShoppingSession(activeSessionId);
        if (!activeSession || activeSession.status !== 'active') {
          throw new Error('There is no active shopping session to hand off. Start shopping and retry.');
        }

        if (!currentCustomer || !customerIdentityToken?.secure_token) {
          throw new Error('A verified customer identity is required to create a mobile companion pass. Sign in again and retry.');
        }

        // A QR is rendered only after the server persists an expiring handoff.
        // A browser-local token cannot be validated by the phone or shared API.
        const generated = await sessionSyncService.createHandoff({
          sessionId: activeSessionId,
          customerId: currentCustomer.customer_id,
          identityToken: customerIdentityToken.secure_token,
          cart: db.getCart(activeSessionId),
          clientOrigin: effectiveOrigin
        });
        if (!generated.handoff?.secure_token || !generated.mobileUrl) {
          throw new Error('The server did not return a secure session pass. Check Supabase session-sync configuration and retry.');
        }
        const mobileUrlObj = new URL(generated.mobileUrl);
        if (mobileUrlObj.searchParams.get('session_token') !== generated.handoff.secure_token) {
          throw new Error('The generated mobile URL does not contain its matching server-issued session token. Retry the QR.');
        }
        setHandoffData({
          mobileUrl: mobileUrlObj.toString(),
          token: generated.handoff.secure_token,
          expiresInMins: 120
        });

        qrService.generateSessionQR({ ...generated.handoff, qr_payload: mobileUrlObj.toString() })
          .then(res => {
            if (active) setQrDataUrl(res.dataUrl);
          })
          .catch(e => {
            console.warn('Failed to render real Session QR:', e);
            if (active) setQrError(e?.message || 'Could not render this session QR. Please retry.');
          });
      } catch (e) {
        console.warn('Failed to generate session handoff QR:', e);
        setQrError(e instanceof Error ? e.message : 'Could not create this session QR. Please retry.');
      }
      })();
    }
    return () => { active = false; };
  }, [isOpen, sessionId, customerId, currentCustomer, customerIdentityToken?.secure_token, lanIp, useLanIp, qrAttempt]);

  // Reactive listener: When mobile companion consumes handoff, immediately close modal & reset kiosk
  useEffect(() => {
    if (!isOpen || !handoffData?.token) return;

    const checkHandoffStatus = () => {
      const currentHandoff = db.getSessionHandoff(handoffData.token);
      if (currentHandoff && currentHandoff.status === 'used') {
        onClose();
      }
    };

    checkHandoffStatus();
    const unsub = db.subscribe(checkHandoffStatus);
    return unsub;
  }, [isOpen, handoffData?.token, onClose]);

  if (!isOpen) return null;

  const mobileUrl = handoffData?.mobileUrl || '';

  const handleCopy = () => {
    if (!mobileUrl) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenCompanion = () => {
    if (!mobileUrl || !handoffData?.token) return;
    window.open(mobileUrl, '_blank', 'width=420,height=820,menubar=no,toolbar=no,location=no');
    onClose();
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
            <span>Temporary Visit Handoff</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Continue on Mobile
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Scan with your phone to take your active cart, store navigation, and AI assistant into the aisles.
          </p>
        </div>

        {/* Session ID Pill & Validity */}
        <div className="flex items-center justify-between bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400">Session:</span>
            <span className="font-mono font-bold text-xs text-emerald-400">{sessionId}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Valid 2h</span>
          </div>
        </div>

        {/* Network IP mode indicator & toggle */}
        {lanIp && (
          <div className="flex items-center justify-between bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800 text-[11px]">
            <span className="text-slate-400">Scan Target:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setUseLanIp(true)}
                className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                  useLanIp ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Phone Wi-Fi ({lanIp})
              </button>
              <button
                onClick={() => setUseLanIp(false)}
                className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                  !useLanIp ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Localhost
              </button>
            </div>
          </div>
        )}

        {/* Real Scannable QR Code Container */}
        <div className="bg-white p-6 rounded-2xl flex flex-col items-center justify-center shadow-lg relative group">
          <div className="w-48 h-48 relative flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Session Handoff QR"
                className="w-48 h-48 object-contain rounded-lg"
              />
            ) : qrError ? (
              <div className="w-48 h-48 flex flex-col items-center justify-center gap-3 px-3 text-center text-rose-700">
                <span className="text-xs">{qrError}</span>
                <button onClick={() => setQrAttempt(attempt => attempt + 1)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Retry QR</button>
              </div>
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-900 font-mono text-xs">
                Generating QR...
              </div>
            )}
          </div>
          <span className="mt-3 text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
            In-Store Session Handoff
          </span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleOpenCompanion}
            disabled={!handoffData?.token || !qrDataUrl}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-2xl text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Mobile Companion in New Tab</span>
          </button>

          <button
            onClick={handleCopy}
            disabled={!handoffData?.token}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 font-semibold rounded-2xl text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Handoff Link Copied!' : 'Copy Mobile Link'}</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-slate-500 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80 flex-shrink-0" />
            <span>Single-use kiosk screen pass • Never emailed • Burns on connect</span>
          </div>
        </div>
      </div>
    </div>
  );
};
