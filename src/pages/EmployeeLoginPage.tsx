import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  AlertCircle,
  Calendar,
  ArrowRight,
  Sparkles,
  KeyRound,
  Fingerprint,
  QrCode,
  UserCheck
} from 'lucide-react';
import { employeeService } from '../services/employeeService';
import { db } from '../services/db';
import { useApp } from '../context/AppContext';

export const EmployeeLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginEmployee, setRole } = useApp();

  const [employeeId, setEmployeeId] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const res = loginEmployee(employeeId, dob);
      setLoading(false);

      if (res.success) {
        setRole('EMPLOYEE');
        navigate('/employee/dashboard');
      } else {
        setError(res.error || 'Authentication failed. Please verify your Employee ID and Date of Birth.');
      }
    }, 300);
  };

  const handleFillDemo = (empId: string, birthDate: string) => {
    setEmployeeId(empId);
    setDob(birthDate);
    setError(null);
  };

  // Get current list of employees for demo buttons
  const availableEmployees = db.getEmployees().slice(0, 4);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-500/10">
            <Fingerprint className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Operational Console Access</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Employee Mobile Login
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Authorized sign-in for exit verification officers, security responders, and store staff.
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
                placeholder="e.g. EMP-1046"
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all font-mono uppercase"
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
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Employee Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Quick Sign-In Presets (Demo Roster):</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {availableEmployees.map((emp) => (
              <button
                key={emp.employee_id}
                type="button"
                onClick={() => handleFillDemo(emp.employee_id, emp.dob)}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="font-bold text-xs text-white group-hover:text-cyan-400 transition-colors">
                    {emp.name} <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded">[{emp.employee_id}]</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {emp.role} · DOB: {emp.dob}
                  </div>
                </div>
                <span className="text-[10px] text-cyan-400 font-semibold group-hover:underline">
                  Fill →
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Switch to Kiosk or Manager */}
        <div className="pt-2 text-center flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80">
          <Link to="/kiosk" className="hover:text-emerald-400 transition-colors">
            ← Physical Kiosk
          </Link>
          <Link to="/manager/login" className="hover:text-blue-400 transition-colors">
            Manager HQ →
          </Link>
        </div>
      </div>
    </div>
  );
};
