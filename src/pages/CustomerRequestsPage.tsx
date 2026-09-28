import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquareQuote,
  Mic,
  MessageSquare,
  Clock,
  ArrowRight,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';

export const CustomerRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { customerRequests } = useApp();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-950 text-white">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              Incoming Customer Voice & Search Requests
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time feed of natural language queries received by Customer Agents on the sales floor
            </p>
          </div>

          <button
            onClick={() => navigate('/store/demand')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
          >
            <span>Analyze Unmet Demand Table</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Requests List */}
        <div className="space-y-3">
          {customerRequests.map((req) => {
            const isUnmet = req.status === 'unavailable';

            return (
              <div
                key={req.id}
                onClick={() => navigate('/store/demand')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                  isUnmet
                    ? 'bg-slate-900 border-rose-500/40 hover:border-rose-500'
                    : 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      req.mode === 'voice'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {req.mode === 'voice' ? <Mic className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                        "{req.request_text}"
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {req.mode.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      Matched: <strong className="text-slate-200">{req.product_name}</strong> • Requested by {req.customer_name || 'Shopper'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <span className="font-mono text-sm font-bold text-white block">
                      {req.request_count}x queries
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isUnmet ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
