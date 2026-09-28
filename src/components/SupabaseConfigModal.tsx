import React, { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, X, ExternalLink, Key, RefreshCw } from 'lucide-react';
import { getSupabaseCredentials, saveSupabaseCredentials, testSupabaseConnection } from '../services/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const creds = getSupabaseCredentials();
  const [url, setUrl] = useState(creds.url);
  const [anonKey, setAnonKey] = useState(creds.anonKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    if (!url || !anonKey) {
      saveSupabaseCredentials('', '');
      setTestResult({
        success: true,
        message: 'Using local high-performance reactive database fallback (Zero setup needed).'
      });
      setTesting(false);
      return;
    }

    const res = await testSupabaseConnection(url, anonKey);
    if (res.success) {
      saveSupabaseCredentials(url, anonKey);
      setTestResult({
        success: true,
        message: 'Connected to Supabase PostgreSQL successfully!'
      });
    } else {
      setTestResult({
        success: false,
        message: `Connection failed: ${res.error || 'Please verify URL & Key'}`
      });
    }
    setTesting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col text-white">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Supabase Database Connection</h3>
              <p className="text-xs text-slate-400">PostgreSQL Persistent Cloud Integration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleTestAndSave} className="p-6 space-y-4">
          <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50 text-xs text-slate-300 leading-relaxed">
            <p className="font-semibold text-emerald-400 mb-1">Dual-Mode Architecture:</p>
            GrocerAI automatically functions with full local reactive persistence and seeded data out-of-the-box. To connect your live Supabase cloud project, paste your Project URL and Anon Public Key below.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Supabase Anon Key
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              Schema: <code className="text-emerald-400 font-mono">supabase/schema.sql</code>
            </span>

            <button
              type="submit"
              disabled={testing}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
              <span>{testing ? 'Testing...' : 'Test & Save'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
