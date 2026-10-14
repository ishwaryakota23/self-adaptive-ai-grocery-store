import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Compass,
  CheckCircle2,
  Circle,
  MapPin,
  ArrowRight,
  Plus,
  Trash2,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Edit2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CustomerMissionPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeMission, updateMissionItemStatus, activateMission, clearActiveMission, products, addToCart } = useApp();
  const [isEditing, setIsEditing] = useState(false);

  if (!activeMission) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Compass className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-bold">No Active Shopping Mission</h2>
          <p className="text-sm text-slate-400">
            Shopping missions provide turn-by-turn checklist guidance through the store. Start one with your conversational assistant or choose a mission below.
          </p>
        </div>

        <button
          onClick={() => navigate('/customer/assistant')}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-sm shadow-lg shadow-emerald-500/20 cursor-pointer"
        >
          Create Custom Mission with AI Assistant
        </button>

        <div className="w-full max-w-lg pt-4 space-y-3 text-left">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-center">
            Or Choose A Curated Mission
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => activateMission('mission-pasta-night')}
              className="p-4 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl cursor-pointer transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-emerald-400">Pasta Night</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">6 items</span>
              </div>
              <p className="text-[11px] text-slate-400">Pasta, Tomatoes, Onions, Cheese, Olive Oil, Garlic</p>
              <span className="text-[11px] font-semibold text-emerald-400 block pt-1">Start Mission →</span>
            </div>

            <div
              onClick={() => activateMission('mission-breakfast-dairy')}
              className="p-4 bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl cursor-pointer transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-cyan-400">Breakfast & Dairy</span>
                <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">3 items</span>
              </div>
              <p className="text-[11px] text-slate-400">Taaza Milk, Whole Wheat Bread, Farm Curd</p>
              <span className="text-[11px] font-semibold text-cyan-400 block pt-1">Start Mission →</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const items = activeMission.items;
  const foundCount = items.filter(i => i.status === 'found').length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((foundCount / totalCount) * 100) : 0;

  const handleToggleFound = (itemId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'found' ? 'pending' : 'found';
    updateMissionItemStatus(activeMission.id, itemId, nextStatus);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Mission Header (Matching Screen 5) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30 inline-flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                Active Shopping Mission
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                {activeMission.name}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Estimated trip time: ~{activeMission.estimated_time_mins} mins • Target budget: ₹{activeMission.budget}
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-400">
                  {foundCount}/{totalCount}
                </span>
                <span className="text-xs text-slate-400 block font-medium">items found</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/customer/map?mission=true')}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Live Map Tour</span>
                </button>
                <button
                  onClick={clearActiveMission}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  title="Pause or exit this shopping mission"
                >
                  Exit Mission
                </button>
              </div>
            </div>
          </div>

          {/* Progress Bar (Matching Screen 5) */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>Mission Progress</span>
              <span className="text-emerald-400">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Items List (Matching Screen 5) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-semibold text-slate-300">Shopping Checklist</h3>
            <button
              onClick={() => navigate('/customer/products')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>

          {items.map((item) => {
            const prod = products.find(p => p.id === item.product_id);
            const isFound = item.status === 'found';
            const isInProgress = item.status === 'in_progress';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                  isFound
                    ? 'bg-slate-900/40 border-emerald-950/60 opacity-90'
                    : isInProgress
                    ? 'bg-slate-900 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                {/* Left: Checkmark & Thumbnail */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <button
                    onClick={() => handleToggleFound(item.id, item.status)}
                    className="p-1 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    title={isFound ? 'Mark uncompleted' : 'Mark found'}
                  >
                    {isFound ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 fill-emerald-950" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-600 hover:text-emerald-400" />
                    )}
                  </button>

                  {prod && (
                    <img
                      src={prod.image_url}
                      alt={prod.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-800 shrink-0"
                    />
                  )}

                  <div className="min-w-0">
                    <Link
                      to={`/customer/products/${item.product_id}`}
                      className={`text-sm font-bold block truncate hover:text-emerald-400 transition-colors ${
                        isFound ? 'line-through text-slate-400' : 'text-white'
                      }`}
                    >
                      {item.product_name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {item.aisle}
                      </span>
                      {prod && (
                        <span className="text-xs text-slate-400">
                          ₹{prod.price}
                        </span>
                      )}
                      {isFound && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded font-medium">
                          Found
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions: Find in Store (Screen 5) */}
                <div className="flex items-center gap-2 shrink-0">
                  {!isFound && (
                    <button
                      onClick={() => navigate(`/customer/map?product=${item.product_id}`)}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Find in store</span>
                    </button>
                  )}

                  {prod && (
                    <button
                      onClick={() => addToCart(prod, 1)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                      title="Add to cart"
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Mission Actions */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            to="/customer/assistant"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Ask Assistant for Recipe Advice</span>
          </Link>

          <Link
            to="/customer/cart"
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            <span>Proceed to Cart & Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
