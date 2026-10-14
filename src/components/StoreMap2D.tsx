import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapPin,
  Navigation,
  Footprints,
  Clock,
  Layers,
  CheckCircle2,
  XCircle,
  Milk,
  Apple,
  Wheat,
  Croissant,
  Cookie,
  Coffee,
  Sparkles,
  CreditCard,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Compass,
  ArrowRight,
  Info,
  Carrot,
  Eye,
  Check,
  ShoppingBag
} from 'lucide-react';
import {
  STORE_ZONES,
  StoreZone,
  storeNavigationService,
  CalculatedRoute,
  MultiStopMissionRoute,
  resolveShelfDestination,
  ShelfDestination
} from '../services/storeNavigationService';
import { Product, ShoppingMissionItem } from '../types';
import { db } from '../services/db';

interface StoreMap2DProps {
  highlightAisle?: string;
  productName?: string;
  productId?: string;
  targetProduct?: Product;
  onNavigateComplete?: () => void;
  onSelectAisle?: (aisle: string) => void;
  onSelectProduct?: (product: Product) => void;
  missionItems?: ShoppingMissionItem[];
  isMissionMode?: boolean;
  onItemFoundToggle?: (itemId: string) => void;
}

export const StoreMap2D: React.FC<StoreMap2DProps> = ({
  highlightAisle = 'Aisle 4',
  productName = 'Amul Fresh Paneer',
  productId,
  targetProduct,
  onNavigateComplete,
  onSelectAisle,
  onSelectProduct,
  missionItems = [],
  isMissionMode = false,
  onItemFoundToggle
}) => {
  // Navigation State
  const [isNavigating, setIsNavigating] = useState(true);
  const [selectedAisle, setSelectedAisle] = useState<string>(highlightAisle);
  const [activeProduct, setActiveProduct] = useState<Product | undefined>(targetProduct);
  const [destinationReached, setDestinationReached] = useState(false);
  const [showAisleDrawer, setShowAisleDrawer] = useState(false);

  // Pan & Zoom Transform State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);

  // Sync incoming props
  useEffect(() => {
    if (highlightAisle) {
      setSelectedAisle(highlightAisle);
    }
  }, [highlightAisle]);

  useEffect(() => {
    if (targetProduct) {
      setActiveProduct(targetProduct);
      setSelectedAisle(targetProduct.aisle);
    } else if (productId) {
      const found = db.getProductById(productId);
      if (found) {
        setActiveProduct(found);
        setSelectedAisle(found.aisle);
      }
    } else if (productName) {
      const all = db.getProducts();
      const match = all.find(p => p.name.toLowerCase().includes(productName.toLowerCase()) || productName.toLowerCase().includes(p.name.toLowerCase()));
      if (match) {
        setActiveProduct(match);
        setSelectedAisle(match.aisle);
      }
    }
  }, [productId, targetProduct, productName]);

  // Derived Zone
  const currentZone: StoreZone | undefined = useMemo(() => {
    return STORE_ZONES.find(z =>
      z.aisle.toLowerCase() === selectedAisle.toLowerCase() ||
      selectedAisle.toLowerCase().includes(z.aisle.toLowerCase())
    ) || STORE_ZONES[3]; // default Dairy
  }, [selectedAisle]);

  // Products belonging to currently selected aisle
  const aisleProducts: Product[] = useMemo(() => {
    if (!currentZone || currentZone.aisle === 'Checkout') return [];
    return db.getProducts().filter(p => p.aisle.toLowerCase() === currentZone.aisle.toLowerCase());
  }, [currentZone]);

  // Destination Resolution
  const shelfDest: ShelfDestination | null = useMemo(() => {
    if (activeProduct) {
      return resolveShelfDestination(activeProduct);
    }
    return null;
  }, [activeProduct]);

  // Dynamic Route Calculation (Single Product vs Aisle Mode)
  const activeRoute: CalculatedRoute = useMemo(() => {
    if (activeProduct) {
      return storeNavigationService.calculateRouteToProduct(activeProduct);
    }
    return storeNavigationService.calculateRouteToAisle(selectedAisle);
  }, [activeProduct, selectedAisle]);

  // Multi-Stop Mission Route Calculation
  const missionRoute: MultiStopMissionRoute | null = useMemo(() => {
    if (!isMissionMode || missionItems.length === 0) return null;
    const dummyMission = {
      id: 'active-session-mission',
      customer_id: 'CUST-CURRENT',
      name: 'Active Shopping Mission',
      budget: 650,
      status: 'active' as const,
      estimated_time_mins: 10,
      created_at: new Date().toISOString(),
      items: missionItems
    };
    return storeNavigationService.planMissionRoute(dummyMission);
  }, [isMissionMode, missionItems]);

  // Map Pan and Zoom Handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.75));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Aisle Selection Trigger
  const handleZoneClick = (zone: StoreZone) => {
    setSelectedAisle(zone.aisle);
    setDestinationReached(false);
    onSelectAisle?.(zone.aisle);
    setShowAisleDrawer(true);

    // If active product does not belong to this aisle, clear active product to show aisle navigation
    if (activeProduct && activeProduct.aisle.toLowerCase() !== zone.aisle.toLowerCase()) {
      setActiveProduct(undefined);
    }
  };

  const handleProductSelect = (prod: Product) => {
    setActiveProduct(prod);
    setSelectedAisle(prod.aisle);
    setDestinationReached(false);
    onSelectProduct?.(prod);
    setShowAisleDrawer(false);
  };

  const handleArrivedToggle = () => {
    if (!destinationReached) {
      setDestinationReached(true);
      onNavigateComplete?.();
    } else {
      setDestinationReached(false);
    }
  };

  // Helper for zone icon rendering
  const renderZoneIcon = (iconName: string) => {
    switch (iconName) {
      case 'Apple': return <Apple className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Carrot': return <Carrot className="w-3.5 h-3.5 text-orange-400" />;
      case 'Wheat': return <Wheat className="w-3.5 h-3.5 text-amber-400" />;
      case 'Milk': return <Milk className="w-3.5 h-3.5 text-blue-400" />;
      case 'Sparkles': return <Sparkles className="w-3.5 h-3.5 text-pink-400" />;
      case 'Croissant': return <Croissant className="w-3.5 h-3.5 text-yellow-400" />;
      case 'Cookie': return <Cookie className="w-3.5 h-3.5 text-purple-400" />;
      case 'Coffee': return <Coffee className="w-3.5 h-3.5 text-cyan-400" />;
      case 'CreditCard': return <CreditCard className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="relative w-full bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-3 sm:p-6 select-none flex flex-col gap-4">
      {/* Top Controls Overlay Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2">
          {/* Floor & Level Badge */}
          <div className="px-3 py-1 bg-slate-900/90 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-2 backdrop-blur-md">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Store Level:</span>
            <span className="text-emerald-400 font-bold">1F (Ground Floor Main)</span>
          </div>
          <span className="text-[11px] text-slate-400 hidden md:inline bg-slate-900/50 px-2 py-0.5 rounded-lg border border-slate-800/60">
            • Indiranagar Flagship Digital Twin
          </span>
        </div>

        {/* View Controls & Dynamic Distance/Time Telemetry */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Live Dynamic Distance derived from Graph */}
          <div className="flex items-center gap-1.5 text-xs text-slate-200 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 shadow-sm backdrop-blur-md">
            <Footprints className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono font-bold text-white">
              {isMissionMode && missionRoute
                ? `${missionRoute.totalRemainingDistanceMeters} m tour`
                : `${activeRoute.totalDistanceMeters} m`}
            </span>
          </div>

          {/* Live Dynamic ETA derived from Graph */}
          <div className="flex items-center gap-1.5 text-xs text-slate-200 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 shadow-sm backdrop-blur-md">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono font-bold text-white">
              {isMissionMode && missionRoute
                ? missionRoute.totalRemainingTimeFormatted
                : activeRoute.estimatedWalkingMinutesFormatted}
            </span>
          </div>

          {/* Zoom & Pan Control Buttons */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden p-0.5">
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Dynamic Navigation Guidance HUD */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl relative z-10 transition-all">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border transition-all ${
            destinationReached
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
              : 'bg-blue-500/20 border-blue-500/40 text-blue-400 animate-pulse'
          }`}>
            {destinationReached ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            ) : (
              <Navigation className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {isMissionMode ? 'MISSION NAVIGATION' : 'NAVIGATING TO'}
              </span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {activeProduct?.aisle || selectedAisle}
              </span>
              {activeProduct?.shelf_location && (
                <span className="text-xs font-semibold text-blue-300 bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                  {activeProduct.shelf_location}
                </span>
              )}
            </div>

            <h3 className="font-extrabold text-white text-base sm:text-lg mt-0.5 flex items-center gap-2">
              {activeProduct ? activeProduct.name : currentZone?.name || selectedAisle}
              {activeProduct?.price && (
                <span className="text-sm font-semibold text-emerald-400 font-mono">
                  ₹{activeProduct.price}
                </span>
              )}
            </h3>

            <p className="text-xs text-slate-400 mt-0.5">
              {destinationReached
                ? 'Arrived at target location! Items are within physical arm reach.'
                : activeRoute.turnByTurnInstructions[activeRoute.turnByTurnInstructions.length - 1] || 'Follow illuminated digital path'}
            </p>
          </div>
        </div>

        {/* Action Button: Arrived confirmation or Next Stop */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleArrivedToggle}
            className={`w-full md:w-auto px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              destinationReached
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {destinationReached ? (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Resume Navigation</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Arrived at Shelf</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Digital Store Map Surface (SVG Canvas 760 x 460) */}
      <div
        ref={svgContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full h-[460px] sm:h-[500px] bg-slate-950/80 rounded-2xl border border-slate-800/90 overflow-hidden shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
      >
        <svg
          viewBox="0 0 760 460"
          className="w-full h-full max-h-full transition-transform duration-75 select-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        >
          {/* Definitions: Gradients, Filters & Floor Patterns */}
          <defs>
            {/* High-Tech Blueprint Floor Grid */}
            <pattern id="storeFloorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.7" opacity="0.35" />
            </pattern>

            {/* Glowing Traversal Path Gradient */}
            <linearGradient id="routeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="60%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            {/* Mission Multi-Stop Route Gradient */}
            <linearGradient id="missionRouteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* Subtle Ambient Glow Filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Shelf LED Bar Gradient */}
            <linearGradient id="shelfLedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Background Grid Floor */}
          <rect width="760" height="460" fill="url(#storeFloorGrid)" />

          {/* Store Perimeter Bounds */}
          <rect
            x="40"
            y="40"
            width="680"
            height="380"
            rx="16"
            fill="none"
            stroke="#1e293b"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.6"
          />

          {/* Store Entrance & Security Gate */}
          <g transform="translate(300, 425)">
            <rect x="0" y="0" width="160" height="18" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
            <text x="80" y="13" textAnchor="middle" fill="#d1fae5" fontSize="10" fontWeight="bold" letterSpacing="0.05em">
              STORE ENTRANCE & WELCOME
            </text>
          </g>

          {/* Walkway Corridors Visual Guides (subtle floor lanes) */}
          <g opacity="0.15">
            <line x1="380" y1="420" x2="380" y2="80" stroke="#60a5fa" strokeWidth="16" strokeLinecap="round" />
            <line x1="60" y1="225" x2="680" y2="225" stroke="#60a5fa" strokeWidth="16" strokeLinecap="round" />
            <line x1="60" y1="340" x2="680" y2="340" stroke="#60a5fa" strokeWidth="16" strokeLinecap="round" />
          </g>

          {/* STORE ZONE SHELVES & BAYS */}
          {STORE_ZONES.map((zone) => {
            const isTarget = currentZone?.id === zone.id;
            const hasStock = zone.aisle !== 'Aisle 7' && zone.aisle !== 'Aisle 8';

            return (
              <g
                key={zone.id}
                onClick={() => handleZoneClick(zone)}
                className="cursor-pointer group"
                transform={`translate(0, 0)`}
              >
                {/* Zone Background Rect */}
                <rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.w}
                  height={zone.h}
                  rx="12"
                  fill={isTarget ? '#172554' : '#090d16'}
                  stroke={isTarget ? '#3b82f6' : '#1e293b'}
                  strokeWidth={isTarget ? '2.5' : '1.2'}
                  filter={isTarget ? 'url(#neonGlow)' : undefined}
                  className="transition-all duration-300 group-hover:stroke-emerald-400 group-hover:fill-slate-900"
                />

                {/* Simulated Shelf Rack Dividers (Visual Depth) */}
                {zone.id !== 'zone-checkout' && (
                  <g opacity={isTarget ? '0.45' : '0.2'}>
                    <line x1={zone.x + 10} y1={zone.y + 20} x2={zone.x + zone.w - 10} y2={zone.y + 20} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1={zone.x + 10} y1={zone.y + 38} x2={zone.x + zone.w - 10} y2={zone.y + 38} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1={zone.x + 10} y1={zone.y + 54} x2={zone.x + zone.w - 10} y2={zone.y + 54} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                  </g>
                )}

                {/* Zone Display Name */}
                <text
                  x={zone.x + zone.w / 2}
                  y={zone.y + 24}
                  textAnchor="middle"
                  fill={isTarget ? '#ffffff' : '#cbd5e1'}
                  fontSize="11"
                  fontWeight="bold"
                  className="pointer-events-none transition-colors group-hover:fill-emerald-300"
                >
                  {zone.name}
                </text>

                {/* Aisle Badge Pill */}
                <rect
                  x={zone.x + zone.w / 2 - 28}
                  y={zone.y + 35}
                  width="56"
                  height="16"
                  rx="5"
                  fill={isTarget ? '#1e40af' : '#0f172a'}
                  stroke={isTarget ? '#60a5fa' : '#334155'}
                  strokeWidth="0.8"
                />
                <text
                  x={zone.x + zone.w / 2}
                  y={zone.y + 47}
                  textAnchor="middle"
                  fill={isTarget ? '#bfdbfe' : '#94a3b8'}
                  fontSize="9.5"
                  fontWeight="700"
                  fontFamily="monospace"
                  className="pointer-events-none"
                >
                  {zone.aisle}
                </text>

                {/* Empty Aisle Label for Aisle 7 & 8 */}
                {!hasStock && (
                  <text
                    x={zone.x + zone.w / 2}
                    y={zone.y + 62}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="7.5"
                    fontWeight="500"
                  >
                    Physical Stock
                  </text>
                )}

                {/* Active Beacon Ripple when Targeted */}
                {isTarget && (
                  <circle
                    cx={zone.x + zone.w / 2}
                    cy={zone.y + zone.h - 10}
                    r="4"
                    fill="#3b82f6"
                    className="animate-ping"
                  />
                )}
              </g>
            );
          })}

          {/* DYNAMIC SVG NAVIGATION ROUTE (SINGLE PRODUCT / AISLE ROUTE) */}
          {!isMissionMode && isNavigating && activeRoute.pathD && (
            <g>
              {/* Outer Glow Path */}
              <path
                d={activeRoute.pathD}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="8"
                opacity="0.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Main Glowing Trajectory Polyline */}
              <path
                d={activeRoute.pathD}
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="4"
                strokeDasharray="8 6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-pulse"
              />

              {/* Animated Trajectory Waypoint Beads */}
              {activeRoute.waypoints.map((wp, idx) => (
                <circle
                  key={wp.nodeId}
                  cx={wp.x}
                  cy={wp.y}
                  r="3.5"
                  fill={idx === 0 ? '#3b82f6' : idx === activeRoute.waypoints.length - 1 ? '#10b981' : '#60a5fa'}
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              ))}
            </g>
          )}

          {/* MULTI-STOP MISSION ROUTE (WHEN IN MISSION MODE) */}
          {isMissionMode && missionRoute && (
            <g>
              {/* Full Tour Background Guide */}
              <path
                d={missionRoute.fullTourPathD}
                fill="none"
                stroke="#6366f1"
                strokeWidth="6"
                opacity="0.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Active Leg Glowing Polyline */}
              <path
                d={missionRoute.activeLegRoute.pathD}
                fill="none"
                stroke="url(#missionRouteGradient)"
                strokeWidth="4.5"
                strokeDasharray="8 6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-pulse"
              />

              {/* Mission Stops Numbered Waypoint Pins */}
              {missionRoute.stops.map((stop) => (
                <g
                  key={stop.itemId}
                  transform={`translate(${stop.coordinates.x}, ${stop.coordinates.y})`}
                  onClick={() => onItemFoundToggle?.(stop.itemId)}
                  className="cursor-pointer group"
                >
                  <circle
                    cx="0"
                    cy="0"
                    r={stop.isFound ? '10' : '14'}
                    fill={stop.isFound ? '#064e3b' : stop.itemId === missionRoute.currentStop?.itemId ? '#1d4ed8' : '#312e81'}
                    stroke={stop.isFound ? '#10b981' : '#a5b4fc'}
                    strokeWidth="2"
                    className={stop.itemId === missionRoute.currentStop?.itemId ? 'animate-pulse' : ''}
                  />
                  {stop.isFound ? (
                    <text x="0" y="4" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="bold">✓</text>
                  ) : (
                    <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                      {stop.stopNumber}
                    </text>
                  )}
                  {/* Item Label Tag */}
                  <rect x="-35" y="-24" width="70" height="15" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
                  <text x="0" y="-13" textAnchor="middle" fill="#e2e8f0" fontSize="8" fontWeight="600">
                    {stop.productName.slice(0, 11)}..
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* "YOU ARE HERE" CURRENT CUSTOMER LOCATION MARKER */}
          <g transform="translate(380, 420)">
            <circle cx="0" cy="0" r="16" fill="#3b82f6" opacity="0.3" className="animate-ping" />
            <circle cx="0" cy="0" r="8" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5" />
            <rect x="-34" y="-22" width="68" height="15" rx="4" fill="#1e293b" stroke="#3b82f6" strokeWidth="1" />
            <text x="0" y="-11" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="bold">
              You are here
            </text>
          </g>

          {/* EXACT PRODUCT / SHELF DESTINATION PIN (WHEN PRODUCT SELECTED) */}
          {shelfDest && !isMissionMode && (
            <g transform={`translate(${shelfDest.coordinates.x}, ${shelfDest.coordinates.y})`}>
              <circle cx="0" cy="0" r="18" fill="#10b981" opacity="0.3" className="animate-ping" />
              <circle cx="0" cy="0" r="10" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
              <g transform="translate(0, -22)">
                <rect x="-55" y="-14" width="110" height="20" rx="6" fill="#022c22" stroke="#10b981" strokeWidth="1.2" />
                <text x="0" y="0" textAnchor="middle" fill="#6ee7b7" fontSize="9.5" fontWeight="bold">
                  📍 {shelfDest.shelfLocation}
                </text>
              </g>
            </g>
          )}

          {/* CHECKOUT EXIT AREA MARKER */}
          <g transform="translate(380, 390)">
            <rect x="-80" y="-12" width="160" height="24" rx="6" fill="#047857" opacity="0.25" stroke="#10b981" strokeWidth="1" />
            <text x="0" y="4" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontWeight="bold" letterSpacing="0.05em">
              CHECKOUT COUNTERS 1–4
            </text>
          </g>
        </svg>

        {/* Legend Overlay at Bottom Right */}
        <div className="absolute bottom-3 right-3 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-300 space-y-1.5 shadow-xl hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/30" />
            <span>Current Position (Entrance)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
            <span>Target Shelf Destination</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" />
            <span>Dynamic Calculated Path</span>
          </div>
        </div>

        {/* Pan Hint Overlay at Bottom Left */}
        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-800/80 rounded-xl px-2.5 py-1 text-[10px] text-slate-400 flex items-center gap-1.5 shadow">
          <Maximize2 className="w-3 h-3 text-emerald-400" />
          <span>Click & drag to pan • Tap any aisle</span>
        </div>
      </div>

      {/* AISLE PRODUCTS QUICK DRAWER / INSPECTOR (WHEN AISLE SELECTED) */}
      {showAisleDrawer && currentZone && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-800 rounded-lg text-emerald-400">
                {renderZoneIcon(currentZone.iconName)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  {currentZone.name}
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                    {currentZone.aisle}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">{currentZone.description}</p>
              </div>
            </div>

            <button
              onClick={() => setShowAisleDrawer(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-xs font-semibold"
            >
              Close
            </button>
          </div>

          {/* Products stocked in this aisle */}
          {aisleProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
              {aisleProducts.map(prod => (
                <div
                  key={prod.id}
                  onClick={() => handleProductSelect(prod)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    activeProduct?.id === prod.id
                      ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    className="w-10 h-10 rounded-lg object-cover border border-slate-800 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{prod.name}</p>
                    <p className="text-[10px] text-emerald-400 truncate">{prod.shelf_location}</p>
                    <span className="text-[11px] font-mono font-bold text-slate-300">₹{prod.price}</span>
                  </div>
                  <button className="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-[10px] font-bold text-slate-300 transition-colors">
                    Route
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-slate-400 font-light bg-slate-950/60 rounded-xl border border-slate-800/60">
              <Info className="w-4 h-4 text-slate-500 mx-auto mb-1" />
              <span>Physical stock available in-store • No catalog products currently mapped to {currentZone.aisle}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
