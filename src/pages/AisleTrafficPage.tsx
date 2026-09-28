import React, { useState } from 'react';
import {
  Footprints,
  Users,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';
import { AisleTraffic } from '../types';

export const AisleTrafficPage: React.FC = () => {
  const { aisleTraffic } = useApp();
  const [selectedAisle, setSelectedAisle] = useState<AisleTraffic>(aisleTraffic[0]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-950 text-white">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Aisle Traffic & Density Heatmap</h1>
            <p className="text-xs text-slate-400 mt-1">Real-time floor optical sensors detecting customer movement & dwell bottlenecks</p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>140 Live Shoppers in Store</span>
          </div>
        </div>

        {/* Selected Aisle Focus Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Selected Aisle Focus
            </span>
            <h3 className="text-xl font-bold text-white mt-1">
              {selectedAisle.aisle}: {selectedAisle.aisle_name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Peak period: {selectedAisle.peak_hours} • Average dwell time: {selectedAisle.avg_dwell_time_mins} mins
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-3xl font-black text-white">{selectedAisle.customer_count}</span>
              <span className="text-xs text-slate-400 block font-medium">current shoppers</span>
            </div>
            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase ${
              selectedAisle.density === 'critical' ? 'bg-rose-500 text-white' : selectedAisle.density === 'high' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
            }`}>
              {selectedAisle.density} density
            </span>
          </div>
        </div>

        {/* Aisle Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {aisleTraffic.map((item: AisleTraffic) => {
            const isSelected = selectedAisle.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedAisle(item)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-lg space-y-3 ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.aisle}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    item.density === 'critical' ? 'bg-rose-950 text-rose-400 border border-rose-500/30' : item.density === 'high' ? 'bg-amber-950 text-amber-400 border border-amber-500/30' : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}>
                    {item.density}
                  </span>
                </div>

                <h4 className="font-bold text-white text-base">{item.aisle_name}</h4>

                <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span>Shoppers present:</span>
                    <strong className="text-white font-mono">{item.customer_count}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Dwell:</span>
                    <strong className="text-white font-mono">{item.avg_dwell_time_mins} min</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
