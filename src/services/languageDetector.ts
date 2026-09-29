import { LanguageCode } from '../types/index.js';

export type DetectedLanguageType = 'en' | 'te' | 'hi' | 'te-en' | 'hi-en';

export interface LanguageDetectionResult {
  detected_language: DetectedLanguageType;
  response_language: LanguageCode;
  is_code_mixed: boolean;
  confidence: number;
}

// Romanized keywords and patterns
const TELUGU_ROMAN_PATTERNS = [
  /\b(ekkada|undha|undhi|kavali|chey|naku|naaku|enka|inka|em|enti|chudu|choodu|pettandi|ivvandi|dorukuthundha|dorukutunda|bagundha)\b/i,
  /\b(lo|ki|tho|ni)\b/i
];

const HINDI_ROMAN_PATTERNS = [
  /\b(kidhar|kahan|kaha|hai|hain|kya|chahiye|batao|bataiye|me|mein|karo|rakho|milega|mil|dikhaiye|chahiye|dekhna)\b/i,
  /\b(ka|ke|ki|se|ko)\b/i
];

// Session-specific language storage
const sessionLanguageMap = new Map<string, LanguageCode>();

export class LanguageDetector {
  public detectLanguage(input: string, sessionId?: string): LanguageDetectionResult {
    const text = input.trim();
    if (!text) {
      const fallback = sessionId ? (sessionLanguageMap.get(sessionId) || 'en') : 'en';
      return {
        detected_language: fallback as DetectedLanguageType,
        response_language: fallback,
        is_code_mixed: false,
        confidence: 1.0
      };
    }

    // 1. Native Telugu Script (\u0C00 - \u0C7F)
    const teluguScriptRegex = /[\u0C00-\u0C7F]/;
    if (teluguScriptRegex.test(text)) {
      const hasEnglish = /[a-zA-Z]/.test(text);
      const resLang: LanguageCode = 'te';
      if (sessionId) sessionLanguageMap.set(sessionId, resLang);
      return {
        detected_language: hasEnglish ? 'te-en' : 'te',
        response_language: resLang,
        is_code_mixed: hasEnglish,
        confidence: 0.98
      };
    }

    // 2. Native Devanagari / Hindi Script (\u0900 - \u097F)
    const hindiScriptRegex = /[\u0900-\u097F]/;
    if (hindiScriptRegex.test(text)) {
      const hasEnglish = /[a-zA-Z]/.test(text);
      const resLang: LanguageCode = 'hi';
      if (sessionId) sessionLanguageMap.set(sessionId, resLang);
      return {
        detected_language: hasEnglish ? 'hi-en' : 'hi',
        response_language: resLang,
        is_code_mixed: hasEnglish,
        confidence: 0.98
      };
    }

    // 3. Romanized Telugu + English Code-Mixed
    let teluguMatchScore = 0;
    for (const pat of TELUGU_ROMAN_PATTERNS) {
      if (pat.test(text)) teluguMatchScore += 1;
    }
    if (teluguMatchScore > 0) {
      const resLang: LanguageCode = 'te';
      if (sessionId) sessionLanguageMap.set(sessionId, resLang);
      return {
        detected_language: 'te-en',
        response_language: resLang,
        is_code_mixed: true,
        confidence: 0.92
      };
    }

    // 4. Romanized Hindi + English Code-Mixed
    let hindiMatchScore = 0;
    for (const pat of HINDI_ROMAN_PATTERNS) {
      if (pat.test(text)) hindiMatchScore += 1;
    }
    if (hindiMatchScore > 0) {
      const resLang: LanguageCode = 'hi';
      if (sessionId) sessionLanguageMap.set(sessionId, resLang);
      return {
        detected_language: 'hi-en',
        response_language: resLang,
        is_code_mixed: true,
        confidence: 0.92
      };
    }

    // 5. English / Fallback to existing session preference if neutral or short follow-up
    const existingSessionLang = sessionId ? sessionLanguageMap.get(sessionId) : undefined;
    const isExplicitEnglishSwitch = /\b(speak in english|talk in english|in english|english only)\b/i.test(text);
    const isNeutralOrShort = text.split(/\s+/).length <= 3 && !isExplicitEnglishSwitch;

    if (existingSessionLang && existingSessionLang !== 'en' && isNeutralOrShort && !isExplicitEnglishSwitch) {
      return {
        detected_language: `${existingSessionLang}-en` as DetectedLanguageType,
        response_language: existingSessionLang,
        is_code_mixed: true,
        confidence: 0.85
      };
    }

    const resLang: LanguageCode = 'en';
    if (sessionId) sessionLanguageMap.set(sessionId, resLang);
    return {
      detected_language: 'en',
      response_language: 'en',
      is_code_mixed: false,
      confidence: 0.95
    };
  }

  public getSessionLanguage(sessionId: string): LanguageCode {
    return sessionLanguageMap.get(sessionId) || 'en';
  }

  public setSessionLanguage(sessionId: string, lang: LanguageCode) {
    sessionLanguageMap.set(sessionId, lang);
  }

  public getPreferredLanguage(sessionId: string): LanguageCode {
    return this.getSessionLanguage(sessionId);
  }

  public setPreferredLanguage(sessionId: string, lang: LanguageCode) {
    this.setSessionLanguage(sessionId, lang);
  }
}

export const languageDetector = new LanguageDetector();
