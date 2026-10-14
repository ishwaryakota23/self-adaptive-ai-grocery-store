import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Boxes,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Coins,
  Layers,
  Zap,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';
import { HindsightMemoryPanel } from '../components/HindsightMemoryPanel';
import { db } from '../services/db';
import { storeAgent } from '../services/storeAgent';
import { roiEngine } from '../services/roiEngine';
import { hindsightEngine } from '../services/hindsightEngine';
import { AIRecommendation } from '../types';

export const AIRecommendationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { aiRecommendations, approveRecommendation, dismissRecommendation } = useApp();
  const [approvedId, setApprovedId] = useState<string | null>(null);
  const [modifyingRec, setModifyingRec] = useState<AIRecommendation | null>(null);
  const [customQty, setCustomQty] = useState<number>(50);
  const [isScanning, setIsScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [convergenceStep, setConvergenceStep] = useState<number>(() => storeAgent.getRestockConvergenceStep());

  const handleAdvanceConvergence = () => {
    const adv = storeAgent.advanceRestockConvergenceStep();
    setConvergenceStep(adv.step);
    storeAgent.autoGenerateRecommendations();
    setScanNotice(`Restock policy converged to Step ${adv.step} (${adv.recommendedQty} units). Suggested batch re-calibrated dynamically.`);
    setTimeout(() => setScanNotice(null), 3500);
  };

  const handleResetConvergence = () => {
    storeAgent.resetRestockConvergenceStep();
    setConvergenceStep(1);
    storeAgent.autoGenerateRecommendations();
    setScanNotice('Restock convergence reset to Step 1 baseline (30 units).');
    setTimeout(() => setScanNotice(null), 3500);
  };

  const handleScanStoreSignals = () => {
    setIsScanning(true);
    try {
      const recs = storeAgent.autoGenerateRecommendations();
      setScanNotice(`Store Agent evaluated the currently available application telemetry: ${recs.length} total recommendations active.`);
      setTimeout(() => setScanNotice(null), 4000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleApprove = (id: string) => {
    approveRecommendation(id);
    setApprovedId(id);
    setTimeout(() => {
      navigate('/store/actions');
    }, 900);
  };

  const handleOpenModify = (rec: AIRecommendation) => {
    const match = rec.suggested_action.match(/Restock (\d+) packs/);
    setCustomQty(match ? parseInt(match[1], 10) : 40);
    setModifyingRec(rec);
  };

  const handleConfirmModify = () => {
    if (!modifyingRec) return;
    db.modifyAndApproveRecommendation(modifyingRec.id, customQty);
    setApprovedId(modifyingRec.id);
    setModifyingRec(null);
    setTimeout(() => {
      navigate('/store/actions');
    }, 900);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-950 text-white">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto">
        {/* Header (Matching Screen 13) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              Restocking & Operational Recommendations
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30">
                Screen 13
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Based on demand patterns, physical sensor counts, and predictive sales velocity
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleScanStoreSignals}
              disabled={isScanning}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Evaluating Telemetry...' : 'Scan Store Signals (Store Agent)'}</span>
            </button>
          </div>
        </div>

        {scanNotice && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{scanNotice}</span>
          </div>
        )}

        {/* Hindsight Experiential Memory & Learning System */}
        <HindsightMemoryPanel />

        {/* Store Agent Dynamic Convergence Stepper (30 -> 38 -> 44 -> 42 Units) */}
        <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">Synthetic Demo Policy Convergence</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                    Demo step {convergenceStep} of 4
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Simulated trace only: Experience ? Outcome ? Demo Memory ? Example Decision. It does not update production policy or prove Cloud learning.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetConvergence}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                title="Reset to Step 1 baseline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset (Step 1)</span>
              </button>
              <button
                onClick={handleAdvanceConvergence}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Advance Convergence ({convergenceStep < 4 ? `Step ${convergenceStep} → ${convergenceStep + 1}` : 'Equilibrium Reached'})</span>
              </button>
            </div>
          </div>

          {/* Stepper Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                stepNum: 1,
                label: 'Week 1: Baseline',
                qty: '30 units',
                outcome: 'Depleted in 42m (18 unmet requests, ~₹1,450 lost sales)',
                tag: 'Baseline Shortage',
                status: convergenceStep === 1 ? 'current' : convergenceStep > 1 ? 'completed' : 'upcoming'
              },
              {
                stepNum: 2,
                label: 'Week 2: +26% Delta',
                qty: '38 units',
                outcome: 'Shortage delta +8 applied. 4 unmet requests at 7:15 PM (~₹320 lost)',
                tag: '+8 Units Delta',
                status: convergenceStep === 2 ? 'current' : convergenceStep > 2 ? 'completed' : 'upcoming'
              },
              {
                stepNum: 3,
                label: 'Week 3: +46% Buffer',
                qty: '44 units',
                outcome: 'Surge buffer +6 applied. 0 stockouts, 3 units surplus remaining',
                tag: 'Mild Surplus Buffer',
                status: convergenceStep === 3 ? 'current' : convergenceStep > 3 ? 'completed' : 'upcoming'
              },
              {
                stepNum: 4,
                label: 'Week 4: Optimum',
                qty: '42 units',
                outcome: 'Hindsight Convergence reached: Exactly 42 units (0 stockouts, 0 waste)',
                tag: 'Equilibrium (0 Stockouts / 0 Waste)',
                status: convergenceStep === 4 ? 'current' : 'upcoming'
              }
            ].map(s => {
              const isCurrent = s.status === 'current';
              const isDone = s.status === 'completed';
              return (
                <div
                  key={s.stepNum}
                  className={`p-3.5 rounded-2xl border transition-all text-xs space-y-1.5 ${
                    isCurrent
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                      : isDone
                      ? 'bg-slate-950/60 border-emerald-500/30 opacity-80'
                      : 'bg-slate-950/30 border-slate-800 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {s.label}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      isCurrent
                        ? 'bg-indigo-500 text-white'
                        : isDone
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isCurrent ? 'ACTIVE' : isDone ? 'LEARNED' : 'QUEUED'}
                    </span>
                  </div>
                  <div className="text-sm font-black font-mono text-white flex items-center gap-1.5">
                    <span>{s.qty}</span>
                    {isCurrent && <span className="text-[11px] text-indigo-400 font-sans font-normal">(Current Policy)</span>}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    {s.outcome}
                  </p>
                  <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                    {s.tag}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Recommendations List (Matching Screen 13) */}
        <div className="space-y-4">
          {aiRecommendations.map((rec) => {
            const isApproved = rec.status === 'approved' || approvedId === rec.id;
            const isDismissed = rec.status === 'dismissed';

            return (
              <div
                key={rec.id}
                className={`bg-slate-900 border rounded-3xl p-6 transition-all shadow-xl space-y-4 ${
                  isApproved
                    ? 'border-emerald-500/40 bg-emerald-950/20'
                    : isDismissed
                    ? 'border-slate-800 opacity-60'
                    : rec.priority === 'urgent'
                    ? 'border-rose-500/40 shadow-rose-500/5'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        rec.priority === 'urgent'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      <Sparkles className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{rec.title}</h3>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            rec.priority === 'urgent'
                              ? 'bg-rose-500 text-white'
                              : rec.priority === 'high'
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {rec.priority === 'urgent' ? 'Urgent' : 'Recommended'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{rec.description}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-emerald-400 block font-mono">
                      {rec.expected_impact}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Confidence: {(rec.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Suggested Action & Historical Evidence */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-800/80">
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
                    <span className="text-slate-400 font-semibold block mb-1">
                      Action to be Dispatched:
                    </span>
                    <p className="text-white font-medium">{rec.suggested_action}</p>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
                    <span className="text-slate-400 font-semibold block mb-1">
                      Historical Evidence (Learned Experience):
                    </span>
                    <p className="text-slate-300">{rec.historical_evidence}</p>
                  </div>
                </div>

                {/* Structured Signal Evidence Bullets if available */}
                {rec.evidence && rec.evidence.length > 0 && (
                  <div className="bg-slate-950/70 p-3 rounded-2xl border border-emerald-500/20 text-xs">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5 mb-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Live Empirical Evidence & Store Signals:
                    </span>
                    <ul className="space-y-1 pl-4 list-disc text-slate-300">
                      {rec.evidence.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Closed-Loop Financial ROI: Expected != Realized */}
                {(() => {
                  const qtyMatch = rec.suggested_action.match(/Restock (\d+) packs/);
                  const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : (rec.suggested_quantity || 40);
                  const price = rec.product_id ? (db.getProductById(rec.product_id)?.price || 35) : 35;
                  const roi = roiEngine.evaluateRecommendationROI({
                    recommendationId: rec.id,
                    type: (rec.type || 'restock').toUpperCase() as any,
                    suggestedQuantity: qty,
                    unitPrice: price,
                    priority: rec.priority as any
                  });

                  return (
                    <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-indigo-500/30 text-xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-indigo-400 font-bold flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5" />
                          Closed-Loop Financial ROI Engine:
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                          Expected ≠ Realized Verified
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center pt-1">
                        <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-medium">Expected Gross Opportunity</span>
                          <span className="text-xs font-bold font-mono text-emerald-400">{roi.expectedBenefitFormatted}</span>
                          <span className="text-[9px] text-slate-500 block">Pre-action gross estimate</span>
                        </div>
                        <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-medium">Decision & Labor Cost</span>
                          <span className="text-xs font-bold font-mono text-rose-400">-{roi.decisionCostFormatted}</span>
                          <span className="text-[9px] text-slate-500 block">Restock handling & shelf space</span>
                        </div>
                        <div className="bg-slate-900/90 p-2 rounded-xl border border-emerald-500/40">
                          <span className="text-[10px] text-emerald-300 block font-medium">Realized Net Impact</span>
                          <span className="text-xs font-black font-mono text-emerald-400">{roi.realizedImpactFormatted}</span>
                          <span className="text-[9px] text-emerald-500/80 block">Net financial return (Retained)</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 italic">
                        💡 {roi.discrepancyNote}
                      </p>
                    </div>
                  );
                })()}

                {/* Action Buttons (Screen 13: Approve, Modify, Dismiss) */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Status: <strong className={isApproved ? 'text-emerald-400' : 'text-slate-300'}>{rec.status}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    {!isApproved && !isDismissed ? (
                      <>
                        <button
                          onClick={() => dismissRecommendation(rec.id)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                          Dismiss
                        </button>

                        <button
                          onClick={() => handleOpenModify(rec)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-700"
                        >
                          Modify
                        </button>

                        <button
                          onClick={() => handleApprove(rec.id)}
                          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve & Execute</span>
                        </button>
                      </>
                    ) : isApproved ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Action Dispatched & Replenished</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Dismissed</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal for Modifying Recommendation (Task 7 requirement) */}
        {modifyingRec && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-white">Modify Recommendation</h3>
                </div>
                <button
                  onClick={() => setModifyingRec(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Target Action</span>
                  <p className="font-semibold text-white bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    {modifyingRec.suggested_action}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Adjust Quantity to Restock</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={customQty}
                      onChange={(e) => setCustomQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm w-32 focus:border-emerald-500 outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCustomQty(q => Math.max(5, q - 10))}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                      >
                        -10
                      </button>
                      <button
                        onClick={() => setCustomQty(q => q + 10)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => setCustomQty(q => q + 50)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                      >
                        +50
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                  <span>Simulated Outcome: Replenishing </span>
                  <strong className="text-emerald-400 font-mono">{customQty} units</strong>
                  <span> will cover estimated weekend demand with +{(Math.min(99, 15 + Math.round(customQty * 0.4)))}% throughput increase.</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setModifyingRec(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmModify}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Execute (+{customQty})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
