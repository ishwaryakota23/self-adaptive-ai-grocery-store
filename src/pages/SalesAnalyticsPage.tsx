import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ShoppingBag,
  DollarSign
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';

export const SalesAnalyticsPage: React.FC = () => {
  const { products } = useApp();
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');

  const dailyTrend = [
    { day: 'Mon', revenue: 112000, margin: 24000 },
    { day: 'Tue', revenue: 118000, margin: 26000 },
    { day: 'Wed', revenue: 109000, margin: 23500 },
    { day: 'Thu', revenue: 125000, margin: 28000 },
    { day: 'Fri', revenue: 142000, margin: 32000 },
    { day: 'Sat', revenue: 168000, margin: 39000 },
    { day: 'Sun', revenue: 154000, margin: 36000 },
  ];

  const topProducts = [
    { name: 'Amul Fresh Paneer 200g', revenue: 35700, units: 420, growth: '+38%' },
    { name: 'Farm Fresh Red Tomatoes', revenue: 24000, units: 600, growth: '+22%' },
    { name: 'Borges Whole Wheat Penne', revenue: 18500, units: 308, growth: '+15%' },
    { name: 'Figaro Extra Virgin Olive Oil', revenue: 16200, units: 36, growth: '+12%' },
    { name: 'Epigamia Greek Yogurt', revenue: 14400, units: 240, growth: '+28%' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-950 text-white">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Sales & Demand Analytics</h1>
            <p className="text-xs text-slate-400 mt-1">Cross-category velocity, basket margins, and replenishment conversion</p>
          </div>

          <div className="flex items-center bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setTimeframe('day')}
              className={`px-3 py-1.5 rounded-xl transition-all ${timeframe === 'day' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}
            >
              Day
            </button>
            <button
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1.5 rounded-xl transition-all ${timeframe === 'week' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1.5 rounded-xl transition-all ${timeframe === 'month' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}
            >
              Month
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-1">
            <span className="text-xs text-slate-400">Total Weekly Revenue</span>
            <div className="text-3xl font-black text-white">₹9,28,000</div>
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              +18.4% vs last week
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-1">
            <span className="text-xs text-slate-400">Average Basket Size</span>
            <div className="text-3xl font-black text-white">₹482</div>
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              +6.2% lift via AI pairing
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-1">
            <span className="text-xs text-slate-400">Restock ROI Conversion</span>
            <div className="text-3xl font-black text-white">94.6%</div>
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Zero spoiled excess
            </span>
          </div>
        </div>

        {/* Area Chart: Revenue Trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Revenue & Margin Trajectory</h3>
              <p className="text-xs text-slate-400">Gross sales vs Net category margins</p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Amount']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performing Items Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white">Top Performing Products This Week</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="text-slate-400 uppercase text-[11px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3">Product</th>
                  <th className="py-3">Units Sold</th>
                  <th className="py-3">Revenue</th>
                  <th className="py-3 text-right">Growth Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {topProducts.map((tp, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-3 font-semibold text-white">{tp.name}</td>
                    <td className="py-3 font-mono text-slate-300">{tp.units} packs</td>
                    <td className="py-3 font-mono font-bold text-emerald-400">₹{tp.revenue.toLocaleString()}</td>
                    <td className="py-3 text-right font-bold text-emerald-400">{tp.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
