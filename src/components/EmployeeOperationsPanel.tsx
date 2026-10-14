import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MapPin,
  Fingerprint,
  RefreshCw,
  BadgeAlert
} from 'lucide-react';
import { storeAgent } from '../services/storeAgent';
import { employeeService } from '../services/employeeService';
import { db } from '../services/db';
import { EmployeeOperationsSummary } from '../types';

export const EmployeeOperationsPanel: React.FC = () => {
  const [summary, setSummary] = useState<EmployeeOperationsSummary>(() =>
    storeAgent.getEmployeeOperationsSummary()
  );
  const [reallocationApplied, setReallocationApplied] = useState(false);

  useEffect(() => {
    const updateSummary = () => {
      setSummary(storeAgent.getEmployeeOperationsSummary());
    };

    updateSummary();
    const unsub = db.subscribe(updateSummary);
    return unsub;
  }, []);

  const handleApplyRecommendation = () => {
    setReallocationApplied(true);
    // Record operational action in db
    db.addOperationalAction({
      type: 'STAFF_REALLOCATION',
      description: summary.recommendation?.description || 'Reallocated Floor Associate to Exit Verification Station',
      expected_impact: 'Reduced verification latency to < 35s'
    });
    setTimeout(() => {
      setSummary(storeAgent.getEmployeeOperationsSummary());
    }, 400);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              Employee Operations & Verification Roster
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-semibold px-2 py-0.5 rounded-full border border-cyan-500/30 uppercase">
                Store Agent Operational Subsystem
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Aggregated floor staffing, live attendance, and physical verification response intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">Staff Present:</span>
          <span className="font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
            {summary.employeesPresent} / {summary.totalEmployees}
          </span>
        </div>
      </div>

      {/* Metric Cards (Requirement 12) */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
          <div className="text-[11px] text-slate-400">Employees Present</div>
          <div className="text-xl font-black text-cyan-400 font-mono">
            {summary.employeesPresent} <span className="text-xs font-normal text-slate-500">/ {summary.totalEmployees}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
          <div className="text-[11px] text-slate-400">Security Events</div>
          <div className="text-xl font-black text-white font-mono">
            {summary.securityEventsToday}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
          <div className="text-[11px] text-slate-400">Resolved by Staff</div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {summary.resolved}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
          <div className="text-[11px] text-slate-400">Pending Review</div>
          <div className="text-xl font-black text-amber-400 font-mono">
            {summary.pending}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
          <div className="text-[11px] text-slate-400">False Positives</div>
          <div className="text-xl font-black text-purple-400 font-mono">
            {summary.falsePositives}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
          <div className="text-[11px] text-slate-400">Avg Response Time</div>
          <div className="text-xl font-black text-cyan-400 font-mono">
            {summary.averageResponseTimeSec}s
          </div>
        </div>
      </div>

      {/* Store Agent Operational Staffing Recommendation (Requirement 12) */}
      {summary.recommendation && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">
                  Store Agent Operational Recommendation: {summary.recommendation.title}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  summary.recommendation.urgency === 'high' ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/20 text-cyan-300'
                }`}>
                  {summary.recommendation.urgency}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {summary.recommendation.description}
              </p>
            </div>
          </div>

          <button
            onClick={handleApplyRecommendation}
            disabled={reallocationApplied}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              reallocationApplied
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
            }`}
          >
            {reallocationApplied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reallocation Applied</span>
              </>
            ) : (
              <>
                <span>Execute Staff Reallocation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Active Employees on Floor Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
          <span>Active On-Duty Employees (Exit Verification & Floor Coverage)</span>
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Role / Department</th>
                <th className="py-2.5 px-3">Station / Location</th>
                <th className="py-2.5 px-3">Attendance</th>
                <th className="py-2.5 px-3 text-right">Verifications Handled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {summary.activeEmployees.map((emp) => (
                <tr key={emp.employee_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-white">{emp.name}</div>
                    <div className="font-mono text-[10px] text-cyan-400">{emp.employee_id}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="text-slate-200">{emp.role}</div>
                    <div className="text-[10px] text-slate-500">{emp.department}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                    {emp.location}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      emp.status === 'PRESENT'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                    {emp.eventsHandledCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
