import { LanguageCode } from '../types/index.js';
import { eventService } from './eventService.js';
import { echoGuard } from './echoGuard.js';

export interface TTSResult {
  played: boolean;
  language: string;
  fallbackToChat?: boolean;
  error?: string;
}

export type VoiceStatus = 'idle' | 'listening' | 'transcribing' | 'speaking' | 'error';

export interface VoiceIntent {
  type: 'NAVIGATION_CONFIRMATION' | 'PRODUCT_SEARCH' | 'UNKNOWN';
  targetProduct?: string;
  rawTranscript: string;
}

export class VoiceService {
  private isSpeaking = false;
  private isListening = false;
  private recognition: any = null;
  private lastText = '';
  private lastLang: LanguageCode = 'en';
  private listeners: ((status: VoiceStatus) => void)[] = [];
  private currentStatus: VoiceStatus = 'idle';
  private watchdogTimer: any = null;

  constructor() {
    this.initRecognition();
  }

  private setStatus(status: VoiceStatus) {
    this.currentStatus = status;
    for (const l of this.listeners) {
      try {
        l(status);
      } catch (e) {
        console.error('Voice status listener error:', e);
      }
    }
  }

  public subscribeStatus(listener: (status: VoiceStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentStatus);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getStatus(): VoiceStatus {
    return this.currentStatus;
  }

  private initRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = false;
          this.recognition.interimResults = true;
          this.recognition.maxAlternatives = 1;
        } catch (e) {
          console.warn('SpeechRecognition initialization failed:', e);
        }
      }
    }
  }

  public isRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public isSynthesisSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  }

  /**
   * Plays a pleasant non-blocking audio chime using Web Audio API as sensory feedback
   * when native speech synthesis is missing or falling back to chat.
   */
  public playAudioChime(freq = 520, durationMs = 180) {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // ignore audio context restrictions
    }
  }

  /**
   * Evaluates voice transcript for conversational intents.
   * Recognizes multilingual affirmative consent ("Avunu", "Haa", "Yes", "Sure") for in-store navigation.
   */
  public parseVoiceIntent(transcript: string): VoiceIntent {
    const raw = transcript.trim().toLowerCase();
    const cleanText = raw.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleanText.split(' ');
    
    // 1. Navigation / Map confirmation intents
    const navigationAffirmations = [
      'yes', 'yeah', 'yep', 'sure', 'ok', 'okay',
      'avunu', 'haa', 'ha', 'chupinchu', 'choodam', 'dikkulu', 'map',
      'haan', 'dikhaye', 'chalo', 'dikhao'
    ];
    const isNavigation = navigationAffirmations.some(aff => 
      words.includes(aff) || cleanText === aff || cleanText.startsWith(`${aff} `) || cleanText.endsWith(` ${aff}`) || cleanText.includes(` ${aff} `)
    );

    if (isNavigation) {
      return {
        type: 'NAVIGATION_CONFIRMATION',
        rawTranscript: transcript
      };
    }

    // 2. Product search intents
    const commonProducts = ['paneer', 'bread', 'pasta', 'olive oil', 'tomatoes', 'milk', 'yogurt', 'quinoa', 'tofu', 'garlic', 'cheese'];
    for (const prod of commonProducts) {
      if (cleanText.includes(prod)) {
        return {
          type: 'PRODUCT_SEARCH',
          targetProduct: prod,
          rawTranscript: transcript
        };
      }
    }

    return {
      type: 'UNKNOWN',
      rawTranscript: transcript
    };
  }

  /**
   * Speaks text with multilingual voice engine support.
   * Includes watchdog timer to prevent silent UI freezes and graceful chat mode fallback for missing Telugu voices.
   */
  public speak(text: string, lang: LanguageCode = 'en', sessionId = 'USER00001'): Promise<TTSResult> {
    this.lastText = text;
    this.lastLang = lang;

    eventService.recordEvent({
      event_type: 'TTS_REQUEST',
      customer_session_id: sessionId,
      metadata: { text: text.substring(0, 100), language: lang }
    });

    return new Promise((resolve) => {
      if (!this.isSynthesisSupported()) {
        this.playAudioChime(440);
        eventService.recordEvent({
          event_type: 'TTS_FAILED',
          customer_session_id: sessionId,
          metadata: { reason: 'speechSynthesis not supported' }
        });
        resolve({ played: false, language: lang, fallbackToChat: true, error: 'Speech synthesis not supported in this browser' });
        return;
      }

      try {
        if (this.watchdogTimer) {
          clearTimeout(this.watchdogTimer);
          this.watchdogTimer = null;
        }

        window.speechSynthesis.cancel(); // cancel any active speech
        echoGuard.onSpeechEnd();
        const uttId = echoGuard.onSpeechStart(text);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        let chosenVoice: SpeechSynthesisVoice | undefined;

        if (lang === 'hi') {
          utterance.lang = 'hi-IN';
          chosenVoice = voices.find(v => v.lang.toLowerCase().includes('hi') || v.lang.toLowerCase().includes('hindi')) ||
            voices.find(v => v.lang.includes('IN') || v.name.includes('India')) ||
            voices[0];
        } else if (lang === 'te') {
          // Check for genuine Telugu voice, or fallback to Indian phonetic voice
          chosenVoice = voices.find(v => 
            v.lang.toLowerCase().includes('te') || 
            v.name.toLowerCase().includes('telugu')
          );
          if (!chosenVoice) {
            // Fallback to Hindi or Indian English phonetic voice so audio speaks naturally
            chosenVoice = voices.find(v => v.lang.toLowerCase().includes('hi') || v.lang.includes('IN') || v.name.includes('India')) ||
              voices[0];
            utterance.lang = 'hi-IN';
          } else {
            utterance.lang = 'te-IN';
          }
        } else {
          utterance.lang = 'en-IN';
          chosenVoice = voices.find(v => v.lang.includes('en-IN') || v.name.includes('India') || v.lang.startsWith('en')) || voices[0];
        }

        if (chosenVoice) {
          utterance.voice = chosenVoice;
        }

        // Prevent Chrome GC bug from cutting speech short mid-sentence
        (window as any).__grocerActiveUtterance = utterance;

        // Dynamic, responsive watchdog timer based on actual sentence length
        const maxDuration = Math.min(Math.max(text.length * 90 + 3000, 4000), 22000);
        this.watchdogTimer = setTimeout(() => {
          if (this.isSpeaking) {
            console.warn('TTS safety watchdog reached timeout');
            window.speechSynthesis.cancel();
            echoGuard.onSpeechEnd(uttId);
            this.isSpeaking = false;
            this.setStatus('idle');
            (window as any).__grocerActiveUtterance = null;
            resolve({ played: true, language: lang });
          }
        }, maxDuration);

        utterance.onstart = () => {
          this.isSpeaking = true;
          this.setStatus('speaking');
        };

        utterance.onend = () => {
          if (this.watchdogTimer) {
            clearTimeout(this.watchdogTimer);
            this.watchdogTimer = null;
          }
          (window as any).__grocerActiveUtterance = null;
          echoGuard.onSpeechEnd(uttId);
          this.isSpeaking = false;
          this.setStatus('idle');
          eventService.recordEvent({
            event_type: 'TTS_SUCCESS',
            customer_session_id: sessionId,
            metadata: { language: lang }
          });
          resolve({ played: true, language: lang });
        };

        utterance.onerror = (e) => {
          if (this.watchdogTimer) {
            clearTimeout(this.watchdogTimer);
            this.watchdogTimer = null;
          }
          (window as any).__grocerActiveUtterance = null;
          echoGuard.onSpeechEnd(uttId);
          console.warn('SpeechSynthesis error:', e);
          this.isSpeaking = false;
          this.setStatus('idle');
          eventService.recordEvent({
            event_type: 'TTS_FAILED',
            customer_session_id: sessionId,
            metadata: { error: e.error || 'Playback error' }
          });
          resolve({ played: false, language: lang, fallbackToChat: true, error: e.error || 'TTS error' });
        };

        if (typeof window !== 'undefined' && window.speechSynthesis.resume) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (err: any) {
        if (this.watchdogTimer) {
          clearTimeout(this.watchdogTimer);
          this.watchdogTimer = null;
        }
        echoGuard.onSpeechEnd();
        console.warn('Speech synthesis exception:', err);
        this.setStatus('idle');
        this.isSpeaking = false;
        eventService.recordEvent({
          event_type: 'TTS_FAILED',
          customer_session_id: sessionId,
          metadata: { error: err?.message || 'Exception in speak()' }
        });
        resolve({ played: false, language: lang, fallbackToChat: true, error: err?.message || 'Speech synthesis exception' });
      }
    });
  }

  public replay(sessionId = 'USER00001'): Promise<TTSResult> {
    if (!this.lastText) {
      return Promise.resolve({ played: false, language: this.lastLang, error: 'No recent text to replay' });
    }
    return this.speak(this.lastText, this.lastLang, sessionId);
  }

  public stopSpeaking() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    echoGuard.onSpeechEnd();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.setStatus('idle');
    }
  }

  public stop() {
    this.stopSpeaking();
    this.stopListening();
  }

  public startListening(
    lang: LanguageCode,
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (err: any) => void
  ): boolean {
    if (!this.recognition) {
      console.warn('SpeechRecognition not supported in this environment');
      this.setStatus('error');
      return false;
    }

    try {
      if (lang === 'hi') this.recognition.lang = 'hi-IN';
      else if (lang === 'te') this.recognition.lang = 'te-IN';
      else this.recognition.lang = 'en-IN';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.setStatus('listening');
      };

      this.recognition.onresult = (event: any) => {
        this.setStatus('transcribing');
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        const isFinal = event.results[last].isFinal;
        onResult(transcript, isFinal);
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Recognition error:', event.error);
        this.isListening = false;
        this.setStatus('idle');
        onError(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.setStatus('idle');
      };

      this.recognition.start();
      return true;
    } catch (e) {
      this.setStatus('idle');
      onError(e);
      return false;
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.isListening = false;
      this.setStatus('idle');
    }
  }

  public getSpeakingStatus(): boolean {
    return this.isSpeaking;
  }

  public getListeningStatus(): boolean {
    return this.isListening;
  }
}

export const voiceService = new VoiceService();
