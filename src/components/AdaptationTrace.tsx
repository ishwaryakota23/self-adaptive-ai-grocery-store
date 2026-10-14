import React from 'react';
import {
  ArrowDown,
  Brain,
  History,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Zap,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Coins,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AdaptiveExperienceTrace } from '../services/hindsightEngine';

interface AdaptationTraceProps {
  trace: AdaptiveExperienceTrace;
  showConvergenceTimeline?: boolean;
  compact?: boolean;
  onSimulateNext?: () => void;
  isInteractive?: boolean;
}

export const AdaptationTrace: React.FC<AdaptationTraceProps> = ({
  trace,
  showConvergenceTimeline = true,
  compact = false,
  onSimulateNext
}) => {
  const isCustomer = trace.domain === 'CUSTOMER';
  const isStore = trace.domain === 'STORE';
  const isSecurity = trace.domain === 'SECURITY';

  // Domain theme colors
  const theme = isCustomer
    ? {
        badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        ringColor: 'border-emerald-500/40',
        glow: 'shadow-emerald-500/10',
        iconColor: 'text-emerald-400',
        accentBg: 'bg-emerald-950/40'
      }
    : isStore
    ? {
        badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
        ringColor: 'border-purple-500/40',
        glow: 'shadow-purple-500/10',
        iconColor: 'text-purple-400',
        accentBg: 'bg-purple-950/40'
      }
    : {
        badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        ringColor: 'border-amber-500/40',
        glow: 'shadow-amber-500/10',
        iconColor: 'text-amber-400',
        accentBg: 'bg-amber-950/40'
      };

  return (
    <div className={`bg-slate-900 border ${theme.ringColor} rounded-3xl p-5 sm:p-6 shadow-2xl ${theme.glow} space-y-5 transition-all`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl ${theme.badgeBg} flex items-center justify-center font-bold text-sm shadow-md`}>
            {isCustomer ? <Sparkles className="w-5 h-5" /> : isStore ? <TrendingUp className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${theme.badgeBg}`}>
                {trace.agentName} • {trace.scenarioType.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Confidence: {(trace.confidenceScore * 100).toFixed(0)}%
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-1">
              {trace.title}
            </h3>
          </div>
        </div>

        {/* Financial / Business Impact Badge */}
        {trace.businessImpact && (
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="text-left">
              <span className="text-[10px] text-slate-400 block font-medium">Business Impact</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {trace.businessImpact.financialImpact || trace.businessImpact.value}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Reusable Vertical 5-Stage Adaptation Pipeline */}
      <div className="space-y-3">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Adaptation Trace Progression (Experience → Outcome → Policy Shift)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {/* STEP 1: PAST EXPERIENCE */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-2 relative group hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-500 font-bold">STAGE 1</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300">
                BASELINE
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>Past Experience</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {trace.pastSituation}
            </p>
            <div className="pt-1.5 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
              Action: <span className="text-slate-300">{trace.pastHumanAction}</span>
            </div>
          </div>

          {/* STEP 2: ACTUAL OUTCOME */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-2 relative group hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-500 font-bold">STAGE 2</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                trace.outcomeType === 'POSITIVE' ? 'bg-emerald-500/20 text-emerald-300' :
                trace.outcomeType === 'FALSE_POSITIVE' ? 'bg-blue-500/20 text-blue-300' :
                trace.outcomeType === 'BENIGN_CORRECTION' ? 'bg-cyan-500/20 text-cyan-300' :
                'bg-rose-500/20 text-rose-300'
              }`}>
                {trace.outcomeType.replace(/_/g, ' ')}
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Actual Outcome</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {trace.actualOutcome}
            </p>
            <div className="pt-1.5 border-t border-slate-900 text-[10px] text-emerald-400 font-mono">
              Metric: {trace.businessImpact.value}
            </div>
          </div>

          {/* STEP 3: HINDSIGHT UPDATE */}
          <div className="bg-slate-950/80 border border-indigo-900/60 rounded-2xl p-4 space-y-2 relative group hover:border-indigo-700 transition-colors">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-indigo-400 font-bold">STAGE 3</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300">
                GATED RETENTION
              </span>
            </div>
            <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
              <span>Hindsight Retained</span>
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed italic bg-indigo-950/30 p-2 rounded-xl border border-indigo-500/20">
              "{trace.retainedLesson}"
            </p>
            <div className="pt-1 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
              ID: {trace.hindsightDocumentId}
            </div>
          </div>

          {/* STEP 4: CURRENT DECISION */}
          <div className={`bg-slate-950/80 border ${theme.ringColor} rounded-2xl p-4 space-y-2 relative group hover:border-opacity-100 transition-colors shadow-lg`}>
            <div className="flex items-center justify-between text-[11px]">
              <span className={`font-mono font-bold ${theme.iconColor}`}>STAGE 4</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${theme.badgeBg}`}>
                ADAPTED ACTION
              </span>
            </div>
            <h4 className={`text-xs font-bold ${theme.iconColor} flex items-center gap-1.5`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Current Decision</span>
            </h4>
            <p className="text-[11px] text-white font-medium leading-relaxed">
              {trace.currentDecision}
            </p>
            <div className="pt-1.5 border-t border-slate-900 text-[10px] text-amber-300">
              Rationale: {trace.whyThisDecision}
            </div>
          </div>

          {/* STEP 5: CONTINUOUS FEEDBACK */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-2 relative group hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-emerald-400 font-bold">STAGE 5</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                NEW OUTCOME
              </span>
            </div>
            <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Learned Feedback</span>
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {trace.currentOutcome || 'Agent validates new decision outcome; updates episodic memory confidence dynamically.'}
            </p>
            <div className="pt-1.5 border-t border-slate-900 text-[10px] text-emerald-400 font-mono">
              Status: Converged & Verified
            </div>
          </div>
        </div>
      </div>

      {/* CRITICAL CALLOUT: "WHAT CHANGED?" COMPARISON MATRIX */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/90 space-y-3">
        <div className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
          <span>Behavioral Differential: Previous Behavior vs Adaptive Decision</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Box 1: Previous Behavior */}
          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              1. Previous Behavior (Baseline)
            </span>
            <p className="text-slate-300 text-[11px] font-medium leading-relaxed">
              {trace.previousBehavior}
            </p>
          </div>

          {/* Box 2: What Happened? */}
          <div className="bg-slate-900/90 p-3 rounded-xl border border-rose-950/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
              2. What Happened (Human/Outcome)?
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {trace.pastHumanAction} → {trace.actualOutcome}
            </p>
          </div>

          {/* Box 3: What Experience Retained? */}
          <div className="bg-slate-900/90 p-3 rounded-xl border border-indigo-950/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
              3. What Experience Retained?
            </span>
            <p className="text-indigo-200 text-[11px] leading-relaxed">
              {trace.retainedLesson}
            </p>
          </div>

          {/* Box 4: What is Different Now? */}
          <div className="bg-slate-900/90 p-3 rounded-xl border border-emerald-950/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              4. What Is Different Now?
            </span>
            <p className="text-emerald-300 text-[11px] font-semibold leading-relaxed">
              {trace.differenceDescription}
            </p>
          </div>
        </div>
      </div>

      {/* MULTI-ITERATION POLICY CONVERGENCE PROGRESSION (When present) */}
      {showConvergenceTimeline && trace.progressionSteps && trace.progressionSteps.length > 0 && (
        <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              <span>Multi-Iteration Policy Convergence (Self-Correction Over Time)</span>
            </span>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-950/50 px-2 py-0.5 rounded-full border border-purple-500/30">
              {trace.progressionSteps.length} Measured Iterations
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {trace.progressionSteps.map((step) => {
              const isCurr = step.status === 'current';
              return (
                <div
                  key={step.step}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                    isCurr
                      ? 'bg-purple-950/40 border-purple-500/60 shadow-md shadow-purple-500/10'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono text-slate-500 font-bold">{step.iterationLabel}</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                      isCurr ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isCurr ? 'CONVERGED OPTIMUM' : 'HISTORICAL'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-1">
                    <span>{step.policyValue}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {step.measuredOutcome}
                  </p>
                  <div className="pt-1 border-t border-slate-800/80 text-[10px] text-emerald-400 font-medium">
                    {step.takeaway}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
