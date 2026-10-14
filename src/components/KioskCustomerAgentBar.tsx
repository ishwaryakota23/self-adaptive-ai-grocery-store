import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Smartphone,
  Plus,
  Check,
  Brain,
  AlertCircle,
  MapPin,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { customerAgent, CustomerAgentResponse, getCustomerAgentIdentity } from '../services/customerAgent';
import { voiceService } from '../services/voiceService';
import { echoGuard } from '../services/echoGuard';
import { db } from '../services/db';
import { hindsightService } from '../services/hindsightService';
import { Product } from '../types';

export const KioskCustomerAgentBar: React.FC = () => {
  const {
    currentCustomer,
    language,
    setLanguage,
    addToCart,
    setIsSessionQRModalOpen,
    activeShoppingSession,
    products
  } = useApp();

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceAudioEnabled, setVoiceAudioEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeResponse, setActiveResponse] = useState<CustomerAgentResponse | null>(null);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});
  const [recalledMemories, setRecalledMemories] = useState<string[]>([]);
  const isContinuousActiveRef = useRef<boolean>(false);

  const sessionId = activeShoppingSession?.session_id || 'SESS_ACTIVE';
  const customerId = currentCustomer?.customer_id || activeShoppingSession?.session_id || 'GUEST';
  const isReturning = recalledMemories.length > 0;

  // Recall only for the identified customer; the API verifies their identity token.
  useEffect(() => {
    let active = true;
    setRecalledMemories([]);
    if (currentCustomer) {
      hindsightService.recallCustomerMemories(customerId, 'dietary brand budget organic preferences')
        .then(res => { if (active) setRecalledMemories(res.success ? res.results.map(item => item.text) : []); })
        .catch(() => { if (active) setRecalledMemories([]); });
    }
    return () => { active = false; };
  }, [currentCustomer, customerId]);

  // Handle voice service status
  useEffect(() => {
    const unsub = voiceService.subscribeStatus((status) => {
      if (status === 'listening') setIsListening(true);
      else if (status === 'speaking') setIsSpeaking(true);
      else if (status === 'idle') {
        setIsListening(false);
        setIsSpeaking(false);
      } else if (status === 'error') {
        setIsListening(false);
        setIsSpeaking(false);
      }
    });
    return unsub;
  }, []);

  // Continuous background wake-word listener (Say "Hey JARVIS")
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let recognition: any = null;
    let isMounted = true;

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onresult = (event: any) => {
        const results = event.results;
        const latest = results[results.length - 1];
        const transcript = latest?.[0]?.transcript?.trim() || '';
        if (!transcript) return;

        if (echoGuard.getIsSpeaking() || echoGuard.isEcho(transcript)) return;

        const lower = transcript.toLowerCase();
        const hasWakeWord =
          lower.includes('hey jarvis') ||
          lower.includes('jarvis') ||
          lower.includes('హే జార్విస్') ||
          lower.includes('జార్విస్') ||
          lower.includes('हे जार्विस') ||
          lower.includes('जार्विस');

        const isEnding =
          lower === 'end' ||
          lower === 'stop' ||
          lower === 'finish' ||
          lower === 'exit' ||
          lower === 'bye' ||
          lower.includes('end conversation') ||
          lower.includes('stop conversation') ||
          lower.includes('goodbye') ||
          lower.includes("that's all") ||
          lower.includes('bye jarvis') ||
          lower.includes('చాలు') ||
          lower.includes('ఆపు') ||
          lower.includes('ముగించు') ||
          lower.includes('बस') ||
          lower.includes('अलविदा') ||
          lower.includes('बंद करो');

        if (latest.isFinal) {
          if (isEnding && isContinuousActiveRef.current) {
            isContinuousActiveRef.current = false;
            voiceService.playAudioChime(480, 200);
            const farewell =
              language === 'te'
                ? 'ధన్యవాదాలు! సంభాషణ ముగిసింది.'
                : language === 'hi'
                ? 'धन्यवाद! बातचीत समाप्त हुई।'
                : "Goodbye! Have a great time shopping. Say 'Hey JARVIS' whenever you need me.";
            setActiveResponse({ message: farewell });
            if (voiceAudioEnabled) {
              voiceService.speak(farewell, language, sessionId);
            }
            return;
          }

          if (hasWakeWord || isContinuousActiveRef.current) {
            isContinuousActiveRef.current = true;
            const cleanCommand = transcript
              .replace(/hey\s+jarvis[,.]?/i, '')
              .replace(/jarvis[,.]?/i, '')
              .replace(/హే\s+జార్విస్[,.]?/i, '')
              .replace(/జార్విస్[,.]?/i, '')
              .replace(/हे\s+जार्विस[,.]?/i, '')
              .replace(/जार्विस[,.]?/i, '')
              .trim();

            if (cleanCommand) {
              setInputQuery(cleanCommand);
              voiceService.playAudioChime(620);
              handleSend(cleanCommand);
            }
          }
        }
      };

      recognition.onend = () => {
        if (isMounted) {
          try {
            recognition.start();
          } catch {}
        }
      };

      try {
        recognition.start();
      } catch {}
    } catch (e) {
      console.warn('Background wake-word recognition error:', e);
    }

    return () => {
      isMounted = false;
      if (recognition) {
        try {
          recognition.stop();
        } catch {}
      }
    };
  }, [language]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    setIsLoading(true);
    setInputQuery('');
    setIsExpanded(true);

    try {
      const response = await customerAgent.processInput(
        query,
        language,
        undefined,
        sessionId,
        isListening ? 'voice' : 'text',
        getCustomerAgentIdentity(sessionId, currentCustomer?.customer_id)
      );

      setActiveResponse(response);

      // CustomerAgent already reconciles and verifies tool mutations against this session cart.
      if (response.toolExecutions) {
        for (const t of response.toolExecutions) {
          if (t.tool_name === 'addToCart' && t.success && t.result?.added) {
            setAddedItemIds(prev => ({ ...prev, [t.result.added.productId]: true }));
          }
        }
      }

      // Play audio TTS if enabled
      if (voiceAudioEnabled && response.message) {
        setIsSpeaking(true);
        const langToSpeak = (response.response_language as any) || language;
        voiceService.speak(response.message, langToSpeak, sessionId).then(() => {
          setIsSpeaking(false);
        });
      }
    } catch (err) {
      console.error('Customer agent query failed:', err);
      setActiveResponse({
        message: language === 'te'
          ? "క్షమించండి, ప్రాసెస్ చేయడంలో లోపం వచ్చింది. దయచేసి మళ్లీ అడగండి."
          : language === 'hi'
          ? "क्षमा करें, अनुरोध संसाधित करने में समस्या आई। कृपया पुनः पूछें।"
          : "I encountered an issue processing that. Please ask again or specify which brand you'd like!",
        error: "Network error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoice = () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
    } else {
      voiceService.startListening(
        language,
        (transcript, isFinal) => {
          setInputQuery(transcript);
          if (isFinal) {
            handleSend(transcript);
            voiceService.stopListening();
            setIsListening(false);
          }
        },
        (err) => {
          console.warn('Voice input error:', err);
          setIsListening(false);
        }
      );
    }
  };

  const handleAddProduct = (prod: Product) => {
    addToCart(prod, 1);
    setAddedItemIds(prev => ({ ...prev, [prod.id]: true }));
    setTimeout(() => {
      setAddedItemIds(prev => ({ ...prev, [prod.id]: false }));
    }, 2500);
  };

  const suggestionChips = language === 'te' ? [
    { label: "🍳 3 మందికి ₹300 లోపు అల్పాహారం", query: "నేను 300 లోపు 3 మందికి బ్రేక్‌ఫాస్ట్ చేయాలనుకుంటున్నాను, స్టోర్‌లో ఉన్న వాటితో ఏమి చేయవచ్చు?" },
    { label: "💡 ఈరోజు ఏమి వండాలి?", query: "ఈరోజు ఏమి వండాలో అర్థం కావడం లేదు, స్టోర్ వస్తువులతో ఒక సులభమైన ఆరోగ్యకరమైన వంటకాన్ని సూచించగలరా?" },
    { label: "🍞 ఆర్గానిక్ బ్రెడ్ & పెరుగు", query: "నాకు ఆర్గానిక్ బ్రెడ్ మరియు పెరుగు కావాలి. పెరుగు స్టాక్ లేకపోతే ప్రత్యామ్నాయాన్ని సూచించండి." },
    { label: "🥦 బ్రకోలీ ఆరోగ్య ప్రయోజనాలు", query: "బరువు తగ్గడానికి బ్రకోలీ మంచిదా? ఆరోగ్యకరమైన అలవాట్లను సూచించండి." }
  ] : language === 'hi' ? [
    { label: "🍳 3 लोगों के लिए ₹300 में नाश्ता", query: "मैं 300 रुपये के अंदर 3 लोगों के लिए नाश्ता बनाना चाहता हूँ, स्टोर में क्या उपलब्ध है?" },
    { label: "💡 आज क्या पकाएं?", query: "मुझे समझ नहीं आ रहा आज क्या पकाऊं, क्या आप कोई आसान स्वस्थ रेसिपी सुझा सकते हैं?" },
    { label: "🍞 ऑर्गेनिक ब्रेड और दही", query: "मुझे ऑर्गेनिक ब्रेड और दही चाहिए। अगर दही स्टॉक में नहीं है तो विकल्प बताएं।" },
    { label: "🥦 वजन घटाने के लिए ब्रोकली", query: "क्या ब्रोकली वजन घटाने के लिए अच्छी है? स्वस्थ खान-पान की आदतें बताएं।" }
  ] : [
    { label: "🍳 Breakfast for 3 under ₹300", query: "I want to prepare breakfast for 3 people below 300, what can I cook with products in store?" },
    { label: "💡 What should I cook today?", query: "I don't know what to cook, can you help recommend a simple healthy recipe with store ingredients?" },
    { label: "🍞 Organic bread & yogurt", query: "I prefer organic whole wheat bread and yogurt. If yogurt is out of stock, recommend the best alternatives." },
    { label: "🥦 Broccoli for weight loss", query: "Is broccoli good for losing weight? Can you suggest healthy eating habits and high-fiber foods in store?" },
  ];

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-1/4 w-96 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          {/* Animated JARVIS Orb */}
          <div className="relative flex items-center justify-center">
            <div className={`w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 ${isSpeaking || isLoading ? 'animate-pulse scale-105' : ''}`}>
              <Brain className="w-5 h-5 text-slate-950" />
            </div>
            {(isSpeaking || isListening) && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                GrocerAI Customer Agent <span className="text-emerald-400 text-xs font-mono font-normal">(JARVIS)</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                In-Store Intelligence
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {language === 'te'
                ? 'వంటకాల ఆలోచనలు, బడ్జెట్ భోజనాలు (<₹300), స్టాక్ ప్రత్యామ్నాయాలు లేదా పోషకాహార సలహాలను అడగండి'
                : language === 'hi'
                ? 'रेसिपी विचार, बजट भोजन (<₹300), स्टॉक विकल्प या पोषण संबंधी सलाह पूछें'
                : 'Ask recipe ideas, budget meals (<₹300), stock alternatives, or dietary advice'}
            </p>
          </div>
        </div>

        {/* Action Controls & Memory Badge */}
        <div className="flex items-center gap-2">
          {/* Audio TTS toggle */}
          <button
            onClick={() => {
              if (isSpeaking) voiceService.stopSpeaking();
              setVoiceAudioEnabled(!voiceAudioEnabled);
            }}
            className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
              voiceAudioEnabled
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={voiceAudioEnabled ? 'Mute AI Voice Speech' : 'Enable AI Voice Speech'}
          >
            {voiceAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Switch to Mobile Button */}
          <button
            onClick={() => setIsSessionQRModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            title="Scan Session QR to continue with JARVIS in aisles"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Switch to Mobile (QR)</span>
          </button>

          {/* Minimize / Expand Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Recalled Hindsight Banner - STRICTLY FOR RETURNING CUSTOMERS */}
      {isReturning && recalledMemories.length > 0 && isExpanded && (
        <div className="mt-3 bg-emerald-950/40 border border-emerald-500/30 px-3.5 py-2 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-emerald-300">
              ⭐ Hindsight Memory Active for {currentCustomer?.name || 'Shopper'}:
            </span>
            <span className="text-slate-300 text-[11px]">
              {recalledMemories[0].slice(0, 100)}...
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">Preferences Auto-Applied</span>
        </div>
      )}

      {/* Expanded Content Area */}
      {isExpanded && (
        <div className="mt-4 space-y-3 relative z-10">
          {/* Interactive Chat Input Bar */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 focus-within:border-emerald-500/60 rounded-2xl p-1.5 pl-3 transition-all shadow-inner">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything: What to cook? Breakfast for 3 under ₹300, organic alternatives..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
              disabled={isLoading}
            />

            {/* Mic Button */}
            <button
              onClick={handleToggleVoice}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-700'
              }`}
              title="Voice Input (English, Telugu, Hindi)"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputQuery.trim()}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              {isLoading ? (
                <span className="animate-spin text-xs">⏳</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ask Agent</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip.query)}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/40 text-[11px] font-medium text-slate-300 hover:text-emerald-300 whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Agent Response Card (If active) */}
          {activeResponse && (
            <div className="bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-4 space-y-3 animate-fade-in shadow-xl">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-emerald-400">Agent Recommendation</span>
                </div>
                <button
                  onClick={() => setActiveResponse(null)}
                  className="text-slate-500 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Message text */}
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                {activeResponse.message}
              </p>

              {/* Dynamic Recommended Products Chips with 1-Click Add to Cart */}
              {activeResponse.productFound && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {activeResponse.productFound.image_url && (
                      <img
                        src={activeResponse.productFound.image_url}
                        alt={activeResponse.productFound.name}
                        className="w-12 h-12 object-cover rounded-lg border border-slate-800"
                      />
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-white">{activeResponse.productFound.name}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono text-emerald-400 font-bold">₹{activeResponse.productFound.price}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-slate-300">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          {activeResponse.productFound.aisle}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddProduct(activeResponse.productFound!)}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 transition-all shadow-md cursor-pointer"
                  >
                    {addedItemIds[activeResponse.productFound.id] ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Cart</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Dynamic Alternatives if out of stock */}
              {activeResponse.alternatives && activeResponse.alternatives.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>In-Stock Alternatives Recommended:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeResponse.alternatives.map((alt) => (
                      <div
                        key={alt.id}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {alt.image_url && (
                            <img
                              src={alt.image_url}
                              alt={alt.name}
                              className="w-9 h-9 object-cover rounded-lg border border-slate-800 flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{alt.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono text-emerald-400">
                              ₹{alt.price} • {alt.aisle}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddProduct(alt)}
                          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] rounded-lg flex items-center gap-1 flex-shrink-0 cursor-pointer"
                        >
                          {addedItemIds[alt.id] ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          <span>{addedItemIds[alt.id] ? 'Added' : 'Add'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Notification & Switch to Mobile Link */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Preferences saved to Hindsight for your future kiosk visits</span>
                </div>

                <button
                  onClick={() => setIsSessionQRModalOpen(true)}
                  className="text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Continue on Mobile Companion (Scan QR) →</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
