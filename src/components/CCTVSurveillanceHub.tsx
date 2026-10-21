import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Video,
  Eye,
  Camera,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Zap,
  Activity,
  Maximize2,
  BrainCircuit,
  Filter,
  Check,
  Volume2,
  VolumeX,
  Sparkles
} from 'lucide-react';
import { cctvManifestService, CCTV_MANIFEST } from '../services/cctvManifestService';
import { CCTVVideoEntry, CCTVCameraStatus, SecurityEvent } from '../types';
import { db } from '../services/db';

export interface CCTVSurveillanceHubProps {
  initialVideoId?: string;
  initialCameraId?: string;
  focusEventId?: string;
  focusNote?: string;
  onClearFocus?: () => void;
}

export const CCTVSurveillanceHub: React.FC<CCTVSurveillanceHubProps> = ({
  initialVideoId,
  initialCameraId,
  focusEventId,
  focusNote,
  onClearFocus
}) => {
  const manifest = cctvManifestService.getManifest();
  const [selectedVideoId, setSelectedVideoId] = useState<string>(initialVideoId || 'cctv_001_shoplifting_jacket');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(10);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [activeEvent, setActiveEvent] = useState<SecurityEvent | null>(null);
  const [managerActionTaken, setManagerActionTaken] = useState<string | null>(null);
  const [cameraStatuses, setCameraStatuses] = useState<CCTVCameraStatus[]>(() => cctvManifestService.getCameras());

  const videoRef = useRef<HTMLVideoElement>(null);
  const selectedVideo = cctvManifestService.getVideoById(selectedVideoId) || manifest[0];

  // Update selected video if initialVideoId or initialCameraId prop changes
  useEffect(() => {
    if (initialVideoId) {
      setSelectedVideoId(initialVideoId);
    } else if (initialCameraId) {
      const match = manifest.find(
        (v) =>
          v.camera_id.toLowerCase().includes(initialCameraId.toLowerCase()) ||
          v.camera_label.toLowerCase().includes(initialCameraId.toLowerCase())
      );
      if (match) {
        setSelectedVideoId(match.video_id);
      }
    }
  }, [initialVideoId, initialCameraId]);

  // Refresh cameras and process event on video selection
  useEffect(() => {
    let isMounted = true;
    cctvManifestService.processCCTVVideo(selectedVideo).then((res) => {
      if (isMounted) {
        setActiveEvent(res.securityEvent);
        setCameraStatuses(cctvManifestService.getCameras());
        setManagerActionTaken(null);
      }
    });

    // Reset player state
    setCurrentTime(0);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [selectedVideoId]);

  // Video time tracking
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 10);
    }
  };

  // Simulating time tracking for GIFs/Images
  useEffect(() => {
    if (!selectedVideo.file_path.endsWith('.mp4') && isPlaying) {
      const interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.5;
          return next > 12 ? 0 : next;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [selectedVideo.file_path, isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const handleReplay = () => {
    setCurrentTime(0);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleManagerAction = async (action: 'CONFIRM_INCIDENT' | 'FALSE_POSITIVE' | 'DISMISS' | 'RESOLVED') => {
    if (!activeEvent) return;
    await cctvManifestService.handleManagerAction(activeEvent.id, action);
    setManagerActionTaken(action);
    setCameraStatuses(cctvManifestService.getCameras());
  };

  // Filter video selector
  const filteredVideos = manifest.filter((v) => {
    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'NORMAL') return v.severity === 'LOW';
    if (filterCategory === 'SECURITY') return v.scenario_type.includes('concealment') || v.scenario_type.includes('shoplifting');
    if (filterCategory === 'SAFETY') return v.scenario_type.includes('fight') || v.scenario_type.includes('confrontation');
    if (filterCategory === 'HAZARD') return v.scenario_type.includes('circuit') || v.scenario_type.includes('outage');
    if (filterCategory === 'CHECKOUT') return v.scenario_type.includes('checkout');
    if (filterCategory === 'FALSE_POSITIVE') return v.scenario_type.includes('false_positive');
    return true;
  });

  return (
    <div id="cctv-surveillance-hub" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight">
                CCTV Surveillance & Security Sentinel
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                DEMO CCTV
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic temporal observation & visual evidence reasoning pipeline across 5 store camera feeds
            </p>
          </div>
        </div>

        {/* Live System Indicator */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300 font-mono">5 Cameras Online</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-bold">Security Agent Active</span>
          </div>
        </div>
      </div>

      {/* Contextual CCTV Incident Focus Banner (Section 4 Requirement) */}
      {focusNote && (
        <div className="bg-gradient-to-r from-cyan-950/90 via-slate-900 to-slate-900 border-2 border-cyan-500/70 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-cyan-200 shadow-xl shadow-cyan-950/60 ring-2 ring-cyan-400/30">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <div>
              <div className="font-mono text-[10px] text-cyan-400 font-black uppercase tracking-wider flex items-center gap-2">
                <span>🎯 AI Contextual Camera & Evidence Focus</span>
                <span className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40">Active Stream</span>
              </div>
              <div className="text-white font-bold text-sm mt-0.5">
                {focusNote}
              </div>
              <div className="text-cyan-300/80 text-[11px] mt-0.5 font-sans">
                Camera feed focused directly to target incident, optical timeline evidence markers, and loss prevention protocol.
              </div>
            </div>
          </div>
          {onClearFocus && (
            <button
              type="button"
              onClick={onClearFocus}
              className="px-3 py-1.5 rounded-xl bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-500/40 font-semibold text-xs transition-colors cursor-pointer self-end sm:self-center"
            >
              Reset Focus
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CAMERA GRID (5 Core CCTV Stations) */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span>Surveillance Camera Feeds</span>
          <span className="text-[10px] text-slate-500">Select camera to inspect live feed</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {cameraStatuses.map((cam) => {
            const isSelected = selectedVideo.camera_id === cam.camera_id;
            return (
              <button
                key={cam.camera_id}
                onClick={() => {
                  const match = manifest.find((v) => v.camera_id === cam.camera_id);
                  if (match) setSelectedVideoId(match.video_id);
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-white">{cam.camera_id}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      cam.status === 'CRITICAL'
                        ? 'bg-rose-500 animate-ping'
                        : cam.status === 'HIGH_ALERT'
                        ? 'bg-amber-400 animate-pulse'
                        : cam.status === 'WARNING'
                        ? 'bg-yellow-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-300 truncate">{cam.name}</div>
                  <div className="text-[9px] text-slate-500 truncate">{cam.location}</div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span
                    className={`text-[9px] font-mono font-bold uppercase ${
                      cam.status === 'CRITICAL'
                        ? 'text-rose-400'
                        : cam.status === 'HIGH_ALERT'
                        ? 'text-amber-400'
                        : cam.status === 'WARNING'
                        ? 'text-yellow-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {cam.status}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">DEMO CCTV</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CCTV VIDEO SELECTOR (Filterable by Scenario) */}
      {/* ========================================================================= */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 flex items-center gap-1 mr-2 text-xs font-semibold">
              <Filter className="w-3.5 h-3.5" /> Filter Scenario:
            </span>
            {[
              { id: 'ALL', label: 'All Feeds (17)' },
              { id: 'SECURITY', label: 'Concealment / Shoplifting' },
              { id: 'SAFETY', label: 'Fight / Confrontation' },
              { id: 'HAZARD', label: 'Electrical / Blackout' },
              { id: 'CHECKOUT', label: 'Checkout Mismatch' },
              { id: 'FALSE_POSITIVE', label: 'False Positive' },
              { id: 'NORMAL', label: 'Normal Shopping' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                  filterCategory === cat.id
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Selected Video: <span className="text-emerald-400 font-bold">{selectedVideo.file_name}</span>
          </span>
        </div>

        {/* Quick Video Selector Strip */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {filteredVideos.map((vid) => {
            const isCurrent = vid.video_id === selectedVideo.video_id;
            return (
              <button
                key={vid.video_id}
                onClick={() => setSelectedVideoId(vid.video_id)}
                className={`shrink-0 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  isCurrent
                    ? 'bg-slate-800 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    vid.severity === 'CRITICAL'
                      ? 'bg-rose-500'
                      : vid.severity === 'HIGH'
                      ? 'bg-amber-400'
                      : vid.severity === 'MEDIUM'
                      ? 'bg-yellow-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <div>
                  <div className="text-xs font-bold text-slate-200 truncate max-w-[190px]">
                    {vid.scenario_title}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                    <span>{vid.camera_id}</span>
                    <span>•</span>
                    <span>{vid.file_name.endsWith('.mp4') ? 'VIDEO' : vid.file_name.endsWith('.gif') ? 'GIF' : 'SNAPSHOT'}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN CCTV PLAYER & EVIDENCE INSPECTION CENTER */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: CCTV PLAYER (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group">
            {/* Real HTML5 Video Player for MP4 files */}
            {selectedVideo.file_path.endsWith('.mp4') ? (
              <video
                ref={videoRef}
                src={selectedVideo.file_path}
                onTimeUpdate={handleTimeUpdate}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              /* High-Fidelity Animated GIF / Snapshot Player */
              <img
                src={selectedVideo.file_path}
                alt={selectedVideo.scenario_title}
                className="w-full h-full object-contain bg-slate-950"
              />
            )}

            {/* Top On-Screen CCTV Telemetry Overlay */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs pointer-events-none z-20">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-white font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-bold">{selectedVideo.camera_id}</span>
                <span className="text-white/40">|</span>
                <span className="text-rose-400 font-bold">REC</span>
                <span className="text-white/60">
                  {new Date().toLocaleTimeString([], { hour12: false })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold text-amber-300 uppercase">
                  DEMO CCTV
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[10px] uppercase backdrop-blur-md ${
                    selectedVideo.severity === 'CRITICAL'
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                      : selectedVideo.severity === 'HIGH'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-500/50'
                      : selectedVideo.severity === 'MEDIUM'
                      ? 'bg-yellow-950/80 text-yellow-300 border border-yellow-500/50'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                  }`}
                >
                  {selectedVideo.severity} SEVERITY
                </span>
              </div>
            </div>

            {/* Bottom Scrim Gradient for Playback Bar */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />

            {/* Player Controls Bar */}
            <div className="absolute bottom-3 inset-x-4 flex items-center gap-3 z-20 text-white text-xs">
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={handleReplay}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
                title="Replay Video"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Seek Slider */}
              <input
                type="range"
                min="0"
                max={duration || 10}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 accent-emerald-400 cursor-pointer h-1.5 bg-white/20 rounded-lg"
              />

              {/* Timecode display */}
              <span className="font-mono text-[11px] text-slate-300">
                {Math.floor(currentTime / 60)}:
                {Math.floor(currentTime % 60)
                  .toString()
                  .padStart(2, '0')}{' '}
                /{' '}
                {Math.floor((duration || 10) / 60)}:
                {Math.floor((duration || 10) % 60)
                  .toString()
                  .padStart(2, '0')}
              </span>

              {selectedVideo.file_path.endsWith('.mp4') && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Under-Video Camera Metadata */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400">Station:</span>{' '}
              <span className="font-bold text-white">{selectedVideo.camera_label}</span>
            </div>
            <div className="font-mono text-slate-500 text-[11px]">
              Source: <span className="text-slate-300">{selectedVideo.file_path}</span>
            </div>
          </div>
        </div>

        {/* RIGHT: SECURITY AGENT INVESTIGATION & REASONING CENTER (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
            {/* Header: Detection Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    selectedVideo.severity === 'CRITICAL'
                      ? 'bg-rose-500 animate-ping'
                      : selectedVideo.severity === 'HIGH'
                      ? 'bg-amber-400 animate-pulse'
                      : selectedVideo.severity === 'MEDIUM'
                      ? 'bg-yellow-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <h3 className="font-black text-sm text-white">
                  {selectedVideo.scenario_title}
                </h3>
              </div>

              <span className="font-mono text-[10px] text-slate-500">
                Confidence: {Math.round((selectedVideo.confidence || 0.9) * 100)}%
              </span>
            </div>

            {/* Event Description */}
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
              {selectedVideo.description}
            </p>

            {/* Temporal Timeline */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Temporal Detection Timeline</span>
              </h4>

              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {selectedVideo.temporal_timeline.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-[11px]"
                  >
                    <span className="font-mono text-[10px] text-emerald-400 shrink-0 font-bold">
                      {step.timestamp}
                    </span>
                    <div className="flex-1">
                      <div className="text-white font-medium">{step.action}</div>
                      <span className="text-[9px] text-slate-500 uppercase font-mono">
                        Stage: {step.stage} • Status: {step.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Agent Reasoning */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                <span>Security Agent Evidence Reasoning</span>
              </h4>
              <div className="text-xs text-slate-200 bg-indigo-950/20 border border-indigo-500/30 p-3 rounded-2xl leading-relaxed">
                "{selectedVideo.security_reasoning}"
              </div>
            </div>

            {/* Rule Triggered & Recommended Action */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">Triggering Rule:</span>
                <span className="text-indigo-300 font-bold">{selectedVideo.expected_event}</span>
              </div>
              <div className="text-slate-300 text-xs pt-1">
                <strong className="text-amber-400">Action:</strong> {selectedVideo.recommended_action}
              </div>
            </div>

            {/* Email Alert Event Indicator (Sections 22 & 23) */}
            {selectedVideo.email_required && (
              <div className="p-2.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold">Manager Email Alert Event Queued</div>
                  <div className="text-[10px] text-slate-400">
                    High/Critical event registered; email payload prepared in authoritative pipeline.
                  </div>
                </div>
              </div>
            )}

            {/* Store Agent Operational Bridge (Section 26) */}
            {selectedVideo.operational_impact && (
              <div className="p-2.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center gap-2.5 text-xs text-cyan-300">
                <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="font-bold">Store Agent Operational Directive</div>
                  <div className="text-[10px] text-slate-300">
                    {selectedVideo.store_impact}
                  </div>
                </div>
              </div>
            )}

            {/* Manager Review Controls (Sections 24 & 25) */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Manager Review:</span>
                {managerActionTaken && (
                  <span className="text-emerald-400 text-xs font-bold font-mono">
                    Recorded: {managerActionTaken}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleManagerAction('CONFIRM_INCIDENT')}
                  className="py-2 px-3 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Confirm Incident</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleManagerAction('FALSE_POSITIVE')}
                  className="py-2 px-3 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>False Positive</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleManagerAction('RESOLVED')}
                  className="col-span-2 py-2 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Resolve & Retain in Security Hindsight</span>
                </button>
              </div>

              {managerActionTaken === 'FALSE_POSITIVE' && (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                  <strong className="text-amber-300">Hindsight Learning Retained:</strong> Documented as benign customer browsing. Future similar dwell-times in Aisle 1 will not trigger heightened suspicion.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
