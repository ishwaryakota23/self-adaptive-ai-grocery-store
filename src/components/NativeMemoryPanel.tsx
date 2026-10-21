import React, { useState, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  CheckCircle2,
  Clock,
  TrendingUp,
  Database,
  Search,
  RefreshCw,
  Zap,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { memoryService, MemoryActivityLogEntry } from '../services/nativeMemoryService';
import { memoryAvailabilityLabel, memoryConnectionLabel } from '../services/memoryDashboardStatus';
import { NativeMemoryLearningLab } from './NativeMemoryLearningLab';

export const NativeMemoryPanel: React.FC = () => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [activities, setActivities] = useState<MemoryActivityLogEntry[]>([]);
  const [query, setQuery] = useState('');
  const [queryBank, setQueryBank] = useState<'store' | 'security' | 'customer'>('store');
  const [customerId, setCustomerId] = useState('CUST-1001');
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [queryError, setQueryError] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [activeTab, setActiveTab] = useState<'learning' | 'audit' | 'sandbox'>('learning');
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());
  const [serviceError, setServiceError] = useState('');
  const [activityError, setActivityError] = useState('');

  const checkStatus = async () => {
    try {
      const healthy = await memoryService.isHealthy();
      setIsHealthy(healthy);
      setServiceError(memoryService.getHealthError());
      try {
        setActivities(await memoryService.fetchActivityLog());
        setActivityError('');
      } catch (error: any) {
        setActivities([]);
        setActivityError(error?.message || 'Native Memory Cloud audit logs are unavailable.');
      }
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (error: any) {
      setIsHealthy(false);
      setServiceError(error?.message || 'Native Memory Cloud status could not be checked.');
    }
  };

  const connectionStatus = memoryService.getOperationalStatusSnapshot();
  const connectionLabel = memoryConnectionLabel(connectionStatus?.state, isHealthy === null);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRunQuery = async () => {
    if (!query.trim()) return;
    setIsQuerying(true);
    setQueryError('');
    try {
      const bankId = queryBank === 'store'
        ? memoryService.getStoreBank()
        : queryBank === 'security'
        ? memoryService.getSecurityBank()
        : memoryService.getCustomerBank(customerId);

      const recallRes = await memoryService.recall(bankId, query.trim());
      setQueryResults(recallRes.success ? recallRes.results : []);
      setQueryError(recallRes.error || '');
      try { setActivities(await memoryService.fetchActivityLog()); } catch { setActivities([]); }
    } catch (err: any) {
      setQueryError(err?.message || 'Native Memory recall failed. Check the server Cloud configuration and service status.');
      setQueryResults([]);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-600/10">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Native Memory Experiential Memory & Learning
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isHealthy === true
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                  : isHealthy === false
                  ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {connectionLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous experiential learning: <span className="text-slate-300 font-medium">Observe â†’ Recall â†’ Reason â†’ Act â†’ Retain â†’ Adapt</span>
            </p>
            {serviceError && <p className="mt-2 max-w-2xl text-xs text-rose-300" role="status">
              {serviceError}
              {connectionStatus?.diagnosticCode && <span className="ml-1 font-mono text-[10px] text-rose-200">{connectionStatus.diagnosticCode}</span>}
            </p>}
            <p className="mt-1 text-[10px] text-slate-500">Activity feed reads Native Memory Cloud audit logs for the store and security banks.</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-1 rounded-2xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('learning')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'learning'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Learning Lab
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Activity Feed ({activities.length})
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'sandbox'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Recall Sandbox
          </button>
        </div>
      </div>

      {/* Active Banks Indicator */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-indigo-400" />
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Store Operational Bank</div>
              <div className="text-white font-mono font-bold">{memoryService.getStoreBank()}</div>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${connectionStatus?.storeBank.availability === 'available' ? 'text-emerald-400 bg-emerald-950/50 border-emerald-500/20' : 'text-rose-300 bg-rose-950/50 border-rose-500/20'}`}>{memoryAvailabilityLabel(connectionStatus?.storeBank.availability)}</span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Customer Bank Isolation</div>
              <div className="text-white font-mono font-bold">grocerai-customer-&lt;verified-customer-id&gt;</div>
            </div>
          </div>
          <span className="text-[10px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700 font-semibold">ID pattern</span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Security Bank</div>
              <div className="text-white font-mono font-bold">{memoryService.getSecurityBank()}</div>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${connectionStatus?.securityBank.availability === 'available' ? 'text-emerald-400 bg-emerald-950/50 border-emerald-500/20' : 'text-rose-300 bg-rose-950/50 border-rose-500/20'}`}>{memoryAvailabilityLabel(connectionStatus?.securityBank.availability)}</span>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Telemetry Status</div>
              <div className="text-white font-mono font-bold">Auto-synced: {lastRefreshed}</div>
            </div>
          </div>
          <button
            onClick={checkStatus}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Refresh status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* TAB 1: DEMONSTRABLE LEARNING CURVE */}
      {activeTab === 'learning' && (
        <div className="space-y-4">
          <NativeMemoryLearningLab />
        </div>
      )}

      {/* TAB 2: LIVE ACTIVITY FEED */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          {activityError ? (
            <div className="text-center py-8 text-xs text-amber-200 bg-amber-950/20 border border-amber-800/60 rounded-2xl" role="status">
              Native Memory Cloud audit activity could not be verified: {activityError}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/40 border border-slate-800/60 rounded-2xl">
              No recent memory operations logged yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      act.operation === 'retain'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                        : act.operation === 'recall'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                    }`}>
                      {act.operation}
                    </span>
                    <div>
                      <div className="text-white font-medium">{act.input}</div>
                      <div className="text-[11px] text-slate-400">
                        {act.resultSummary} â€¢ Bank: <span className="font-mono text-slate-300">{act.bankId}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span>{act.durationMs}ms</span>
                    <span>{act.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RECALL SANDBOX */}
      {activeTab === 'sandbox' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setQueryBank('store')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  queryBank === 'store' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Store Bank
              </button>
              <button
                onClick={() => setQueryBank('security')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  queryBank === 'security' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Security Bank
              </button>
              <button
                onClick={() => setQueryBank('customer')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  queryBank === 'customer' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Customer Bank
              </button>
            </div>

            {queryBank === 'customer' && (
              <input
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="Customer ID (e.g. CUST-1001)"
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            )}

            <div className="flex-1 flex items-center gap-2 w-full">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunQuery()}
                placeholder={
                  queryBank === 'store'
                    ? "Query store memory (e.g. 'milk restock rush', 'counter congestion')"
                    : queryBank === 'security'
                    ? "Query security memory (e.g. 'quantity mismatch', 'checkout correction', 'false positive')"
                    : "Query customer preferences (e.g. 'milk preference', 'dietary', 'organic')"
                }
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleRunQuery}
                disabled={isQuerying || !query.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Search className={`w-3.5 h-3.5 ${isQuerying ? 'animate-spin' : ''}`} />
                <span>{isQuerying ? 'Recalling...' : 'Recall'}</span>
              </button>
            </div>
          </div>

          {/* Results Box */}
          {queryResults !== null && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Recalled Results ({queryResults.length})
              </div>
              {queryResults.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 border border-slate-800/60 rounded-2xl">
                  {queryError || <>No memories matched this query in bank <span className="font-mono">{queryBank === 'store' ? memoryService.getStoreBank() : queryBank === 'security' ? memoryService.getSecurityBank() : memoryService.getCustomerBank(customerId)}</span>.</>}
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {queryResults.map((r, idx) => (
                    <div
                      key={r.id || idx}
                      className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-indigo-400 text-[10px] font-bold">
                          Score: {r.scores?.final ? r.scores.final.toFixed(3) : 'N/A'} (Reranker: {r.scores?.reranker ? r.scores.reranker.toFixed(3) : 'N/A'})
                        </span>
                        {r.tags && r.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {r.tags.map((t: string) => (
                              <span key={t} className="text-[9px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-slate-200 leading-relaxed">{r.text}</p>
                      {r.entities && r.entities.length > 0 && (
                        <div className="text-[10px] text-slate-500">
                          Entities: {r.entities.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};




