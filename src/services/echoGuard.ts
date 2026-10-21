/**
 * GrocerAI EchoGuard & Barge-In Service
 * 
 * Prevents SpeechRecognition from transcribing Alexa+'s own SpeechSynthesis audio
 * through microphone acoustic feedback loops, while allowing genuine user
 * speech interruptions (barge-in) to cleanly stop TTS and process commands.
 */

export interface TrackedUtterance {
  id: string;
  text: string;
  normalizedText: string;
  words: Set<string>;
  startTime: number;
  endTime?: number;
}

export class EchoGuard {
  private activeUtterance: TrackedUtterance | null = null;
  private recentUtterances: TrackedUtterance[] = [];
  private isSpeaking = false;
  private speechEndedTimestamp = 0;
  private readonly REVERB_GUARD_MS = 600; // 600ms guard window after TTS stops
  private readonly UTTERANCE_EXPIRY_MS = 12000; // Keep past 12s for loop detection

  private normalize(str: string): string {
    return (str || '')
      .toLowerCase()
      .replace(/[*#_`]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractWords(str: string): Set<string> {
    const norm = this.normalize(str);
    const words = norm.split(' ').filter(w => w.length > 2);
    return new Set(words);
  }

  /**
   * Called whenever Alexa+ starts speaking via SpeechSynthesis
   */
  public onSpeechStart(text: string): string {
    const normalized = this.normalize(text);
    const words = this.extractWords(text);
    const id = `utt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    this.isSpeaking = true;
    this.activeUtterance = {
      id,
      text,
      normalizedText: normalized,
      words,
      startTime: Date.now()
    };

    // Keep up to 8 recent utterances for historical echo prevention
    this.recentUtterances.unshift(this.activeUtterance);
    if (this.recentUtterances.length > 8) {
      this.recentUtterances.pop();
    }

    return id;
  }

  /**
   * Called whenever Alexa+ finishes speaking or SpeechSynthesis.cancel() is executed
   */
  public onSpeechEnd(id?: string) {
    this.isSpeaking = false;
    this.speechEndedTimestamp = Date.now();

    if (this.activeUtterance) {
      this.activeUtterance.endTime = Date.now();
      this.activeUtterance = null;
    }

    // Clean up expired utterances
    const now = Date.now();
    this.recentUtterances = this.recentUtterances.filter(
      u => now - (u.endTime || u.startTime) < this.UTTERANCE_EXPIRY_MS
    );
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getSpeechEndedTimestamp(): number {
    return this.speechEndedTimestamp;
  }

  /**
   * Checks whether incoming candidate transcript is acoustic echo from Alexa+'s own speakers
   */
  public isEcho(candidateTranscript: string): boolean {
    const normCandidate = this.normalize(candidateTranscript);
    if (!normCandidate || normCandidate.length < 2) return false;

    // Never block intentional manager affirmations and commands when speech has ended
    const managerIntentWords = new Set([
      'yes', 'no', 'yeah', 'yep', 'nope', 'sure', 'ok', 'okay',
      'why', 'who', 'what', 'show', 'open', 'stop', 'end', 'dismiss',
      'cancel', 'approve', 'confirm', 'continue', 'cctv', 'surveillance',
      'view', 'feed', 'camera', 'do it', 'show cctv', 'open cctv', 'open surveillance'
    ]);

    // Fast-path: When Alexa+ is NOT speaking, immediately allow intent/affirmation responses
    if (!this.isSpeaking) {
      if (
        managerIntentWords.has(normCandidate) ||
        normCandidate.startsWith('yes') ||
        normCandidate.startsWith('yeah') ||
        normCandidate.startsWith('sure') ||
        normCandidate.startsWith('show') ||
        normCandidate.startsWith('open') ||
        normCandidate.startsWith('approve') ||
        normCandidate.startsWith('do it')
      ) {
        return false;
      }
    }

    // 1. WHILE ALEXA+ IS SPEAKING:
    // Any incoming audio from the microphone that is NOT an explicit barge-in keyword
    // is acoustic feedback from the computer speakers.
    if (this.isSpeaking) {
      return true;
    }

    const now = Date.now();
    const isWithinReverbWindow = now - this.speechEndedTimestamp < this.REVERB_GUARD_MS;
    const candidateWords = this.extractWords(candidateTranscript);

    // 2. POST-SPEECH REVERBERATION & AUDIO BUFFER DRAIN (within 600ms after TTS stops):
    // Discard any residual words that match the utterance that just finished.
    if (isWithinReverbWindow) {
      for (const utt of this.recentUtterances) {
        if (utt.normalizedText.includes(normCandidate) || normCandidate.includes(utt.normalizedText)) {
          return true;
        }
        for (const w of candidateWords) {
          if (utt.words.has(w)) {
            return true;
          }
        }
      }
    }

    // 3. HISTORICAL LOOP PREVENTION (across recent utterances within 12 seconds):
    for (const utt of this.recentUtterances) {
      const age = now - (utt.endTime || utt.startTime);
      if (age > this.UTTERANCE_EXPIRY_MS) continue;

      // Substring match
      if (normCandidate.length >= 8 && (utt.normalizedText.includes(normCandidate) || normCandidate.includes(utt.normalizedText))) {
        return true;
      }

      // Word overlap
      if (candidateWords.size >= 2) {
        let matchCount = 0;
        candidateWords.forEach(w => {
          if (utt.words.has(w)) matchCount++;
        });
        if (matchCount / candidateWords.size >= 0.5) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Identifies if incoming speech during TTS playback is a genuine, intentional user barge-in interruption.
   * Only explicit user interruption keywords (e.g. "stop", "wait", "hold on", "cancel", "hey alexa")
   * trigger interruption. Acoustic speaker bleed is never treated as barge-in.
   */
  public isBargeInInterruption(candidateTranscript: string): boolean {
    if (!this.isSpeaking) return false;

    const norm = this.normalize(candidateTranscript);
    if (norm.length < 2) return false;

    // Explicit intentional user interruption keywords:
    const intentionalBargeInKeywords = [
      'stop', 'wait', 'hold on', 'cancel', 'pause', 'quiet',
      'shut up', 'hey alexa', 'alexa', 'alexa plus', 'listen', 'stop talking',
      'stop speaking', 'hold up', 'shh', 'silence', 'enough'
    ];

    // Check if the user explicitly used an interruption keyword
    const isExplicitKeyword = intentionalBargeInKeywords.some(kw => 
      norm === kw || norm.startsWith(kw + ' ') || norm.endsWith(' ' + kw) || norm.includes(' ' + kw + ' ')
    );

    return isExplicitKeyword;
  }
}

export const echoGuard = new EchoGuard();
