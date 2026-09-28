import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitCommit,
  CheckCircle2,
  TrendingUp,
  BrainCircuit,
  Boxes,
  Clock,
  Sparkles,
  ArrowRight,
  Database,
  Layers,
  ArrowDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';

export const StoreActionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { actionOutcomes, operationalActions } = useApp();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-950 text-white">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 sm:p-8 space-y-8 overflow-y-auto">
        {/* Header (Matching Screen 14) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              Action → Re-Observe → Outcome Loop
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30">
                Screen 14
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Closed-loop autonomous adaptation: Verifying intervention outcomes and committing learned policies
            </p>
          </div>
        </div>

        {/* The 6-Stage Loop Diagram */}
        <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-xl space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            Autonomous Adaptation Architecture
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-bold text-white">
            <span className="px-3 py-1 bg-slate-800 rounded-xl border border-slate-700">1. OBSERVE</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            <span className="px-3 py-1 bg-slate-800 rounded-xl border border-slate-700">2. REMEMBER</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            <span className="px-3 py-1 bg-slate-800 rounded-xl border border-slate-700">3. REASON</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            <span className="px-3 py-1 bg-emerald-500 text-slate-950 rounded-xl shadow-md">4. ACT</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            <span className="px-3 py-1 bg-blue-600 text-white rounded-xl">5. RE-OBSERVE</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            <span className="px-3 py-1 bg-purple-600 text-white rounded-xl shadow-md">6. LEARN</span>
          </div>
        </div>

        {/* Action History Visual Timeline (Matching Screen 14) */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white">Action History & Outcome Records</h2>

          {actionOutcomes.map((outcome) => (
            <div
              key={outcome.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-xl font-bold text-white">{outcome.title}</h3>
                  <span className="text-xs text-slate-400 font-mono mt-0.5 block">{outcome.timestamp}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    {outcome.sales_delta}
                  </span>
                  <span className="text-xs font-bold text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-500/30">
                    {outcome.satisfaction_delta}
                  </span>
                </div>
              </div>

              {/* Vertical Connected Flow (Screen 14) */}
              <div className="space-y-6 relative pl-6 border-l-2 border-slate-800">
                {/* 1. Action Taken / Stocked */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">1. Action Dispatched & Restocked</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      {outcome.observed_event}
                    </p>
                  </div>
                </div>

                {/* 2. Re-Observation Metric */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">2. Store Re-Observed (Telemetry)</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      {outcome.reobserved_metric}
                    </p>
                  </div>
                </div>

                {/* 3. Customer Satisfaction Improved */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">3. Customer Satisfaction Improved</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      {outcome.outcome_summary}
                    </p>
                  </div>
                </div>

                {/* 4. Memory Recorded in Hindsight */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    4
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">4. Outcome Recorded in Memory</h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1">
                        <BrainCircuit className="w-3 h-3" />
                        Stored in Hindsight
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Policy Key: {outcome.hindsight_id || 'hs-store-mem-8842'} • Synced with Store Agent collective reasoning.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
