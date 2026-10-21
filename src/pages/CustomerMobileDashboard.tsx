import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Smartphone,
  Navigation,
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
  MicOff,
  Camera,
  QrCode,
  X
} from 'lucide-react';
import { db } from '../services/db.js';
import { sessionService } from '../services/sessionService.js';
import { sessionSyncService, SharedCartSnapshot } from '../services/sessionSyncService.js';
import { parseMobileHandoffParams } from '../services/sessionHandoffUrl.js';
import { customerAgent, getCustomerAgentIdentity } from '../services/customerAgent.js';
import { voiceService } from '../services/voiceService.js';
import { languageDetector } from '../services/languageDetector.js';
import { memoryService } from '../services/nativeMemoryService.js';
import { ProductCameraIdentifier } from '../components/ProductCameraIdentifier.js';
import { CustomerJarvisVoiceOrb } from '../components/CustomerJarvisVoiceOrb.js';
import { qrService } from '../services/qrService.js';
import { ShoppingMission, ShoppingMissionItem, CartItem, NotificationItem, Product } from '../types/index.js';

export const CustomerMobileDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const handoffParams = parseMobileHandoffParams(searchParams);
  const querySession = searchParams.get('session');
  const sessionToken = handoffParams.token;
  const querySessionId = searchParams.get('session_id');

  const navigate = useNavigate();
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const consumedTokenRef = useRef<string | null>(null);
  const sharedRevisionRef = useRef<number | null>(null);
  const sharedCartSignatureRef = useRef<string>('');
  const sharedSavePendingRef = useRef(false);
  const [sharedRevision, setSharedRevision] = useState<number | null>(null);
  const [sharedSyncError, setSharedSyncError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string>(() => {
    if (sessionToken) return '';
    // URL session IDs are hints only. A kiosk-to-phone visit requires a
    // server-issued handoff token; never trust a bare session query parameter.
    if (querySession || querySessionId) return '';
    return sessionService.getActiveSessionId();
  });
  const [activeSessionToken, setActiveSessionToken] = useState<string | null>(sessionToken);

  useEffect(() => {
    const hintedSessionId = handoffParams.sessionIdHint;
    if (handoffParams.tokenMissing) {
      setHandoffError('This link has no secure handoff token. Return to the kiosk and scan a fresh session QR.');
      return;
    }
    if (sessionToken && consumedTokenRef.current !== sessionToken) {
      consumedTokenRef.current = sessionToken;
      setActiveSessionToken(sessionToken);
      setHandoffError(null);
      void sessionSyncService.load(sessionToken, hintedSessionId || undefined).then(shared => {
        if (!shared.customer || shared.session.session_id !== (hintedSessionId || shared.session.session_id)) throw new Error('The session pass does not match the active customer session.');
        db.importRemoteShoppingSession(shared.session as any, shared.customer);
        const items = db.replaceCartFromServer(shared.session.session_id, shared.cart.items);
        sessionService.setActiveSession(shared.session.session_id);
        setSessionId(shared.session.session_id);
        setActiveSessionToken(shared.syncToken || sessionToken);
        setMission(db.getActiveMission(shared.session.session_id));
        setCart(items);
        setNotifications(db.getNotifications(shared.session.session_id));
        sharedRevisionRef.current = shared.cart.revision;
        setSharedRevision(shared.cart.revision);
        sharedCartSignatureRef.current = JSON.stringify(shared.cart.items.map(i => [i.product_id, i.quantity]));
        setHandoffError(null);
      }).catch(error => {
        setHandoffError(error?.message || 'Invalid or expired session pass.');
      });
    }
  }, [sessionToken, querySessionId, querySession, handoffParams.sessionIdHint, handoffParams.tokenMissing]);

  const [mission, setMission] = useState<ShoppingMission | undefined>(() => db.getActiveMission(sessionId));
  const [cart, setCart] = useState<CartItem[]>(() => db.getCart(sessionId));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => db.getNotifications(sessionId));
  const [deviceFrame, setDeviceFrame] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [activeScannedProduct, setActiveScannedProduct] = useState<Product | null>(null);
  const [recalledMemories, setRecalledMemories] = useState<string[]>([]);
  const [showCheckoutPass, setShowCheckoutPass] = useState(false);
  const [sessionQrUrl, setSessionQrUrl] = useState<string | null>(null);
  const [checkoutQrError, setCheckoutQrError] = useState<string | null>(null);
  const [checkoutQrAttempt, setCheckoutQrAttempt] = useState(0);

  useEffect(() => {
    if (!showCheckoutPass || !sessionId) return;
    let cancelled = false;
    setSessionQrUrl(null);
    setCheckoutQrError(null);
    if (!activeSessionToken) {
      setCheckoutQrError('This mobile session has no secure handoff token. Reopen it by scanning the session QR from the kiosk.');
      return () => { cancelled = true; };
    }

    try {
      // The signed handoff token already authorizes the kiosk lookup. Build its URL
      // locally so a transient session-sync read cannot leave the QR spinner stuck.
      const kioskUrl = new URL('/kiosk', window.location.origin);
      kioskUrl.searchParams.set('handoff', activeSessionToken);
      kioskUrl.searchParams.set('action', 'verify');
      const rawKioskUrl = kioskUrl.toString();
      void qrService.generateSessionQR({
        handoff_id: activeSessionToken, session_id: sessionId,
        customer_id: '', secure_token: activeSessionToken,
        qr_payload: rawKioskUrl, status: 'active', created_at: new Date().toISOString(), expires_at: ''
      } as any).then(qr => {
        if (!cancelled) setSessionQrUrl(qr.dataUrl);
      }).catch(error => {
        if (!cancelled) setCheckoutQrError(error?.message || 'Could not render the kiosk session QR. Please retry.');
      });
    } catch (error: any) {
      setCheckoutQrError(error?.message || 'Could not create the kiosk session QR. Please retry.');
    }
    return () => { cancelled = true; };
  }, [showCheckoutPass, sessionId, activeSessionToken, checkoutQrAttempt]);

  const handleProductIdentifiedFromCamera = async (product: Product) => {
    setActiveScannedProduct(product);
    // Explicit camera assistive identification: Customer Agent explains product & availability
    const query = `What is ${product.name}? Tell me its shelf location, price, and if it is an approved substitute for my mission.`;
    const preferredLang = languageDetector.getPreferredLanguage(sessionId);
    try {
      const response = await customerAgent.processInput(query, preferredLang, mission, sessionId, 'voice', getCustomerAgentIdentity(sessionId));
      const agentMsg = {
        sender: 'agent' as const,
        text: response.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        aisleHint: response.productFound?.shelf_location || response.aisle,
        data: response
      };
      setMessages((prev) => [...prev, agentMsg]);
      if (voicePlayback) {
        const langToSpeak = (response.response_language as any) || preferredLang || 'en';
        voiceService.speak(response.message, langToSpeak, sessionId);
      }
    } catch (e) {
      console.warn('Error processing camera product with Customer Agent:', e);
    }
  };

  // Recall the bank belonging to the session customer; the API validates their identity.
  useEffect(() => {
    let active = true;
    const session = db.getShoppingSession(sessionId);
    const custId = session?.customer_id || '';
    setRecalledMemories([]);
    if (custId) {
      memoryService.recallCustomerMemories(custId, 'preferences diet organic habits')
        .then(res => { if (active) setRecalledMemories(res.success ? res.results.map(item => item.text.split('\n')[0]) : []); })
        .catch(() => { if (active) setRecalledMemories([]); });
    }
    return () => { active = false; };
  }, [sessionId]);

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

  // Pull changes from the shared revisioned snapshot; no browser-local broadcast is required.
  useEffect(() => {
    if (!activeSessionToken || !sessionId) return;
    let cancelled = false;
    let inFlight = false;
    const pull = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const shared = await sessionSyncService.load(activeSessionToken);
        if (cancelled || shared.session.session_id !== sessionId || shared.cart.revision === sharedRevisionRef.current) return;
        sharedRevisionRef.current = shared.cart.revision;
        setSharedRevision(shared.cart.revision);
        sharedCartSignatureRef.current = JSON.stringify(shared.cart.items.map(i => [i.product_id, i.quantity]));
        const next = db.replaceCartFromServer(sessionId, shared.cart.items);
        setCart(next);
        setSharedSyncError(null);
      } catch (error: any) {
        if (!cancelled) setSharedSyncError(error?.message || 'Shared cart could not be refreshed.');
      } finally { inFlight = false; }
    };
    void pull();
    const timer = window.setInterval(() => void pull(), 2500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [activeSessionToken, sessionId]);

  // Persist cart edits with optimistic revision checks to avoid overwriting concurrent device updates.
  useEffect(() => {
    if (!activeSessionToken || !sessionId || sharedRevisionRef.current === null) return;
    const signature = JSON.stringify(cart.map(i => [i.product_id, i.quantity]));
    if (signature === sharedCartSignatureRef.current || sharedSavePendingRef.current) return;
    const timer = window.setTimeout(async () => {
      sharedSavePendingRef.current = true;
      try {
        const result: any = await sessionSyncService.saveCart(activeSessionToken, sharedRevisionRef.current!, db.getCart(sessionId));
        if (!result.success && result.conflict && result.cart) {
          sharedRevisionRef.current = result.cart.revision;
          setSharedRevision(result.cart.revision);
          sharedCartSignatureRef.current = JSON.stringify(result.cart.items.map((i: any) => [i.product_id, i.quantity]));
          const latest = db.replaceCartFromServer(sessionId, result.cart.items);
          setCart(latest);
          setSharedSyncError('The cart changed on another device. The latest shared cart is shown; retry your change.');
        } else {
          sharedRevisionRef.current = result.cart.revision;
          setSharedRevision(result.cart.revision);
          sharedCartSignatureRef.current = JSON.stringify(result.cart.items.map((i: any) => [i.product_id, i.quantity]));
          setSharedSyncError(null);
        }
      } catch (error: any) {
        setSharedSyncError(error?.message || 'Cart changes could not be saved to the shared backend.');
      } finally { sharedSavePendingRef.current = false; }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [cart, activeSessionToken, sessionId, sharedRevision]);

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
      handleSendMessage(`Add ${altProduct.name} to my cart as the substitute.`);
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
      const prod = data?.productFound;
      if (prod) {
        handleSendMessage(`Add ${prod.name} to my cart.`);
      } else {
        setMessages(prev => [...prev, { sender: 'agent', text: 'Please choose a specific product from the catalog before I add it.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
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
          setMessages((prev) => [
            ...prev,
            {
              sender: 'agent',
              text: 'Microphone permission blocked by browser. You can type your shopping question directly into the text box below!',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      );
      if (!started) {
        setIsListening(false);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'agent',
            text: 'Microphone speech recognition requires HTTPS or localhost. You can type your shopping question directly in the text box below, or open companion in a localhost tab!',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
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
      const response = await customerAgent.processInput(query, preferredLang, mission, sessionId, inputMode, getCustomerAgentIdentity(sessionId));
      const agentMsg = {
        sender: 'agent' as const,
        text: response.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        aisleHint: response.productFound?.shelf_location || response.aisle,
        data: response
      };
      setMessages((prev) => [...prev, agentMsg]);
      setIsAgentThinking(false);

      setCart(db.getCart(sessionId));

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
      {(sharedSyncError || sharedRevision !== null) && (
        <div role={sharedSyncError ? 'alert' : 'status'} className={`px-4 py-2 text-[11px] ${sharedSyncError ? 'bg-rose-950/60 text-rose-200 border-b border-rose-700' : 'bg-slate-900 text-slate-400 border-b border-slate-800'}`}>
          {sharedSyncError || `Shared cart connected Â· revision ${sharedRevision} Â· refreshes about every 2.5 seconds`}
        </div>
      )}
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
                {sessionId} â€¢ Flagship Store
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

          {/* Camera Product Identifier */}
          <button
            onClick={() => setCameraOpen(true)}
            className="p-1.5 rounded-lg border bg-slate-800 border-slate-700 text-emerald-400 hover:text-white transition-colors cursor-pointer"
            title="Identify Product with Camera"
          >
            <Camera className="w-4 h-4" />
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
            <div className="flex items-center gap-2">
              <Link
                to="/customer/map?mission=true"
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-500/30 transition-colors"
              >
                <Navigation className="w-3 h-3" />
                <span>Map Tour</span>
              </Link>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {foundMissionItems}/{totalMissionItems} Found ({progressPercent}%)
              </span>
            </div>
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

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        isFound
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {isFound ? 'Found' : 'Pending'}
                    </span>
                    {!isFound && (
                      <Link
                        to={`/customer/map?product=${item.product_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold transition-colors"
                      >
                        Route
                      </Link>
                    )}
                  </div>
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
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5"
                >
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">{notif.title}</span>
                    <span>{notif.message}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Aisle 1 Fresh Arrival</span>
                  <span>Farm-fresh produce restocked this morning in Produce Bins.</span>
                </div>
              </div>
            )}
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
              placeholder={isListening ? "Listening..." : "Ask Alexa+ to find an item..."}
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
              {cart.length} items (â‚¹{cartTotal})
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
                    â‚¹{item.product.price * item.quantity}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
            <button
              onClick={() => setShowCheckoutPass(true)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Checkout â†’</span>
            </button>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span>Exit Station: Kiosks 1â€“4</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                  Session: {sessionId}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Your shopping cart is ready. Please proceed to the nearest GrocerAI kiosk to verify your items and continue to checkout. Scan this session pass at the kiosk.
              </p>
            </div>
          </div>
        </section>
      </main>

      <ProductCameraIdentifier
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onProductIdentified={handleProductIdentifiedFromCamera}
      />

      {/* Checkout Exit Pass Modal */}
      {showCheckoutPass && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-sm w-full text-center space-y-5 shadow-2xl animate-fade-in relative">
            <button
              onClick={() => setShowCheckoutPass(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Exit Verification Pass</h2>
              <div className="mt-2 p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-200">
                <p className="text-xs font-semibold leading-relaxed">
                  Navigate to the kiosk for product verification and payment
                </p>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-3 rounded-2xl shadow-inner mx-auto w-56 h-56 flex items-center justify-center border-4 border-emerald-500/20">
              {sessionQrUrl ? (
                <img
                  src={sessionQrUrl}
                  alt="Customer Session QR Code"
                  className="w-full h-full object-contain"
                />
              ) : checkoutQrError ? (
                <div className="flex flex-col items-center justify-center gap-3 px-4 text-center text-rose-700">
                  <span className="text-xs font-semibold">{checkoutQrError}</span>
                  <button onClick={() => setCheckoutQrAttempt(attempt => attempt + 1)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Retry QR</button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-600 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="text-xs font-semibold">Generating QR Pass...</span>
                </div>
              )}
            </div>

            {/* Session Info */}
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span>Session ID:</span>
                <span className="font-mono text-emerald-400 font-bold">{sessionId}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Cart Total ({cart.length} items):</span>
                <span className="font-mono text-white font-bold text-sm">â‚¹{cartTotal}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Link
                to={`/customer/verify?session=${sessionId}`}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <span>Direct Kiosk Verification Screen</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setShowCheckoutPass(false)}
                className="w-full py-2 rounded-xl text-slate-400 hover:text-white text-xs transition-colors"
              >
                Back to Shopping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer mobile voice companion */}
      <CustomerJarvisVoiceOrb
        sessionId={sessionId}
        mission={mission}
        onOpenProductCamera={() => setCameraOpen(true)}
        onMessageAdded={(msg) => {
          setMessages((prev) => [
            ...prev,
            {
              sender: msg.sender,
              text: msg.text,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              aisleHint: msg.aisleHint,
              data: msg.data
            }
          ]);
        }}
        activeScannedProduct={activeScannedProduct}
        onNavigateToRoute={(route) => navigate(route)}
        voiceAudioEnabled={voicePlayback}
        onToggleVoiceAudio={() => setVoicePlayback(!voicePlayback)}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-6">
    {(sessionToken || querySession || querySessionId) && !sessionId && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-5">
          <div className="max-w-md w-full rounded-3xl border border-slate-700 bg-slate-900 p-7 text-center space-y-4">
            {handoffError ? <AlertCircle className="w-10 h-10 mx-auto text-rose-400" /> : <RefreshCw className="w-10 h-10 mx-auto text-emerald-400 animate-spin" />}
            <h1 className="text-xl font-bold text-white">{handoffError ? 'Could not load this shopping session' : 'Loading your shared shopping sessionâ€¦'}</h1>
            <p className="text-sm text-slate-300">{handoffError || 'Connecting to the secure shared cart. No new cart will be created.'}</p>
            {handoffError && <button onClick={() => window.location.assign('/kiosk')} className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm">Return to kiosk and scan a fresh QR</button>}
          </div>
        </div>
      )}
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



