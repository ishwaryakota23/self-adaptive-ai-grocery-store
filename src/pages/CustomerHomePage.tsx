import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Compass,
  MapPin,
  Mic,
  ShoppingCart,
  ArrowRight,
  Clock,
  Heart,
  TrendingUp,
  BrainCircuit,
  ShoppingBag,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AgentAvatar } from '../components/AgentAvatar';

export const CustomerHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, activeMission, products, addToCart } = useApp();

  const recommendedItems = products.slice(0, 4);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white p-4 sm:p-8 space-y-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Future Personalized Interaction Banner (Matching Screen 17) */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 z-10 relative">
            <div className="space-y-3 max-w-2xl">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4" />
                Adaptive Memory In Action (Screen 17)
              </span>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Next Time You Shop...
              </h1>

              <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed">
                Your AI assistant will be even more helpful based on your past preferences and learned dietary habits.
              </p>

              {/* 4 Feature Cards (Screen 17) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                <div
                  onClick={() => navigate('/customer/products')}
                  className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 cursor-pointer transition-all"
                >
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Personalized Recommendations
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Based on your recipe preferences</p>
                </div>

                <div
                  onClick={() => navigate('/customer/mission')}
                  className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 cursor-pointer transition-all"
                >
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    Proactive Shopping List
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Before you run out of items</p>
                </div>

                <div
                  onClick={() => navigate('/customer/map')}
                  className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 cursor-pointer transition-all"
                >
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-yellow-400" />
                    Faster Navigation
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">To your frequently purchased items</p>
                </div>

                <div
                  onClick={() => navigate('/customer/availability/prod-paneer')}
                  className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 cursor-pointer transition-all"
                >
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                    Smart Substitutions
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">For out-of-stock items</p>
                </div>
              </div>
            </div>

            {/* Avatar & Speech Bubble (Screen 17) */}
            <div className="flex flex-col items-center text-center shrink-0 w-full lg:w-64 bg-slate-950/80 p-5 rounded-3xl border border-slate-800">
              <AgentAvatar size="xl" />
              <div className="mt-3 bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-2xl text-xs text-slate-200">
                "Next time you visit, I'll remember your preferences and make shopping even easier!"
              </div>
              <button
                onClick={() => navigate('/customer/memory')}
                className="mt-4 w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                See My Profile →
              </button>
            </div>
          </div>
        </div>

        {/* Active Shopping Mission Resume Card */}
        {activeMission && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Compass className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Mission In Progress
                </span>
                <h3 className="text-lg font-bold text-white">{activeMission.name}</h3>
                <p className="text-xs text-slate-400">
                  {activeMission.items.filter(i => i.status === 'found').length} of {activeMission.items.length} items found
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate('/customer/map')}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Store Map</span>
              </button>
              <button
                onClick={() => navigate('/customer/mission')}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <span>Continue Mission</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Personalized Recommendations Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Recommended for You Tonight</h2>
              <p className="text-xs text-slate-400">Tailored to your Italian cuisine preference & fresh produce habits</p>
            </div>
            <Link
              to="/customer/products"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {recommendedItems.map((prod) => (
              <div
                key={prod.id}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 shadow-md flex flex-col justify-between group transition-all"
              >
                <div
                  onClick={() => navigate(`/customer/products/${prod.id}`)}
                  className="cursor-pointer"
                >
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    className="w-full h-36 object-cover rounded-xl mb-3 group-hover:scale-105 transition-transform"
                  />
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">{prod.brand}</span>
                  <h4 className="text-sm font-bold text-white truncate">{prod.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{prod.aisle}</p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">₹{prod.price}</span>
                  <button
                    onClick={() => addToCart(prod, 1)}
                    className="p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                    title="Add to cart"
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Voice Bar Trigger */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Speak to your in-store assistant</h4>
              <p className="text-xs text-slate-400">Ask in English, Telugu, or Hindi where any product is.</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/customer/assistant?mode=voice')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            Start Voice
          </button>
        </div>
      </div>
    </div>
  );
};
