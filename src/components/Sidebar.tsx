import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  ShieldAlert,
  Camera,
  BrainCircuit,
  Calculator,
  Users,
  Activity,
  Sparkles,
  GitCommit,
  Store
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';

export const Sidebar: React.FC = () => {
  const { aiRecommendations, checkoutQueues, inventory } = useApp();

  const pendingRecs = aiRecommendations.filter(r => r.status === 'pending').length;
  const congestedQueues = checkoutQueues.filter(q => q.status === 'congested' || q.estimated_wait_mins > 3.0).length;
  const stockouts = inventory.filter(i => i.quantity === 0).length;
  const openSecurity = db.getSecurityEvents().filter(e => e.status !== 'RESOLVED' && (e.severity === 'high' || e.severity === 'critical')).length;

  const links = [
    { to: '/store/dashboard', label: 'Command Center', icon: LayoutDashboard },
    { to: '/store/dashboard?tab=operations', label: 'Operations', icon: Activity, badge: congestedQueues > 0 ? 'Queue SLA' : undefined, badgeColor: 'bg-amber-500' },
    { to: '/store/dashboard?tab=inventory', label: 'Inventory', icon: Boxes, badge: stockouts > 0 ? `${stockouts} out` : undefined, badgeColor: 'bg-rose-500' },
    { to: '/store/dashboard?tab=security', label: 'Security', icon: ShieldAlert, badge: openSecurity > 0 ? `${openSecurity} Alert` : undefined, badgeColor: 'bg-rose-500' },
    { to: '/store/dashboard?tab=cctv', label: 'CCTV Surveillance', icon: Camera, badge: '5 Cams', badgeColor: 'bg-cyan-600' },
    { to: '/store/dashboard?tab=hindsight', label: 'Hindsight Memory', icon: BrainCircuit, badge: 'Active', badgeColor: 'bg-emerald-600' },
    { to: '/store/dashboard?tab=roi', label: 'ROI & Impact', icon: Calculator, badge: '₹1.09k Net', badgeColor: 'bg-emerald-600' },
    { to: '/store/dashboard?tab=employees', label: 'Employees', icon: Users },
    { to: '/store/recommendations', label: 'AI Recommendations', icon: Sparkles, badge: pendingRecs > 0 ? `${pendingRecs}` : undefined, badgeColor: 'bg-emerald-500' },
    { to: '/store/actions', label: 'Self-Adaptive Loop', icon: GitCommit, badge: 'Loop', badgeColor: 'bg-indigo-500' },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Store Header Info */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Store Agent HQ</h3>
            <p className="text-xs text-slate-400">Branch #104 - Indiranagar</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </div>
              {link.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold text-white ${link.badgeColor}`}>
                  {link.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Live AI Status Widget */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Store AI Agent Active
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">ONLINE</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Observing footfall, shelves & counter wait-times in real-time.
        </p>
      </div>
    </aside>
  );
};
