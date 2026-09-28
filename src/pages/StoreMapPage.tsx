import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Navigation,
  Compass,
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  Layers,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StoreMap2D } from '../components/StoreMap2D';

export const StoreMapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { products, activeMission } = useApp();

  const productId = searchParams.get('product') || 'prod-paneer';
  const matchedProduct = products.find(p => p.id === productId || p.name.toLowerCase().includes(productId.toLowerCase())) || products[0];

  const [currentAisle, setCurrentAisle] = useState(matchedProduct.aisle);
  const [currentProductName, setCurrentProductName] = useState(matchedProduct.name);

  useEffect(() => {
    if (matchedProduct) {
      setCurrentAisle(matchedProduct.aisle);
      setCurrentProductName(matchedProduct.name);
    }
  }, [productId, matchedProduct]);

  const quickAisles = [
    { aisle: 'Aisle 4', name: 'Dairy (Paneer & Milk)', prodId: 'prod-paneer' },
    { aisle: 'Aisle 1', name: 'Fruits & Veg (Tomatoes)', prodId: 'prod-tomatoes' },
    { aisle: 'Aisle 2', name: 'Root Veggies (Onions)', prodId: 'prod-onions' },
    { aisle: 'Aisle 3', name: 'Grains & Pasta (Penne)', prodId: 'prod-pasta' },
    { aisle: 'Aisle 6', name: 'Bakery (Breads)', prodId: 'prod-bread' },
    { aisle: 'Checkout', name: 'Exit & Counters 1-4', prodId: '' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
                Store Navigation / Map
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  Live 2.5D
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Physical indoor GPS and optimal walking path planner
              </p>
            </div>
          </div>

          {/* Quick Mission Shortcut */}
          {activeMission && (
            <button
              onClick={() => navigate('/customer/mission')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Mission: {activeMission.name}</span>
            </button>
          )}
        </div>

        {/* Quick Aisle Switcher Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {quickAisles.map((qa) => {
            const isSelected = currentAisle.toLowerCase().includes(qa.aisle.toLowerCase());
            return (
              <button
                key={qa.aisle}
                onClick={() => {
                  setCurrentAisle(qa.aisle);
                  setCurrentProductName(qa.name);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {qa.name}
              </button>
            );
          })}
        </div>

        {/* 2D Interactive Store Map Component (Screen 8) */}
        <StoreMap2D
          highlightAisle={currentAisle}
          productName={currentProductName}
          onNavigateComplete={() => {
            // navigate complete action
          }}
        />

        {/* Navigation Guidance Hints */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Smart Pathing</h4>
              <p className="text-[11px] text-slate-400">Routes around high-density aisles to save you 4 mins.</p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Shelf Beacon Sync</h4>
              <p className="text-[11px] text-slate-400">Pings shelf LED indicators when you arrive within 2m.</p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Mission Waypoints</h4>
              <p className="text-[11px] text-slate-400">Automatically sequences shopping stops in optimal order.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
