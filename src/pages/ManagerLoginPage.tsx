import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Store,
  ShieldCheck,
  Lock,
  UserCheck,
  AlertCircle,
  Calendar,
  ArrowRight,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { managerService, SEEDED_MANAGERS } from '../services/managerService';
import { useApp } from '../context/AppContext';

export const ManagerLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setRole } = useApp();

  const [employeeId, setEmployeeId] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const res = managerService.login(employeeId, dob);
      setLoading(false);

      if (res.success) {
        setRole('STORE_MANAGER');
        navigate('/store/dashboard');
      } else {
        setError(res.error || 'Authentication failed. Please verify credentials.');
      }
    }, 400);
  };

  const handleFillCredentials = (empId: string, birthDate: string) => {
    setEmployeeId(empId);
    setDob(birthDate);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto shadow-lg shadow-blue-500/10">
            <Store className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Store Operations HQ
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Authorized portal for store managers, inventory supervisors, and operational agents.
          </p>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Employee ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. EMP-1042"
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all font-mono"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute right-4 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Date of Birth (YYYY-MM-DD)
            </label>
            <div className="relative">
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Sign In to Store Operations</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Helper Box */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Demo Manager Credentials</span>
            </span>
            <span>Click to auto-fill</span>
          </div>

          <div className="space-y-2">
            {SEEDED_MANAGERS.map((mgr) => (
              <button
                key={mgr.employee_id}
                type="button"
                onClick={() => handleFillCredentials(mgr.employee_id, mgr.dob)}
                className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between transition-colors group cursor-pointer"
              >
                <div>
                  <span className="font-bold text-xs text-white group-hover:text-blue-400 block">
                    {mgr.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {mgr.employee_id} • DOB: {mgr.dob}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Return to Customer Experience */}
        <div className="text-center pt-2">
          <Link
            to="/customer/home"
            onClick={() => setRole('CUSTOMER')}
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
          >
            ← Return to Customer Store
          </Link>
        </div>
      </div>
    </div>
  );
};
