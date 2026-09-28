import React, { useState } from 'react';
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
  CreditCard
} from 'lucide-react';

interface StoreMap2DProps {
  highlightAisle?: string;
  productName?: string;
  onNavigateComplete?: () => void;
}

export const StoreMap2D: React.FC<StoreMap2DProps> = ({
  highlightAisle = 'Aisle 4',
  productName = 'Amul Fresh Paneer',
  onNavigateComplete
}) => {
  const [isNavigating, setIsNavigating] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState('1F');
  const [stepProgress, setStepProgress] = useState(65);

  const zones = [
    { id: 'zone-fruits', name: 'Fruits & Veg', aisle: 'Aisle 1', icon: Apple, x: 120, y: 140, w: 100, h: 70, color: 'border-emerald-500/40 bg-emerald-950/30' },
    { id: 'zone-veggies', name: 'Root Veggies', aisle: 'Aisle 2', icon: Apple, x: 120, y: 240, w: 100, h: 70, color: 'border-emerald-500/40 bg-emerald-950/30' },
    { id: 'zone-grains', name: 'Grains & Pasta', aisle: 'Aisle 3', icon: Wheat, x: 260, y: 140, w: 100, h: 70, color: 'border-amber-500/40 bg-amber-950/30' },
    { id: 'zone-dairy', name: 'Dairy Section', aisle: 'Aisle 4', icon: Milk, x: 260, y: 240, w: 100, h: 70, color: 'border-blue-500/60 bg-blue-900/40' },
    { id: 'zone-bakery', name: 'Bakery', aisle: 'Aisle 6', icon: Croissant, x: 400, y: 140, w: 100, h: 70, color: 'border-yellow-500/40 bg-yellow-950/30' },
    { id: 'zone-snacks', name: 'Snacks & Bites', aisle: 'Aisle 7', icon: Cookie, x: 400, y: 240, w: 100, h: 70, color: 'border-purple-500/40 bg-purple-950/30' },
    { id: 'zone-beverages', name: 'Beverages', aisle: 'Aisle 8', icon: Coffee, x: 540, y: 140, w: 100, h: 70, color: 'border-cyan-500/40 bg-cyan-950/30' },
    { id: 'zone-care', name: 'Personal Care', aisle: 'Aisle 5', icon: Sparkles, x: 540, y: 240, w: 100, h: 70, color: 'border-pink-500/40 bg-pink-950/30' },
    { id: 'zone-checkout', name: 'Checkout Counters 1-4', aisle: 'Checkout', icon: CreditCard, x: 200, y: 360, w: 360, h: 60, color: 'border-emerald-500/60 bg-emerald-950/40' },
  ];

  const isTarget = (aisle: string) => {
    return highlightAisle.toLowerCase().includes(aisle.toLowerCase()) || aisle.toLowerCase().includes(highlightAisle.toLowerCase());
  };

  return (
    <div className="relative w-full bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-4 sm:p-6 select-none">
      {/* Top Controls Overlay */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 z-10 relative">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Floor:</span>
            <button
              onClick={() => setSelectedFloor('1F')}
              className={`px-2 py-0.5 rounded-lg text-xs transition-all ${selectedFloor === '1F' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              1F (Main)
            </button>
            <button
              onClick={() => setSelectedFloor('2F')}
              className={`px-2 py-0.5 rounded-lg text-xs transition-all ${selectedFloor === '2F' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              2F
            </button>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">• Live indoor positioning active</span>
        </div>

        {/* Live Distance & ETA */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Footprints className="w-4 h-4 text-emerald-400" />
            <span>~150 m walk</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>~2 mins ETA</span>
          </div>
        </div>
      </div>

      {/* Floating Guidance Card (Matching Screen 8) */}
      <div className="mb-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-md">
            <Navigation className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              Navigate to {productName}
              <span className="text-xs font-normal text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {highlightAisle}
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Walk straight 40m, turn left past Produce into Dairy Section (Shelf B2).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isNavigating ? (
            <button
              onClick={() => {
                setIsNavigating(false);
                onNavigateComplete?.();
              }}
              className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Arrived at Aisle</span>
            </button>
          ) : (
            <button
              onClick={() => setIsNavigating(true)}
              className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <Navigation className="w-4 h-4" />
              <span>Start Navigation</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Map Visual Surface */}
      <div className="relative w-full h-[440px] bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden flex items-center justify-center p-2">
        <svg viewBox="0 0 760 460" className="w-full h-full max-h-full">
          {/* Subtle Grid floor */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.8" opacity="0.4" />
            </pattern>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <rect width="760" height="460" fill="url(#grid)" />

          {/* Supermarket Entrance */}
          <rect x="300" y="440" width="160" height="15" rx="4" fill="#047857" opacity="0.8" />
          <text x="380" y="452" textAnchor="middle" fill="#ecfdf5" fontSize="10" fontWeight="bold">
            STORE ENTRANCE & GATES
          </text>

          {/* Store Zone Shelves */}
          {zones.map((zone) => {
            const targeted = isTarget(zone.aisle);
            return (
              <g key={zone.id} className="transition-all duration-300">
                <rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.w}
                  height={zone.h}
                  rx="10"
                  fill={targeted ? '#1e3a8a' : '#0f172a'}
                  stroke={targeted ? '#60a5fa' : '#334155'}
                  strokeWidth={targeted ? '2.5' : '1.2'}
                  filter={targeted ? 'url(#glow)' : undefined}
                  className="cursor-pointer hover:stroke-emerald-400 transition-colors"
                />
                <text
                  x={zone.x + zone.w / 2}
                  y={zone.y + 26}
                  textAnchor="middle"
                  fill={targeted ? '#ffffff' : '#cbd5e1'}
                  fontSize="12"
                  fontWeight="bold"
                >
                  {zone.name}
                </text>
                <text
                  x={zone.x + zone.w / 2}
                  y={zone.y + 44}
                  textAnchor="middle"
                  fill={targeted ? '#93c5fd' : '#64748b'}
                  fontSize="10"
                  fontWeight="600"
                >
                  {zone.aisle}
                </text>
                {targeted && (
                  <circle
                    cx={zone.x + zone.w / 2}
                    cy={zone.y + 54}
                    r="4"
                    fill="#60a5fa"
                    className="animate-ping"
                  />
                )}
              </g>
            );
          })}

          {/* Navigation Trajectory Path (from Entrance to Dairy Section Aisle 4) */}
          {isNavigating && (
            <g>
              <path
                d="M 380 430 L 380 340 L 220 340 L 220 280 L 310 280"
                fill="none"
                stroke="url(#pathGradient)"
                strokeWidth="4"
                strokeDasharray="6 6"
                strokeLinecap="round"
                className="animate-pulse"
              />

              {/* Waypoint beads along path */}
              <circle cx="380" cy="385" r="3" fill="#60a5fa" />
              <circle cx="300" cy="340" r="3" fill="#60a5fa" />
              <circle cx="220" cy="310" r="3" fill="#60a5fa" />
            </g>
          )}

          {/* "You Are Here" Marker */}
          <g transform="translate(380, 420)">
            <circle cx="0" cy="0" r="14" fill="#3b82f6" opacity="0.3" className="animate-ping" />
            <circle cx="0" cy="0" r="8" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
            <text x="0" y="-14" textAnchor="middle" fill="#93c5fd" fontSize="10" fontWeight="bold">
              You are here
            </text>
          </g>

          {/* Destination Pin on Dairy Section (Aisle 4) */}
          <g transform="translate(310, 275)">
            <circle cx="0" cy="0" r="16" fill="#10b981" opacity="0.25" className="animate-ping" />
            <circle cx="0" cy="0" r="10" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            <text x="0" y="-16" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold">
              📍 Dairy - Shelf B2
            </text>
          </g>
        </svg>

        {/* Legend Overlay at Bottom Right */}
        <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-300 space-y-1 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Current Position</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Target Product Aisle</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-blue-400 border-dashed" />
            <span>Optimal Walking Path</span>
          </div>
        </div>
      </div>
    </div>
  );
};
