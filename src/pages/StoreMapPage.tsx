import React, { useState, useEffect, useMemo } from 'react';
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
  Clock,
  Search,
  Check,
  Footprints,
  RotateCcw,
  ArrowRight,
  ListOrdered
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StoreMap2D } from '../components/StoreMap2D';
import { storeNavigationService, STORE_ZONES } from '../services/storeNavigationService';
import { Product } from '../types';

export const StoreMapPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { products, activeMission, updateMissionItemStatus } = useApp();

  const queryProduct = searchParams.get('product') || 'prod-paneer';
  const queryMissionMode = searchParams.get('mission') === 'true';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(queryProduct);
  const [isMissionTourMode, setIsMissionTourMode] = useState<boolean>(queryMissionMode && !!activeMission);

  // Sync with searchParams
  useEffect(() => {
    if (queryProduct) {
      setSelectedProductId(queryProduct);
    }
  }, [queryProduct]);

  // Resolve target product from catalog
  const targetProduct: Product = useMemo(() => {
    return products.find(p => p.id === selectedProductId || p.name.toLowerCase().includes(selectedProductId.toLowerCase())) || products[0];
  }, [products, selectedProductId]);

  const [currentAisle, setCurrentAisle] = useState(targetProduct?.aisle || 'Aisle 4');

  useEffect(() => {
    if (targetProduct) {
      setCurrentAisle(targetProduct.aisle);
    }
  }, [targetProduct]);

  // Filtered products for quick search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.aisle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  // Turn-by-Turn Guidance derived from graph
  const calculatedRoute = useMemo(() => {
    if (targetProduct) {
      return storeNavigationService.calculateRouteToProduct(targetProduct);
    }
    return storeNavigationService.calculateRouteToAisle(currentAisle);
  }, [targetProduct, currentAisle]);

  // Quick Aisle Switcher Tabs
  const quickAisles = [
    { aisle: 'Aisle 4', name: 'Dairy (Paneer & Milk)', prodId: 'prod-paneer' },
    { aisle: 'Aisle 1', name: 'Fruits & Veg (Tomatoes)', prodId: 'prod-tomatoes' },
    { aisle: 'Aisle 2', name: 'Root Veggies (Onions)', prodId: 'prod-onions' },
    { aisle: 'Aisle 3', name: 'Grains & Pasta (Penne)', prodId: 'prod-pasta' },
    { aisle: 'Aisle 5', name: 'Superfoods (Quinoa)', prodId: 'prod-quinoa' },
    { aisle: 'Aisle 6', name: 'Bakery (Breads)', prodId: 'prod-bread' },
    { aisle: 'Checkout', name: 'Exit & Counters 1–4', prodId: '' },
  ];

  const handleSelectProduct = (prod: Product) => {
    setSelectedProductId(prod.id);
    setCurrentAisle(prod.aisle);
    setSearchQuery('');
    setSearchParams({ product: prod.id });
  };

  const handleToggleMissionItem = (itemId: string) => {
    if (!activeMission) return;
    const item = activeMission.items.find(i => i.id === itemId);
    if (!item) return;
    const nextStatus = item.status === 'found' ? 'pending' : 'found';
    updateMissionItemStatus(activeMission.id, itemId, nextStatus);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white p-3 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
                Digital Store Twin & Indoor GPS
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  Live Dynamic
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Deterministic topological waypoint graph • Shortest-path indoor navigation
              </p>
            </div>
          </div>

          {/* Mode Switcher: Single Product vs Mission Tour */}
          <div className="flex items-center gap-2">
            {activeMission && (
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-md">
                <button
                  onClick={() => setIsMissionTourMode(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !isMissionTourMode
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Single Product
                </button>
                <button
                  onClick={() => setIsMissionTourMode(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isMissionTourMode
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Mission Tour</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Product Quick Search Bar & Aisle Switcher */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Product Search */}
          <div className="md:col-span-5 relative">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any product or aisle (e.g. paneer, pasta, milk)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Quick Search Dropdown */}
            {filteredProducts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl z-30 max-h-60 overflow-y-auto space-y-1">
                {filteredProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className="p-2 rounded-xl hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                      <div>
                        <span className="font-bold text-white block">{p.name}</span>
                        <span className="text-[10px] text-emerald-400">{p.aisle} • {p.shelf_location}</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-white">₹{p.price}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Aisle Switcher Tabs */}
          <div className="md:col-span-7 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {quickAisles.map((qa) => {
              const isSelected = currentAisle.toLowerCase().includes(qa.aisle.toLowerCase());
              return (
                <button
                  key={qa.aisle}
                  onClick={() => {
                    setCurrentAisle(qa.aisle);
                    if (qa.prodId) {
                      const prod = products.find(p => p.id === qa.prodId);
                      if (prod) setSelectedProductId(prod.id);
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/10 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {qa.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2D Interactive Digital Twin Map Component */}
        <StoreMap2D
          highlightAisle={currentAisle}
          productName={targetProduct?.name}
          productId={targetProduct?.id}
          targetProduct={targetProduct}
          isMissionMode={isMissionTourMode}
          missionItems={activeMission?.items}
          onItemFoundToggle={handleToggleMissionItem}
          onSelectAisle={(aisle) => setCurrentAisle(aisle)}
          onSelectProduct={handleSelectProduct}
        />

        {/* Step-by-Step Waypoint Guidance & Mission Sequencing */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Turn-by-Turn Dynamic Waypoint Guidance (7 cols) */}
          <div className="md:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Dynamic Turn-by-Turn Guidance</h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <Footprints className="w-3.5 h-3.5" />
                <span>{calculatedRoute.totalDistanceMeters}m ({calculatedRoute.estimatedWalkingMinutesFormatted})</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {calculatedRoute.turnByTurnInstructions.map((instruction, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span className="text-slate-200 leading-relaxed font-medium">
                    {instruction}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Shopping Mission Overview / Waypoint Stops (5 cols) */}
          <div className="md:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">
                  {activeMission ? activeMission.name : 'Store Tour Features'}
                </h3>
              </div>
              {activeMission && (
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {activeMission.items.filter(i => i.status === 'found').length}/{activeMission.items.length} Found
                </span>
              )}
            </div>

            {activeMission ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {activeMission.items.map((item, idx) => {
                  const isFound = item.status === 'found';
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleMissionItem(item.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                        isFound
                          ? 'bg-slate-950/40 border-emerald-900/40 text-slate-400 opacity-75'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          isFound
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {isFound ? '✓' : idx + 1}
                        </div>
                        <div>
                          <p className={`font-bold leading-tight ${isFound ? 'line-through' : ''}`}>
                            {item.product_name}
                          </p>
                          <p className="text-[10px] text-emerald-400">{item.shelf_location || item.aisle}</p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const prod = products.find(p => p.id === item.product_id);
                          if (prod) handleSelectProduct(prod);
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-[10px] font-bold text-slate-300 transition-colors"
                      >
                        Pin
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-400">
                <p>
                  No active shopping mission currently assigned to this session. Click any product or aisle to inspect inventory and calculate instant routes.
                </p>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Ask the Customer Agent: "Where is paneer?" to auto-plot routes.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
