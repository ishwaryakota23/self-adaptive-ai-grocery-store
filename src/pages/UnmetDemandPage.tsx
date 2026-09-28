import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Sparkles,
  CheckCircle2,
  Calendar,
  Filter,
  Search,
  Eye,
  ShoppingCart,
  ShieldCheck,
  Ban
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';
import { storeAgent } from '../services/storeAgent';
import { eventService } from '../services/eventService';

export const UnmetDemandPage: React.FC = () => {
  const navigate = useNavigate();
  const { customerRequests, inventory, products } = useApp();
  const [filterPeriod, setFilterPeriod] = useState<'today' | '7d' | '30d'>('today');

  const unmetItems = storeAgent.detectUnmetDemand();
  const funnel = eventService.calculateDemandFunnel();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-950 text-white">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto">
        {/* Header (Matching Screen 12) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              Unmet Demand Detection
              <span className="text-xs font-semibold text-rose-400 bg-rose-950/80 px-2.5 py-1 rounded-full border border-rose-500/30">
                Screen 12
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Products frequently requested via voice & search but low or out of stock
            </p>
          </div>

          {/* Time Filter Tabs (Screen 12) */}
          <div className="flex items-center bg-slate-900 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setFilterPeriod('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterPeriod === 'today'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setFilterPeriod('7d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterPeriod === '7d'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setFilterPeriod('30d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterPeriod === '30d'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              30D
            </button>
          </div>
        </div>

        {/* Demand Funnel Telemetry (Requirement: Behavioral Activity != Confirmed Purchase) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Demand vs. Purchase Funnel</span>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Closed-Loop Telemetry
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Searches and cart additions represent intent; inventory deductions occur only on confirmed payment.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>1. Searches</span>
                <Search className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-xl font-bold font-mono text-white">{funnel.searches}</div>
              <span className="text-[10px] text-slate-500 block">Keyword & voice</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>2. Views</span>
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl font-bold font-mono text-white">{funnel.views}</div>
              <span className="text-[10px] text-slate-500 block">Detail views</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>3. Cart Adds</span>
                <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-bold font-mono text-white">{funnel.cartAdditions}</div>
              <span className="text-[10px] text-slate-500 block">Intent preserved</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>4. Checkout</span>
                <Boxes className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-xl font-bold font-mono text-white">{funnel.checkoutAttempts}</div>
              <span className="text-[10px] text-slate-500 block">Started checkout</span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-1">
              <div className="flex items-center justify-between text-emerald-400 text-[11px]">
                <span>5. Confirmed</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-300">{funnel.confirmedSales}</div>
              <span className="text-[10px] text-emerald-500/80 block">Payment success</span>
            </div>

            <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-1">
              <div className="flex items-center justify-between text-rose-400 text-[11px]">
                <span>6. Unfulfilled</span>
                <Ban className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-xl font-bold font-mono text-rose-300">{funnel.unfulfilledDemand}</div>
              <span className="text-[10px] text-rose-400/80 block">0 stock requests</span>
            </div>
          </div>
        </div>

        {/* Unmet Demand Table (Matching Screen 12) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-4 px-6">Product</th>
                  <th className="py-4 px-4">Demand Level</th>
                  <th className="py-4 px-4">Request Count</th>
                  <th className="py-4 px-4">Current Stock</th>
                  <th className="py-4 px-4">Trend</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {unmetItems.map((item, index) => {
                  return (
                    <tr key={index} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6 font-bold text-white">
                        {item.productName}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            item.urgency === 'high'
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                              : item.urgency === 'medium'
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.urgency}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono font-semibold text-slate-200">
                        {item.requestCount} requests
                      </td>
                      <td className="py-4 px-4 font-mono font-bold">
                        <span className={item.currentStock === 0 ? 'text-rose-400' : 'text-amber-400'}>
                          {item.currentStock} in stock
                        </span>
                      </td>
                      <td className="py-4 px-4 text-emerald-400 font-semibold text-xs">
                        {item.trend}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => navigate('/store/recommendations')}
                          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Recommend Restock</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Context Box */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white">Cross-Agent Telemetry Synchronization</h4>
              <p className="text-slate-400 mt-0.5">
                Every voice query for missing items is aggregated into the Store Agent's restock planner.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/store/recommendations')}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-700 shrink-0 cursor-pointer"
          >
            <span>Review AI Restock Actions</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
};
