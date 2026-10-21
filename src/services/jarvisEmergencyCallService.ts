import { voiceService } from './voiceService.js';
import { managerService } from './managerService.js';
import { db } from './db.js';
import { employeeService } from './employeeService.js';

export type EmergencyCallState =
  | 'IDLE'
  | 'RINGING'
  | 'CONNECTED'
  | 'CALLBACK_RINGING'
  | 'CALLBACK_CONNECTED'
  | 'ENDED';

export interface EmergencyCallContext {
  incidentId: string;
  incidentTitle: string;
  cameraLabel: string;
  aisle: string;
  severity: 'HIGH' | 'CRITICAL';
  assignedEmployeeName?: string;
  callDurationSeconds: number;
  dialogueStep: number;
  lastJarvisSpeech?: string;
  lastManagerSpeech?: string;
  isJarvisSpeaking?: boolean;
}

class JarvisEmergencyCallService {
  private callState: EmergencyCallState = 'IDLE';
  private ringtoneInterval: any = null;
  private callTimer: any = null;
  private callDuration = 0;
  private audioCtx: any = null;
  private lastSavedDispatch: any = null;
  private listeners: ((state: EmergencyCallState, context: EmergencyCallContext | null) => void)[] = [];

  private currentContext: EmergencyCallContext = {
    incidentId: 'cctv_001_shoplifting_jacket',
    incidentTitle: 'Product Concealment (Jacket / Clothing)',
    cameraLabel: 'CAM-04B · Aisle 2 (Pantry & Snacks)',
    aisle: 'Aisle 2',
    severity: 'CRITICAL',
    assignedEmployeeName: 'Rahul Sen',
    callDurationSeconds: 0,
    dialogueStep: 0,
    lastJarvisSpeech: '',
    lastManagerSpeech: '',
    isJarvisSpeaking: false
  };

  public getCallState(): EmergencyCallState {
    return this.callState;
  }

  public getContext(): EmergencyCallContext {
    return { ...this.currentContext, callDurationSeconds: this.callDuration };
  }

  public subscribe(listener: (state: EmergencyCallState, context: EmergencyCallContext | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.callState, this.getContext());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    for (const l of this.listeners) {
      try {
        l(this.callState, this.getContext());
      } catch (e) {
        console.error('Call listener error:', e);
      }
    }
  }

  /**
   * Synthesize standard telephone ringing tone using Web Audio API (440Hz + 480Hz dual-frequency)
   */
  public playRingtone() {
    this.stopRingtone();
    if (typeof window === 'undefined') return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      this.audioCtx = new AudioContextClass();

      const playBurst = () => {
        if (!this.audioCtx || this.callState !== 'RINGING' && this.callState !== 'CALLBACK_RINGING') return;
        try {
          const osc1 = this.audioCtx.createOscillator();
          const osc2 = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc1.frequency.setValueAtTime(440, this.audioCtx.currentTime);
          osc2.frequency.setValueAtTime(480, this.audioCtx.currentTime);

          gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.8);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc1.start();
          osc2.start();
          osc1.stop(this.audioCtx.currentTime + 1.8);
          osc2.stop(this.audioCtx.currentTime + 1.8);

          // Vibrate mobile device if supported
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([400, 200, 400]);
          }
        } catch {
          // ignore audio context restrictions
        }
      };

      playBurst();
      this.ringtoneInterval = setInterval(playBurst, 3500);
    } catch {
      // AudioContext not available
    }
  }

  public stopRingtone() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {
        // ignore
      }
      this.audioCtx = null;
    }
  }

  /**
   * Play call disconnect tone (three short beeps)
   */
  public playDisconnectTone() {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const beeps = [0, 0.25, 0.5];
      beeps.forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(480, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.18);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Triggers the emergency incoming call to the manager mobile
   */
  public initiateEmergencyCall(incidentDetails?: Partial<EmergencyCallContext>) {
    if (this.callState === 'CONNECTED' || this.callState === 'RINGING') return;

    if (incidentDetails) {
      this.currentContext = { ...this.currentContext, ...incidentDetails, dialogueStep: 0 };
    }

    this.callState = 'RINGING';
    this.callDuration = 0;
    this.notify();
    this.playRingtone();
  }

  /**
   * Manager accepts the incoming call
   */
  public answerCall(): Promise<void> {
    this.stopRingtone();
    this.callState = 'CONNECTED';
    this.currentContext.dialogueStep = 1;
    this.currentContext.lastJarvisSpeech = "Hey Manager.";
    this.currentContext.isJarvisSpeaking = true;
    this.startCallTimer();
    this.notify();

    // Alexa+ speaks greeting
    return voiceService.speak("Hey Manager.", "en", "MANAGER_EMERGENCY_LINE").then(() => {
      this.currentContext.isJarvisSpeaking = false;
      this.notify();
    });
  }

  /**
   * Step 2: Manager asks / responds "What's up Alexa?"
   */
  public managerAskWhatsUp(): Promise<void> {
    this.currentContext.dialogueStep = 2;
    const speech = `Security Agent detected a critical incident: product concealment at Camera 4 in Aisle 2. You are marked away in traffic, so I reached you on your direct line. We need your immediate decision on this.`;
    this.currentContext.lastJarvisSpeech = speech;
    this.currentContext.isJarvisSpeaking = true;
    this.notify();

    return voiceService.speak(speech, "en", "MANAGER_EMERGENCY_LINE").then(() => {
      this.currentContext.isJarvisSpeaking = false;
      this.notify();
    });
  }

  /**
   * Optional: Manager asks for store status updates
   */
  public managerAskForUpdates(): Promise<void> {
    this.currentContext.dialogueStep = 3;
    const speech = `Store operations are stable: 842 shoppers today, sales at ₹1,24,560 across 415 orders. Associate Rahul Sen is actively on floor duty near Aisle 2.`;
    this.currentContext.lastJarvisSpeech = speech;
    this.currentContext.isJarvisSpeaking = true;
    this.notify();

    return voiceService.speak(speech, "en", "MANAGER_EMERGENCY_LINE").then(() => {
      this.currentContext.isJarvisSpeaking = false;
      this.notify();
    });
  }

  /**
   * Step 3: Manager orders dispatch and hangs up
   */
  public managerOrderEmployeeDispatch(): Promise<void> {
    this.currentContext.dialogueStep = 4;
    const speech = `Understood Manager. Alerting active floor associate Rahul Sen now. Disconnecting call.`;
    this.currentContext.lastJarvisSpeech = speech;
    this.currentContext.isJarvisSpeaking = true;
    this.notify();

    return voiceService.speak(speech, "en", "MANAGER_EMERGENCY_LINE").then(() => {
      this.currentContext.isJarvisSpeaking = false;
      this.notify();
      this.playDisconnectTone();
      this.hangUpCall();

      // Dispatch urgent security task to Employee Service
      this.dispatchAlertToEmployee();
    });
  }

  /**
   * Natural Language Spoken Voice Input Processor
   * Interprets what the manager speaks naturally over the phone call!
   */
  public async processSpokenInput(rawText: string): Promise<{ handled: boolean; intent?: string }> {
    const text = (rawText || '').trim();
    if (!text) return { handled: false };

    this.currentContext.lastManagerSpeech = text;
    this.notify();

    const lower = text.toLowerCase();

    // 1. If in callback connected mode:
    if (this.callState === 'CALLBACK_CONNECTED') {
      const isBye = lower.includes('bye') || lower.includes('by') || lower.includes('ok') || 
                    lower.includes('okay') || lower.includes('thank') || lower.includes('cut') || 
                    lower.includes('hang') || lower.includes('good') || lower.includes('great') ||
                    lower.includes('safe') || lower.includes('సరే') || lower.includes('బై') || 
                    lower.includes('अलविदा') || lower.includes('ठीक है');
      if (isBye) {
        this.managerSayByeAndHangUp();
        return { handled: true, intent: 'CALLBACK_BYE' };
      }
      return { handled: false };
    }

    if (this.callState !== 'CONNECTED') {
      return { handled: false };
    }

    // 2. Dispatch to employee & Hang Up intent:
    // Matches if manager mentions traffic, driving, Rahul, employee, handle it, check aisle, keep updated, hang up, etc.
    const hasTraffic = lower.includes('traffic') || lower.includes('driving') || lower.includes('drive') || 
                       lower.includes('road') || lower.includes('car') || lower.includes('ట్రాఫిక్') || lower.includes('ट्रैफिक');
    const hasEmployeeOrRahul = lower.includes('employee') || lower.includes('rahul') || lower.includes('staff') || 
                               lower.includes('associate') || lower.includes('someone') || lower.includes('active') || 
                               lower.includes('రాహుల్') || lower.includes('राहुल') || lower.includes('कर्मचारी');
    const hasHandleOrCheck = lower.includes('handle') || lower.includes('check') || lower.includes('look into') || 
                             lower.includes('manage') || lower.includes('take care') || lower.includes('investigate') || 
                             lower.includes('sort') || lower.includes('హ్యాండిల్') || lower.includes('సంభాల్') || lower.includes('संभाल');
    const hasHangUp = lower.includes('hang up') || lower.includes('hangup') || lower.includes('cut the call') || 
                      lower.includes('cut call') || lower.includes('disconnect') || lower.includes('end call') || 
                      lower.includes('bye') || lower.includes('కట్') || lower.includes('काटो');

    const isDispatch = (hasTraffic && (hasEmployeeOrRahul || hasHandleOrCheck || hasHangUp)) ||
                       (hasEmployeeOrRahul && (hasHandleOrCheck || hasHangUp)) ||
                       (this.currentContext.dialogueStep >= 2 && (hasEmployeeOrRahul || hasHandleOrCheck || hasTraffic || hasHangUp)) ||
                       (this.currentContext.dialogueStep === 3 && (lower.includes('yes') || lower.includes('sure') || lower.includes('dispatch') || lower.includes('do it') || hasHangUp));

    if (isDispatch) {
      await this.managerOrderEmployeeDispatch();
      return { handled: true, intent: 'DISPATCH_AND_HANGUP' };
    }

    // 3. Store updates inquiry:
    const isStoreUpdates = lower.includes('update') || lower.includes('store') || lower.includes('sales') || 
                           lower.includes('footfall') || lower.includes('numbers') || lower.includes('orders') || 
                           lower.includes('status') || lower.includes('how are things') || lower.includes('అప్‌డేట్') || 
                           lower.includes('अपडेट') || lower.includes('बिक्री');

    if (isStoreUpdates && this.currentContext.dialogueStep >= 2) {
      await this.managerAskForUpdates();
      return { handled: true, intent: 'STORE_UPDATES' };
    }

    // 4. Initial inquiry / What's up / Wakeword greeting:
    const isWhatsUp = lower.includes("what's up") || lower.includes("whats up") || lower.includes("what is up") || 
                      lower.includes("what happened") || lower.includes("what is going on") || lower.includes("what's going on") || 
                      lower.includes("what is it") || lower.includes("why are you calling") || lower.includes("why call") || 
                      lower.includes("tell me") || lower.includes("report") || lower.includes("issue") || 
                      lower.includes("alert") || lower.includes("incident") || lower.includes("hey alexa") ||
                      lower.includes("alexa") || lower.includes("yes") || lower.includes("hello") ||
                      lower.includes("hi") || lower.includes("ఏంటి") || lower.includes("ఏమైంది") || 
                      lower.includes("చెప్పు") || lower.includes("क्या हुआ") || lower.includes("बताओ");

    if (this.currentContext.dialogueStep === 1 || isWhatsUp) {
      await this.managerAskWhatsUp();
      return { handled: true, intent: 'WHATS_UP_INQUIRY' };
    }

    // 5. If dialogue step is 2 or 3 and user spoke something conversational:
    if (this.currentContext.dialogueStep === 2 || this.currentContext.dialogueStep === 3) {
      // Natural conversational default: dispatch associate Rahul Sen
      await this.managerOrderEmployeeDispatch();
      return { handled: true, intent: 'DISPATCH_NATURAL_DEFAULT' };
    }

    return { handled: false };
  }

  private dispatchAlertToEmployee() {
    // Record urgent manager dispatch in persistent DB / LocalStorage
    const dispatchPayload = {
      id: `DISPATCH-${Date.now()}`,
      assignedTo: 'Rahul Sen',
      employeeId: 'EMP-1046',
      incidentId: this.currentContext.incidentId,
      incidentTitle: this.currentContext.incidentTitle,
      location: this.currentContext.aisle,
      cameraLabel: this.currentContext.cameraLabel,
      instruction: 'MANAGER DISPATCH (Traffic): Investigate concealment, verify checkout status and report back.',
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };

    this.lastSavedDispatch = dispatchPayload;

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('grocer_active_emergency_dispatch', JSON.stringify(dispatchPayload));
      // Dispatch storage event so other tabs immediately pick it up
      window.dispatchEvent(new Event('grocer_emergency_dispatch_created'));
    }
  }

  public getActiveDispatch() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem('grocer_active_emergency_dispatch');
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return this.lastSavedDispatch;
  }

  /**
   * Called when employee clicks "Mark Resolved & Notify Manager"
   */
  public notifyEmployeeHandled() {
    if (this.callState === 'RINGING' || this.callState === 'CALLBACK_RINGING') return;

    // Trigger follow-up call back to Manager!
    this.callState = 'CALLBACK_RINGING';
    this.callDuration = 0;
    this.notify();
    this.playRingtone();
  }

  /**
   * Manager answers callback
   */
  public answerCallback(): Promise<void> {
    this.stopRingtone();
    this.callState = 'CALLBACK_CONNECTED';
    this.startCallTimer();

    const speech = `Hey Manager, associate Rahul Sen has handled the situation in Aisle 2. Shelf verified and all secure. Have a safe drive, bye!`;
    this.currentContext.lastJarvisSpeech = speech;
    this.currentContext.isJarvisSpeaking = true;
    this.notify();

    return voiceService.speak(speech, "en", "MANAGER_EMERGENCY_LINE").then(() => {
      this.currentContext.isJarvisSpeaking = false;
      this.notify();
    });
  }

  /**
   * Manager says "Ok bye" -> Call ends
   */
  public managerSayByeAndHangUp() {
    this.playDisconnectTone();
    this.hangUpCall();
  }

  public hangUpCall() {
    this.stopRingtone();
    this.stopCallTimer();
    this.callState = 'ENDED';
    this.notify();

    setTimeout(() => {
      this.callState = 'IDLE';
      this.notify();
    }, 2000);
  }

  private startCallTimer() {
    this.stopCallTimer();
    this.callDuration = 0;
    this.callTimer = setInterval(() => {
      this.callDuration += 1;
      this.notify();
    }, 1000);
  }

  private stopCallTimer() {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
  }
}

export const jarvisEmergencyCallService = new JarvisEmergencyCallService();
