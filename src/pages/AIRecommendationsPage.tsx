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
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';
import { HindsightMemoryPanel } from '../components/HindsightMemoryPanel';
import { db } from '../services/db';
import { storeAgent } from '../services/storeAgent';
import { AIRecommendation } from '../types';

export const AIRecommendationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { aiRecommendations, approveRecommendation, dismissRecommendation } = useApp();
  const [approvedId, setApprovedId] = useState<string | null>(null);
  const [modifyingRec, setModifyingRec] = useState<AIRecommendation | null>(null);
  const [customQty, setCustomQty] = useState<number>(50);
  const [isScanning, setIsScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  const handleScanStoreSignals = () => {
    setIsScanning(true);
    try {
      const recs = storeAgent.autoGenerateRecommendations();
      setScanNotice(`Store Agent evaluated real telemetry: ${recs.length} total recommendations active.`);
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
