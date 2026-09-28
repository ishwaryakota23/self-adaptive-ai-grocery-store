import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MessageSquare, LayoutGrid, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InteractionMode, LanguageCode } from '../types';

export const InteractionModePage: React.FC = () => {
  const navigate = useNavigate();
  const { interactionMode, setInteractionMode, language, setLanguage, setRole } = useApp();

  const handleContinue = () => {
    setRole('CUSTOMER');
    if (interactionMode === 'voice') {
      navigate('/customer/assistant?mode=voice');
    } else if (interactionMode === 'chat') {
      navigate('/customer/assistant?mode=chat');
    } else {
      navigate('/customer/products');
    }
  };

  const languages: { code: LanguageCode; label: string; native: string }[] = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-3xl mx-auto w-full">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            How would you like to shop today?
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto font-light">
            Choose your preferred way to interact with your AI shopping assistant.
          </p>
        </div>

        {/* 3 Interaction Mode Cards (Screen 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {/* Voice Card */}
          <button
            onClick={() => setInteractionMode('voice')}
            className={`p-6 rounded-3xl border text-center transition-all cursor-pointer relative overflow-hidden group flex flex-col items-center justify-center ${
              interactionMode === 'voice'
                ? 'bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            {interactionMode === 'voice' && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            )}
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105 ${
                interactionMode === 'voice'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <Mic className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Voice</h3>
            <p className="text-xs text-slate-400">Speak naturally in your preferred language</p>
          </button>

          {/* Chat Card */}
          <button
            onClick={() => setInteractionMode('chat')}
            className={`p-6 rounded-3xl border text-center transition-all cursor-pointer relative overflow-hidden group flex flex-col items-center justify-center ${
              interactionMode === 'chat'
                ? 'bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            {interactionMode === 'chat' && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            )}
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105 ${
                interactionMode === 'chat'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Chat</h3>
            <p className="text-xs text-slate-400">Type and chat with quick tap answers</p>
          </button>

          {/* Browse Card */}
          <button
            onClick={() => setInteractionMode('browse')}
            className={`p-6 rounded-3xl border text-center transition-all cursor-pointer relative overflow-hidden group flex flex-col items-center justify-center ${
              interactionMode === 'browse'
                ? 'bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            {interactionMode === 'browse' && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            )}
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105 ${
                interactionMode === 'browse'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <LayoutGrid className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Browse</h3>
            <p className="text-xs text-slate-400">Explore shelves and grocery categories</p>
          </button>
        </div>

        {/* Choose Language (Screen 2) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 mb-10">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 text-center">
            Choose Language
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`py-3 px-4 rounded-2xl text-center text-sm font-semibold transition-all cursor-pointer border ${
                  language === l.code
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{l.native}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <button
            onClick={handleContinue}
            className="w-full sm:w-auto px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-base shadow-xl shadow-emerald-500/20 inline-flex items-center justify-center gap-2 transform hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
