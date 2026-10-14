/**
 * GrocerAI — Multilingual Voice Provider Boundaries
 * 
 * Replaceable STT (Speech-To-Text) and TTS (Text-To-Speech) boundaries.
 * Provides guaranteed fallback to Chat mode when speech recognition or
 * synthesis engines are unavailable or fail.
 */

import { LanguageCode } from '../types/index.js';

export interface STTResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  detectedLanguage?: string;
  error?: string;
}

export interface TTSPlaybackResult {
  played: boolean;
  language: string;
  durationMs?: number;
  fallbackToChat: boolean;
  error?: string;
}

export interface ISTTProvider {
  readonly name: string;
  isSupported(): boolean;
  startListening(
    language: LanguageCode,
    onResult: (result: STTResult) => void,
    onError: (error: string) => void
  ): boolean;
  stopListening(): void;
  getStatus(): 'idle' | 'listening' | 'transcribing' | 'error';
}

export interface ITTSProvider {
  readonly name: string;
  isSupported(): boolean;
  speak(text: string, language: LanguageCode): Promise<TTSPlaybackResult>;
  stopSpeaking(): void;
  isSpeaking(): boolean;
}

/**
 * Headless / Test STT Provider for automated test suites
 */
export class MockSTTProvider implements ISTTProvider {
  public readonly name = 'MOCK_STT_PROVIDER';
  private status: 'idle' | 'listening' | 'transcribing' | 'error' = 'idle';
  public simulatedTranscripts: string[] = [];

  public isSupported(): boolean {
    return true;
  }

  public getStatus(): 'idle' | 'listening' | 'transcribing' | 'error' {
    return this.status;
  }

  public startListening(
    _language: LanguageCode,
    onResult: (result: STTResult) => void,
    _onError: (error: string) => void
  ): boolean {
    this.status = 'listening';
    if (this.simulatedTranscripts.length > 0) {
      const text = this.simulatedTranscripts.shift()!;
      this.status = 'transcribing';
      onResult({
        transcript: text,
        isFinal: true,
        confidence: 0.95
      });
      this.status = 'idle';
    }
    return true;
  }

  public stopListening(): void {
    this.status = 'idle';
  }

  public queueTranscript(text: string) {
    this.simulatedTranscripts.push(text);
  }
}

/**
 * Headless / Test TTS Provider for automated test suites
 */
export class MockTTSProvider implements ITTSProvider {
  public readonly name = 'MOCK_TTS_PROVIDER';
  public spokenUtterances: Array<{ text: string; language: string; timestamp: number }> = [];
  public failPlayback = false;

  public isSupported(): boolean {
    return true;
  }

  public async speak(text: string, language: LanguageCode): Promise<TTSPlaybackResult> {
    if (this.failPlayback) {
      return {
        played: false,
        language,
        fallbackToChat: true,
        error: 'Simulated TTS failure: Engine offline'
      };
    }

    this.spokenUtterances.push({
      text,
      language,
      timestamp: Date.now()
    });

    return {
      played: true,
      language,
      durationMs: text.length * 50,
      fallbackToChat: false
    };
  }

  public stopSpeaking(): void {
    // no-op
  }

  public isSpeaking(): boolean {
    return false;
  }
}
