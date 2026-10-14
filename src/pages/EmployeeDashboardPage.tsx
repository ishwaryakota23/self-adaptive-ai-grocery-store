import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
  Users,
  Eye,
  Camera,
  Clock,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  UserCheck,
  Building2,
  LogOut,
  MapPin,
  Fingerprint,
  RefreshCw,
  MessageSquare,
  HelpCircle,
  FileCheck2,
  History,
  QrCode,
  BadgeAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { employeeService } from '../services/employeeService';
import { db } from '../services/db';
import { cctvManifestService } from '../services/cctvManifestService';
import { jarvisEmergencyCallService } from '../services/jarvisEmergencyCallService';
import { SecurityEvent, CCTVVideoEntry, CCTVTimelineStage } from '../types';

export const EmployeeDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentEmployee, logoutEmployee } = useApp();

  // Active Employee Profile (defaults to active in service if present)
  const employee = currentEmployee || employeeService.getCurrentEmployee() || {
    employee_id: 'EMP-1046',
    name: 'Rahul Sen',
    dob: '1995-09-28',
    role: 'Floor Associate & Security Responder',
    department: 'Operations & Security',
    qr_token: 'GROCERAI_EMP_V1:EMP-1046:sec_tok_882914',
    registered_at: '2026-09-12T09:00:00Z',
    status: 'active' as const
  };

  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>(() => db.getSecurityEvents());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [resolutionAction, setResolutionAction] = useState<'FALSE_POSITIVE' | 'CONFIRMED_INCIDENT' | 'BENIGN_CORRECTION'>('FALSE_POSITIVE');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionFeedback, setResolutionFeedback] = useState<{ eventId: string; docId: string; message: string } | null>(null);

  // Audio Voice Alert State (Requirement 8)
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState(true);
  const [lastAnnouncedEventId, setLastAnnouncedEventId] = useState<string | null>(null);

  // Urgent Manager Telephony Direct Dispatch
  const [emergencyDispatch, setEmergencyDispatch] = useState<any>(null);

  // CCTV Manifest Entries
  const cctvManifest = cctvManifestService.getManifest();

  // Subscribe to DB updates and Emergency Dispatches
  useEffect(() => {
    const unsub = db.subscribe(() => {
      setSecurityEvents(db.getSecurityEvents());
    });

    const loadDispatch = () => {
      try {
        const saved = localStorage.getItem('grocer_active_emergency_dispatch');
        if (saved) setEmergencyDispatch(JSON.parse(saved));
        else setEmergencyDispatch(null);
      } catch (e) {}
    };

    loadDispatch();
    window.addEventListener('grocer_emergency_dispatch_created', loadDispatch);
    window.addEventListener('storage', loadDispatch);

    return () => {
      unsub();
      window.removeEventListener('grocer_emergency_dispatch_created', loadDispatch);
      window.removeEventListener('storage', loadDispatch);
    };
  }, []);

  // Set default selected event
  useEffect(() => {
    if (!selectedEventId && securityEvents.length > 0) {
      const openEvent = securityEvents.find(e => e.status === 'OPEN' || !e.status);
      setSelectedEventId(openEvent ? openEvent.id : securityEvents[0].id);
    }
  }, [securityEvents, selectedEventId]);

  // Voice Alert Announcer for High / Critical Alerts (Requirement 8)
  const triggerVoiceAnnouncement = (text: string) => {
    if (!voiceAlertsEnabled) return;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Ignore audio synthesis errors
    }
  };

  // Check for new high-priority alerts to announce
  useEffect(() => {
    const openUrgent = securityEvents.find(
      e => (e.status === 'OPEN' || !e.status) && (e.severity === 'high' || e.severity === 'critical')
    );

    if (openUrgent && openUrgent.id !== lastAnnouncedEventId) {
      setLastAnnouncedEventId(openUrgent.id);
      const voiceText = openUrgent.event_type === 'CHECKOUT_QUANTITY_MISMATCH'
        ? 'Security alert. Checkout mismatch detected at Exit Verification Station. Employee verification required.'
        : openUrgent.event_type === 'POSSIBLE_PRODUCT_CONCEALMENT'
        ? 'Security alert. Possible product concealment detected in corridor. Employee verification required.'
        : openUrgent.event_type === 'ELECTRICAL_HAZARD'
        ? 'Warning. Electrical abnormality detected at Aisle 4. Safety verification required.'
        : `Security alert. ${openUrgent.event_type.replace(/_/g, ' ').toLowerCase()}. Employee verification requested.`;

      triggerVoiceAnnouncement(voiceText);
    }
  }, [securityEvents, lastAnnouncedEventId, voiceAlertsEnabled]);

  const selectedEvent = securityEvents.find(e => e.id === selectedEventId) || securityEvents[0];

  // Match corresponding CCTV video entry if exists
  const matchingVideo: CCTVVideoEntry | undefined = selectedEvent
    ? cctvManifest.find(v => v.video_id === (selectedEvent.metadata as any)?.video_id || v.expected_event === selectedEvent.event_type)
    : undefined;

  // Handle Event Resolution by Employee (Requirement 9 & 10)
  const handleResolveAlert = async (action: 'FALSE_POSITIVE' | 'CONFIRMED_INCIDENT' | 'BENIGN_CORRECTION') => {
    if (!selectedEvent) return;
    setIsResolving(true);

    try {
      const res = await employeeService.resolveSecurityAlert(
        selectedEvent.id,
        action,
        resolutionNotes,
        employee.employee_id
      );

      setIsResolving(false);
      setResolutionNotes('');
      setResolutionFeedback({
        eventId: selectedEvent.id,
        docId: res.hindsightDocId || `sec-exp-${Date.now()}`,
        message: action === 'FALSE_POSITIVE'
          ? 'Marked as False Positive. Experience committed to Security Hindsight to adapt future benign baseline.'
          : action === 'BENIGN_CORRECTION'
          ? 'Resolved as Benign Customer Correction. Customer integrity confirmed & remembered.'
          : 'Incident Confirmed. Verified evidence documented in store loss prevention ledger.'
      });

      // Clear feedback notice after 6 seconds
      setTimeout(() => {
        setResolutionFeedback(null);
      }, 6000);
    } catch (err: any) {
      console.error('Failed to resolve security alert:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const handleResolveEmergencyDispatch = async () => {
    if (!emergencyDispatch || isResolving) return;
    setIsResolving(true);
    try {
      // Find top open event or concealment event
      const events = db.getSecurityEvents();
      const targetEvent = events.find(e => e.status !== 'RESOLVED' && (e.event_type.includes('CONCEALMENT') || e.id === emergencyDispatch.incidentId)) || events[0];
      if (targetEvent) {
        await employeeService.resolveSecurityAlert(
          targetEvent.id,
          'FALSE_POSITIVE',
          'Physical aisle patrol verified shelf inventory. Item was placed back on rack. Customer shopping normally.',
          employee.employee_id
        );
      }
      const updated = { ...emergencyDispatch, status: 'RESOLVED', resolvedAt: new Date().toISOString() };
      localStorage.setItem('grocer_active_emergency_dispatch', JSON.stringify(updated));
      setEmergencyDispatch(updated);

      // Trigger JARVIS callback to manager mobile!
      jarvisEmergencyCallService.notifyEmployeeHandled();
    } catch (e) {
      console.error('Failed to resolve emergency dispatch:', e);
    } finally {
      setIsResolving(false);
    }
  };

  const openEventsCount = securityEvents.filter(e => e.status === 'OPEN' || !e.status).length;
  const resolvedCount = securityEvents.filter(e => e.status === 'RESOLVED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ===================================================================== */}
      {/* TOP BAR: EMPLOYEE ON-DUTY STATUS & CONTROLS */}
      {/* ===================================================================== */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-white">
                {employee.name}
              </h1>
              <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                {employee.employee_id}
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                PRESENT / ON DUTY
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-0.5">
              <span>{employee.role}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-500" />
                {employee.department}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <MapPin className="w-3 h-3 text-cyan-400" />
                Station: Exit Verification Bay 1
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Voice Alert Toggle */}
          <button
            onClick={() => {
              const nextState = !voiceAlertsEnabled;
              setVoiceAlertsEnabled(nextState);
              if (nextState) {
                triggerVoiceAnnouncement('Audio alerts enabled.');
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
              voiceAlertsEnabled
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle synthesized voice alerts for security events"
          >
            {voiceAlertsEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
            <span>{voiceAlertsEnabled ? 'Voice Alerts On' : 'Voice Muted'}</span>
          </button>

          {/* Test Voice Announcement */}
          <button
            onClick={() => triggerVoiceAnnouncement('Security alert. Checkout mismatch detected at Exit Verification Station 2. Employee verification required.')}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            title="Test in-browser voice synthesis"
          >
            Test Chime
          </button>

          {/* Sign Out */}
          <button
            onClick={() => {
              logoutEmployee();
              navigate('/employee/login');
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700/80 hover:border-rose-500/30 transition-colors cursor-pointer"
            title="Sign out of Employee Console"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* URGENT MANAGER DIRECT DISPATCH CARD */}
      {/* ===================================================================== */}
      {emergencyDispatch && (
        <div className={`rounded-3xl border-2 p-5 shadow-2xl transition-all ${
          emergencyDispatch.status === 'PENDING'
            ? 'bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/80 border-rose-500 animate-pulse'
            : 'bg-slate-900/90 border-emerald-500/40'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  emergencyDispatch.status === 'PENDING'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {emergencyDispatch.status === 'PENDING' ? 'URGENT MANAGER DISPATCH (FROM TRAFFIC)' : 'DISPATCH RESOLVED & NOTIFIED'}
                </span>
                <span className="text-xs text-slate-400 font-mono">Camera: {emergencyDispatch.cameraLabel}</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                {emergencyDispatch.incidentTitle} · {emergencyDispatch.location}
              </h3>
              <p className="text-xs text-slate-300">
                <strong className="text-amber-400">Manager Instruction:</strong> "{emergencyDispatch.instruction}"
              </p>
            </div>

            {emergencyDispatch.status === 'PENDING' ? (
              <button
                type="button"
                disabled={isResolving}
                onClick={handleResolveEmergencyDispatch}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 transition-all cursor-pointer transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Mark Handled & Notify Manager</span>
              </button>
            ) : (
              <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
                <span>Callback placed to Manager (+91 9618633599)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SHIFT SUMMARY METRIC CARDS */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Open Alerts</div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {openEventsCount}
          </div>
          <div className="text-[11px] text-slate-500">Awaiting verification</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Resolved Today</div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {resolvedCount}
          </div>
          <div className="text-[11px] text-slate-500">Learned by Hindsight</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Avg. Response Time</div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            44<span className="text-sm font-normal text-slate-400">s</span>
          </div>
          <div className="text-[11px] text-slate-500">Target SLA &lt; 60s</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Hindsight Memories</div>
          <div className="text-2xl font-black text-purple-400 font-mono">
            {db.getEmployeeResolutions().length}
          </div>
          <div className="text-[11px] text-slate-500">Adaptive patterns retained</div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* REAL-TIME HINDSIGHT LEARNING BANNER (Requirement 10) */}
      {/* ===================================================================== */}
      {resolutionFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white">
                {resolutionFeedback.message}
              </p>
              <p className="text-[11px] text-emerald-400/80 font-mono">
                Document ID: {resolutionFeedback.docId} · Committed to Security Hindsight
              </p>
            </div>
          </div>
          <button
            onClick={() => setResolutionFeedback(null)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MAIN TWO-COLUMN WORKFLOW: LEFT = ALERT QUEUE, RIGHT = VERIFICATION DECK */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ----------------------------------------------------------------- */}
        {/* LEFT COLUMN: ACTIVE SECURITY ALERTS QUEUE (4 cols) */}
        {/* ----------------------------------------------------------------- */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>Incoming Security Alert Feed</span>
            </h2>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              {securityEvents.length} Events
            </span>
          </div>

          <div className="space-y-2.5 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
            {securityEvents.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-semibold text-white">All Clear</p>
                <p className="text-xs text-slate-400">Zero open security discrepancies or CCTV alerts.</p>
              </div>
            ) : (
              securityEvents.map((evt) => {
                const isSelected = evt.id === selectedEventId;
                const isResolved = evt.status === 'RESOLVED';
                const severity = evt.severity?.toLowerCase();

                return (
                  <button
                    key={evt.id}
                    onClick={() => setSelectedEventId(evt.id)}
                    className={`w-full p-4 rounded-2xl text-left transition-all border cursor-pointer relative ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500/70 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : severity === 'high'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {evt.severity || 'MEDIUM'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {evt.id}
                        </span>
                      </div>

                      {isResolved ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          RESOLVED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          PENDING VERIFY
                        </span>
                      )}
                    </div>

                    {/* Neutral Title */}
                    <h3 className="font-bold text-sm text-white line-clamp-1">
                      {evt.event_type.replace(/_/g, ' ')}
                    </h3>

                    {/* Neutral Description Guarantee */}
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {evt.details}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-800/80">
                      <span>Station / Cam: {(evt.metadata as any)?.camera_id || 'EXIT-BAY-1'}</span>
                      <span>{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RIGHT COLUMN: ACTIONABLE EVENT INSPECTION & RESOLUTION (7 cols) */}
        {/* ----------------------------------------------------------------- */}
        <div className="lg:col-span-7 space-y-5">
          {selectedEvent ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              {/* Event Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      selectedEvent.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : selectedEvent.severity === 'high'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {selectedEvent.severity || 'MEDIUM'}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      ID: {selectedEvent.id}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedEvent.event_type.replace(/_/g, ' ')}
                  </h2>
                </div>

                <div className="text-right text-xs text-slate-400">
                  <div>Timestamp: <strong className="text-white">{new Date(selectedEvent.timestamp).toLocaleTimeString()}</strong></div>
                  <div>Status: <strong className={selectedEvent.status === 'RESOLVED' ? 'text-emerald-400' : 'text-amber-400'}>{selectedEvent.status || 'OPEN'}</strong></div>
                </div>
              </div>

              {/* Evidence Visual / Video / Feed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span>Optical & CCTV Evidence Stream</span>
                  </span>
                  <span className="font-mono text-[11px] text-cyan-400">
                    {(selectedEvent.metadata as any)?.camera_id || 'CAM-CHECKOUT-CV-01'}
                  </span>
                </div>

                <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center">
                  {matchingVideo ? (
                    matchingVideo.file_path.endsWith('.mp4') ? (
                      <video
                        src={matchingVideo.file_path}
                        controls
                        autoPlay
                        loop
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={matchingVideo.file_path}
                        alt="Security camera capture"
                        className="w-full h-full object-contain"
                      />
                    )
                  ) : (
                    <div className="text-center p-6 space-y-2">
                      <Camera className="w-10 h-10 text-slate-700 mx-auto" />
                      <p className="text-xs text-slate-400">Optical sensor snapshot logged</p>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-700 text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>EVIDENCE REPLAY</span>
                  </div>
                </div>
              </div>

              {/* Temporal Observation Timeline if present */}
              {matchingVideo?.temporal_timeline && matchingVideo.temporal_timeline.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Multi-Stage Temporal Detection Timeline</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {matchingVideo.temporal_timeline.map((stage: CCTVTimelineStage, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-mono">{stage.time}</span>
                          <span className={`px-1 rounded text-[9px] font-bold ${
                            stage.status === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                            stage.status === 'DETECTED' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {stage.status}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white line-clamp-1">
                          {stage.stage.replace(/_/g, ' ')}
                        </div>
                        <div className="text-[10px] text-slate-400 line-clamp-2">
                          {stage.action}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Agent Reasoning & Recommended Action */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    Security Agent Assessment
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {(selectedEvent as any).securityReasoning || selectedEvent.details}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Recommended Verification Action
                  </span>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    {selectedEvent.recommendedAction || 'Perform courteous on-site physical basket check and confirm resolution.'}
                  </p>
                </div>
              </div>

              {/* Resolution Form (Requirement 9 & 10) */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-cyan-400" />
                    <span>Employee Physical Verification & Resolution</span>
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Feeds directly into Security Hindsight
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Select Verification Outcome:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Resolution Option 1: False Positive */}
                    <button
                      type="button"
                      onClick={() => setResolutionAction('FALSE_POSITIVE')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        resolutionAction === 'FALSE_POSITIVE'
                          ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs text-cyan-400">
                        Normal / False Positive
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Item placed back or benign inspection
                      </div>
                    </button>

                    {/* Resolution Option 2: Benign Customer Correction */}
                    <button
                      type="button"
                      onClick={() => setResolutionAction('BENIGN_CORRECTION')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        resolutionAction === 'BENIGN_CORRECTION'
                          ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs text-emerald-400">
                        Benign Correction
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Customer self-corrected basket
                      </div>
                    </button>

                    {/* Resolution Option 3: Confirmed Incident */}
                    <button
                      type="button"
                      onClick={() => setResolutionAction('CONFIRMED_INCIDENT')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        resolutionAction === 'CONFIRMED_INCIDENT'
                          ? 'bg-rose-500/15 border-rose-500 text-white shadow-md shadow-rose-500/10'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs text-rose-400">
                        Confirmed Incident
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Physical mismatch or security policy
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Verification Notes:
                  </label>
                  <textarea
                    rows={2}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Enter on-site verification observation notes (e.g. Customer read label and placed item in cart; determined benign)..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <button
                  type="button"
                  disabled={isResolving}
                  onClick={() => handleResolveAlert(resolutionAction)}
                  className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isResolving ? (
                    <span>Committing to Hindsight...</span>
                  ) : (
                    <>
                      <span>Submit Resolution & Update Security Hindsight</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Select a Security Alert</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Choose an incoming alert from the left feed to inspect evidence and execute physical verification.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
