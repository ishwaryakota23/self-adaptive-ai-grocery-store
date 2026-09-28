import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Heart,
  Globe,
  Sliders,
  Bell,
  Mic,
  Save,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';

export const CustomerPreferencesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, language, setLanguage } = useApp();
  const currentPrefs = db.getCustomerPreferences(currentUser.id);

  const [dietary, setDietary] = useState<string[]>(currentPrefs?.dietary_preferences || ['Vegetarian', 'High-Protein']);
  const [budgetMax, setBudgetMax] = useState<number>(currentPrefs?.budget_max || 1500);
  const [preferredBrands, setPreferredBrands] = useState<string[]>(currentPrefs?.preferred_brands || ['Amul', 'Borges', 'Epigamia']);
  const [voiceEnabled, setVoiceEnabled] = useState(currentPrefs?.voice_enabled ?? true);
  const [notifsEnabled, setNotifsEnabled] = useState(currentPrefs?.notifications_enabled ?? true);
  const [savedToast, setSavedToast] = useState(false);

  const dietaryOptions = ['Vegetarian', 'Vegan', 'High-Protein', 'Gluten-Free', 'Keto', 'Organic Only', 'Dairy-Free'];
  const brandOptions = ['Amul', 'Borges', 'Epigamia', 'OrganicTattva', 'HealthFactory', 'Raw Pressery', 'TrueElements'];

  const toggleDietary = (item: string) => {
    setDietary(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  };

  const toggleBrand = (brand: string) => {
    setPreferredBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateCustomerPreferences(currentUser.id, {
      dietary_preferences: dietary,
      budget_max: budgetMax,
      preferred_brands: preferredBrands,
      voice_enabled: voiceEnabled,
      notifications_enabled: notifsEnabled
    });

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Customer Profile Preferences</h1>
            <p className="text-xs text-slate-400">Configure how the Customer Agent customizes your shopping trips</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Dietary Options */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Dietary & Health Preferences
            </label>
            <div className="flex flex-wrap gap-2">
              {dietaryOptions.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => toggleDietary(opt)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    dietary.includes(opt)
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Brands */}
          <div className="pt-4 border-t border-slate-800">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Preferred Supermarket Brands
            </label>
            <div className="flex flex-wrap gap-2">
              {brandOptions.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => toggleBrand(b)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    preferredBrands.includes(b)
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Range */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
              <span className="uppercase tracking-wider">Target Trip Budget Limit</span>
              <span className="text-emerald-400 font-mono text-sm">₹{budgetMax}</span>
            </div>
            <input
              type="range"
              min="300"
              max="5000"
              step="100"
              value={budgetMax}
              onChange={(e) => setBudgetMax(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Toggles */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
                <Mic className="w-4 h-4 text-emerald-400" />
                Enable Voice Interactions & TTS Readout
              </span>
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                Proactive In-Store Notifications & Alerts
              </span>
              <input
                type="checkbox"
                checked={notifsEnabled}
                onChange={(e) => setNotifsEnabled(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all cursor-pointer"
          >
            {savedToast ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Preferences Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Preferences to Database</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
