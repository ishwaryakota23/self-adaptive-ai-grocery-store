import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Bot,
  Store,
  ShieldCheck,
  BrainCircuit,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  CreditCard,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  User,
  Smartphone,
  Monitor,
  Eye,
  Check,
  TrendingUp,
  Cpu,
  Layers,
  Clock,
  Volume2
} from 'lucide-react';

export interface StoryScene {
  id: number;
  chapter: string;
  title: string;
  agentBadge: 'CUSTOMER' | 'STORE' | 'SECURITY' | 'HINDSIGHT' | 'SYSTEM';
  agentName: string;
  summary: string;
  customerSpeech?: string;
  agentSpeech?: string;
  details: string[];
  keyTakeaway: string;
}

export const STORY_SCENES: StoryScene[] = [
  {
    id: 1,
    chapter: 'SCENE 01',
    title: 'Customer Enters the Store',
    agentBadge: 'CUSTOMER',
    agentName: 'Customer Agent',
    summary: 'The shopper enters the physical grocery store. Entrance sensors wake up the customer experience and identify the local environment.',
    details: [
      'Store environment becomes active with ambient guidance.',
      'Customer companion app links to store branch #104 telemetry.',
      'Customer Agent initializes personalized context ready for spoken requests.'
    ],
    keyTakeaway: 'Zero-friction store arrival with immediate conversational readiness.'
  },
  {
    id: 2,
    chapter: 'SCENE 02',
    title: 'Customer Talks to Customer Agent',
    agentBadge: 'CUSTOMER',
    agentName: 'Customer Agent',
    summary: 'The customer states their meal intent in natural language. Customer Agent structures it into a 4-item live shopping mission.',
    customerSpeech: '“Hi, I’m making pasta tonight.”',
    agentSpeech: '“Got it! Let’s build your dinner shopping mission with organic durum penne, cold-pressed olive oil, fresh garlic, and aged parmesan.”',
    details: [
      'Understands natural language cuisine requests.',
      'Constructs active 4-item shopping mission.',
      'Strict Invariant: Items are structured as targets, never auto-added without consent.'
    ],
    keyTakeaway: 'Conversational intent transforms into a structured, trackable shopping mission.'
  },
  {
    id: 3,
    chapter: 'SCENE 03',
    title: 'In-Store Guided Shopping & Explicit Selection',
    agentBadge: 'CUSTOMER',
    agentName: 'Customer Agent',
    summary: 'The digital store map animates an optimal route through the aisles. The customer walks to Aisle 3 and explicitly taps Add to Cart.',
    customerSpeech: '“Where is the pasta?”',
    agentSpeech: '“Pasta is in Aisle 3, Shelf B2. Follow the highlighted green path on your store map.”',
    details: [
      'Interactive 2D path: Entrance → Aisle 3 → Shelf B2.',
      'Customer reaches shelf, inspects organic penne, and explicitly confirms selection.',
      'Dynamic re-routing updates waypoint: next item (Fresh Garlic) highlighted in Aisle 1.'
    ],
    keyTakeaway: 'AI provides proactive spatial guidance; customer retains 100% selection agency.'
  },
  {
    id: 4,
    chapter: 'SCENE 04',
    title: 'Store Agent Works in Background',
    agentBadge: 'STORE',
    agentName: 'Store Agent',
    summary: 'Zooming out: while the customer shops, Store Agent monitors inventory velocity, shelf levels, and checkout queue congestion.',
    agentSpeech: '“Congestion surge detected at Verification Kiosks 1–3 (wait time: 4.8 min). Recommending: Open Verification Kiosk 4.”',
    details: [
      'Real-time aisle dwell time and checkout queue throughput monitoring.',
      'Structured operational recommendation generated for Store Manager.',
      'Manager controls: APPROVE / MODIFY / DISMISS. Upon approval, Kiosk 4 activates and queue drops to 1.4 min.'
    ],
    keyTakeaway: 'Store Agent continuously optimizes operational capacity without interrupting the shopper.'
  },
  {
    id: 5,
    chapter: 'SCENE 05',
    title: 'Security Agent Observes Physical Events',
    agentBadge: 'SECURITY',
    agentName: 'Security Agent',
    summary: 'CCTV surveillance and computer vision monitor physical store activity, detecting a temporary shelf item count difference.',
    agentSpeech: '“Notice: Optical basket count differs from digital cart. Verification required.”',
    details: [
      'Computer vision observes physical item transfer into basket.',
      'Zero accusatory language: uses strictly neutral notification terminology.',
      'Benign discrepancy resolved smoothly: Floor Associate verifies without friction.'
    ],
    keyTakeaway: 'Security operates as a benign physical-digital audit layer, not an accusatory gate.'
  },
  {
    id: 6,
    chapter: 'SCENE 06',
    title: 'Shopping Mission Completed',
    agentBadge: 'CUSTOMER',
    agentName: 'Customer Agent',
    summary: 'The shopper collects all 4 items on the shopping mission. All checklist targets turn green, and the customer initiates checkout.',
    customerSpeech: '“I’m done shopping.”',
    agentSpeech: '“Great! Your mission is 100% complete (4 of 4 items). Ready to proceed to checkout?”',
    details: [
      'Checklist completed: ✓ Organic Penne, ✓ Olive Oil, ✓ Garlic Pods, ✓ Parmesan.',
      'Shopper taps [PROCEED TO CHECKOUT].',
      'System transitions session lifecycle to CHECKOUT_REQUESTED.'
    ],
    keyTakeaway: 'Clean conclusion to in-aisle journey before heading to verification.'
  },
  {
    id: 7,
    chapter: 'SCENE 07',
    title: 'Dynamic Routing to Verification Kiosk',
    agentBadge: 'STORE',
    agentName: 'Store Agent & Companion',
    summary: 'Mobile companion guides the shopper to the least congested verification kiosk. Payment QR is strictly NOT displayed yet.',
    agentSpeech: '“Please proceed to Verification Kiosk 2 (least congested, estimated wait 1 min). Present your scannable session pass upon arrival.”',
    details: [
      'Store Agent evaluates queue depth across Kiosks 1–4.',
      'Routes customer to Verification Kiosk 2 (1 customer waiting vs 7 at Kiosk 1).',
      'Scannable Session Pass generated: GROCERAI_SESS_V1:SESS_104.'
    ],
    keyTakeaway: 'Congestion-aware routing prevents checkout bottlenecks before verification begins.'
  },
  {
    id: 8,
    chapter: 'SCENE 08',
    title: 'Same Active Session Identified at Kiosk',
    agentBadge: 'CUSTOMER',
    agentName: 'Dual-Mode Kiosk',
    summary: 'Customer presents session pass at Kiosk 2. The station instantly restores the exact same active shopping session without rescanning.',
    details: [
      'Kiosk reads GROCERAI_SESS_V1 token and binds to active session.',
      'Customer profile, digital cart (4 items), and mission context restored identically.',
      'Eliminates item rescanning and creates unified Kiosk ↔ Mobile flow.'
    ],
    keyTakeaway: 'Kiosk and mobile companion are two windows into the exact same active shopping session.'
  },
  {
    id: 9,
    chapter: 'SCENE 09',
    title: '3-Source Physical Basket Verification',
    agentBadge: 'SECURITY',
    agentName: 'Security Agent',
    summary: 'Deterministic 3-source verification compares Digital Cart vs Optical CV Tray Observation vs Authoritative Store Inventory.',
    details: [
      'Source 1: Digital Cart (4 declared items, ₹840 subtotal).',
      'Source 2: Physical Tray CV Camera (4 observed items, 99% confidence match).',
      'Source 3: Inventory State (Stock movement confirmed).',
      'Result: 100% Agreement → VERIFICATION PASSED.'
    ],
    keyTakeaway: 'Multi-source physical verification guarantees inventory integrity prior to billing.'
  },
  {
    id: 10,
    chapter: 'SCENE 10',
    title: 'Verified Demo Checkout',
    agentBadge: 'SYSTEM',
    agentName: 'Payment Authority',
    summary: 'A demo-only QR unlocks on the kiosk screen after verification passes. No payment provider is contacted.',
    details: [
      'Gating Enforced: Payment QR is strictly blocked until verification succeeds.',
      'Kiosk renders a scannable demo-only QR.',
      'Customer scans with phone → Instant payment confirmation → Order #ORD-84920 completed.'
    ],
    keyTakeaway: 'Payment is securely unlocked only when physical and digital reality are in complete sync.'
  },
  {
    id: 11,
    chapter: 'SCENE 11',
    title: 'Hindsight Experiential Vault Retention',
    agentBadge: 'HINDSIGHT',
    agentName: 'Hindsight Engine',
    summary: 'The transaction ends, but the store remembers. Rich experiential records flow from all three agents into the unified Hindsight layer.',
    details: [
      'Customer Experience: Durum Penne preference & brand acceptance recorded.',
      'Store Experience: Congestion spike mitigated by Kiosk 4 opening retained.',
      'Security Experience: Basket match and 100% verification agreement audit logged.'
    ],
    keyTakeaway: 'Every completed shopping journey converts into persistent behavioral experience.'
  },
  {
    id: 12,
    chapter: 'SCENE 12',
    title: 'The Next Visit: Customer Agent Adapts',
    agentBadge: 'CUSTOMER',
    agentName: 'Customer Agent (Visit 2)',
    summary: 'The same customer returns next week. Customer Agent’s behavior is visibly different: it proactively recommends their preferred items.',
    agentSpeech: '“Welcome back, Ishwarya! ⭐ Hindsight: Preferred Choice — We noticed you loved the Durum Penne last week. Would you like to repeat it?”',
    details: [
      'Before (Visit 1): Generic pasta options presented.',
      'After (Visit 2): Proactive personalized recommendation with Hindsight badge.',
      'Rejection learning: Suppresses items the user previously declined.'
    ],
    keyTakeaway: 'Hindsight proves itself through visible, personalized behavioral change on return visits.'
  },
  {
    id: 13,
    chapter: 'SCENE 13',
    title: 'Store Agent Adapts: Policy Convergence',
    agentBadge: 'STORE',
    agentName: 'Store Agent Learning',
    summary: 'Store Agent analyzes previous stockout and waste outcomes, converging restock policy through 4 iterations to zero waste.',
    details: [
      'Iteration 1 (30 units): Stockout on Sunday rush (28 lost requests).',
      'Iteration 2 (38 units): Reduced stockout, higher demand velocity.',
      'Iteration 3 (44 units): Over-compensated (+2 residual spoilage).',
      'Iteration 4 (42 units): CONVERGED OPTIMAL POLICY — 0 stockouts, 0 waste.'
    ],
    keyTakeaway: 'The store itself continuously refines stocking policies toward zero-loss equilibrium.'
  },
  {
    id: 14,
    chapter: 'SCENE 14',
    title: 'Security Agent Adapts: False Positive Suppression',
    agentBadge: 'SECURITY',
    agentName: 'Security Agent Learning',
    summary: 'Security Hindsight remembers verified false positives (like prolonged shelf inspection), dropping future false alarm risk from 0.72 to 0.18.',
    details: [
      'Past Event: Shopper spent 45s reading organic pasta label → Staff confirmed benign.',
      'Hindsight Memory: Linger alone without physical concealment is harmless.',
      'Future Decision: Lowers risk score to 0.18; suppresses alert to eliminate floor staff alert fatigue.'
    ],
    keyTakeaway: 'Security Hindsight eliminates annoying false alarms while remaining sharp for real anomalies.'
  },
  {
    id: 15,
    chapter: 'SCENE 15',
    title: 'The Complete Self-Adaptive Store Ecosystem',
    agentBadge: 'SYSTEM',
    agentName: 'GrocerAI Closed-Loop',
    summary: 'Pulling back to reveal the full architecture: Three specialized AI agents operating in harmony, anchored by closed-loop Hindsight.',
    details: [
      'Customer Agent creates delightful, personalized shopping journeys.',
      'Store Agent optimizes stocking and queue throughput in real time.',
      'Security Agent guarantees physical-digital truth with zero accusation.',
      'Hindsight continuously loops real-world outcomes into tomorrow’s decisions.'
    ],
    keyTakeaway: 'A grocery store that learns from what happens next — continuous, self-adaptive intelligence.'
  }
];

interface InteractiveProductStoryProps {
  onOpenGetStarted: (role?: 'CUSTOMER' | 'EMPLOYEE' | 'MANAGER') => void;
}

export const InteractiveProductStory: React.FC<InteractiveProductStoryProps> = ({ onOpenGetStarted }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [interactiveCart, setInteractiveCart] = useState<string[]>(['Organic Durum Penne']);
  const [kiosk4Approved, setKiosk4Approved] = useState(false);
  const [hasScannedKiosk, setHasScannedKiosk] = useState(false);
  const [verificationPassed, setVerificationPassed] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const timerRef = useRef<any>(null);

  const scene = STORY_SCENES[currentSceneIndex];

  // Auto-play timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentSceneIndex((prev) => (prev + 1) % STORY_SCENES.length);
      }, 5500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const handleNext = () => {
    setCurrentSceneIndex((prev) => (prev + 1) % STORY_SCENES.length);
  };

  const handlePrev = () => {
    setCurrentSceneIndex((prev) => (prev === 0 ? STORY_SCENES.length - 1 : prev - 1));
  };

  const handleSelectScene = (index: number) => {
    setCurrentSceneIndex(index);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="relative w-full bg-slate-950 py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-900 overflow-hidden select-none">
      {/* Subtle Background Ambience */}
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        {/* =================================================================== */}
        {/* PART 2 HEADER & STORY CONTROLLER BAR */}
        {/* =================================================================== */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Part 2 • Live Product Demonstration</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              ONE SHOPPING <span className="text-emerald-400">JOURNEY</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mt-1 font-light">
              Watch an end-to-end customer journey inside GrocerAI: conversational mission, background store telemetry, physical verification, and persistent behavioral Hindsight.
            </p>
          </div>

          {/* Interactive Player Controls */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-xl backdrop-blur-md">
            <button
              onClick={handlePrev}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Previous Scene"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-slate-950" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Auto-Play</span>
                </>
              )}
            </button>

            <button
              onClick={handleNext}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Next Scene"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="h-6 w-px bg-slate-800 mx-1" />

            <span className="text-xs font-mono font-semibold text-emerald-400 px-2">
              {String(scene.id).padStart(2, '0')} / 15
            </span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* CHAPTER PROGRESS SCRUBBER BAR (15 SCENES) */}
        {/* =================================================================== */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>SCENE TIMELINE SCRUBBER</span>
            <span className="text-emerald-400 font-bold">{scene.title}</span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-15 gap-1.5 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800/80">
            {STORY_SCENES.map((s, idx) => {
              const isActive = idx === currentSceneIndex;
              const isPassed = idx < currentSceneIndex;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectScene(idx)}
                  className={`group relative h-9 rounded-xl flex items-center justify-center text-xs font-mono font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 scale-105 z-10'
                      : isPassed
                      ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60'
                      : 'bg-slate-950/80 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  }`}
                  title={`${s.chapter}: ${s.title}`}
                >
                  <span>{s.id}</span>
                  {isActive && (
                    <span className="absolute -bottom-1 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* =================================================================== */}
        {/* MAIN INTERACTIVE STAGE & NARRATIVE LAYOUT */}
        {/* =================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* ----------------------------------------------------------------- */}
          {/* LEFT: INTERACTIVE SIMULATION STAGE (lg:col-span-7) */}
          {/* ----------------------------------------------------------------- */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            {/* Stage Ambient Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top Stage Bar: Telemetry & Chapter Indicator */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-800/80 relative z-10">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs font-bold tracking-wider">
                  {scene.chapter}
                </span>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  {scene.agentName}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>BRANCH #104 LIVE DEMO</span>
              </div>
            </div>

            {/* Stage Center Display (Dynamic content depending on current scene) */}
            <div className="py-8 my-auto relative z-10">
              {/* SCENE 1: ENTRANCE */}
              {scene.id === 1 && (
                <div className="space-y-6">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 h-64 bg-slate-950 flex items-center justify-center">
                    <img
                      src="/movie/scene1-walk-phone.jpg"
                      alt="Shopper entering store"
                      className="w-full h-full object-cover opacity-85"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />
                    <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Store className="w-5 h-5 text-emerald-400" />
                        <div>
                          <p className="text-xs font-bold text-white">Store Entrance Terminal Active</p>
                          <p className="text-[11px] text-slate-400">Customer Identity Recognized: Ishwarya Kota</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                        CONNECTED
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 2: TALKS TO CUSTOMER AGENT */}
              {scene.id === 2 && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 max-w-md">
                    <User className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-cyan-300">Customer (Spoken Voice):</p>
                      <p className="text-sm text-white font-medium mt-1">“Hi, I’m making pasta tonight.”</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 ml-auto max-w-md">
                    <Bot className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-400">Customer Agent:</p>
                      <p className="text-sm text-slate-200 mt-1">
                        “Got it. Let’s build your dinner mission with 4 fresh ingredients.”
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 mt-4 space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Generated Shopping Mission Targets:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-white">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Organic Durum Penne</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-white">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Cold-Pressed Olive Oil</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-white">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Fresh Garlic Pods</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-white">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Aged Parmesan Cheese</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-400/90 font-mono mt-1">
                      ⚠️ Invariant: Target list created — never auto-added to cart without customer action.
                    </p>
                  </div>
                </div>
              )}

              {/* SCENE 3: IN-STORE NAVIGATION & SELECTION */}
              {scene.id === 3 && (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 h-52 bg-slate-950 flex items-center justify-center">
                    <img
                      src="/movie/scene2-reach-shelf.jpg"
                      alt="Reaching for shelf in aisle 3"
                      className="w-full h-full object-cover opacity-85"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30" />
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Waypoint: Aisle 3 • Shelf B2</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Organic Durum Penne (500g)</p>
                      <p className="text-xs text-slate-400">₹85 • In Stock (42 units)</p>
                    </div>
                    <button
                      onClick={() => {
                        if (!interactiveCart.includes('Organic Durum Penne')) {
                          setInteractiveCart([...interactiveCart, 'Organic Durum Penne']);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      {interactiveCart.includes('Organic Durum Penne') ? '✓ Added by Customer' : '+ Add to Cart'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Next route recalculation: garlic is located in Aisle 1 (Fresh Produce).
                  </p>
                </div>
              )}

              {/* SCENE 4: STORE AGENT WORKS IN BACKGROUND */}
              {scene.id === 4 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-blue-400" />
                        <span className="text-xs font-bold text-blue-300">Store Agent Operational Intelligence</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-mono font-bold">
                        SURGE DETECTED
                      </span>
                    </div>
                    <p className="text-sm text-slate-200">
                      Verification Kiosks 1–3 experiencing queue surge (wait time: 4.8 min). SLA threshold is 2.0 min.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Store Agent Structured Recommendation:
                    </p>
                    <p className="text-sm text-white font-medium">
                      “Open Verification Kiosk 4 immediately to rebalance throughput.”
                    </p>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => setKiosk4Approved(true)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          kiosk4Approved
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40'
                        }`}
                      >
                        {kiosk4Approved ? '✓ APPROVED: KIOSK 4 ACTIVE' : 'APPROVE'}
                      </button>
                      <button className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider">
                        MODIFY
                      </button>
                      <button className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider">
                        DISMISS
                      </button>
                    </div>

                    <p className="text-[11px] text-emerald-400/90 font-mono">
                      {kiosk4Approved
                        ? 'Impact: Average verification dwell time dropped to 1.4 mins. Zero checkout abandonment.'
                        : 'Store Agent recommends. Store Manager decides.'}
                    </p>
                  </div>
                </div>
              )}

              {/* SCENE 5: SECURITY AGENT WORKS IN BACKGROUND */}
              {scene.id === 5 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-amber-400" />
                        <span className="text-xs font-bold text-amber-300">CCTV Telemetry: CAM-CHECKOUT-CV-01</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-mono font-bold">
                        NON-ACCUSATORY
                      </span>
                    </div>
                    <p className="text-sm text-slate-200">
                      Physical basket observation differs from digital declared cart.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Neutral Security Notice to Floor Staff:
                    </p>
                    <p className="text-sm text-white font-medium">
                      “Quantity discrepancy detected. Verification required. Please assist customer with basket review.”
                    </p>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
                      ✓ Resolution: Customer updated cart count. Zero accusatory friction.
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 6: FINISHES SHOPPING */}
              {scene.id === 6 && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        Mission Status: 100% Complete
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold">
                        READY
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-medium text-white">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Organic Penne</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Cold-Pressed Olive Oil</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Fresh Garlic Pods</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Aged Parmesan</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleNext}
                      className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/25 flex items-center gap-2 cursor-pointer"
                    >
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* SCENE 7: ROUTE TO VERIFICATION KIOSK */}
              {scene.id === 7 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                      <MapPin className="w-4 h-4" />
                      <span>Optimal Kiosk Guidance</span>
                    </div>
                    <p className="text-sm text-white font-medium">
                      “Please proceed to Verification Kiosk 2 (Queue: 1 shopper • Estimated Wait: 1.0 min).”
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Scannable Session Pass
                      </span>
                      <span className="text-xs font-mono text-emerald-400">NO PAYMENT QR YET</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <QrCode className="w-8 h-8 text-emerald-400" />
                        <div>
                          <p className="text-xs font-mono font-bold text-white">GROCERAI_SESS_V1:SESS_104</p>
                          <p className="text-[11px] text-slate-400">Valid for kiosk handoff</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono">
                        STANDBY
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-400/90 font-mono">
                      🔒 Invariant: Demo checkout QR is strictly forbidden prior to physical verification.
                    </p>
                  </div>
                </div>
              )}

              {/* SCENE 8: SAME ACTIVE SESSION AT KIOSK */}
              {scene.id === 8 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                        <Monitor className="w-4 h-4" />
                        <span>Verification Kiosk #02 Screen</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-mono">
                        SESSION RECOGNIZED
                      </span>
                    </div>
                    <p className="text-sm text-white font-medium">
                      Active Shopping Session Restored: <span className="text-emerald-400 font-mono">SESS_104</span>
                    </p>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
                      <p>• Shopper: Ishwarya Kota (Verified Token)</p>
                      <p>• Active Cart: 4 items declared (₹840)</p>
                      <p>• Zero Rescanning Required: Kiosk loads digital cart automatically.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 9: 3-SOURCE VERIFICATION */}
              {scene.id === 9 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-slate-400 text-[11px]">Digital Cart</p>
                      <p className="text-sm font-bold text-white mt-1">4 Items</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-slate-400 text-[11px]">Physical CV</p>
                      <p className="text-sm font-bold text-emerald-400 mt-1">4 Observed</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-slate-400 text-[11px]">Store Inventory</p>
                      <p className="text-sm font-bold text-cyan-400 mt-1">Stock Verified</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-1">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 mb-1">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-base font-black text-white">100% BASKET AGREEMENT</p>
                    <p className="text-xs text-emerald-300 font-mono">VERIFICATION PASSED • UNLOCKING PAYMENT QR</p>
                  </div>
                </div>
              )}

              {/* SCENE 10: PAYMENT COMPLETION */}
              {scene.id === 10 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase">
                        Payment Ready on Kiosk
                      </span>
                      <h4 className="text-lg font-bold text-white">Scan with Mobile to Pay</h4>
                      <p className="text-xs text-slate-400 font-mono">Demo checkout • Session verified • ₹840</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-white flex items-center justify-center shadow-xl">
                      <QrCode className="w-24 h-24 text-slate-950" />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                    <span>✓ Demo checkout confirmed (no payment)</span>
                    <span className="font-mono font-bold">RECEIPT DISPATCHED</span>
                  </div>
                </div>
              )}

              {/* SCENE 11: HINDSIGHT REVEAL */}
              {scene.id === 11 && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      <BrainCircuit className="w-5 h-5 text-emerald-400" />
                      <span>Hindsight Experiential Vault</span>
                    </div>
                    <p className="text-sm text-slate-200">
                      The transaction is complete, but GrocerAI retains the real-world outcome as permanent experience across all 3 domains.
                    </p>

                    <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[11px] font-mono">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300">
                        Customer Bank<br /><span className="text-slate-400">Dietary Preference</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-blue-300">
                        Store Bank<br /><span className="text-slate-400">Kiosk 4 Scaling</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-300">
                        Security Bank<br /><span className="text-slate-400">Zero Dispute Rate</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 12: NEXT VISIT CUSTOMER AGENT ADAPTS */}
              {scene.id === 12 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 opacity-60">
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Visit 1 (Before Hindsight):</p>
                      <p className="text-slate-300 leading-relaxed">
                        “Here are 15 generic pasta options in stock.”
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Visit 2 (After Hindsight):</span>
                      </div>
                      <p className="text-white font-medium leading-relaxed">
                        “Welcome back, Ishwarya! ⭐ <span className="text-emerald-400 font-bold">Hindsight: Preferred Choice</span> — Recommending Durum Penne and Artisan Sourdough based on your past favorites.”
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono text-center">
                    Behavioral proof: The Customer Agent actively adapts recommendations from past feedback.
                  </p>
                </div>
              )}

              {/* SCENE 13: STORE AGENT ADAPTS POLICY CONVERGENCE */}
              {scene.id === 13 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-3">
                    <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                      Store Agent Restock Policy Convergence (Paneer):
                    </p>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <p className="text-slate-400">Iter 1</p>
                        <p className="text-sm font-bold text-red-400 mt-1">30 units</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Stockout</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <p className="text-slate-400">Iter 2</p>
                        <p className="text-sm font-bold text-amber-400 mt-1">38 units</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Low Stock</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <p className="text-slate-400">Iter 3</p>
                        <p className="text-sm font-bold text-orange-400 mt-1">44 units</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">+2 Waste</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                        <p className="text-emerald-400 font-bold">Iter 4</p>
                        <p className="text-sm font-black text-emerald-400 mt-1">42 units</p>
                        <p className="text-[10px] text-emerald-300 font-bold mt-0.5">OPTIMAL</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-400/90 font-mono text-center">
                      ✓ Converged: 0 stockouts, 0 waste, 100% demand satisfaction.
                    </p>
                  </div>
                </div>
              )}

              {/* SCENE 14: SECURITY AGENT ADAPTS */}
              {scene.id === 14 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
                    <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Security Hindsight False-Positive Suppression:
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <p className="font-bold text-slate-400">Linger Pattern (Before):</p>
                        <p className="text-red-400 font-mono">Risk Score: 0.72 (False Alarm)</p>
                        <p className="text-[11px] text-slate-500">Unnecessary staff alert raised.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                        <p className="font-bold text-emerald-300">Linger Pattern (After):</p>
                        <p className="text-emerald-400 font-mono">Risk Score: 0.18 (Suppressed)</p>
                        <p className="text-[11px] text-emerald-400/80">Recognized as label reading; zero alert fatigue.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 15: COMPLETE CLOSED LOOP */}
              {scene.id === 15 && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-cyan-950/40 border border-emerald-500/40 text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Full Autonomous Ecosystem</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      The Self-Adaptive Grocery Operating System
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto font-light leading-relaxed">
                      Every customer interaction, operational decision, and security check forms a continuous feedback loop that makes GrocerAI smarter every day.
                    </p>

                    <div className="pt-2">
                      <button
                        onClick={() => onOpenGetStarted()}
                        className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-sm shadow-xl shadow-emerald-500/25 cursor-pointer transform hover:-translate-y-0.5 transition-all"
                      >
                        EXPERIENCE GROCERAI NOW →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stage Bottom Bar: Key Takeaway */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 relative z-10">
              <span className="font-mono text-emerald-400 font-semibold">
                KEY INVARIANT: {scene.keyTakeaway}
              </span>
              <button
                onClick={handleNext}
                className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Next Scene</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* RIGHT: NARRATIVE STORY CARD & EXPLANATION (lg:col-span-5) */}
          {/* ----------------------------------------------------------------- */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <div className="space-y-5">
              {/* Scene Badge & Chapter */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
                  {scene.chapter} OF 15
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    scene.agentBadge === 'CUSTOMER'
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                      : scene.agentBadge === 'STORE'
                      ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
                      : scene.agentBadge === 'SECURITY'
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                      : 'bg-purple-500/15 border border-purple-500/30 text-purple-400'
                  }`}
                >
                  {scene.agentName}
                </span>
              </div>

              {/* Title & Summary */}
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                  {scene.title}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed font-light">
                  {scene.summary}
                </p>
              </div>

              {/* Dialogue Box (If present) */}
              {(scene.customerSpeech || scene.agentSpeech) && (
                <div className="space-y-2.5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
                  {scene.customerSpeech && (
                    <div className="flex items-start gap-2 text-cyan-300">
                      <User className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{scene.customerSpeech}</span>
                    </div>
                  )}
                  {scene.agentSpeech && (
                    <div className="flex items-start gap-2 text-emerald-300">
                      <Bot className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{scene.agentSpeech}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Key Bullet Details */}
              <div className="space-y-2.5 pt-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  What Happens in This Scene:
                </p>
                <ul className="space-y-2">
                  {scene.details.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <button
                onClick={handlePrev}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                ← Prev Scene
              </button>

              <button
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <span>{scene.id === 15 ? 'Restart Story' : 'Next Scene'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
