import React from 'react';
import {
  BrainCircuit,
  Sparkles,
  TrendingDown,
  Clock,
  Layers,
  CheckCircle2,
  ArrowRight,
  Database,
  History,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';
import { db } from '../services/db';

export const StoreMemoryPage: React.FC = () => {
  const storeMemories = db.getStoreMemories();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-950 text-white">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              Store Collective Memory & Learned Policies
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30">
                Screen 16
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Long-term experiential memory retained by the Store Agent to prevent bottlenecks and stockouts
            </p>
          </div>

          <div className="flex items-center gap-2 bg-purple-950/40 border border-purple-500/30 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-purple-300">
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Hindsight Knowledge Engine</span>
          </div>
        </div>

        {/* Hindsight Architectural Separation Callout (Section 28 & 38) */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between text-xs text-slate-400">
          <span>
            <strong className="text-emerald-400">Hindsight Memory Boundary: </strong>
            Transactional tables (sales, inventory) store operational state. Hindsight preserves cross-week semantic rules learned from operational actions.
          </span>
          <span className="text-purple-400 font-mono font-bold text-[11px] shrink-0 ml-4">
            EPISODIC GRAPH ACTIVE
          </span>
        </div>

        {/* Store Memory Cards (Matching Screen 16) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {storeMemories.map((mem) => (
            <div
              key={mem.id}
              className="bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-3xl p-6 transition-all shadow-xl space-y-4 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                  {mem.type.replace('_', ' ')}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Confidence: {(mem.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                  {mem.title}
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  <strong className="text-slate-400">Observed: </strong>{mem.observation}
                </p>
                <p className="text-xs text-rose-300 mt-1">
                  <strong className="text-slate-400">Consequence: </strong>{mem.consequence}
                </p>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Autonomous Policy Learned:
                </span>
                <p className="text-slate-200 font-medium">{mem.learned_rule}</p>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Recorded: {mem.recorded_at.split('T')[0]}</span>
                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Synced in Hindsight
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
