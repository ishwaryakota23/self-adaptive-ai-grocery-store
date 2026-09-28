import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Smartphone,
  Compass,
  CheckCircle2,
  Circle,
  MapPin,
  Bot,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  ShoppingCart,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Mic,
  MicOff
} from 'lucide-react';
import { db } from '../services/db';
import { sessionService } from '../services/sessionService';
import { customerAgent } from '../services/customerAgent';
import { voiceService } from '../services/voiceService';
import { languageDetector } from '../services/languageDetector';
import { ShoppingMission, ShoppingMissionItem, CartItem, NotificationItem } from '../types';

export const CustomerMobileDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const querySession = searchParams.get('session');

  const [sessionId, setSessionId] = useState<string>(() => {
    if (querySession && querySession.startsWith('USER')) {
      sessionService.setActiveSession(querySession);
      return querySession;
    }
    return sessionService.getActiveSessionId();
  });

  const [mission, setMission] = useState<ShoppingMission | undefined>(() => db.getActiveMission(sessionId));
  const [cart, setCart] = useState<CartItem[]>(() => db.getCart(sessionId));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => db.getNotifications(sessionId));
  const [deviceFrame, setDeviceFrame] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string; aisleHint?: string; data?: any }>>([
    {
      sender: 'agent',
      text: `Hello! I'm your in-aisle GrocerAI companion. I've synced your shopping mission for session ${sessionId}. Ask me anything about item locations or substitutions!`,
      time: 'Just now'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voicePlayback, setVoicePlayback] = useState(true);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Synchronize with DB changes
  useEffect(() => {
    const unsub = db.subscribe(() => {
      setMission(db.getActiveMission(sessionId));
      setCart(db.getCart(sessionId));
      setNotifications(db.getNotifications(sessionId));
    });
    return unsub;
  }, [sessionId]);

  // Handle session updates from service
  useEffect(() => {
    const unsubSession = sessionService.subscribe((s) => {
      setSessionId(s.id);
      setMission(db.getActiveMission(s.id));
      setCart(db.getCart(s.id));
      setNotifications(db.getNotifications(s.id));
    });
    return unsubSession;
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentThinking]);

  const handleToggleItemStatus = (item: ShoppingMissionItem) => {
    if (!mission) return;
    const newStatus = item.status === 'found' ? 'pending' : 'found';
    db.updateMissionItemStatus(mission.id, item.id, newStatus);
  };

  const handleMobileQuickAction = (qa: { label: string; action: string; route?: string }, data?: any) => {
    if (qa.action === 'accept_substitute' && data?.alternatives?.[0]) {
      const altProduct = data.alternatives[0];
      db.addToCart(altProduct, 1, sessionId, 'MOBILE');
      const subs = db.getSubstitutions();
      const match = subs.find(s => s.customer_session_id === sessionId && s.substitute_product_id === altProduct.id && !s.substitute_accepted);
      if (match) {
        db.recordSubstitutionAccepted(match.id, sessionId);
      }
      handleSendMessage(`Accepted substitute: ${altProduct.name}. Added to cart.`);
      return;
    }
    if (qa.action === 'reject_substitute') {
      const subs = db.getSubstitutions();
      const match = subs.find(s => s.customer_session_id === sessionId && !s.substitute_accepted);
      if (match) {
        db.recordSubstitutionRejected(match.id, sessionId, 'Mobile shopper declined substitute');
      }
      handleSendMessage('I decline this substitution.');
      return;
    }
    if (qa.action === 'add_to_cart') {
      const prod = data?.productFound || db.getProductById('prod-taaza-milk');
      if (prod) {
        db.addToCart(prod, 1, sessionId, 'MOBILE');
        handleSendMessage(`Added ${prod.name} to cart.`);
      }
      return;
    }
    handleSendMessage(qa.label);
  };

  const toggleMobileVoice = () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      const sessionLang = languageDetector.getPreferredLanguage(sessionId);
      const started = voiceService.startListening(
        sessionLang,
        (recText, isFinal) => {
          if (isFinal) {
            setIsListening(false);
            handleSendMessage(recText, 'voice');
          }
        },
        (err) => {
          console.warn('Mobile voice recognition error:', err);
          setIsListening(false);
        }
      );
      if (!started) {
        setIsListening(false);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string, inputMode: 'text' | 'voice' = 'text') => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg = {
      sender: 'user' as const,
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsAgentThinking(true);

    try {
      const preferredLang = languageDetector.getPreferredLanguage(sessionId);
      const response = await customerAgent.processInput(query, preferredLang, mission, sessionId, inputMode);
      const agentMsg = {
        sender: 'agent' as const,
        text: response.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        aisleHint: response.productFound?.shelf_location || response.aisle,
        data: response
      };
      setMessages((prev) => [...prev, agentMsg]);
      setIsAgentThinking(false);

      if (voicePlayback) {
        const langToSpeak = (response.response_language as any) || preferredLang || 'en';
        voiceService.speak(response.message, langToSpeak, sessionId);
      }
    } catch {
      setIsAgentThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: `Checking shelf locations for "${query}"... Please check aisle signs or ask floor staff.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const totalMissionItems = mission?.items.length || 0;
  const foundMissionItems = mission?.items.filter((i) => i.status === 'found').length || 0;
  const progressPercent = totalMissionItems > 0 ? Math.round((foundMissionItems / totalMissionItems) * 100) : 0;
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const content = (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white selection:bg-emerald-500 selection:text-slate-950">
      {/* Mobile Top Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Smartphone className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
              Grocer<span className="text-emerald-400">AI</span> Mobile
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-mono font-semibold">
                {sessionId} • Flagship Store
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio speech toggle */}
          <button
            onClick={() => setVoicePlayback(!voicePlayback)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              voicePlayback
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={voicePlayback ? 'Voice audio enabled' : 'Voice audio muted'}
          >
            {voicePlayback ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Sync indicator */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg text-[10px] text-emerald-400 font-semibold">
            <RefreshCw className="w-3 h-3 animate-spin-slow" />
            <span>Synced</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 space-y-5 pb-24 max-w-lg mx-auto w-full">
        {/* Active Shopping Mission Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <h2 className="font-bold text-sm text-white">Active Shopping Mission</h2>
            </div>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              {foundMissionItems}/{totalMissionItems} Found ({progressPercent}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Mission Item Checklist with Aisle Locations */}
          <div className="space-y-2.5 pt-1">
            {mission?.items.map((item) => {
              const isFound = item.status === 'found';
              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleItemStatus(item)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isFound
                      ? 'bg-slate-950/60 border-emerald-500/40 opacity-75'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button className="text-emerald-400 shrink-0">
                      {isFound ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                    <div>
                      <p
                        className={`text-xs font-bold leading-tight ${
                          isFound ? 'line-through text-slate-400' : 'text-slate-100'
                        }`}
                      >
                        {item.product_name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="font-medium text-emerald-300">
                          {item.shelf_location || item.aisle}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                      isFound
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isFound ? 'Found' : 'Find in Aisle'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Proactive In-Store Location Alerts */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Aisle Telemetry & Smart Alerts</span>
          </div>

          <div className="space-y-2">
            <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Aisle 4 Notice (Dairy)</span>
                <span>
                  Amul Fresh Paneer 200g is currently out of stock. Suggested substitute:{' '}
                  <strong className="text-white">Milky Mist Paneer (Aisle 4, Shelf B3)</strong>.
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Aisle 1 Fresh Arrival</span>
                <span>Vine-ripened organic tomatoes restocked this morning in Bin 4.</span>
              </div>
            </div>
          </div>
        </section>

        {/* In-Aisle Customer Agent Chat */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3 flex flex-col h-80">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-400" />
              <h2 className="font-bold text-xs text-white">Ask Customer Agent</h2>
            </div>
            <span className="text-[10px] text-slate-400">Natural Language & Voice</span>
          </div>

          {/* Quick Query Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <button
              onClick={() => handleSendMessage('Check Curd')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg whitespace-nowrap transition-colors border border-slate-700 cursor-pointer"
            >
              Check Curd
            </button>
            <button
              onClick={() => handleSendMessage('Where is Amul Paneer?')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg whitespace-nowrap transition-colors border border-slate-700 cursor-pointer"
            >
              Where is Paneer?
            </button>
            <button
              onClick={() => handleSendMessage('Find Amul Milk')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg whitespace-nowrap transition-colors border border-slate-700 cursor-pointer"
            >
              Find Milk
            </button>
            <button
              onClick={() => handleSendMessage('Where is Olive Oil?')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg whitespace-nowrap transition-colors border border-slate-700 cursor-pointer"
            >
              Find Olive Oil
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700 rounded-tl-none'
                  }`}
                >
                  <p>{m.text}</p>
                  {m.aisleHint && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-700 flex items-center gap-1 text-[11px] text-emerald-300 font-semibold">
                      <MapPin className="w-3 h-3" />
                      <span>{m.aisleHint}</span>
                    </div>
                  )}

                  {/* Render Quick Actions in Mobile Bubble */}
                  {m.data?.quickActions && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700/80 flex flex-wrap gap-1.5">
                      {m.data.quickActions.map((qa: any, qi: number) => (
                        <button
                          key={qi}
                          onClick={() => handleMobileQuickAction(qa, m.data)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-emerald-600 hover:text-slate-950 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-600 transition-colors cursor-pointer"
                        >
                          {qa.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-500 mt-0.5 px-1">{m.time}</span>
              </div>
            ))}

            {isAgentThinking && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 p-2">
                <Bot className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
                <span className="italic">Customer Agent is thinking...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input Box */}
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={toggleMobileVoice}
              className={`p-2 rounded-xl transition-all ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Speak to Agent"
            >
              <Mic className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isListening ? "Listening..." : "Ask for aisle or item..."}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
            />
            <button
              onClick={() => handleSendMessage()}
              className="p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Live Cart Preview (Synced with Kiosk) */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              <h2 className="font-bold text-xs text-white">Cart Synchronized with Kiosk</h2>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {cart.length} items (₹{cartTotal})
            </span>
          </div>

          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2 text-center">
                Cart is empty. Items added on kiosk or mobile will appear here.
              </p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60"
                >
                  <span className="text-slate-300">
                    {item.quantity}x {item.product.name}
                  </span>
                  <span className="font-mono font-semibold text-white">
                    ₹{item.product.price * item.quantity}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Pay at Smart Kiosk or Counter 1-4</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Auto-synced</span>
            </span>
          </div>
        </section>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-6">
      {/* Viewport switch toolbar for desktop testing */}
      <div className="mb-4 flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl text-xs">
        <span className="text-slate-400">Display Simulation:</span>
        <button
          onClick={() => setDeviceFrame(false)}
          className={`px-3 py-1 rounded-xl font-bold transition-all ${
            !deviceFrame ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          Full View
        </button>
        <button
          onClick={() => setDeviceFrame(true)}
          className={`px-3 py-1 rounded-xl font-bold transition-all ${
            deviceFrame ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          Mobile Shell (iPhone / Android)
        </button>
        <Link
          to="/"
          className="ml-auto text-emerald-400 hover:underline flex items-center gap-1"
        >
          <span>Back to Large Display</span>
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {deviceFrame ? (
        <div className="w-[390px] h-[844px] bg-slate-950 rounded-[48px] border-8 border-slate-800 shadow-2xl overflow-hidden relative flex flex-col">
          {/* Phone Speaker Notch */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-32 h-4 bg-slate-900 rounded-full z-50 pointer-events-none" />
          <div className="flex-1 overflow-y-auto pt-2">{content}</div>
        </div>
      ) : (
        <div className="w-full max-w-lg">{content}</div>
      )}
    </div>
  );
};
