import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Layers,
  Coins,
  Clock,
  ArrowRight,
  Activity,
  Zap,
  Info
} from 'lucide-react';
import { hindsightEngine, AdaptiveExperienceTrace } from '../services/hindsightEngine';
import { AdaptationTrace } from './AdaptationTrace';

export const HindsightSimulationLab: React.FC = () => {
  const [selectedDomain, setSelectedDomain] = useState<'CUSTOMER' | 'STORE' | 'SECURITY'>('STORE');
  const domainTraces = hindsightEngine.getTracesByDomain(selectedDomain);
  const [selectedTraceId, setSelectedTraceId] = useState<string>(domainTraces[0]?.id || 'STORE_RESTOCK_CONVERGENCE');
  const [replayStep, setReplayStep] = useState<number>(4); // Default to full adaptive state (Step 4)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Sync selected trace if domain changes
  const handleDomainChange = (domain: 'CUSTOMER' | 'STORE' | 'SECURITY') => {
    setSelectedDomain(domain);
    const newTraces = hindsightEngine.getTracesByDomain(domain);
    if (newTraces.length > 0) {
      setSelectedTraceId(newTraces[0].id);
      setReplayStep(4);
    }
  };

  const currentTrace = hindsightEngine.getTraceById(selectedTraceId) || domainTraces[0];
  const metrics = hindsightEngine.getMetricsSummary();
  const activeMetrics = selectedDomain === 'CUSTOMER' ? metrics.customer : selectedDomain === 'STORE' ? metrics.store : metrics.security;

  const handleNextStep = () => {
    setReplayStep((prev) => Math.min(4, prev + 1));
  };

  const handleResetReplay = () => {
    setReplayStep(1);
  };

  const handlePlayAll = () => {
    setReplayStep(1);
    setIsPlaying(true);
    let step = 1;
    const interval = setInterval(() => {
      step++;
      setReplayStep(step);
      if (step >= 4) {
        clearInterval(interval);
        setIsPlaying(false);
      }
    }, 1200);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
      {/* Title & Domain Switcher */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/10">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-wide">
                Self-Adaptive Hindsight Replay Lab
              </h2>
              <span className="text-[10px] font-mono font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                Interactive Demonstration
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Demonstrating agent behavior changes: <span className="text-white font-medium">Experience → Outcome → Hindsight Gated → Changed Decision</span>
            </p>
          </div>
        </div>

        {/* Domain Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => handleDomainChange('CUSTOMER')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedDomain === 'CUSTOMER'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Customer Agent</span>
          </button>
          <button
            onClick={() => handleDomainChange('STORE')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedDomain === 'STORE'
                ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Store Agent</span>
          </button>
          <button
            onClick={() => handleDomainChange('SECURITY')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedDomain === 'SECURITY'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Security Agent</span>
          </button>
        </div>
      </div>

      {/* Scenario Selector & Replay Controls */}
      <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Scenario Select */}
        <div className="flex-1 w-full md:w-auto">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Select Adaptive Scenario To Replay:
          </label>
          <select
            value={selectedTraceId}
            onChange={(e) => {
              setSelectedTraceId(e.target.value);
              setReplayStep(4);
            }}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {domainTraces.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Step-by-Step Progression Controller */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleResetReplay}
            title="Reset to Step 1"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={handlePlayAll}
            disabled={isPlaying}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`} />
            <span>{isPlaying ? 'Replaying...' : 'Auto-Replay Lifecycle'}</span>
          </button>
          <button
            onClick={handleNextStep}
            disabled={replayStep >= 4 || isPlaying}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
          >
            <span>Next Step ({replayStep}/4)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Step Replay Indicator Bar */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        {[
          { num: 1, label: 'Past Experience', desc: 'Initial baseline decision' },
          { num: 2, label: 'Actual Outcome', desc: 'Human / Sensor feedback' },
          { num: 3, label: 'Hindsight Retained', desc: 'Gated lesson preserved' },
          { num: 4, label: 'Current Decision', desc: 'Behavior & Policy changed' }
        ].map((s) => {
          const isActive = replayStep >= s.num;
          const isCurrent = replayStep === s.num;
          return (
            <div
              key={s.num}
              onClick={() => setReplayStep(s.num)}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                isCurrent
                  ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                  : isActive
                  ? 'bg-slate-950 border-slate-800 text-slate-300'
                  : 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-60'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <span className={`w-4 h-4 rounded-full text-[10px] font-mono flex items-center justify-center font-bold ${
                  isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
                }`}>
                  {s.num}
                </span>
                <span className="font-bold text-[11px] truncate">{s.label}</span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:block truncate">{s.desc}</span>
            </div>
          );
        })}
      </div>

      {/* Primary Replay Visualization: Active Adaptation Trace */}
      {currentTrace && (
        <AdaptationTrace
          trace={currentTrace}
          showConvergenceTimeline={true}
        />
      )}

      {/* Domain Self-Adaptation Metrics & ROI Panel */}
      <div className="bg-slate-950/90 rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-850 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {selectedDomain} Agent Measurable Self-Adaptation Metrics
            </h4>
          </div>
          <span className="text-[10px] text-slate-400">
            Measured against static non-adaptive baseline
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium">
              {activeMetrics.metric1.label}
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-white font-mono">{activeMetrics.metric1.value}</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {activeMetrics.metric1.change}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium">
              {activeMetrics.metric2.label}
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-white font-mono">{activeMetrics.metric2.value}</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {activeMetrics.metric2.change}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium">
              {activeMetrics.metric3.label}
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-white font-mono">{activeMetrics.metric3.value}</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {activeMetrics.metric3.change}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-amber-950/40 space-y-1">
            <span className="text-[10px] text-amber-400 block font-bold flex items-center gap-1">
              <Coins className="w-3 h-3 text-amber-400" />
              <span>{activeMetrics.roiImpact.label}</span>
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-amber-300 font-mono">{activeMetrics.roiImpact.value}</span>
            </div>
            <p className="text-[9px] text-slate-400 leading-tight">
              {activeMetrics.roiImpact.note}
            </p>
          </div>
        </div>

        {/* Safety Critical Non-Suppression Callout */}
        {selectedDomain === 'SECURITY' && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong className="text-cyan-300">Safety Gating Rule: </strong>
              Critical safety events (smoke, short circuit, physical confrontation) are NEVER suppressed or downgraded by past false positives or ROI calculations.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
