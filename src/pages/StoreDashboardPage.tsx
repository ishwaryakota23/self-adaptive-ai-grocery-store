import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp,
  Users,
  Boxes,
  Clock,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Calendar,
  CheckCircle2,
  TrendingDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';
import { StoreAgentChat } from '../components/StoreAgentChat';
import { HindsightMemoryPanel } from '../components/HindsightMemoryPanel';
import { db } from '../services/db';

export const StoreDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { inventory, checkoutQueues, aiRecommendations, customerRequests } = useApp();

  const stockouts = inventory.filter(i => i.quantity === 0);
  const lowStock = inventory.filter(i => i.quantity > 0 && i.quantity <= i.reorder_threshold);
  const congestedQueues = checkoutQueues.filter(q => q.status === 'congested' || q.estimated_wait_mins > 5);

  // Hourly Sales Trend Data matching Screen 11
  const salesTrendData = [
    { time: '9 AM', sales: 12400 },
    { time: '11 AM', sales: 24800 },
    { time: '1 PM', sales: 18500 },
    { time: '3 PM', sales: 16200 },
    { time: '5 PM', sales: 28900 },
    { time: '7 PM', sales: 34500 },
    { time: '9 PM', sales: 19260 },
  ];

  // Category Distribution matching Screen 11
  const categoryData = [
    { name: 'Dairy', value: 28, color: '#3b82f6' },
    { name: 'Fruits & Veg', value: 24, color: '#10b981' },
    { name: 'Snacks', value: 18, color: '#f59e0b' },
    { name: 'Beverages', value: 15, color: '#06b6d4' },
    { name: 'Others', value: 15, color: '#8b5cf6' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-950 text-white">
      {/* Sidebar (Matching Screen 11) */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Dashboard Surface */}
      <main className="flex-1 p-4 sm:p-8 space-y-8 overflow-y-auto">
        {/* Header (Screen 11) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Store Overview
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live store performance, automated shelf telemetry, and AI operations
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Today, 28 Sep 2026</span>
          </div>
        </div>

        {/* 4 Top KPI Cards (Matching Screen 11) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Sales */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Sales</span>
              <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/20">
                +12% vs yest.
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">₹1,24,560</div>
            <p className="text-[11px] text-slate-500">415 transactions recorded</p>
          </div>

          {/* Customers Footfall */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Customers Footfall</span>
              <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/20">
                +8%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">842</div>
            <p className="text-[11px] text-slate-500">Peak hour: 6:00 PM - 7:30 PM</p>
          </div>

          {/* Inventory Health */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Inventory Health</span>
              <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/20">
                92%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {stockouts.length > 0 ? `${stockouts.length} Stockouts` : 'Optimal'}
            </div>
            <p className="text-[11px] text-amber-400 font-medium">
              {lowStock.length} items below reorder threshold
            </p>
          </div>

          {/* Average Queue Time */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Avg. Queue Time</span>
              <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/20">
                -40% wait
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">2.3 mins</div>
            <p className="text-[11px] text-slate-500">
              {congestedQueues.length > 0 ? 'Counter 3 congested' : 'All lines flowing'}
            </p>
          </div>
        </div>

        {/* Hindsight Experiential Memory & Learning System */}
        <HindsightMemoryPanel />

        {/* Charts Row: Sales Trend & Category Breakdown (Screen 11) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Trend Bar Chart (2 cols) */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Sales Trend by Hour</h3>
                <p className="text-xs text-slate-400">Intra-day sales volume velocity</p>
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30 font-semibold">
                Peak: 7 PM
              </span>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Sales']}
                  />
                  <Bar dataKey="sales" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Product Categories Donut Chart (1 col) */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Product Categories</h3>
              <p className="text-xs text-slate-400">Revenue contribution</p>
            </div>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(val: any) => [`${val}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
              {categoryData.map((cat) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-300 text-[11px] truncate">{cat.name} ({cat.value}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Store Agent Conversational Supervisory Center */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Store Agent Conversational HQ
            </h2>
            <span className="text-xs text-slate-400">Powered by Groq Cloud & Real Store Telemetry</span>
          </div>
          <StoreAgentChat />
        </div>

        {/* Live Operational Alerts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Urgent Restock Alerts */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Critical Stockout Alerts</h3>
              </div>
              <Link to="/store/inventory" className="text-xs text-emerald-400 hover:underline">
                View All →
              </Link>
            </div>

            <div className="space-y-2.5">
              {stockouts.map((so) => {
                const prod = db.getProductById(so.product_id);
                return (
                  <div key={so.id} className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-white">{prod?.name || so.product_id} (Stock: 0)</h4>
                      <p className="text-[11px] text-rose-300">Aisle: {prod?.aisle || 'Shelf'} • Critical deficit</p>
                    </div>
                    <button
                      onClick={() => navigate('/store/recommendations')}
                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs transition-colors"
                    >
                      Restock Now
                    </button>
                  </div>
                );
              })}

              {lowStock.slice(0, 2).map((ls) => {
                const prod = db.getProductById(ls.product_id);
                return (
                  <div key={ls.id} className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-white">{prod?.name || ls.product_id} (Stock: {ls.quantity})</h4>
                      <p className="text-[11px] text-amber-300">Approaching reorder threshold ({ls.reorder_threshold})</p>
                    </div>
                    <button
                      onClick={() => navigate('/store/inventory')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
                    >
                      Inspect
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Queue Congestion Alert */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Live Checkout Status</h3>
              </div>
              <Link to="/store/queues" className="text-xs text-emerald-400 hover:underline">
                Open Queues Screen →
              </Link>
            </div>

            <div className="space-y-2.5">
              {checkoutQueues.map((q) => (
                <div
                  key={q.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                    q.status === 'congested'
                      ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                      : q.status === 'open'
                      ? 'bg-slate-950 border-slate-800 text-slate-300'
                      : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white">Counter {q.counter_number}</span>
                    <span className="text-[11px] text-slate-400">{q.customer_count} customers</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">~{q.estimated_wait_mins} min</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      q.status === 'congested' ? 'bg-rose-500 text-white' : q.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {q.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
