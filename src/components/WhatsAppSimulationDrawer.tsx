import React, { useState, useEffect } from 'react';
import { MessageSquare, X, CheckCheck, Smartphone, QrCode, ExternalLink } from 'lucide-react';
import { customerIdentityService, WhatsAppMessage } from '../services/customerIdentityService';

export const WhatsAppSimulationDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const update = () => {
      const msgs = customerIdentityService.getSimulatedWhatsAppMessages();
      setMessages(msgs);
    };

    update();
    const unsub = customerIdentityService.subscribe(update);
    return unsub;
  }, []);

  // Increase unread count when new messages arrive and drawer is closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      setUnreadCount(prev => prev + 1);
    }
  }, [messages.length]);

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  return (
    <>
      {/* Floating WhatsApp trigger button */}
      <button
        onClick={handleOpen}
        title="Open Simulated WhatsApp Business Chat"
        className="fixed bottom-5 left-5 z-40 bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-full shadow-2xl flex items-center gap-2 border border-emerald-400/30 transition-all transform hover:scale-105 cursor-pointer"
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5 fill-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
              {unreadCount}
            </span>
          )}
        </div>
        <span className="text-xs font-semibold hidden md:inline">WhatsApp Business</span>
      </button>

      {/* Simulated WhatsApp Phone Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-start sm:justify-start sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b141a] text-[#e9edef] w-full sm:w-[380px] h-[85vh] sm:h-[620px] rounded-t-3xl sm:rounded-3xl border border-emerald-900/40 shadow-2xl flex flex-col overflow-hidden relative">
            {/* WhatsApp Header */}
            <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-[#222e35]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-sm">
                  G
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white leading-tight flex items-center gap-1.5">
                    GrocerAI Official
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                      Verified
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#8696a0]">WhatsApp Business Account</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-[#8696a0] hover:text-white hover:bg-[#111b21] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#0b141a] text-xs">
              <div className="text-center my-2">
                <span className="bg-[#182229] text-[#8696a0] text-[10px] px-2.5 py-1 rounded-md border border-[#222e35]">
                  🔒 Messages are end-to-end encrypted
                </span>
              </div>

              {messages.length === 0 ? (
                <div className="text-center py-12 text-[#8696a0] space-y-2">
                  <Smartphone className="w-8 h-8 mx-auto opacity-40 text-emerald-500" />
                  <p className="text-xs">No WhatsApp messages yet.</p>
                  <p className="text-[11px] max-w-xs mx-auto">
                    When you request an OTP, register as a customer, or complete an order, simulated messages will appear here.
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="max-w-[85%] bg-[#005c4b] text-[#e9edef] p-3 rounded-2xl rounded-tl-sm space-y-2 shadow-md">
                    <div className="text-[10px] font-semibold text-emerald-200 uppercase tracking-wide">
                      {m.type === 'OTP' ? '🔐 Verification Code' : m.type === 'IDENTITY_QR' ? '🏷️ Customer Identity QR' : '🧾 Order Receipt'}
                    </div>
                    <p className="whitespace-pre-line text-xs text-white leading-relaxed">{m.text}</p>

                    {m.qr_payload && (
                      <div className="bg-white p-3 rounded-xl mt-2 text-slate-950 text-center">
                        <div className="text-[10px] font-bold text-slate-600 mb-1">CUSTOMER IDENTITY TOKEN</div>
                        <div className="font-mono text-[9px] bg-slate-100 p-1 rounded break-all border border-slate-300">
                          {m.qr_payload}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-200/80 pt-1">
                      <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="bg-[#202c33] px-3 py-2 text-[11px] text-[#8696a0] text-center border-t border-[#222e35]">
              Simulated GrocerAI WhatsApp Service (+91 8000 GROCER)
            </div>
          </div>
        </div>
      )}
    </>
  );
};
