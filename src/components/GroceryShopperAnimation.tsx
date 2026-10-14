import React, { useState } from 'react';
import { Sparkles, Play, X, Film, Eye, Compass, ShieldCheck } from 'lucide-react';

/**
 * GROCERAI MINI ANIMATED MOVIE SCENE & FILM VIEWER
 *
 * Visual reference implementation following the luxury, cinematic reference video:
 * - High-framerate 3D Bitmoji shopper movie scene (WebP continuous commercial loop)
 * - Supporting scene captures from /movie/
 * - Modal film player playing /movie/reference.mp4 upon tapping "Watch Cinematic Reel"
 * - Subtle ambient store telemetry and intelligent signals
 * - Borderless vignette blending into the dark navy hero section
 */
export const GroceryShopperAnimation: React.FC = () => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  return (
    <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[520px] flex items-center justify-center select-none group">
      {/* Soft Ambient Cinematic Glow Orbs */}
      <div className="absolute -inset-4 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none transition-all duration-700 group-hover:bg-emerald-500/25" />
      <div className="absolute bottom-4 left-1/4 w-80 h-36 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Main Animated Movie Viewport */}
      <div className="relative w-full h-full overflow-hidden rounded-3xl bg-slate-950 flex items-center justify-center shadow-2xl border border-slate-800/80 group-hover:border-emerald-500/30 transition-all duration-500">
        {/* Continuous Animated Movie Scene (WebP continuous commercial loop) */}
        <img
          src="/movie/grocerai-animated-scene.webp"
          alt="3D Bitmoji shopper movie scene: walking, picking organic pasta, placing in cart, continuing to shop"
          className="w-full h-full object-cover object-center transform scale-[1.02] transition-transform duration-700 group-hover:scale-105"
        />

        {/* Seamless Vignette Edge Gradients (Melt into dark navy background) */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950 via-transparent to-slate-950/60" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-slate-950/60 via-transparent to-slate-950/60" />

        {/* Subtle Floor Ceiling Lights Reflection Sweep */}
        <div className="absolute bottom-0 inset-x-0 h-28 overflow-hidden pointer-events-none opacity-25">
          <div className="w-[180%] h-full bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent transform -skew-x-12 animate-movieFloorLight" />
        </div>

        {/* Floating Subtle Intelligent Signals (As requested: subtle store activity) */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-4" />
          <span>Aisle 3 • Organic Pantry</span>
        </div>

        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 text-cyan-300 text-xs font-semibold shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Active Learning Loop</span>
        </div>

        {/* Interactive Reel Button: Watch Reference Film */}
        <div className="absolute bottom-4 left-4 z-20">
          <button
            onClick={() => setIsVideoModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-emerald-950/90 border border-slate-700/80 hover:border-emerald-500/50 text-slate-200 hover:text-emerald-300 text-xs font-medium transition-all shadow-lg cursor-pointer"
            title="Watch Cinematic Reference Reel"
          >
            <Film className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cinematic Film Reel</span>
          </button>
        </div>
      </div>

      {/* Reference Film Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <Film className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                  GrocerAI Cinematic Visual Reference
                </h3>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Viewport */}
            <div className="relative aspect-video max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
              <video
                src="/movie/reference.mp4"
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Modal Footer Notes */}
            <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Demonstration reference for cinematic pacing, typography & scene flow</span>
              <span className="text-emerald-400 font-mono">1080p • Ultra-Premium</span>
            </div>
          </div>
        </div>
      )}

      {/* Cinematic Lighting Sweep Keyframes */}
      <style>{`
        @keyframes movieFloorLight {
          0% {
            transform: translateX(-40%) skewX(-12deg);
          }
          100% {
            transform: translateX(60%) skewX(-12deg);
          }
        }
        .animate-movieFloorLight {
          animation: movieFloorLight 4.2s ease-in-out infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
