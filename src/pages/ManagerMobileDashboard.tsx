import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Building,
  PhoneCall,
  ShieldAlert,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Users,
  ShoppingBag,
  TrendingUp,
  Camera,
  Play,
  Sparkles,
  ArrowLeft,
  Volume2,
  Bell
} from 'lucide-react';
import { managerService } from '../services/managerService';
import { jarvisEmergencyCallService } from '../services/jarvisEmergencyCallService';
import { db } from '../services/db';
import { cctvManifestService } from '../services/cctvManifestService';

export const ManagerMobileDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [presence, setPresence] = useState<'ACTIVE' | 'AWAY' | 'IN_TRAFFIC'>(
    managerService.getPresence()
  );
  const manager = managerService.getCurrentManager() || {
    name: 'Ishwarya Kota',
    phone: '9618633599',
    employee_id: 'EMP-1042',
    role: 'STORE_MANAGER',
    branch_name: 'Indiranagar Flagship Superstore #104'
  };

  const [activeDispatch, setActiveDispatch] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDesktopOnline, setIsDesktopOnline] = useState<boolean>(() =>
    managerService.isAvailableAtSystemDesk()
  );

  useEffect(() => {
    if (!managerService.isAuthenticated()) {
      navigate('/manager/login', { replace: true });
      return;
    }

    // Check PWA standalone display mode
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    setIsStandalone(Boolean(standaloneMode));

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Monitor desktop presence heartbeat every 2 seconds
    const interval = setInterval(() => {
      setIsDesktopOnline(managerService.isAvailableAtSystemDesk());
    }, 2000);

    const unsub = managerService.subscribePresence((p) => {
      setPresence(p);
    });

    const checkDispatch = () => {
      try {
        const saved = localStorage.getItem('grocer_active_emergency_dispatch');
        if (saved) setActiveDispatch(JSON.parse(saved));
      } catch (e) {}
    };

    checkDispatch();
    window.addEventListener('grocer_emergency_dispatch_created', checkDispatch);
    window.addEventListener('storage', checkDispatch);

    return () => {
      clearInterval(interval);
      unsub();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('grocer_emergency_dispatch_created', checkDispatch);
      window.removeEventListener('storage', checkDispatch);
    };
  }, [navigate]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else {
      alert("To install on iOS: Tap Share (⎋) -> 'Add to Home Screen'.\nTo install on Android: Tap Chrome Menu (⋮) -> 'Install app'.");
    }
  };

  const handleTriggerSimulatedCCTVIncident = () => {
    // 1. Ensure high severity security event exists in DB
    const topClip = cctvManifestService.getManifest().find(m => m.video_id.includes('shoplifting')) || cctvManifestService.getManifest()[0];
    
    // 2. Trigger the emergency phone call directly
    jarvisEmergencyCallService.initiateEmergencyCall({
      incidentId: topClip.video_id,
      incidentTitle: topClip.scenario_title,
      cameraLabel: topClip.camera_label,
      aisle: 'Aisle 2 (Pantry & Snacks)',
      severity: 'CRITICAL',
      assignedEmployeeName: 'Rahul Sen'
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 pb-24 max-w-lg mx-auto space-y-5 animate-fade-in">
      {/* Top Mobile Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => navigate('/store/dashboard')}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Desktop HQ</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>{isStandalone ? '📱 INSTALLED APP MODE' : 'MANAGER ON-THE-GO'}</span>
        </div>
      </div>

      {/* Install PWA Prompt Banner (if not yet standalone) */}
      {!isStandalone && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-cyan-950/60 border border-cyan-500/30 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Install Manager Sentinel App</div>
              <div className="text-[10px] text-slate-300">Run as full-screen app on home screen</div>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow transition-all shrink-0 cursor-pointer"
          >
            Install App
          </button>
        </div>
      )}

      {/* Manager Profile & Presence Status Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-3.5">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
              Logged In Manager Account
            </span>
            <h1 className="text-xl font-black text-white tracking-tight">{manager.name}</h1>
            <p className="text-xs text-slate-400 font-mono">
              Direct Line: +91 {manager.phone || '9618633599'} • {manager.employee_id}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg">
            <Car className="w-5 h-5" />
          </div>
        </div>

        {/* Presence Policy Box */}
        <div className="pt-1 space-y-2">
          {/* Mobile Status Badge */}
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" /> Mobile App Status:
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                REMOTE STANDBY (NOT AT DESK)
              </span>
            </div>
            <p className="text-[10px] text-amber-200/80 leading-relaxed">
              You are logged in on mobile. Because you are on the mobile app and not in front of the system, your status is strictly <strong>ON-THE-GO (STANDBY)</strong>.
            </p>
          </div>

          {/* Desktop Workstation Status Indicator */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-400" /> Desktop System Station:
              </span>
              {isDesktopOnline ? (
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ONLINE AT DESK
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                  OFFLINE / UNATTENDED
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              {isDesktopOnline ? (
                <span>Laptop browser session is active. In-store desk alerts are enabled.</span>
              ) : (
                <span className="text-rose-300 font-medium">
                  Desktop workstation is unattended. <strong>Automated JARVIS phone calling is ARMED</strong> to ring this phone for any critical security incident.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Live Store Telemetry Mini Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Sales Today</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-white">₹1,24,560</div>
          <span className="text-[10px] text-emerald-400 font-semibold">+12% vs yesterday</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Live Footfall</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-white">842 Shoppers</div>
          <span className="text-[10px] text-slate-400">4 Kiosks Active</span>
        </div>
      </div>

      {/* CCTV Incident Demonstration Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border border-rose-500/30 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <Camera className="w-4 h-4 animate-pulse" />
            <span>CCTV Security Sentinel</span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold">
            LIVE MONITOR
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          When fresh suspicious CCTV footage is detected while you are away or stuck in traffic, JARVIS immediately calls your direct line (+91 {manager.phone}).
        </p>

        {/* Action Trigger Button */}
        <button
          type="button"
          onClick={handleTriggerSimulatedCCTVIncident}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Simulate Suspicious CCTV Event & Call Mobile</span>
        </button>
      </div>

      {/* Active Dispatch Status Card */}
      {activeDispatch && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> Active Incident Dispatch
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/10 rounded-md">
              {activeDispatch.status}
            </span>
          </div>
          <p className="text-xs text-white font-bold">{activeDispatch.incidentTitle}</p>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Location: {activeDispatch.location}</span>
            <span>Assignee: {activeDispatch.assignedTo}</span>
          </div>
        </div>
      )}

      {/* Active Floor Employees Status */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
        <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
          <span>Active Floor Personnel</span>
          <span className="text-emerald-400 text-[10px]">1 On Duty</span>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <div>
            <div className="font-bold text-white">Rahul Sen (EMP-1046)</div>
            <div className="text-[10px] text-slate-400">Floor Associate · Aisle 2 Patrol</div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
            ACTIVE
          </span>
        </div>
      </div>
    </div>
  );
};
