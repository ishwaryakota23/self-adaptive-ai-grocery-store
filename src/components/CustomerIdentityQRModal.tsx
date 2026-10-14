import React, { useState, useEffect } from 'react';
import { X, QrCode, Smartphone, Copy, Check, Mail, MessageSquare, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { qrService } from '../services/qrService';

export const CustomerIdentityQRModal: React.FC = () => {
  const { isCustomerIdentityQRModalOpen, setIsCustomerIdentityQRModalOpen, currentCustomer, customerIdentityToken } = useApp();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  if (!isCustomerIdentityQRModalOpen || !currentCustomer) return null;

  const qrToken = customerIdentityToken?.secure_token || `CID_SEC_${currentCustomer.customer_id}_VERIFIED`;
  const qrPayload = customerIdentityToken?.qr_payload || JSON.stringify({
    t: 'CID',
    cid: currentCustomer.customer_id,
    tok: qrToken,
    st: 'BRANCH-104',
    iat: Date.now()
  });

  useEffect(() => {
    let active = true;
    const tokenRec = customerIdentityToken || {
      token_id: `tok-${Date.now()}`,
      customer_id: currentCustomer.customer_id,
      secure_token: qrToken,
      qr_payload: qrPayload,
      status: 'active' as const,
      delivered_via_whatsapp: true,
      delivered_via_email: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    qrService.generateCustomerIdentityQR(tokenRec)
      .then(res => {
        if (active) setQrDataUrl(res.dataUrl);
      })
      .catch(err => {
        console.warn('Failed to generate Customer Identity QR:', err);
      });

    return () => { active = false; };
  }, [customerIdentityToken, currentCustomer.customer_id, qrToken, qrPayload]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-white space-y-6">
        {/* Close Button */}
        <button
          onClick={() => setIsCustomerIdentityQRModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Permanent Customer Identity</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Customer Identity QR
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Delivered to your registered email. Scan at any kiosk upon arrival to begin shopping.
          </p>
        </div>

        {/* Customer Profile Pill */}
        <div className="flex items-center justify-between bg-slate-950 px-4 py-3 rounded-2xl border border-slate-800 text-xs">
          <div>
            <div className="font-bold text-white text-sm">{currentCustomer.name}</div>
            <div className="text-slate-400 font-mono text-[11px]">{currentCustomer.email || currentCustomer.whatsapp_number}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Verified Shopper
            </span>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{currentCustomer.customer_id}</div>
          </div>
        </div>

        {/* Real High-Contrast QR Code */}
        <div className="bg-white p-6 rounded-2xl flex flex-col items-center justify-center shadow-lg relative group">
          <div className="w-48 h-48 relative flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Customer Identity QR"
                className="w-48 h-48 object-contain rounded-lg"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-900 font-mono text-xs">
                Generating QR...
              </div>
            )}
          </div>
          <span className="mt-3 text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
            Permanent Identity Key
          </span>
        </div>

        {/* Email Communication Gateway Notice */}
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3 flex items-center gap-3 text-xs text-emerald-300">
          <Mail className="w-5 h-5 shrink-0 text-emerald-400" />
          <p className="text-[11px] leading-relaxed">
            {currentCustomer.email
              ? `Delivered to ${currentCustomer.email}. Scan at any kiosk to resume your profile and past preferences.`
              : 'Delivered to your registered contact channel. Scan at any kiosk to identify yourself.'}
          </p>
        </div>

        {/* Copy Token Button */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'QR Payload Copied!' : 'Copy Identity Token'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
