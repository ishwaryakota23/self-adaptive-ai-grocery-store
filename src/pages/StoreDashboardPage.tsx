import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
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
  TrendingDown,
  Shield,
  ShieldAlert,
  Check,
  RefreshCw,
  Mail,
  Eye,
  Calculator,
  Play,
  FileCode,
  Info,
  X,
  ChevronRight,
  HelpCircle,
  Award,
  Camera,
  Activity,
  BrainCircuit,
  Sliders,
  DollarSign,
  AlertOctagon,
  Zap,
  Smartphone,
  Car,
  Building,
  PhoneCall,
  Download,
  QrCode
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';
import { StoreAgentChat } from '../components/StoreAgentChat';
import { NativeMemoryPanel } from '../components/NativeMemoryPanel';
import { CCTVSurveillanceHub } from '../components/CCTVSurveillanceHub';
import { EmployeeOperationsPanel } from '../components/EmployeeOperationsPanel';
import { JarvisManagerCommandCenter } from '../components/JarvisManagerCommandCenter';
import { ManagerAppInstallModal } from '../components/ManagerAppInstallModal';
import { db } from '../services/db';
import { roiEngine } from '../services/roiEngine';
import { storeAgent } from '../services/storeAgent';
import { managerService } from '../services/managerService';
import { jarvisEmergencyCallService } from '../services/jarvisEmergencyCallService';
import {
  jarvisManagerService,
  ManagerCategory,
  ManagerNavigationEvent
} from '../services/jarvisManagerService';
import { RoiMetricResult, BusinessImpactSummary } from '../types';

export const StoreDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { inventory, checkoutQueues, aiRecommendations } = useApp();

  const rawTab = searchParams.get('tab') as ManagerCategory | null;
  const activeTab: ManagerCategory = rawTab || 'dashboard';

  const [securityEvents, setSecurityEvents] = useState(() => db.getSecurityEvents());
  const [businessImpact, setBusinessImpact] = useState<BusinessImpactSummary>(() =>
    roiEngine.getStoreBusinessImpactSummary()
  );
  const [selectedMetricForAudit, setSelectedMetricForAudit] = useState<RoiMetricResult | null>(null);
  const [isSimulatingLoop, setIsSimulatingLoop] = useState(false);
  const [activeLoopResult, setActiveLoopResult] = useState<{
    scenarioName: string;
    stages: Array<{ stage: string; title: string; detail: string; status: string }>;
    netImpact: string;
    hindsightDocId: string;
  } | null>(null);

  // Contextual CCTV focus state when navigated from alert or Alexa+ voice command
  const [cctvFocus, setCctvFocus] = useState<{
    videoId?: string;
    cameraId?: string;
    note?: string;
  } | null>(null);

  const [managerPresence, setManagerPresence] = useState<'ACTIVE' | 'AWAY' | 'IN_TRAFFIC'>(
    managerService.getPresence()
  );
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  useEffect(() => {
    return managerService.subscribePresence(setManagerPresence);
  }, []);

  // Desktop In-Front-Of-System Presence Heartbeat (every 2.5s)
  useEffect(() => {
    managerService.sendDesktopHeartbeat();
    const heartbeatInterval = setInterval(() => {
      managerService.sendDesktopHeartbeat();
    }, 2500);

    return () => {
      clearInterval(heartbeatInterval);
      managerService.clearDesktopHeartbeat();
    };
  }, []);

  const [activeSessions, setActiveSessions] = useState(() => db.getActiveShoppingSessions());

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setSecurityEvents([...db.getSecurityEvents()]);
      setBusinessImpact(roiEngine.getStoreBusinessImpactSummary());
      setActiveSessions([...db.getActiveShoppingSessions()]);
    });
    return unsubscribe;
  }, []);

  // Subscribe to Alexa+ navigation events (Section 4 & 11 Requirement)
  useEffect(() => {
    const unsub = jarvisManagerService.subscribeNavigation((evt: ManagerNavigationEvent) => {
      if (evt.category === 'dashboard') {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('tab');
        setSearchParams(nextParams);
      } else {
        setSearchParams({ tab: evt.category });
      }

      if (evt.category === 'cctv') {
        setCctvFocus({
          videoId: evt.cctvVideoId,
          cameraId: evt.cctvCameraId,
          note: evt.focusNote
        });
        setTimeout(() => {
          const el = document.getElementById('cctv-surveillance-hub');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
    });
    return unsub;
  }, [searchParams, setSearchParams]);

  const handleSelectTab = (tab: ManagerCategory) => {
    if (tab === 'dashboard') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('tab');
      setSearchParams(nextParams);
    } else {
      setSearchParams({ tab });
    }
  };

  const handleUpdateSecurityStatus = (id: string, status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED') => {
    db.updateSecurityEvent(id, { status });
    setSecurityEvents([...db.getSecurityEvents()]);
  };

  const handleRunMilkLoop = async () => {
    setIsSimulatingLoop(true);
    try {
      const res = await roiEngine.executeMilkEveningRestockDemonstration();
      setActiveLoopResult({
        scenarioName: 'Synthetic demo: Evening Milk Restock & Stockout Avoidance',
        stages: res.loopStages,
        netImpact: res.roiReport.metrics.netBusinessImpact?.formattedValue || 'â‚¹1,090',
        hindsightDocId: res.retainedHindsightId
      });
      setBusinessImpact(roiEngine.getStoreBusinessImpactSummary());
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulatingLoop(false);
    }
  };

  const handleRunFailedLoop = async () => {
    setIsSimulatingLoop(true);
    try {
      const res = await roiEngine.executeFailedRecommendationDemonstration();
      setActiveLoopResult({
        scenarioName: 'Part 8: Inadequate Restock Buffer Learning (Failed & Adapted)',
        stages: [
          {
            stage: 'THINK',
            title: 'Store Agent Recommends 10 Units',
            detail: 'Recommended standard 10 units for lunch produce restock without festival surge buffer.',
            status: 'COMPLETED'
          },
          {
            stage: 'DECIDE',
            title: 'Manager Approves',
            detail: 'Manager approved 10-unit replenishment.',
            status: 'COMPLETED'
          },
          {
            stage: 'ACT',
            title: 'Store Action Executed',
            detail: '10 units placed in Aisle 1 bin.',
            status: 'COMPLETED'
          },
          {
            stage: 'MEASURE',
            title: 'ROI Engine Detects Deficit',
            detail: 'Stock exhausted in 35 mins; 18 unfulfilled queries logged. Demand fulfillment dropped by -54.3 percentage points below target.',
            status: 'COMPLETED'
          },
          {
            stage: 'REMEMBER',
            title: 'Isolated synthetic Hindsight retention',
            detail: res.retainedHindsightId ? `Synthetic example retained in a separate learning-lab bank (${res.retainedHindsightId}); not production learning.` : 'Hindsight retention was not confirmed; no production learning is claimed.',
            status: res.retainedHindsightId ? 'COMPLETED' : 'FAILED'
          },
          {
            stage: 'IMPROVE',
            title: 'Production policy',
            detail: 'No production policy changed. This is a synthetic demonstration.',
            status: 'INACTIVE'
          }
        ],
        netImpact: res.roiReport.metrics.netBusinessImpact?.formattedValue || 'â‚¹800',
        hindsightDocId: res.retainedHindsightId
      });
      setBusinessImpact(roiEngine.getStoreBusinessImpactSummary());
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulatingLoop(false);
    }
  };

  const stockouts = inventory.filter(i => i.quantity === 0);
  const lowStock = inventory.filter(i => i.quantity > 0 && i.quantity <= i.reorder_threshold);
  const congestedQueues = checkoutQueues.filter(q => q.status === 'congested' || q.estimated_wait_mins > 3.0);
  const openSecurity = securityEvents.filter(e => e.status !== 'RESOLVED' && (e.severity === 'high' || e.severity === 'critical'));
  const pendingRecs = aiRecommendations.filter(r => r.status === 'pending');

  // Hourly Sales Trend Data
  const salesTrendData = [
    { time: '9 AM', sales: 12400 },
    { time: '11 AM', sales: 24800 },
    { time: '1 PM', sales: 18500 },
    { time: '3 PM', sales: 16200 },
    { time: '5 PM', sales: 28900 },
    { time: '7 PM', sales: 34500 },
    { time: '9 PM', sales: 19260 }
  ];

  // Category Distribution
  const categoryData = [
    { name: 'Dairy', value: 28, color: '#3b82f6' },
    { name: 'Fruits & Veg', value: 24, color: '#10b981' },
    { name: 'Snacks', value: 18, color: '#f59e0b' },
    { name: 'Beverages', value: 15, color: '#06b6d4' },
    { name: 'Others', value: 15, color: '#8b5cf6' }
  ];

  // =========================================================================
  // DYNAMIC IMPORTANT LIVE ALERTS (3 to 5 Current Alerts Max - Requirement 1 & 12)
  // =========================================================================
  const currentImportantAlerts = [
    // 1. Critical / High Security Alert
    ...(openSecurity.length > 0
      ? [
          {
            id: 'alert-sec-critical',
            type: 'SECURITY' as const,
            severity: 'CRITICAL' as const,
            badge: 'ðŸ”´ Critical Security Alert',
            title: openSecurity[0].details || 'Possible Product Concealment Detected',
            location: 'Camera 4 (CAM-04B) Â· Aisle 2',
            timestamp: openSecurity[0].timestamp ? new Date(openSecurity[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '14:32',
            actionText: 'Review Footage',
            onAction: () => {
              setCctvFocus({
                videoId: 'cctv_001_shoplifting_jacket',
                cameraId: 'CAM-04B',
                note: 'Camera 4 (CAM-04B) Â· High Severity Concealment at 14:32 (Concealment + exit sequence)'
              });
              handleSelectTab('cctv');
            },
            secondaryActionText: 'View Terminal',
            onSecondaryAction: () => handleSelectTab('security')
          }
        ]
      : []),

    // 2. High Priority Operational Alert (Queue SLA Breach)
    ...(congestedQueues.length > 0
      ? [
          {
            id: 'alert-op-queue',
            type: 'OPERATIONAL' as const,
            severity: 'HIGH' as const,
            badge: 'ðŸŸ  High Priority Operational Alert',
            title: `${congestedQueues[0].kiosk_name || 'Verification Kiosk 3'} Congested`,
            location: `Wait time ~${congestedQueues[0].estimated_wait_mins} min (Target SLA: 3.0 min)`,
            timestamp: 'Live',
            actionText: 'Open Kiosk 4',
            onAction: () => storeAgent.openVerificationKiosk(4),
            secondaryActionText: 'Inspect Operations',
            onSecondaryAction: () => handleSelectTab('operations')
          }
        ]
      : []),

    // 3. High Priority Inventory Deficit
    ...(stockouts.length > 0
      ? [
          {
            id: 'alert-inv-stockout',
            type: 'INVENTORY' as const,
            severity: 'HIGH' as const,
            badge: 'ðŸŸ  High Priority Operational Alert',
            title: `Critical Stockout: ${db.getProductById(stockouts[0].product_id)?.name || stockouts[0].product_id} (0 Units)`,
            location: `Aisle: ${db.getProductById(stockouts[0].product_id)?.aisle || 'Aisle 1'} â€¢ Lost sales risk`,
            timestamp: 'Real-time',
            actionText: 'Inspect Inventory',
            onAction: () => handleSelectTab('inventory'),
            secondaryActionText: 'AI Recommendations',
            onSecondaryAction: () => navigate('/store/recommendations')
          }
        ]
      : []),

    // 4. Attention Required (Store Agent Restock Recommendation)
    ...(pendingRecs.length > 0
      ? [
          {
            id: 'alert-rec-pending',
            type: 'RECOMMENDATION' as const,
            severity: 'MEDIUM' as const,
            badge: 'ðŸŸ¡ Attention Required',
            title: `Store Agent Recommendation: ${pendingRecs[0].title}`,
            location: `${pendingRecs[0].suggested_action} (${pendingRecs[0].suggested_quantity || 42} units)`,
            timestamp: 'Pending Review',
            actionText: 'Approve via Alexa+',
            onAction: () => jarvisManagerService.processManagerInput('Approve restock'),
            secondaryActionText: 'View Recommendations',
            onSecondaryAction: () => navigate('/store/recommendations')
          }
        ]
      : []),

    // 5. Live Staff Attendance Check-In Alert
    ...(db.getAttendanceRecords().slice(0, 1).map(att => ({
      id: `alert-staff-att-${att.id}`,
      type: 'OPERATIONAL' as const,
      severity: 'LOW' as const,
      badge: 'ðŸŸ¢ Staff Check-In Verified',
      title: `${att.employee_name} (${att.employee_id} - ${att.role}) checked in`,
      location: `Station: ${att.location} â€¢ Time: ${att.time_display}`,
      timestamp: 'Today',
      actionText: 'View Staff Roster',
      onAction: () => handleSelectTab('employees'),
      secondaryActionText: 'Operations',
      onSecondaryAction: () => handleSelectTab('operations')
    })))
  ].slice(0, 5);

  // Time-of-day greeting
  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  const categoryTabs: Array<{ id: ManagerCategory; label: string; icon: React.FC<any>; badge?: string; badgeColor?: string }> = [
    { id: 'dashboard', label: 'Command Center', icon: Zap },
    { id: 'operations', label: 'Operations', icon: Activity, badge: congestedQueues.length > 0 ? 'SLA Alert' : undefined, badgeColor: 'bg-amber-500' },
    { id: 'inventory', label: 'Inventory', icon: Boxes, badge: stockouts.length > 0 ? `${stockouts.length} out` : undefined, badgeColor: 'bg-rose-500' },
    { id: 'security', label: 'Security', icon: ShieldAlert, badge: openSecurity.length > 0 ? `${openSecurity.length} alert` : undefined, badgeColor: 'bg-rose-500' },
    { id: 'cctv', label: 'CCTV Surveillance', icon: Camera, badge: '5 Cams', badgeColor: 'bg-cyan-600' },
    { id: 'hindsight', label: 'Hindsight', icon: BrainCircuit, badge: 'Active', badgeColor: 'bg-emerald-600' },
    { id: 'roi', label: 'ROI & Impact', icon: Calculator, badge: 'â‚¹1.09k Net', badgeColor: 'bg-emerald-600' },
    { id: 'employees', label: 'Employees', icon: Users }
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-950 text-white">
      {/* Sidebar with all 8 manager categories */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Command Surface */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
        {/* =================================================================== */}
        {/* TOP SECTION: HELLO, MANAGER (Clean, Executive, Premium Header)      */}
        {/* =================================================================== */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                HQ COMMAND TERMINAL
              </span>
              <span className="text-slate-500 text-xs">â€¢</span>
              <span className="text-xs text-slate-400 font-mono">Branch #104 Â· Indiranagar Flagship</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
              HELLO, MANAGER
              <span className="text-emerald-400 text-lg font-mono font-normal hidden sm:inline">
                ({timeGreeting}, {managerService.getCurrentManager()?.name || 'Ishwarya Kota'})
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct Mobile: +91 {managerService.getManagerPhone()} â€¢ Executive supervisory interface â€¢ Multi-agent analytics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Manager Presence State Selector */}
            <button
              type="button"
              onClick={() => {
                const next = managerPresence === 'IN_TRAFFIC' ? 'ACTIVE' : 'IN_TRAFFIC';
                managerService.setPresence(next);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                managerPresence === 'IN_TRAFFIC'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md animate-pulse'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Toggle Manager Presence: At Desk vs In Traffic"
            >
              {managerPresence === 'IN_TRAFFIC' ? <Car className="w-3.5 h-3.5" /> : <Building className="w-3.5 h-3.5" />}
              <span>{managerPresence === 'IN_TRAFFIC' ? 'Presence: In Traffic ðŸš—' : 'Presence: At Desk ðŸ¢'}</span>
            </button>

            {/* Direct Link to Mobile Companion */}
            <Link
              to="/manager/mobile"
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Open Manager Mobile Portal"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Portal</span>
            </Link>

            {/* Install Mobile App on Phone via QR Scan */}
            <button
              type="button"
              onClick={() => setIsInstallModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Install Mobile App on Phone (Scan QR Code)"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Install Mobile App (QR)</span>
            </button>

            {/* Live Sentinel Indicators */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Sentinel: 5 Cams Active</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>4 Kiosks Flowing</span>
            </div>
          </div>
        </div>

        {/* CCTV Unattended Emergency Phone Call Banner */}
        {openSecurity.length > 0 && (
          <div className="p-4 rounded-3xl bg-gradient-to-r from-rose-950/70 via-slate-900 to-amber-950/50 border border-rose-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 shadow-lg">
                <PhoneCall className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-2">
                  <span>Critical CCTV Incident Unattended: Manager Telephony Escalation</span>
                  <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    Direct Line: +91 {managerService.getManagerPhone()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  When manager is away or in traffic, Alexa+ automatically rings mobile direct line without waiting 5 minutes.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                jarvisEmergencyCallService.initiateEmergencyCall({
                  incidentId: 'cctv_001_shoplifting_jacket',
                  incidentTitle: 'Product Concealment (Jacket / Clothing)',
                  cameraLabel: 'CAM-04B Â· Aisle 2 (Pantry & Snacks)',
                  aisle: 'Aisle 2',
                  severity: 'CRITICAL',
                  assignedEmployeeName: 'Rahul Sen'
                });
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/60 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Simulate Emergency Voice Call to Mobile</span>
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* CATEGORY NAVIGATION BAR (Tabs across all 8 systems - Section 8)    */}
        {/* =================================================================== */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {categoryTabs.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectTab(cat.id)}
                className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400/40'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
                {cat.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold text-white ${cat.badgeColor || 'bg-slate-700'}`}>
                    {cat.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* =================================================================== */}
        {/* VIEWPORT 1: COMMAND CENTER (COMPACT FIRST SCREEN - REQ 1, 2, 9, 12)  */}
        {/* =================================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 1. ALEXA+ IS THE MAIN COMMAND INTERFACE (Requirement 2) */}
            <JarvisManagerCommandCenter />

            {/* 2. IMPORTANT LIVE ALERTS (3 to 5 Current Alerts ONLY - Reqs 1 & 12) */}
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      Important Live Alerts
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 font-semibold px-2 py-0.5 rounded-full border border-rose-500/30">
                        {currentImportantAlerts.length} Unresolved
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Prioritized current exceptions across Security, Verification Kiosks, and Inventory
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 text-[11px]">Say "Hey Alexa, what needs attention?" or click below</span>
                </div>
              </div>

              {/* Dynamic Alert Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                {currentImportantAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border text-xs flex flex-col justify-between space-y-3 transition-all ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-950/30 border-rose-500/50 hover:border-rose-400/80 shadow-md ring-1 ring-rose-500/20'
                        : alert.severity === 'HIGH'
                        ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400/70 shadow-sm'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono font-bold text-[9px] uppercase ${
                            alert.severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                              : alert.severity === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30'
                          }`}
                        >
                          {alert.badge}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{alert.timestamp}</span>
                      </div>

                      <h3 className="font-bold text-white text-xs leading-snug">{alert.title}</h3>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{alert.location}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                      <button
                        type="button"
                        onClick={alert.onAction}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <span>{alert.actionText}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      {alert.secondaryActionText && (
                        <button
                          type="button"
                          onClick={alert.onSecondaryAction}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-[10px] transition-colors cursor-pointer"
                        >
                          {alert.secondaryActionText}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {currentImportantAlerts.length === 0 && (
                  <div className="col-span-full p-6 rounded-2xl bg-slate-950/70 border border-emerald-500/30 flex items-center justify-center text-center space-x-3 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>All store systems operating within optimal SLAs. Zero critical security or operational alerts.</span>
                  </div>
                )}
              </div>
            </section>

            {/* 3. EXECUTIVE SNAPSHOT (Minimal KPI Row - Screen 11 Compact Formulation) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Active In-Store
                  </span>
                  <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    Live
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white">{activeSessions.length}</div>
                <p className="text-[10px] text-slate-500">Active sessions (&lt; 2h)</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Total Sales Today</span>
                  <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    +12%
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white">â‚¹1,24,560</div>
                <p className="text-[10px] text-slate-500">415 transactions verified</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Footfall</span>
                  <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    +8%
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white">842</div>
                <p className="text-[10px] text-slate-500">Peak dwell: 6:00 PM â€“ 7:30 PM</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Inventory Health</span>
                  <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    92%
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white">
                  {stockouts.length > 0 ? `${stockouts.length} Stockouts` : 'Optimal'}
                </div>
                <p className="text-[10px] text-amber-400 font-medium">
                  {lowStock.length} SKUs below threshold
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Verification Flow</span>
                  <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    -40% wait
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white">2.3 mins</div>
                <p className="text-[10px] text-slate-500">
                  {congestedQueues.length > 0 ? 'Kiosk 3 congested' : 'All 4 verification bays clear'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* CATEGORY: OPERATIONS (Checkout Queues, Traffic & Store Agent HQ)    */}
        {/* =================================================================== */}
        {activeTab === 'operations' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  Store Operations & Verification Queues
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time verification kiosk flow, customer dwell patterns, and Store Agent supervisory HQ
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectTab('dashboard')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Back to Command Center</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Verification Kiosks & Queue Telemetry */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Live Physical Verification Kiosks</h3>
                </div>
                <span className="text-xs text-emerald-400 font-mono">4 Total Bays Active</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {checkoutQueues.map((q) => (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      q.status === 'congested'
                        ? 'bg-rose-950/20 border-rose-500/40 text-rose-200 shadow-md'
                        : q.status === 'open'
                        ? 'bg-slate-950 border-slate-800 text-slate-300'
                        : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{q.kiosk_name || `Kiosk ${q.counter_number}`}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          q.status === 'congested'
                            ? 'bg-rose-500 text-white'
                            : q.status === 'open'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>

                    <div className="text-2xl font-black font-mono text-white">
                      ~{q.estimated_wait_mins} min
                    </div>
                    <p className="text-[11px] text-slate-400">{q.customer_count} shoppers waiting</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hourly Sales Trend & Product Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Sales Trend by Hour</h3>
                    <p className="text-xs text-slate-400">Intra-day sales velocity</p>
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
                      <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `â‚¹${val / 1000}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                        formatter={(val: any) => [`â‚¹${Number(val).toLocaleString()}`, 'Sales']}
                      />
                      <Bar dataKey="sales" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

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

            {/* Store Agent Conversational Supervisory HQ */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  Store Agent Supervisory Chat
                </h3>
                <span className="text-xs text-slate-400">Deep telemetry queries & manual policy adjustments</span>
              </div>
              <StoreAgentChat />
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* CATEGORY: INVENTORY (Stockouts, Low Stock, Telemetry)               */}
        {/* =================================================================== */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-emerald-400" />
                  Store Inventory & Shelf Telemetry
                </h2>
                <p className="text-xs text-slate-400">
                  Live shelf replenishment alerts, stockout mitigation, and reorder triggers
                </p>
              </div>
              <Link to="/store/inventory" className="text-xs text-emerald-400 hover:underline">
                Open Full Catalog View â†’
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Critical Stockouts */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                    <h3 className="text-base font-bold text-white">Critical Stockout SKUs ({stockouts.length})</h3>
                  </div>
                  <span className="text-xs text-rose-400 font-mono">Immediate Action</span>
                </div>

                <div className="space-y-2.5">
                  {stockouts.map((so) => {
                    const prod = db.getProductById(so.product_id);
                    return (
                      <div key={so.id} className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <h4 className="font-bold text-white">{prod?.name || so.product_id} (Stock: 0)</h4>
                          <p className="text-[11px] text-rose-300">Aisle: {prod?.aisle || 'Shelf'} â€¢ Critical deficit</p>
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
                  {stockouts.length === 0 && (
                    <div className="p-4 rounded-xl bg-slate-950 text-center text-slate-400 text-xs">
                      Zero active stockouts recorded.
                    </div>
                  )}
                </div>
              </div>

              {/* Low Stock Approaching Threshold */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base font-bold text-white">Low Stock Approaching Threshold</h3>
                  </div>
                  <span className="text-xs text-amber-400 font-mono">{lowStock.length} SKUs</span>
                </div>

                <div className="space-y-2.5">
                  {lowStock.map((ls) => {
                    const prod = db.getProductById(ls.product_id);
                    return (
                      <div key={ls.id} className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <h4 className="font-bold text-white">{prod?.name || ls.product_id} (Stock: {ls.quantity})</h4>
                          <p className="text-[11px] text-amber-300">Reorder threshold: {ls.reorder_threshold}</p>
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
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* CATEGORY: SECURITY (Discrepancy Terminal & Sentinel Ledger)         */}
        {/* =================================================================== */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  Manager Security Terminal & Discrepancy Gate
                </h2>
                <p className="text-xs text-slate-400">
                  Live manager audit terminal for computer-vision vs digital cart quantity discrepancies & loss prevention
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCctvFocus({
                    videoId: 'cctv_001_shoplifting_jacket',
                    cameraId: 'CAM-04B',
                    note: 'Camera 4 Â· High Severity Concealment at 14:32'
                  });
                  handleSelectTab('cctv');
                }}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Switch to Live CCTV Surveillance Feeds â†’</span>
              </button>
            </div>

            {/* Active Security Incidents & Discrepancies */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">Active Incidents Requiring Review</span>
                <span className="text-xs font-mono text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {openSecurity.length} Open
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {securityEvents.map((sec) => (
                  <div
                    key={sec.id}
                    className={`p-4 rounded-2xl border text-xs space-y-3 transition-all ${
                      sec.status === 'RESOLVED'
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-300'
                        : sec.status === 'ACKNOWLEDGED'
                        ? 'bg-blue-950/30 border-blue-500/30 text-blue-200'
                        : sec.severity === 'critical'
                        ? 'bg-rose-950/50 border-rose-500/70 text-rose-100 shadow-xl ring-1 ring-rose-500/40'
                        : sec.severity === 'high'
                        ? 'bg-amber-950/30 border-amber-500/50 text-amber-100 shadow-md'
                        : 'bg-slate-900/90 border-amber-500/30 text-amber-200/90'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] uppercase ${
                          sec.status === 'RESOLVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : sec.status === 'ACKNOWLEDGED'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : sec.severity === 'critical'
                            ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          Status: {sec.status || 'OPEN'}
                        </span>

                        <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] uppercase ${
                          sec.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-black animate-pulse'
                            : sec.severity === 'high'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30'
                        }`}>
                          {sec.severity === 'critical' ? 'CRITICAL ALERT' : sec.severity === 'high' ? 'HIGH SEVERITY' : 'MEDIUM WARNING'}
                        </span>

                        {sec.emailDispatched && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-semibold">
                            <Mail className="w-3 h-3" />
                            <span>Manager Email Dispatched</span>
                          </span>
                        )}

                        <span className="font-bold text-white text-xs">{sec.details}</span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(sec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    {(sec.digital_quantity !== undefined || sec.physical_quantity !== undefined) && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase">Digital Cart</span>
                          <span className="text-white font-bold">{sec.digital_quantity} units</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase">CV Observed</span>
                          <span className="text-amber-300 font-bold">{sec.physical_quantity} units</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase">Store Inventory</span>
                          <span className="text-slate-300 font-bold">{sec.inventory_state ?? 'Available'} units</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase">Rule Triggered</span>
                          <span className="text-indigo-300 font-bold truncate block">{sec.triggering_rule || 'CROSS_CHECK'}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
                      <div className="text-slate-400">
                        Session: <span className="text-slate-200 font-mono">{sec.session_id || 'N/A'}</span>
                        {sec.recommendedAction && (
                          <div className="text-slate-300 text-[10px] mt-0.5 font-sans">
                            <strong className="text-amber-300">Action:</strong> {sec.recommendedAction}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {sec.status !== 'ACKNOWLEDGED' && sec.status !== 'RESOLVED' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateSecurityStatus(sec.id, 'ACKNOWLEDGED')}
                            className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 font-semibold rounded-lg text-[10px] transition-colors cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        )}
                        {sec.status !== 'RESOLVED' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateSecurityStatus(sec.id, 'RESOLVED')}
                            className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 font-semibold rounded-lg text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Mark Resolved</span>
                          </button>
                        )}
                        {sec.status === 'RESOLVED' && (
                          <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Resolved & Committed to Hindsight</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Sentinel Ledger */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-base text-white">Security Sentinel Ledger</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">{securityEvents.length} Total Audited Events</span>
              </div>

              <div className="space-y-2 pt-1">
                {securityEvents.slice(0, 5).map((sec) => (
                  <div
                    key={sec.id}
                    className="p-3 bg-slate-950 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{sec.details}</span>
                        <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                          sec.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          sec.severity === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {sec.severity}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Type: {sec.event_type} â€¢ ID: {sec.id}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(sec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* CATEGORY: CCTV (Live Surveillance Hub with Contextual Focus - REQ 4) */}
        {/* =================================================================== */}
        {activeTab === 'cctv' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-cyan-400" />
                  CCTV Surveillance & Optical Evidence Hub
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time multi-camera streaming, optical timeline validation, and manager loss prevention verification
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectTab('dashboard')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Back to Command Center</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Existing CCTVSurveillanceHub focused on relevant camera/incident */}
            <CCTVSurveillanceHub
              initialVideoId={cctvFocus?.videoId}
              initialCameraId={cctvFocus?.cameraId}
              focusNote={cctvFocus?.note}
              onClearFocus={() => setCctvFocus(null)}
            />
          </div>
        )}

        {/* =================================================================== */}
        {/* CATEGORY: HINDSIGHT (Learning Traces & Memory Banks - REQ 5)       */}
        {/* =================================================================== */}
        {activeTab === 'hindsight' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-emerald-400" />
                  Hindsight Experiential Memory & Adaptive Learning
                </h2>
                <p className="text-xs text-slate-400">
                  Self-adaptive experiential reflection loops across Customer, Store, and Security intelligence banks
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectTab('dashboard')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Back to Command Center</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Existing NativeMemoryPanel Component */}
            <NativeMemoryPanel />
          </div>
        )}

        {/* =================================================================== */}
        {/* CATEGORY: ROI (Deterministic Business Impact & Closed-Loop - REQ 6) */}
        {/* =================================================================== */}
        {activeTab === 'roi' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-400" />
                  Deterministic Business Impact & ROI Engine
                </h2>
                <p className="text-xs text-slate-400">
                  Deterministic arithmetic on completed store interventions â€¢ Zero AI Math â€¢ 3-Tier Classification
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectTab('dashboard')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Back to Command Center</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              {/* Controls */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <span className="text-xs text-slate-400">
                  Interventions evaluated: ACTUAL verified sales, ESTIMATED avoided stockouts, and PROJECTED margins.
                </span>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleRunMilkLoop}
                    disabled={isSimulatingLoop}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <Play className={`w-3.5 h-3.5 ${isSimulatingLoop ? 'animate-spin' : ''}`} />
                    <span>Run Milk Restock Loop (Part 7)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRunFailedLoop}
                    disabled={isSimulatingLoop}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingLoop ? 'animate-spin' : ''}`} />
                    <span>Simulate Buffer Deficit (Part 8)</span>
                  </button>
                </div>
              </div>

              {/* 5 Distinct Business Impact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Sales Opportunity Preserved */}
                <div className="bg-slate-950/80 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-4 transition-all flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Opportunity Preserved</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                      {businessImpact.totalSalesOpportunityPreserved.classification}
                    </span>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white font-mono">
                      {businessImpact.totalSalesOpportunityPreserved.formattedValue}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Avoided evening & weekend stockout losses</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMetricForAudit(businessImpact.totalSalesOpportunityPreserved)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold pt-1 border-t border-slate-800/80 cursor-pointer"
                  >
                    <span>Audit Formula</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* 2. Wastage Reduced */}
                <div className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 transition-all flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Wastage Reduced</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                      {businessImpact.totalWastageReduced.classification}
                    </span>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white font-mono">
                      {businessImpact.totalWastageReduced.formattedValue}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Perishable shelf spoilage reduction delta</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMetricForAudit(businessImpact.totalWastageReduced)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold pt-1 border-t border-slate-800/80 cursor-pointer"
                  >
                    <span>Audit Formula</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* 3. Demand Fulfillment */}
                <div className="bg-slate-950/80 border border-slate-800 hover:border-teal-500/40 rounded-2xl p-4 transition-all flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Demand Fulfillment</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase">
                      {businessImpact.overallDemandFulfillmentImprovement.classification}
                    </span>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-teal-400 font-mono">
                      {businessImpact.overallDemandFulfillmentImprovement.formattedValue}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Pure operational fulfillment rate delta</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMetricForAudit(businessImpact.overallDemandFulfillmentImprovement)}
                    className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold pt-1 border-t border-slate-800/80 cursor-pointer"
                  >
                    <span>Audit Telemetry</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* 4. Operational Cost */}
                <div className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 transition-all flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Operational Cost</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                      {businessImpact.totalOperationalCost.classification}
                    </span>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-amber-300 font-mono">
                      {businessImpact.totalOperationalCost.formattedValue}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Intervention dispatches & shelf labor</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMetricForAudit(businessImpact.totalOperationalCost)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold pt-1 border-t border-slate-800/80 cursor-pointer"
                  >
                    <span>Audit Cost Inputs</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* 5. Net Business Impact */}
                <div className="bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 border-2 border-emerald-500/50 rounded-2xl p-4 transition-all flex flex-col justify-between space-y-3 shadow-lg shadow-emerald-950/40">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-300 font-bold">Net Business Impact</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 uppercase">
                      {businessImpact.netBusinessImpact.classification} NET
                    </span>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                      {businessImpact.netBusinessImpact.formattedValue}
                    </div>
                    <p className="text-[10px] text-emerald-300/70 mt-0.5">Gross Benefit âˆ’ Operational Cost</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMetricForAudit(businessImpact.netBusinessImpact)}
                    className="text-[11px] text-emerald-300 hover:text-white flex items-center gap-1 font-bold pt-1 border-t border-emerald-500/30 cursor-pointer"
                  >
                    <span>Audit Net Formula</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* 6 Stage Visual Pipeline */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Autonomous Closed-Loop: Think â†’ Decide â†’ Act â†’ Measure â†’ Remember â†’ Improve
                  </span>
                  {activeLoopResult && (
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                      {activeLoopResult.scenarioName}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 text-xs">
                  <div className={`p-3 rounded-xl border ${activeLoopResult ? 'bg-slate-900 border-emerald-500/40' : 'bg-slate-900/60 border-slate-800'}`}>
                    <div className="text-[10px] font-mono font-bold text-slate-400">STAGE 1</div>
                    <div className="font-bold text-white mt-0.5">PAST EXPERIENCE</div>
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                      {activeLoopResult ? activeLoopResult.stages[0]?.detail : 'Hindsight store bank retains recurring stockout patterns.'}
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border ${activeLoopResult ? 'bg-slate-900 border-emerald-500/40' : 'bg-slate-900/60 border-slate-800'}`}>
                    <div className="text-[10px] font-mono font-bold text-slate-400">STAGE 2</div>
                    <div className="font-bold text-emerald-400 mt-0.5">STORE AGENT</div>
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                      {activeLoopResult ? activeLoopResult.stages[0]?.title : 'Recalls prior memory & produces structured recommendation.'}
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border ${activeLoopResult ? 'bg-slate-900 border-emerald-500/40' : 'bg-slate-900/60 border-slate-800'}`}>
                    <div className="text-[10px] font-mono font-bold text-slate-400">STAGE 3</div>
                    <div className="font-bold text-blue-400 mt-0.5">MANAGER DECISION</div>
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                      {activeLoopResult ? activeLoopResult.stages[1]?.detail : 'Human manager reviews evidence and Approves / Modifies.'}
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border ${activeLoopResult ? 'bg-slate-900 border-emerald-500/40' : 'bg-slate-900/60 border-slate-800'}`}>
                    <div className="text-[10px] font-mono font-bold text-slate-400">STAGE 4</div>
                    <div className="font-bold text-amber-400 mt-0.5">STORE ACTION</div>
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                      {activeLoopResult ? activeLoopResult.stages[2]?.detail : 'Staff replenishes shelf according to approved quantity.'}
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border ${activeLoopResult ? 'bg-slate-900 border-emerald-500/40' : 'bg-slate-900/60 border-slate-800'}`}>
                    <div className="text-[10px] font-mono font-bold text-slate-400">STAGE 5</div>
                    <div className="font-bold text-purple-400 mt-0.5">ROI ENGINE</div>
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                      {activeLoopResult ? activeLoopResult.stages[3]?.detail : 'Calculates deterministic sales opportunity & net impact.'}
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border ${activeLoopResult ? 'bg-emerald-950/40 border-emerald-500/60' : 'bg-slate-900/60 border-slate-800'}`}>
                    <div className="text-[10px] font-mono font-bold text-emerald-400">STAGE 6</div>
                    <div className="font-bold text-emerald-300 mt-0.5">NEW HINDSIGHT</div>
                    <div className="text-[10px] text-emerald-300/80 mt-1 line-clamp-2">
                      {activeLoopResult ? activeLoopResult.stages[4]?.detail : 'Outcome & learned rule committed to Store Hindsight.'}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =================================================================== */}
        {/* CATEGORY: EMPLOYEES (Operations Panel & Verification Roster)        */}
        {/* =================================================================== */}
        {activeTab === 'employees' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Employee Operations & Verification Roster
                </h2>
                <p className="text-xs text-slate-400">
                  Floor responders, exit verification shifts, task allocation, and real-time attendance
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectTab('dashboard')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Back to Command Center</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Existing EmployeeOperationsPanel Component */}
            <EmployeeOperationsPanel />
          </div>
        )}

        {/* =================================================================== */}
        {/* DRILL-DOWN FORMULA AUDIT MODAL (Used across ROI and metrics)        */}
        {/* =================================================================== */}
        {selectedMetricForAudit && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      selectedMetricForAudit.classification === 'ACTUAL'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : selectedMetricForAudit.classification === 'ESTIMATED'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    }`}>
                      {selectedMetricForAudit.classification}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Confidence: {selectedMetricForAudit.confidence}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1">
                    {selectedMetricForAudit.metricName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMetricForAudit(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Classification Definition Context */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-emerald-400 block">3-Tier Classification Context:</span>
                {selectedMetricForAudit.classification === 'ACTUAL' && (
                  <p className="text-[11px] text-slate-400">
                    ACTUAL: Directly measured from completed physical or digital store telemetry events (e.g. verified order sales, physical waste audits).
                  </p>
                )}
                {selectedMetricForAudit.classification === 'ESTIMATED' && (
                  <p className="text-[11px] text-slate-400">
                    ESTIMATED: Calculated from observed historical/business data where the avoided loss cannot be directly observed (e.g. historical unmet customer demand).
                  </p>
                )}
                {selectedMetricForAudit.classification === 'PROJECTED' && (
                  <p className="text-[11px] text-slate-400">
                    PROJECTED: Future expected impact before outcome occurs. Never shown as achieved savings.
                  </p>
                )}
              </div>

              {/* Calculated Value Display */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Calculated Result</span>
                <div className="text-3xl font-black text-white font-mono">
                  {selectedMetricForAudit.formattedValue}
                </div>
                <span className="text-[11px] text-slate-400 block font-mono mt-1">
                  Formula: <code className="text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">{selectedMetricForAudit.formula}</code>
                </span>
              </div>

              {/* Raw Inputs Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Underlying Deterministic Inputs
                </h4>
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3 space-y-1.5 text-xs font-mono">
                  {Object.entries(selectedMetricForAudit.inputs).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between py-0.5 border-b border-slate-900 last:border-0">
                      <span className="text-slate-400">{key}:</span>
                      <span className="text-white font-semibold">{String(val)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1 text-slate-500 text-[10px]">
                    <span>Data Period:</span>
                    <span>{selectedMetricForAudit.dataPeriod}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[10px]">
                    <span>Calculated Timestamp:</span>
                    <span>{new Date(selectedMetricForAudit.calculatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Transparency Guardrail Note */}
              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-300 block">Transparency Guardrail:</span>
                {selectedMetricForAudit.statusNote || 'Calculated strictly via deterministic JavaScript arithmetic without LLMs or natural language estimation.'}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMetricForAudit(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close Audit View
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manager Mobile App Installation & Remote Standby QR Modal */}
        <ManagerAppInstallModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
        />
      </main>
    </div>
  );
};

