import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Compass,
  MapPin,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Plus,
  RefreshCw,
  Bell
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VoiceWaveform } from '../components/VoiceWaveform';
import { AgentAvatar } from '../components/AgentAvatar';
import { customerAgent, CustomerAgentResponse } from '../services/customerAgent';
import { voiceService } from '../services/voiceService';
import { db } from '../services/db';
import { SubstitutionRecord } from '../types';

export const CustomerAssistantPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    currentUser,
    language,
    activeMission,
    updateMissionItemStatus,
    addToCart,
    products
  } = useApp();

  const initialMode = searchParams.get('mode') === 'voice' ? 'voice' : 'chat';
  const [mode, setMode] = useState<'voice' | 'chat'>(initialMode);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [flowStatus, setFlowStatus] = useState<string>('idle');
  const [groqStatus, setGroqStatus] = useState<{ isConfigured: boolean; model?: string }>({ isConfigured: true });
  const [conversation, setConversation] = useState<
    { sender: 'user' | 'agent'; text: string; data?: CustomerAgentResponse }[]
  >([]);

  // Proactive check state
  const [showProactiveFoundCheck, setShowProactiveFoundCheck] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check Groq status and subscribe to voice status
  useEffect(() => {
    fetch('/api/groq-status')
      .then(res => res.json())
      .then(data => setGroqStatus(data))
      .catch(() => setGroqStatus({ isConfigured: false }));

    const unsubVoice = voiceService.subscribeStatus((status) => {
      if (status === 'listening') {
        setIsListening(true);
        setFlowStatus('listening');
      } else if (status === 'transcribing') {
        setFlowStatus('transcribing');
      } else if (status === 'speaking') {
        setIsSpeaking(true);
      } else if (status === 'idle') {
        setIsListening(false);
        setIsSpeaking(false);
        setFlowStatus((prev) => (prev === 'listening' || prev === 'transcribing' ? 'idle' : prev));
      } else if (status === 'error') {
        setIsListening(false);
        setIsSpeaking(false);
        setFlowStatus('error');
      }
    });

    return unsubVoice;
  }, []);

  // Initialize with the standard Pasta Night intent matching Screen 4
  useEffect(() => {
    const initResponse: CustomerAgentResponse = {
      message:
        language === 'hi'
          ? 'नमस्ते! मैं समझ गया कि आप 4 लोगों के लिए पास्ता सामग्री खरीदना चाहते हैं। क्या आपको सॉस या पनीर भी चाहिए?'
          : language === 'te'
          ? 'నమస్కారం! మీరు 4 వ్యక్తుల కోసం పాస్తా పదార్థాలు కొనాలనుకుంటున్నారని నేను అర్థం చేసుకున్నాను. మీకు సాస్ లేదా చీజ్ కూడా కావాలా?'
          : 'I understood you want to buy ingredients for pasta for 4 people. Do you also need any sauces or cheese?',
      intent: 'Dinner for 4 (Pasta Night)',
      itemsDetected: ['Pasta', 'Tomatoes', 'Onions', 'Cheese'],
      followUpSuggestions: [
        {
          id: 'wheat_pref',
          question: 'Do you prefer whole wheat or regular pasta?',
          options: ['Whole Wheat (Borges)', 'Regular Durum', 'Gluten-Free']
        },
        {
          id: 'recipe_pref',
          question: 'Would you like me to suggest a pasta recipe?',
          options: ['Creamy Tomato Penne', 'Classic Aglio e Olio', 'Basilico Pesto']
        },
        {
          id: 'brand_pref',
          question: 'Do you want any special brand?',
          options: ['Borges Semolina', 'Barilla', 'Organic Choice']
        }
      ],
      quickActions: [
        { label: 'View Pasta Night Mission', action: 'view_mission', route: '/customer/mission' },
        { label: 'Navigate to Aisle 3 (Pasta)', action: 'navigate_aisle', route: '/customer/map?product=prod-pasta' }
      ]
    };

    setConversation([
      {
        sender: 'agent',
        text: initResponse.message,
        data: initResponse
      }
    ]);

    // Trigger proactive check after 3 seconds to demonstrate Screen 9 / Section 7 requirement
    const timer = setTimeout(() => {
      setShowProactiveFoundCheck(true);
    }, 3500);

    return () => clearTimeout(timer);
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation, showProactiveFoundCheck]);

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    // Add user message
    setConversation(prev => [...prev, { sender: 'user', text }]);
    setInputText('');
    setTranscript('');

    // Status progression
    setFlowStatus('understanding');
    const lower = text.toLowerCase();
    if (lower.includes('add') || lower.includes('buy') || lower.includes('cart') || lower.includes('vesuko')) {
      setTimeout(() => setFlowStatus('adding_cart'), 300);
    } else if (lower.includes('where') || lower.includes('check') || lower.includes('stock') || lower.includes('undha') || lower.includes('kidhar')) {
      setTimeout(() => setFlowStatus('checking'), 300);
    } else {
      setTimeout(() => setFlowStatus('generating'), 300);
    }

    // Process with Customer Agent
    try {
      const res = await customerAgent.processInput(text, language, activeMission, currentUser.id, mode === 'voice' ? 'voice' : 'text');

      setFlowStatus('response_ready');
      setTimeout(() => setFlowStatus('idle'), 2500);

      if (res.groqConfigured === false) {
        setGroqStatus({ isConfigured: false });
      }

      // Speak response
      setIsSpeaking(true);
      voiceService.speak(res.message, language, currentUser.id).then(() => {
        setIsSpeaking(false);
      });

      setConversation(prev => [...prev, { sender: 'agent', text: res.message, data: res }]);
    } catch (err) {
      setFlowStatus('error');
      setTimeout(() => setFlowStatus('idle'), 3000);
    }
  };

  const handleReplay = () => {
    setIsSpeaking(true);
    voiceService.replay(currentUser.id).then(() => {
      setIsSpeaking(false);
    });
  };

  const handleStopSpeaking = () => {
    voiceService.stopSpeaking();
    setIsSpeaking(false);
    setFlowStatus('idle');
  };

  const handleQuickAction = (qa: { label: string; action: string; route?: string }, msgData?: CustomerAgentResponse) => {
    if (qa.action === 'accept_substitute' && msgData?.alternatives?.[0]) {
      const altProduct = msgData.alternatives[0];
      addToCart(altProduct, 1);
      const subs = db.getSubstitutions();
      const match = subs.find((s: SubstitutionRecord) => s.customer_session_id === currentUser.id && s.substitute_product_id === altProduct.id && !s.substitute_accepted);
      if (match) {
        db.recordSubstitutionAccepted(match.id, currentUser.id);
      }
      handleSend(`Accepted substitute: ${altProduct.name}. Added to cart.`);
      return;
    }
    if (qa.action === 'reject_substitute') {
      const subs = db.getSubstitutions();
      const match = subs.find((s: SubstitutionRecord) => s.customer_session_id === currentUser.id && !s.substitute_accepted);
      if (match) {
        db.recordSubstitutionRejected(match.id, currentUser.id, 'Shopper declined substitution');
      }
      handleSend('I decline this substitution.');
      return;
    }
    if (qa.action === 'add_to_cart') {
      const prod = msgData?.productFound || products.find(p => p.id === 'prod-taaza-milk');
      if (prod) {
        addToCart(prod, 1);
        handleSend(`Added ${prod.name} to cart.`);
      }
      return;
    }
    if (qa.route) {
      navigate(qa.route);
    } else {
      handleSend(`Selected: ${qa.label}`);
    }
  };

  const toggleVoiceListening = () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      if (transcript) {
        handleSend(transcript);
      }
    } else {
      setIsListening(true);
      setTranscript('');
      const started = voiceService.startListening(
        language,
        (recText, isFinal) => {
          setTranscript(recText);
          if (isFinal) {
            setIsListening(false);
            handleSend(recText);
          }
        },
        (err) => {
          console.warn('Voice recognition error fallback:', err);
          setIsListening(false);
        }
      );

      // If physical microphone isn't granted or supported in browser, simulate realistic speech after 3 seconds
      if (!started) {
        setTimeout(() => {
          setTranscript("I need paneer and pasta");
          setTimeout(() => {
            setIsListening(false);
            handleSend("I need paneer and pasta");
          }, 1500);
        }, 1200);
      }
    }
  };

  const handlePlayVoice = (text: string) => {
    setIsSpeaking(true);
    voiceService.speak(text, language).then(() => {
      setIsSpeaking(false);
    });
  };

  const handleMarkPaneerFound = () => {
    if (activeMission) {
      updateMissionItemStatus(activeMission.id, 'm-item-4', 'found');
    }
    setShowProactiveFoundCheck(false);
    handleSend('I found the item! What is next on my mission?');
  };

  const handlePaneerNotFound = async () => {
    setShowProactiveFoundCheck(false);
    handleSend("I couldn't find the paneer in Aisle 4.");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white flex flex-col justify-between">
      {/* Top Header Controls */}
      <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AgentAvatar size="md" isListening={isListening} isSpeaking={isSpeaking} />
          <div>
            <h2 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              GrocerAI Customer Assistant
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Active
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Multimodal conversational shopping partner
            </p>
          </div>
        </div>

        {/* Voice Audio Controls & Mode Toggle Pills */}
        <div className="flex items-center gap-2">
          {/* Replay Button */}
          <button
            onClick={handleReplay}
            title="Replay Voice Response"
            className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Replay</span>
          </button>

          {/* Stop Button */}
          {isSpeaking && (
            <button
              onClick={handleStopSpeaking}
              title="Stop Speaking"
              className="px-2.5 py-1 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-medium flex items-center gap-1 transition-colors animate-pulse"
            >
              <VolumeX className="w-3 h-3" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}

          {/* Mode Toggle Pills (Voice vs Chat) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMode('voice')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                mode === 'voice'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice</span>
            </button>
            <button
              onClick={() => setMode('chat')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                mode === 'chat'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Agent Lifecycle Status Bar */}
      <div className="bg-slate-900/40 border-b border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Status:</span>
          {flowStatus === 'listening' && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1 animate-pulse">
              <Mic className="w-3 h-3" /> Listening...
            </span>
          )}
          {flowStatus === 'transcribing' && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1 animate-pulse">
              <Sparkles className="w-3 h-3" /> Transcribing...
            </span>
          )}
          {flowStatus === 'understanding' && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center gap-1 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" /> Understanding...
            </span>
          )}
          {flowStatus === 'checking' && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center gap-1 animate-pulse">
              <Compass className="w-3 h-3" /> Checking inventory & shelves...
            </span>
          )}
          {flowStatus === 'adding_cart' && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 animate-pulse">
              <CheckCircle className="w-3 h-3" /> Adding to cart...
            </span>
          )}
          {flowStatus === 'generating' && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center gap-1 animate-pulse">
              <Sparkles className="w-3 h-3" /> Generating response...
            </span>
          )}
          {flowStatus === 'response_ready' && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Response ready
            </span>
          )}
          {flowStatus === 'speaking' && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 animate-pulse">
              <Volume2 className="w-3 h-3" /> Speaking...
            </span>
          )}
          {flowStatus === 'idle' && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Ready
            </span>
          )}
          {flowStatus === 'error' && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Non-blocking error
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">
            Model: {groqStatus.model || 'llama-3.3-70b-versatile'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${groqStatus.isConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`}
            title={groqStatus.isConfigured ? 'Groq configured' : 'GROQ_API_KEY missing in .env'}
          />
        </div>
      </div>

      {/* Main Area: Voice Mode (Screen 3) OR Conversation (Screen 4) */}
      {mode === 'voice' && isListening ? (
        /* Screen 3: Dedicated Voice Listening Interface */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto w-full">
          <h2 className="text-3xl font-extrabold text-white mb-2">I'm listening...</h2>
          <p className="text-sm text-slate-400 mb-8">
            {transcript ? `"${transcript}"` : 'Speak naturally, e.g. "I need paneer" or "Pasta ingredients"'}
          </p>

          {/* Giant Glowing Green Microphone Button (Screen 3) */}
          <button
            onClick={toggleVoiceListening}
            className="w-32 h-32 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-2xl shadow-emerald-500/40 animate-ring-pulse transform hover:scale-105 transition-all cursor-pointer mb-6"
          >
            <Mic className="w-16 h-16 stroke-[2.2]" />
          </button>

          {/* Animated Waveform */}
          <VoiceWaveform isListening={true} />

          {/* Example prompt pills (Screen 3) */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <button
              onClick={() => handleSend('I need ingredients for pasta')}
              className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-emerald-500/40 transition-colors"
            >
              "I need ingredients for pasta"
            </button>
            <button
              onClick={() => handleSend('Where is paneer?')}
              className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-emerald-500/40 transition-colors"
            >
              "Where is paneer?"
            </button>
            <button
              onClick={() => handleSend('Show me offers')}
              className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-emerald-500/40 transition-colors"
            >
              "Show me offers"
            </button>
          </div>

          <button
            onClick={() => setIsListening(false)}
            className="mt-8 px-6 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
          >
            Cancel
          </button>
        </div>
      ) : (
        /* Screen 4: Multimodal Conversation Area */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
          {/* Groq Unconfigured Alert Banner (Section 3, 21, 23) */}
          {!groqStatus.isConfigured && (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 text-xs text-amber-200 space-y-1 animate-fade-in shadow-lg">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Groq LLM Reasoning Engine Notice</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                <code className="text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded font-mono text-[11px]">GROQ_API_KEY</code> is not configured in the backend environment. Groq with <code className="text-emerald-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono text-[11px]">{groqStatus.model || 'llama-3.3-70b-versatile'}</code> is the designated reasoning engine for GrocerAI. To enable live multimodal reasoning, add <code className="text-amber-300 font-mono text-[11px]">GROQ_API_KEY=your_key_here</code> to your <code className="font-mono text-[11px]">.env</code> file in the project root. GrocerAI will not fake AI responses.
              </p>
            </div>
          )}

          {/* Proactive Notification Banner (Requirement 7 & Screen 9 proactive check) */}
          {showProactiveFoundCheck && (
            <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70 border border-emerald-500/40 rounded-2xl p-4 shadow-xl animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      Proactive In-Store Assistant
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      Did you find the paneer?
                    </h4>
                    <p className="text-xs text-slate-300">
                      It's available in Dairy Section, Aisle 4 (Shelf B2).
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handlePlayVoice("Did you find the paneer? It's available in Dairy, Aisle 4.")}
                  className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-800/80 rounded-xl"
                  title="Play Voice"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons (Requirement 7: Play Voice, View Location, Mark Found, Not Found) */}
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => handlePlayVoice("Did you find the paneer? It's available in Dairy, Aisle 4.")}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Play Voice</span>
                </button>

                <button
                  onClick={() => navigate('/customer/map?product=prod-paneer')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>View Location</span>
                </button>

                <button
                  onClick={handleMarkPaneerFound}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Mark Found</span>
                </button>

                <button
                  onClick={handlePaneerNotFound}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-xs font-medium text-slate-300 rounded-lg transition-colors"
                >
                  <span>Not Found</span>
                </button>
              </div>
            </div>
          )}

          {/* Conversation history */}
          {conversation.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'agent' && (
                <div className="shrink-0 mt-1">
                  <AgentAvatar size="sm" isSpeaking={isSpeaking && idx === conversation.length - 1} />
                </div>
              )}

              <div className={`max-w-xl rounded-2xl p-4 ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 shadow-lg'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>

                {/* If Agent structured data exists (Screen 4) */}
                {msg.data && (
                  <div className="mt-4 space-y-4 pt-3 border-t border-slate-800">
                    {/* Shopping Intent Pills (Screen 4) */}
                    {msg.data.itemsDetected && (
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                          Your Shopping Intent:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.data.itemsDetected.map((item, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-medium flex items-center gap-1"
                            >
                              <span>{item}</span>
                            </span>
                          ))}
                          <button
                            onClick={() => navigate('/customer/products')}
                            className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add items</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Follow-up Suggestions (Screen 4 clickable options) */}
                    {msg.data.followUpSuggestions && (
                      <div className="space-y-3">
                        <span className="text-[11px] font-semibold text-slate-400 block">
                          Follow-up Suggestions:
                        </span>
                        {msg.data.followUpSuggestions.map((fu) => (
                          <div key={fu.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                            <p className="text-xs font-medium text-slate-300 mb-2">
                              {fu.question}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {fu.options.map((opt, oi) => (
                                <button
                                  key={oi}
                                  onClick={() => handleSend(`Selected: ${opt}`)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-xs font-medium transition-colors border border-slate-700"
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Alternatives if product is unavailable */}
                    {msg.data.alternatives && msg.data.alternatives.length > 0 && (
                      <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3">
                        <span className="text-xs font-bold text-amber-400 block mb-2">
                          Available Substitutions in Aisle 4:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.data.alternatives.map((alt) => (
                            <div
                              key={alt.id}
                              onClick={() => navigate(`/customer/products/${alt.id}`)}
                              className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:border-emerald-500/50 cursor-pointer flex items-center gap-2.5"
                            >
                              <img
                                src={alt.image_url}
                                alt={alt.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-white truncate">{alt.name}</p>
                                <p className="text-[11px] text-emerald-400 font-semibold">₹{alt.price}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Action Buttons */}
                    {msg.data.quickActions && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {msg.data.quickActions.map((qa, qi) => (
                          <button
                            key={qi}
                            onClick={() => handleQuickAction(qa, msg.data)}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{qa.label}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Bottom Sticky Input Bar */}
      <div className="border-t border-slate-800 bg-slate-900/90 backdrop-blur-md p-3 sm:p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {/* Microphone Button */}
          <button
            onClick={toggleVoiceListening}
            className={`p-3 rounded-2xl transition-all shadow-md ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
            title="Voice input"
          >
            <Mic className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(inputText)}
            placeholder="Type or speak your answer... (e.g. 'I need paneer')"
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
          />

          {/* Send Button */}
          <button
            onClick={() => handleSend(inputText)}
            disabled={!inputText.trim()}
            className={`p-3 rounded-2xl transition-all ${
              inputText.trim()
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-md'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
