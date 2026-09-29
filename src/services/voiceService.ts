import { LanguageCode } from '../types/index.js';
import { eventService } from './eventService.js';

export interface TTSResult {
  played: boolean;
  language: string;
  error?: string;
}

export type VoiceStatus = 'idle' | 'listening' | 'transcribing' | 'speaking' | 'error';

export class VoiceService {
  private isSpeaking = false;
  private isListening = false;
  private recognition: any = null;
  private lastText = '';
  private lastLang: LanguageCode = 'en';
  private listeners: ((status: VoiceStatus) => void)[] = [];
  private currentStatus: VoiceStatus = 'idle';

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

  public speak(text: string, lang: LanguageCode = 'en', sessionId = 'USER00001'): Promise<TTSResult> {
    this.lastText = text;
    this.lastLang = lang;

    eventService.recordEvent({
      event_type: 'TTS_REQUEST',
      customer_session_id: sessionId,
      metadata: { text, language: lang }
    });

    return new Promise((resolve) => {
      if (!this.isSynthesisSupported()) {
        eventService.recordEvent({
          event_type: 'TTS_FAILED',
          customer_session_id: sessionId,
          metadata: { reason: 'speechSynthesis not supported' }
        });
        resolve({ played: false, language: lang, error: 'Speech synthesis not supported in this browser' });
        return;
      }

      try {
        window.speechSynthesis.cancel(); // cancel any active speech

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Select voice based on language
        const voices = window.speechSynthesis.getVoices();
        let chosenVoice: SpeechSynthesisVoice | undefined;

        if (lang === 'hi') {
          utterance.lang = 'hi-IN';
          chosenVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
        } else if (lang === 'te') {
          utterance.lang = 'te-IN';
          chosenVoice = voices.find(v => v.lang.includes('te') || v.lang.includes('IN'));
        } else {
          utterance.lang = 'en-IN';
          chosenVoice = voices.find(v => v.lang.includes('en-IN') || v.name.includes('India') || v.lang.includes('en'));
        }

        if (chosenVoice) {
          utterance.voice = chosenVoice;
        }

        utterance.onstart = () => {
          this.isSpeaking = true;
          this.setStatus('speaking');
        };

        utterance.onend = () => {
          this.isSpeaking = false;
          this.setStatus('idle');
          eventService.recordEvent({
            event_type: 'TTS_SUCCESS',
            customer_session_id: sessionId,
            metadata: { text, language: lang }
          });
          resolve({ played: true, language: lang });
        };

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error:', e);
          this.isSpeaking = false;
          this.setStatus('error');
          eventService.recordEvent({
            event_type: 'TTS_FAILED',
            customer_session_id: sessionId,
            metadata: { error: e.error || 'Playback error' }
          });
          resolve({ played: false, language: lang, error: e.error || 'TTS error' });
        };

        window.speechSynthesis.speak(utterance);
      } catch (err: any) {
        console.warn('Speech synthesis exception:', err);
        this.setStatus('error');
        eventService.recordEvent({
          event_type: 'TTS_FAILED',
          customer_session_id: sessionId,
          metadata: { error: err?.message || 'Exception in speak()' }
        });
        resolve({ played: false, language: lang, error: err?.message || 'Speech synthesis exception' });
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.setStatus('idle');
    }
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
        this.setStatus('error');
        onError(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.setStatus('idle');
      };

      this.recognition.start();
      return true;
    } catch (e) {
      this.setStatus('error');
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
