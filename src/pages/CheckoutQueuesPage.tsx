import React, { useState } from 'react';
import {
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  Video,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';

export const CheckoutQueuesPage: React.FC = () => {
  const { checkoutQueues, openCounter, approveRecommendation, aiRecommendations } = useApp();
  const [openedToast, setOpenedToast] = useState(false);

  const counter4 = checkoutQueues.find(q => q.counter_number === 4);
  const counter3 = checkoutQueues.find(q => q.counter_number === 3);
  const isCongested = counter3 && counter3.customer_count >= 6;
  const isCounter4Open = counter4 && counter4.status === 'open';

  const handleOpenCounter4 = () => {
    openCounter(4);
    // Also approve queue recommendation if exists
    const queueRec = aiRecommendations.find(r => r.type === 'open_counter');
    if (queueRec) {
      approveRecommendation(queueRec.id);
    }
    setOpenedToast(true);
    setTimeout(() => setOpenedToast(false), 2500);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-950 text-white">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto">
        {/* Header (Matching Screen 15) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              Live Checkout Queue Monitoring
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30">
                Screen 15
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Physical counter vision sensors, queue dwell time estimates, and automated load balancing
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{checkoutQueues.filter(q => q.status === 'open').length} Active Counters</span>
          </div>
        </div>

        {/* Congestion Alert Banner (Screen 15) */}
        {isCongested && !isCounter4Open && (
          <div className="bg-gradient-to-r from-rose-950/70 via-slate-900 to-rose-950/70 border border-rose-500/40 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                  AI Autonomous Bottleneck Alert
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Checkout congestion detected at Counter 3
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  8 customers in line (~7 mins wait time). Recommendation: Open Counter 4 immediately.
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenCounter4}
              className="px-6 py-3 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-xl shadow-rose-500/25 flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Counter 4</span>
            </button>
          </div>
        )}

        {openedToast && (
          <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 p-4 rounded-2xl text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Counter 4 is now OPEN! Express cashier assigned. Wait times dropped across all lines.</span>
          </div>
        )}

        {/* 4 Counter Cards (Matching Screen 15) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {checkoutQueues.map((q) => {
            const isCounterCongested = q.status === 'congested';
            const isOpen = q.status === 'open';

            return (
              <div
                key={q.id}
                className={`p-6 rounded-3xl border transition-all shadow-xl space-y-4 ${
                  isCounterCongested
                    ? 'bg-rose-950/20 border-rose-500/50 shadow-rose-500/10'
                    : isOpen
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-slate-900/50 border-slate-800/60 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-white">Counter {q.counter_number}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isCounterCongested
                        ? 'bg-rose-500 text-white'
                        : isOpen
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {q.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">{q.customer_count}</span>
                    <span className="text-xs text-slate-400 font-medium">customers</span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    ~{q.estimated_wait_mins} mins wait
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
                  <span>Cashier:</span>
                  <strong className="text-slate-200">{q.operator_name || 'Standby'}</strong>
                </div>

                {q.counter_number === 4 && !isOpen && (
                  <button
                    onClick={handleOpenCounter4}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
                  >
                    Open Counter 4 Now
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Live CCTV Video Preview Thumbnail (Screen 15) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Front Checkout Optical Cameras</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">CAM-FRONT-01 • 30 FPS</span>
          </div>

          <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
            <img
              src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200&auto=format&fit=crop&q=80"
              alt="Live Checkout Queue Camera"
              className="w-full h-full object-cover filter contrast-125"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />

            <div className="absolute top-3 left-3 bg-rose-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              LIVE TELEMETRY
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-300 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800">
              <span>Computer vision queue length estimator: 15 shoppers detected</span>
              <span className="text-emerald-400 font-semibold">Optical accuracy: 99.4%</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
