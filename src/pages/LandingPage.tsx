import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  Store,
  Compass,
  MapPin,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Play,
  BrainCircuit,
  TrendingUp,
  Boxes
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { managerService } from '../services/managerService';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setRole, setIsDemoTourOpen } = useApp();

  const handleEnterStore = () => {
    setRole('CUSTOMER');
    navigate('/interaction');
  };

  const handleManagerDashboard = () => {
    if (managerService.isAuthenticated()) {
      setRole('STORE_MANAGER');
      navigate('/store/dashboard');
    } else {
      navigate('/manager/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500 selection:text-slate-950">
      {/* Hero Section (Matching Screen 1) */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Supermarket Background with Cinematic Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1800&auto=format&fit=crop&q=80"
            alt="Intelligent Grocery Store"
            className="w-full h-full object-cover object-center filter brightness-[0.38] contrast-125 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/80" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 pb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse-subtle">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Self-Adaptive AI Grocery Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            <span className="text-white">Grocer</span>
            <span className="text-emerald-400">AI</span>
            <span className="block text-2xl sm:text-4xl lg:text-5xl font-bold text-slate-200 mt-2">
              Your Smart Grocery Companion
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-300 font-light mb-10 leading-relaxed">
            AI agents, Personalized shopping, Smarter stores. Continuous closed-loop intelligence from customer request to autonomous shelf replenishment.
          </p>

          {/* Hero Action Buttons (Screen 1 exact buttons) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={handleEnterStore}
              className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-base shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <span>Enter Store</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsDemoTourOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900/90 hover:bg-slate-800 text-white font-semibold rounded-2xl text-base border border-slate-700/80 shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              <span>Watch Demo</span>
            </button>
          </div>

          {/* Quick Access to Store Manager */}
          <div className="mt-6">
            <button
              onClick={handleManagerDashboard}
              className="text-xs text-slate-400 hover:text-emerald-400 underline underline-offset-4 transition-colors"
            >
              Are you a Store Manager? Open Store Operations HQ →
            </button>
          </div>
        </div>

        {/* Feature Pills (Screen 1 bottom row) */}
        <div className="absolute bottom-4 left-0 right-0 z-10 max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-xs sm:text-sm text-slate-200 shadow-xl">
            <div className="flex items-center justify-center gap-2 py-1">
              <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">AI Assistance</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">Real-time Availability</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">Store Navigation</span>
            </div>
            <div className="flex items-center justify-center gap-2 py-1">
              <BrainCircuit className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">Personalized Experience</span>
            </div>
          </div>
        </div>
      </section>

      {/* Two-Agent Coordinated System Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
            Two-Agent Coordinated Intelligence
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            How GrocerAI Transforms Physical Retail
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto mt-3 text-sm">
            Two autonomous AI agents work together in real time: one serving the shopper, the other optimizing the physical supermarket floor.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Customer Agent Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 hover:border-emerald-500/40 transition-all shadow-xl group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-105 transition-transform">
              <Bot className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Customer Agent</h3>
            <p className="text-sm text-slate-400 mb-6">
              Your multimodal in-store guide that understands spoken speech, builds dynamic shopping missions, verifies shelf stock, and suggests dietary alternatives.
            </p>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Understands voice & text in English, Telugu, and Hindi</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Step-by-step 2.5D indoor aisle navigation</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Proactive item checks ("Did you find the paneer in Aisle 4?")</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant smart substitutions for out-of-stock items</span>
              </li>
            </ul>
            <div className="mt-8 pt-6 border-t border-slate-800">
              <Link
                to="/customer/home"
                onClick={() => setRole('CUSTOMER')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <span>Try Customer Experience</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Store Agent Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 hover:border-blue-500/40 transition-all shadow-xl group">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-105 transition-transform">
              <Store className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Store Agent</h3>
            <p className="text-sm text-slate-400 mb-6">
              The autonomous retail brain monitoring shelf weight sensors, customer inquiries, aisle congestion, and counter queues to optimize throughput.
            </p>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Unmet demand detection from voice and search logs</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Automated restock recommendations with confidence scores</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Checkout queue monitoring (e.g. triggers opening Counter 4)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Continuous outcome tracking saved into Hindsight Memory</span>
              </li>
            </ul>
            <div className="mt-8 pt-6 border-t border-slate-800">
              <Link
                to="/manager/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <span>Store Operations Login (Employee ID + DOB)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The Self-Adaptive AI Loop Section */}
      <section className="py-16 bg-slate-900/40 border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
            Self-Adaptive Intelligence Architecture
          </h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mb-10">
            OBSERVE → REMEMBER → REASON → ACT → RE-OBSERVE → LEARN
          </p>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Step 1</span>
              <span className="font-bold text-sm text-emerald-400">Observe</span>
              <p className="text-[11px] text-slate-400 mt-2">Detects 0 Paneer stock & queue wait &gt; 6m</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Step 2</span>
              <span className="font-bold text-sm text-emerald-400">Remember</span>
              <p className="text-[11px] text-slate-400 mt-2">Recalls past weekend demand surges</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Step 3</span>
              <span className="font-bold text-sm text-emerald-400">Reason</span>
              <p className="text-[11px] text-slate-400 mt-2">Predicts +45% sales if restocked immediately</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Step 4</span>
              <span className="font-bold text-sm text-emerald-400">Act</span>
              <p className="text-[11px] text-slate-400 mt-2">Dispatches restock & opens Counter 4</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Step 5</span>
              <span className="font-bold text-sm text-emerald-400">Re-Observe</span>
              <p className="text-[11px] text-slate-400 mt-2">Monitors 42 sold, wait dropped to 2 mins</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Step 6</span>
              <span className="font-bold text-sm text-emerald-400">Learn</span>
              <p className="text-[11px] text-slate-400 mt-2">Hindsight encodes pattern for next week</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-900">
        <p>© 2026 GrocerAI Inc. Self-Adaptive Physical Grocery Store Intelligence.</p>
        <div className="flex items-center gap-4 mt-4 sm:mt-0">
          <Link to="/interaction" className="hover:text-emerald-400 transition-colors">Start Shopping</Link>
          <Link to="/manager/login" className="hover:text-emerald-400 transition-colors">Store Manager HQ</Link>
          <button onClick={() => setIsDemoTourOpen(true)} className="hover:text-emerald-400 transition-colors cursor-pointer">
            13-Step AI Demo
          </button>
        </div>
      </footer>
    </div>
  );
};
