import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  Sparkles,
  Heart,
  History,
  Tag,
  Calendar,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Database,
  Layers,
  ArrowLeft,
  Activity
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { eventService } from '../services/eventService';

export const CustomerMemoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const memories = db.getCustomerMemories(currentUser.id);
  const prefs = db.getCustomerPreferences(currentUser.id);
  const requests = db.getCustomerRequests();
  const pastOrders = db.getOrders(currentUser.id);
  const customerEvents = eventService.getEvents({ customer_session_id: currentUser.id, limit: 8 });

  const [activeTab, setActiveTab] = useState<'agent_memory' | 'app_profile'>('agent_memory');

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header & Architectural Separation Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
                Customer Memory & Insights
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  Customer Interaction Memory (Episodic History)
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Episodic and preference memory learned by the Customer Agent across previous visits
              </p>
            </div>
          </div>
        </div>

        {/* Clear Tab Distinction: Application Profile vs Agent Memory */}
        <div className="flex items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800 max-w-md">
          <button
            onClick={() => setActiveTab('agent_memory')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'agent_memory'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Agent Episodic Memory</span>
          </button>
          <button
            onClick={() => setActiveTab('app_profile')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'app_profile'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Application Profile</span>
          </button>
        </div>

        {activeTab === 'agent_memory' ? (
          /* Agent Episodic Memory */
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-xs text-slate-400 flex items-center justify-between">
              <span>Customer Agent Interaction Memory: Structured history of customer events, inquiries, and verified shopping habits.</span>
              <span className="text-emerald-400 font-mono font-bold text-[11px]">INTERACTION LOG</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {memories.map((mem) => (
                <div
                  key={mem.id}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-6 transition-all shadow-xl space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      {mem.tag}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Confidence: {(mem.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {mem.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                    {mem.description}
                  </p>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Applied: {mem.times_applied} times</span>
                    <span>Last reinforced: {mem.last_reinforced}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Past Inquiries & Requests */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-base text-white">Recent Agent Voice & Chat Inquiries</h3>
              <div className="space-y-2">
                {requests.slice(0, 4).map((r) => (
                  <div key={r.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">"{r.request_text}"</span>
                      <span className="text-slate-400 text-[11px]">{r.product_name} • mode: {r.mode}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                      r.status === 'fulfilled' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Structured Interaction History Ledger */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-base text-white">Customer Event & Interaction Ledger</h3>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">Session: {currentUser.id}</span>
              </div>

              <div className="space-y-2">
                {customerEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No interaction events logged yet for this session.</p>
                ) : (
                  customerEvents.map((evt) => (
                    <div key={evt.event_id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white block text-xs">{evt.event_type}</span>
                        <span className="text-slate-400 text-[11px]">
                          {evt.product_name ? `${evt.product_name} • ` : ''}source: {evt.source || 'SYSTEM'}
                          {evt.metadata?.detected_language ? ` • lang: ${evt.metadata.detected_language}` : ''}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Application Profile (Stored in DB) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-base text-white">Dietary & Health Preferences</h3>
              <div className="flex flex-wrap gap-2">
                {prefs?.dietary_preferences.map((dp, i) => (
                  <span key={i} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl">
                    {dp}
                  </span>
                ))}
              </div>

              <h4 className="font-semibold text-xs text-slate-300 pt-3 border-t border-slate-800">
                Preferred Brands
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {prefs?.preferred_brands.map((b, i) => (
                  <span key={i} className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg">
                    {b}
                  </span>
                ))}
              </div>

              <h4 className="font-semibold text-xs text-slate-300 pt-3 border-t border-slate-800">
                Budget Range
              </h4>
              <p className="text-xs text-slate-300">
                ₹{prefs?.budget_min} - ₹{prefs?.budget_max} per shopping trip
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-base text-white">Past Shopping Transactions</h3>
              <div className="space-y-3">
                {pastOrders.map((ord) => (
                  <div key={ord.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-white">
                      <span>Order #{ord.id}</span>
                      <span className="text-emerald-400">₹{ord.total_amount}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {ord.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/customer/preferences')}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors border border-slate-700 mt-2"
              >
                Edit Preferences & Constraints →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
