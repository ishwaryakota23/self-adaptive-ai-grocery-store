import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  Navigation,
  ShoppingCart,
  BrainCircuit
} from 'lucide-react';
import { customerAgent, getCustomerAgentIdentity } from '../services/customerAgent.js';
import { voiceService } from '../services/voiceService.js';
import { languageDetector } from '../services/languageDetector.js';
import { db } from '../services/db.js';
import { memoryService } from '../services/nativeMemoryService.js';
import { echoGuard } from '../services/echoGuard.js';
import { Product, ShoppingMission, LanguageCode, CartItem } from '../types/index.js';
import { useApp } from '../context/AppContext';

export type CustomerVoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';

export type CustomerConversationState =
  | 'WAKE_WORD_MONITORING'
  | 'CONVERSATION_ACTIVE'
  | 'AWAITING_CONTINUATION';

export interface CustomerJarvisVoiceOrbProps {
  sessionId: string;
  mission?: ShoppingMission;
  onOpenProductCamera: () => void;
  onMessageAdded: (msg: { sender: 'user' | 'agent'; text: string; aisleHint?: string; data?: any }) => void;
  activeScannedProduct?: Product | null;
  onNavigateToRoute?: (path: string) => void;
  voiceAudioEnabled?: boolean;
  onToggleVoiceAudio?: () => void;
}

export const CustomerJarvisVoiceOrb: React.FC<CustomerJarvisVoiceOrbProps> = ({
  sessionId,
  mission,
  onOpenProductCamera,
  onMessageAdded,
  activeScannedProduct,
  onNavigateToRoute,
  voiceAudioEnabled = true,
  onToggleVoiceAudio
}) => {
  const { language, currentCustomer } = useApp();

  const [voiceState, setVoiceState] = useState<CustomerVoiceState>('IDLE');
  const [conversationState, setConversationState] = useState<CustomerConversationState>('WAKE_WORD_MONITORING');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [lastSpokenText, setLastSpokenText] = useState<string>('');
  const [showStatusBubble, setShowStatusBubble] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [activeProductContext, setActiveProductContext] = useState<Product | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const voiceStateRef = useRef<CustomerVoiceState>(voiceState);
  const conversationStateRef = useRef<CustomerConversationState>(conversationState);
  const inactivityTimeoutRef = useRef<any>(null);
  const promptTimeoutRef = useRef<any>(null);
  const bubbleTimeoutRef = useRef<any>(null);

  // Update active product context when camera identifies an item
  useEffect(() => {
    if (activeScannedProduct) {
      setActiveProductContext(activeScannedProduct);
    }
  }, [activeScannedProduct]);

  // Keep recognition language synchronized with customer selection
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    }
  }, [language]);

  // Keep refs synchronized with state
  useEffect(() => {
    voiceStateRef.current = voiceState;
    isSpeakingRef.current = voiceState === 'SPEAKING';
  }, [voiceState]);

  useEffect(() => {
    conversationStateRef.current = conversationState;
    if (conversationState === 'CONVERSATION_ACTIVE') {
      resetInactivityTimer();
    } else {
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
    }
  }, [conversationState]);

  // Inactivity timeout manager (5 minutes = 300,000 ms)
  const resetInactivityTimer = () => {
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);

    if (conversationStateRef.current === 'CONVERSATION_ACTIVE') {
      inactivityTimeoutRef.current = setTimeout(() => {
        if (conversationStateRef.current === 'CONVERSATION_ACTIVE') {
          triggerCustomerInactivityPrompt();
        }
      }, 5 * 60 * 1000); // 5 minutes inactivity
    }
  };

  const triggerCustomerInactivityPrompt = async () => {
    setConversationState('AWAITING_CONTINUATION');
    setShowStatusBubble(true);
    const promptText = language === 'te'
      ? "à°®à°¨à°‚ à°•à°¾à°¸à±‡à°ªà± à°®à°¾à°Ÿà±à°²à°¾à°¡à°²à±‡à°¦à±. à°•à±Šà°¨à°¸à°¾à°—à°¿à°‚à°šà°¾à°²à°¾ à°²à±‡à°¦à°¾ à°®à±à°—à°¿à°‚à°šà°¾à°²à°¾?"
      : language === 'hi'
      ? "à¤¹à¤®à¤¨à¥‡ à¤¥à¥‹à¤¡à¤¼à¥€ à¤¦à¥‡à¤° à¤¸à¥‡ à¤¬à¤¾à¤¤à¤šà¥€à¤¤ à¤¨à¤¹à¥€à¤‚ à¤•à¥€à¥¤ à¤•à¥à¤¯à¤¾ à¤†à¤ª à¤œà¤¾à¤°à¥€ à¤°à¤–à¤¨à¤¾ à¤šà¤¾à¤¹à¤¤à¥‡ à¤¹à¥ˆà¤‚ à¤¯à¤¾ à¤¸à¤®à¤¾à¤ªà¥à¤¤ à¤•à¤°à¥‡à¤‚?"
      : "We haven't continued our conversation for a while. Would you like to continue, or should I end the conversation?";
    setLastSpokenText(promptText);

    if (voiceAudioEnabled && typeof window !== 'undefined') {
      setVoiceState('SPEAKING');
      try {
        await voiceService.speak(promptText, language, sessionId);
      } catch (e) {
      } finally {
        if (conversationStateRef.current === 'AWAITING_CONTINUATION') {
          setVoiceState('LISTENING');
        }
      }
    } else {
      setVoiceState('LISTENING');
    }

    // Safety timeout: auto-end if no answer to prompt after 35 seconds
    promptTimeoutRef.current = setTimeout(() => {
      if (conversationStateRef.current === 'AWAITING_CONTINUATION') {
        const timeoutEndMsg = language === 'te'
          ? "à°¨à°¿à°·à±à°•à±à°°à°¿à°¯à°¤ à°•à°¾à°°à°£à°‚à°—à°¾ à°¸à±†à°·à°¨à± à°®à±à°—à°¿à°¸à°¿à°‚à°¦à°¿. à°®à±€à°•à± à°•à°¾à°µà°²à°¸à°¿à°¨à°ªà±à°ªà±à°¡à± 'à°¹à±‡ à°…à°²à±†à°•à±à°¸à°¾' à°…à°¨à°¿ à°šà±†à°ªà±à°ªà°‚à°¡à°¿."
          : language === 'hi'
          ? "à¤¨à¤¿à¤·à¥à¤•à¥à¤°à¤¿à¤¯à¤¤à¤¾ à¤•à¥‡ à¤•à¤¾à¤°à¤£ à¤¸à¤¤à¥à¤° à¤¸à¤®à¤¾à¤ªà¥à¤¤ à¤¹à¥à¤†à¥¤ à¤œà¤¬ à¤­à¥€ à¤œà¤¼à¤°à¥‚à¤°à¤¤ à¤¹à¥‹ 'à¤¹à¥‡ à¤à¤²à¥‡à¤•à¥à¤¸à¤¾' à¤•à¤¹à¥‡à¤‚à¥¤"
          : "Ending conversation session due to inactivity. Say 'Hey Alexa' whenever you need me.";
        endCustomerConversation(timeoutEndMsg);
      }
    }, 35000);
  };

  const handleCustomerContinue = async () => {
    if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
    setConversationState('CONVERSATION_ACTIVE');
    setShowStatusBubble(true);
    const confirmMsg = language === 'te'
      ? "à°¸à°‚à°­à°¾à°·à°£ à°•à±Šà°¨à°¸à°¾à°—à±à°¤à±‹à°‚à°¦à°¿. à°¨à±‡à°¨à± à°®à±€à°•à± à°‡à°‚à°•à°¾ à°à°®à°¿ à°¸à°¹à°¾à°¯à°ªà°¡à°—à°²à°¨à±?"
      : language === 'hi'
      ? "à¤¬à¤¾à¤¤à¤šà¥€à¤¤ à¤œà¤¾à¤°à¥€ à¤¹à¥ˆà¥¤ à¤®à¥ˆà¤‚ à¤†à¤ªà¤•à¥‹ à¤”à¤° à¤•à¥à¤¯à¤¾ à¤¢à¥‚à¤à¤¢à¤¨à¥‡ à¤®à¥‡à¤‚ à¤®à¤¦à¤¦ à¤•à¤° à¤¸à¤•à¤¤à¤¾ à¤¹à¥‚à¤?"
      : "Continuing our conversation. What else can I help you find?";
    setLastSpokenText(confirmMsg);
    resetInactivityTimer();
    await speakResponse(confirmMsg, language);
  };

  const endCustomerConversation = async (msg?: string) => {
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
    const defaultEnd = language === 'te'
      ? "à°¸à°‚à°­à°¾à°·à°£ à°®à±à°—à°¿à°¸à°¿à°‚à°¦à°¿. à°®à±€à°•à± à°…à°µà°¸à°°à°®à±ˆà°¨à°ªà±à°ªà±à°¡à± 'à°¹à±‡ à°…à°²à±†à°•à±à°¸à°¾' à°…à°¨à°¿ à°šà±†à°ªà±à°ªà°‚à°¡à°¿."
      : language === 'hi'
      ? "à¤¬à¤¾à¤¤à¤šà¥€à¤¤ à¤¸à¤®à¤¾à¤ªà¥à¤¤ à¤¹à¥à¤ˆà¥¤ à¤œà¤¬ à¤­à¥€ à¤†à¤ªà¤•à¥‹ à¤œà¤¼à¤°à¥‚à¤°à¤¤ à¤¹à¥‹ 'à¤¹à¥‡ à¤à¤²à¥‡à¤•à¥à¤¸à¤¾' à¤•à¤¹à¥‡à¤‚à¥¤"
      : "Ending conversation. Say 'Hey Alexa' whenever you need me.";
    const finalMsg = msg || defaultEnd;
    setConversationState('WAKE_WORD_MONITORING');
    setLastSpokenText(finalMsg);
    setLiveTranscript('');
    setShowStatusBubble(true);

    if (voiceAudioEnabled && typeof window !== 'undefined') {
      setVoiceState('SPEAKING');
      try {
        await voiceService.speak(finalMsg, language, sessionId);
      } catch (e) {
      } finally {
        setVoiceState('IDLE');
        setTimeout(() => setShowStatusBubble(false), 3500);
      }
    } else {
      setVoiceState('IDLE');
      setTimeout(() => setShowStatusBubble(false), 3500);
    }
  };

  // ---------------------------------------------------------------------------
  // SPEECH RECOGNITION & CONTINUOUS CONVERSATION INITIALIZATION
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    setSpeechSupported(true);

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        isListeningRef.current = true;
        setErrorNotice(null);
      };

      recognition.onresult = (event: any) => {
        const results = event.results;
        const latest = results[results.length - 1];
        const rawTranscript = latest[0].transcript.trim();

        if (!rawTranscript) return;

        // 1. Acoustic Feedback / Echo Rejection
        if (echoGuard.isEcho(rawTranscript)) {
          return;
        }

        // 2. Barge-In Interruption Detection while speaking
        const isSpeaking = isSpeakingRef.current || voiceStateRef.current === 'SPEAKING' || echoGuard.getIsSpeaking();
        if (isSpeaking) {
          if (echoGuard.isBargeInInterruption(rawTranscript)) {
            voiceService.stopSpeaking();
            voiceStateRef.current = 'LISTENING';
            setVoiceState('LISTENING');
          } else {
            return;
          }
        }

        const lower = rawTranscript.toLowerCase();
        const hasWakeWord =
          lower.includes('hey alexa') ||
          lower.includes('alexa') ||
          lower.includes('à°¹à±‡ à°…à°²à±†à°•à±à°¸à°¾') ||
          lower.includes('à°…à°²à±†à°•à±à°¸à°¾') ||
          lower.includes('à¤¹à¥‡ à¤à¤²à¥‡à¤•à¥à¤¸à¤¾') ||
          lower.includes('à¤à¤²à¥‡à¤•à¥à¤¸à¤¾');

        if (latest.isFinal) {
          const cleanCommand = rawTranscript
            .replace(/hey\s+alexa[,.]?/i, '')
            .replace(/alexa[,.]?/i, '')
            .replace(/à°¹à±‡\s+à°…à°²à±†à°•à±à°¸à°¾[,.]?/i, '')
            .replace(/à°…à°²à±†à°•à±à°¸à°¾[,.]?/i, '')
            .replace(/à¤¹à¥‡\s+à¤à¤²à¥‡à¤•à¥à¤¸à¤¾[,.]?/i, '')
            .replace(/à¤à¤²à¥‡à¤•à¥à¤¸à¤¾[,.]?/i, '')
            .trim();

          // ===================================================================
          // STATE 1: WAKE_WORD_MONITORING (Passive listening for "Hey Alexa")
          // ===================================================================
          if (conversationStateRef.current === 'WAKE_WORD_MONITORING') {
            if (hasWakeWord) {
              setConversationState('CONVERSATION_ACTIVE');
              setShowStatusBubble(true);

              if (cleanCommand) {
                // One-breath initiation + query: e.g. "Hey Alexa, where is olive oil?"
                setLiveTranscript(cleanCommand);
                resetInactivityTimer();
                handleProcessVoiceCommand(cleanCommand);
              } else {
                // Standalone "Hey Alexa" -> Start conversation session!
                setLiveTranscript('Starting conversation...');
                voiceService.playAudioChime(580);
                resetInactivityTimer();
                const greeting = language === 'te'
                  ? "à°šà±†à°ªà±à°ªà°‚à°¡à°¿, à°¨à±‡à°¨à± à°®à±€à°•à± à°Žà°²à°¾ à°¸à°¹à°¾à°¯à°ªà°¡à°—à°²à°¨à±?"
                  : language === 'hi'
                  ? "à¤¹à¤¾à¤, à¤®à¥ˆà¤‚ à¤†à¤ªà¤•à¥€ à¤•à¥à¤¯à¤¾ à¤®à¤¦à¤¦ à¤•à¤° à¤¸à¤•à¤¤à¤¾ à¤¹à¥‚à¤?"
                  : "Yes, how can I help?";
                setLastSpokenText(greeting);
                speakResponse(greeting, language);
              }
            }
          }
          // ===================================================================
          // STATE 2: AWAITING_CONTINUATION (Responding to 5-min Inactivity Prompt)
          // ===================================================================
          else if (conversationStateRef.current === 'AWAITING_CONTINUATION') {
            if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);

            if (
              lower.includes('continue') ||
              lower.includes('keep going') ||
              lower === 'yes' ||
              lower === 'yeah' ||
              lower === 'sure' ||
              lower.includes('stay')
            ) {
              handleCustomerContinue();
            } else if (
              lower.includes('end') ||
              lower.includes('stop') ||
              lower.includes('finish') ||
              lower === 'no' ||
              lower.includes('close')
            ) {
              endCustomerConversation();
            } else {
              // Direct question asked: resume conversation and process query
              setConversationState('CONVERSATION_ACTIVE');
              resetInactivityTimer();
              handleProcessVoiceCommand(cleanCommand || rawTranscript);
            }
          }
          // ===================================================================
          // STATE 3: CONVERSATION_ACTIVE (Continuous conversation - NO wake-word needed!)
          // ===================================================================
          else if (conversationStateRef.current === 'CONVERSATION_ACTIVE') {
            const commandToProcess = cleanCommand || rawTranscript;

            // Check for explicit ending commands
            if (
              lower === 'end' ||
              lower === 'stop' ||
              lower === 'finish' ||
              lower === 'exit' ||
              lower === 'bye' ||
              lower.includes('end conversation') ||
              lower.includes('stop conversation') ||
              lower.includes('exit conversation') ||
              lower.includes('close conversation') ||
              lower.includes('goodbye') ||
              lower.includes("that's all") ||
              lower.includes('bye alexa') ||
              lower.includes('à°šà°¾à°²à±') ||
              lower.includes('à°†à°ªà±') ||
              lower.includes('à°®à±à°—à°¿à°‚à°šà±') ||
              lower.includes('à¤¬à¤¸') ||
              lower.includes('à¤…à¤²à¤µà¤¿à¤¦à¤¾') ||
              lower.includes('à¤¬à¤‚à¤¦ à¤•à¤°à¥‹')
            ) {
              endCustomerConversation();
            } else {
              // Normal follow-up message (e.g. "What about pasta?", "What else do I need?")
              setLiveTranscript(commandToProcess);
              resetInactivityTimer();
              handleProcessVoiceCommand(commandToProcess);
            }
          }
        } else {
          // Interim results for immediate visual responsiveness
          if (conversationStateRef.current === 'CONVERSATION_ACTIVE' || hasWakeWord) {
            setVoiceState('LISTENING');
            setShowStatusBubble(true);
            setLiveTranscript(rawTranscript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          console.warn('[Customer Alexa+] Microphone permission denied');
          setErrorNotice('Microphone permission blocked. You can type in the chat below.');
        } else if (event.error !== 'no-speech') {
          console.warn('[Customer Alexa+] Speech recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        // Continuously restart continuous listening
        setTimeout(() => {
          if (!isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              // Already started or restarting
            }
          }
        }, 400);
      };

      recognition.recognition = recognition;
      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch (e) {}
    } catch (err) {
      console.warn('[Customer Alexa+] Speech recognition init failed:', err);
    }

    return () => {
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // PROCESS NATURAL VOICE COMMAND THROUGH EXISTING CUSTOMER AGENT
  // ---------------------------------------------------------------------------
  const handleProcessVoiceCommand = async (command: string) => {
    const text = command.trim();
    if (!text) return;

    // 1. Post user message to shared mobile chat transcript
    onMessageAdded({
      sender: 'user',
      text,
    });

    setVoiceState('PROCESSING');
    setShowStatusBubble(true);
    setLiveTranscript('Thinking...');

    const lower = text.toLowerCase();

    // -------------------------------------------------------------------------
    // Intent A: Product Camera Identification ("What is this?", "Scan this", etc.)
    // -------------------------------------------------------------------------
    if (
      lower.includes('what is this') ||
      lower.includes('identify this') ||
      lower.includes('scan this') ||
      lower.includes('what product') ||
      lower.includes('check this item')
    ) {
      const cameraSpokenPrompt = "Opening product camera. Point your phone at the shelf item to verify it.";
      setLastSpokenText(cameraSpokenPrompt);
      onMessageAdded({
        sender: 'agent',
        text: cameraSpokenPrompt
      });

      onOpenProductCamera();
      await speakResponse(cameraSpokenPrompt);
      return;
    }

    // -------------------------------------------------------------------------
    // Intent B: Explicit Add to Cart ("Add this to my cart", "Add to cart")
    // -------------------------------------------------------------------------
    if (
      lower.includes('add this to my cart') ||
      lower.includes('add this to cart') ||
      lower.includes('add to my cart') ||
      lower.includes('add to cart') ||
      lower.includes('put this in my cart')
    ) {
      let targetProduct: Product | undefined = activeProductContext || activeScannedProduct || undefined;

      // If specific product mentioned by name (e.g. "add sourdough to cart")
      if (!targetProduct) {
        const products = db.getProducts();
        targetProduct = products.find(p => lower.includes(p.name.toLowerCase()) || lower.includes(p.id.toLowerCase()));
      }

      // Default to last mission pending item if no explicit context
      if (!targetProduct && mission?.items) {
        const pendingItem = mission.items.find(i => i.status === 'pending');
        if (pendingItem) {
          targetProduct = db.getProductById(pendingItem.product_id);
        }
      }

      if (targetProduct) {
        // Perform authoritative backend database cart addition
        db.addToCart(targetProduct, 1, sessionId, 'MOBILE');

        // VERIFY backend action actually succeeded before saying "Done"
        const currentCart = db.getCart(sessionId);
        const isVerified = currentCart.some(item => item.product_id === targetProduct!.id);

        if (isVerified) {
          const confirmMsg = `Done. I've added ${targetProduct.name} to your cart.`;
          setLastSpokenText(confirmMsg);
          onMessageAdded({
            sender: 'agent',
            text: confirmMsg,
            aisleHint: targetProduct.shelf_location || targetProduct.aisle
          });
          await speakResponse(confirmMsg);
          return;
        }
      }

      const failMsg = "Which item would you like me to add to your cart? Please point the camera or tap the item.";
      setLastSpokenText(failMsg);
      onMessageAdded({ sender: 'agent', text: failMsg });
      await speakResponse(failMsg);
      return;
    }

    // -------------------------------------------------------------------------
    // Intent C: Checkout Transition ("Take me to checkout", "Go to checkout")
    // -------------------------------------------------------------------------
    if (
      lower.includes('take me to checkout') ||
      lower.includes('go to checkout') ||
      lower.includes('ready to checkout') ||
      lower.includes('where do i pay') ||
      lower.includes('proceed to checkout')
    ) {
      const cart = db.getCart(sessionId);
      const checkoutMsg = `Guiding you to checkout verification. Your cart has ${cart.length} items. Verification Kiosks 1 through 4 are open for physical verification.`;
      setLastSpokenText(checkoutMsg);
      onMessageAdded({
        sender: 'agent',
        text: checkoutMsg
      });

      if (onNavigateToRoute) {
        onNavigateToRoute('/customer/cart');
      }

      await speakResponse(checkoutMsg);
      return;
    }

    // -------------------------------------------------------------------------
    // Intent D: Pass Request to the Authoritative EXISTING Customer Agent
    // -------------------------------------------------------------------------
    try {
      const preferredLang = languageDetector.getPreferredLanguage(sessionId);

      // Invoke Customer Agent with current mission and customer session context
      const response = await customerAgent.processInput(
        text,
        preferredLang,
        mission,
        sessionId,
        'voice',
        getCustomerAgentIdentity(sessionId, currentCustomer?.customer_id)
      );

      // Update active product context if Customer Agent found or discussed a product
      if (response.productFound) {
        setActiveProductContext(response.productFound);
      }

      // Record agent response in shared chat
      onMessageAdded({
        sender: 'agent',
        text: response.message,
        aisleHint: response.productFound?.shelf_location || response.aisle,
        data: response
      });

      setLastSpokenText(response.message);

      // Speak Customer Agent response via TTS
      const langToSpeak = (response.response_language as LanguageCode) || preferredLang || 'en';
      await speakResponse(response.message, langToSpeak);
    } catch (err) {
      console.error('[Customer Alexa+] Error invoking Customer Agent:', err);
      const fallbackError = "I couldn't complete that request right now. Please try again in a moment.";
      setLastSpokenText(fallbackError);
      onMessageAdded({
        sender: 'agent',
        text: fallbackError
      });
      await speakResponse(fallbackError);
    }
  };

  // ---------------------------------------------------------------------------
  // TEXT-TO-SPEECH WITH UI SYNCHRONIZATION
  // ---------------------------------------------------------------------------
  const speakResponse = async (text: string, lang: LanguageCode = language) => {
    if (!voiceAudioEnabled || typeof window === 'undefined') {
      finishVoiceTurn();
      return;
    }

    setVoiceState('SPEAKING');

    try {
      await voiceService.speak(text, lang, sessionId);
    } catch (e) {
      console.warn('[Customer Alexa+] TTS playback error:', e);
    } finally {
      finishVoiceTurn();
    }
  };

  const finishVoiceTurn = () => {
    if (conversationStateRef.current === 'CONVERSATION_ACTIVE') {
      // Stay in active listening mode for follow-up speech (NO wake-word needed!)
      setVoiceState('LISTENING');
      setLiveTranscript('');
    } else {
      setVoiceState('IDLE');
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
      bubbleTimeoutRef.current = setTimeout(() => {
        setShowStatusBubble(false);
        setLiveTranscript('');
      }, 4500);
    }
  };

  // ---------------------------------------------------------------------------
  // MANUAL TAP ACTIVATION FALLBACK (Requirement 8)
  // ---------------------------------------------------------------------------
  const handleOrbTap = () => {
    if (voiceState === 'SPEAKING') {
      voiceService.stopSpeaking();
      finishVoiceTurn();
    } else if (conversationState === 'CONVERSATION_ACTIVE') {
      endCustomerConversation();
    } else {
      setConversationState('CONVERSATION_ACTIVE');
      setShowStatusBubble(true);
      setLiveTranscript('Listening...');
      voiceService.playAudioChime(620);
      resetInactivityTimer();
      setVoiceState('LISTENING');
      try {
        if (recognitionRef.current && !isListeningRef.current) {
          recognitionRef.current.start();
        }
      } catch (e) {}
    }
  };

  return (
    <>
      {/* Floating Subtle Voice Companion Orb (Fixed near bottom right) */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Responsive Holographic Speech Bubble / Status HUD */}
        <AnimatePresence>
          {showStatusBubble && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="max-w-[280px] sm:max-w-xs p-3 rounded-2xl bg-slate-900/95 border border-emerald-500/40 shadow-2xl backdrop-blur-xl text-white text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                <span className="font-mono text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <BrainCircuit className="w-3 h-3 text-emerald-400" />
                  GrocerAI Shopping Assistant
                </span>
                <div className="flex items-center gap-1.5">
                  {conversationState === 'CONVERSATION_ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => endCustomerConversation()}
                      className="text-[9px] font-mono text-rose-300 hover:text-rose-100 bg-rose-950/70 border border-rose-500/40 px-1.5 py-0.5 rounded cursor-pointer"
                      title="End active conversation session"
                    >
                      End
                    </button>
                  )}
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    {conversationState === 'CONVERSATION_ACTIVE' ? 'ACTIVE' : conversationState === 'AWAITING_CONTINUATION' ? 'CHECK' : voiceState}
                  </span>
                </div>
              </div>

              {/* Inactivity Prompt Interactive Choices */}
              {conversationState === 'AWAITING_CONTINUATION' ? (
                <div className="space-y-2 py-1">
                  <p className="text-[11px] text-amber-200 font-medium leading-relaxed">
                    We haven't continued our conversation for a while. Would you like to continue, or should I end the conversation?
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCustomerContinue()}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] text-center cursor-pointer transition-all shadow"
                    >
                      Continue
                    </button>
                    <button
                      type="button"
                      onClick={() => endCustomerConversation()}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] text-center cursor-pointer transition-all shadow"
                    >
                      End Conversation
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-200 leading-relaxed max-h-24 overflow-y-auto pr-1">
                  {conversationState === 'CONVERSATION_ACTIVE' && voiceState === 'LISTENING' && (liveTranscript || 'Listening... (Speak follow-up naturally)')}
                  {voiceState === 'PROCESSING' && 'Consulting Customer Agent & Store Telemetry...'}
                  {voiceState === 'SPEAKING' && lastSpokenText}
                  {conversationState === 'WAKE_WORD_MONITORING' && voiceState === 'IDLE' && 'Say "Hey Alexa" anytime to ask about products, locations, or cart.'}
                </p>
              )}

              {/* Context Action Shortcut Pill */}
              {activeProductContext && voiceState !== 'LISTENING' && (
                <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 truncate max-w-[150px]">
                    In focus: <strong className="text-white">{activeProductContext.name}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleProcessVoiceCommand('Add this to my cart')}
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ShoppingCart className="w-2.5 h-2.5" />
                    <span>+ Cart</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Voice Orb Button */}
        <div className="flex items-center gap-2">
          {/* Audio Mute / Unmute Toggle Button */}
          {onToggleVoiceAudio && (
            <button
              type="button"
              onClick={onToggleVoiceAudio}
              className={`p-2 rounded-full border shadow-lg backdrop-blur-md transition-all cursor-pointer ${
                voiceAudioEnabled
                  ? 'bg-slate-900/90 border-slate-700 text-emerald-400 hover:bg-slate-800'
                  : 'bg-rose-950/80 border-rose-500/40 text-rose-300 hover:bg-rose-900'
              }`}
              title={voiceAudioEnabled ? 'Mute Alexa+ voice response' : 'Enable Alexa+ voice response'}
            >
              {voiceAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Assistant voice control */}
          <button
            type="button"
            onClick={handleOrbTap}
            className="relative w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-xl focus:outline-none group select-none"
            title='Say "Hey Alexa" or tap to talk'
          >
            {/* Outer Pulsing Aura (Reacts to voice state) */}
            <motion.div
              animate={
                voiceState === 'LISTENING'
                  ? { scale: [1, 1.45, 1], opacity: [0.6, 1, 0.6] }
                  : voiceState === 'SPEAKING'
                  ? { scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }
                  : voiceState === 'PROCESSING'
                  ? { rotate: 360 }
                  : { scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }
              }
              transition={
                voiceState === 'PROCESSING'
                  ? { repeat: Infinity, duration: 1.5, ease: 'linear' }
                  : { repeat: Infinity, duration: 2, ease: 'easeInOut' }
              }
              className={`absolute inset-0 rounded-full border ${
                voiceState === 'LISTENING'
                  ? 'border-emerald-400 bg-emerald-500/20 shadow-emerald-500/40 shadow-lg'
                  : voiceState === 'SPEAKING'
                  ? 'border-cyan-400 bg-cyan-500/20 shadow-cyan-500/40 shadow-lg'
                  : voiceState === 'PROCESSING'
                  ? 'border-purple-400 border-dashed bg-purple-500/20'
                  : 'border-emerald-500/30 bg-emerald-500/10'
              }`}
            />

            {/* Inner Core Orb */}
            <div
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                voiceState === 'LISTENING'
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-400 text-slate-950 shadow-md'
                  : voiceState === 'SPEAKING'
                  ? 'bg-gradient-to-br from-cyan-500 to-emerald-400 text-slate-950 shadow-md'
                  : voiceState === 'PROCESSING'
                  ? 'bg-gradient-to-br from-purple-600 to-indigo-500 text-white'
                  : 'bg-slate-900 border border-emerald-500/50 text-emerald-400 group-hover:border-emerald-400'
              }`}
            >
              {voiceState === 'LISTENING' ? (
                <Mic className="w-5 h-5 animate-pulse" />
              ) : voiceState === 'SPEAKING' ? (
                <Sparkles className="w-5 h-5 animate-spin-slow" />
              ) : voiceState === 'PROCESSING' ? (
                <BrainCircuit className="w-5 h-5 animate-pulse" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </div>

            {/* Micro Wake Word Tag */}
            <span className="absolute -top-1 -left-2 bg-slate-950 text-emerald-400 border border-emerald-500/40 text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-full uppercase pointer-events-none shadow-sm">
              ALEXA+
            </span>
          </button>
        </div>
      </div>

      {errorNotice && (
        <div className="fixed bottom-36 right-4 z-40 max-w-xs p-2.5 rounded-xl bg-amber-950/90 border border-amber-500/40 text-amber-200 text-[11px] shadow-lg flex items-center justify-between gap-2">
          <span>{errorNotice}</span>
          <button
            type="button"
            onClick={() => setErrorNotice(null)}
            className="text-amber-400 hover:text-amber-200 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};



