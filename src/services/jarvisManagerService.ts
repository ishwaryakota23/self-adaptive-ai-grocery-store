import { db } from './db.js';
import { storeAgent } from './storeAgent.js';
import { storeAgentTools } from './storeAgentTools.js';
import { securityAgent } from './securityAgent.js';
import { hindsightEngine } from './hindsightEngine.js';
import { memoryService } from './nativeMemoryService.js';
import { roiEngine } from './roiEngine.js';
import { employeeService } from './employeeService.js';
import { cctvManifestService } from './cctvManifestService.js';
import {
  AIRecommendation,
  SecurityEvent,
  CheckoutQueue,
  Product,
  RecommendationRoiReport
} from '../types/index.js';
import { echoGuard } from './echoGuard.js';
import { groqJarvisManagerServer } from '../server/groqJarvisManager.js';
import { kioskService } from './kioskService.js';
import { managerService } from './managerService.js';

export type JarvisVoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'CONFIRMING';

export type JarvisConversationState =
  | 'WAKE_WORD_MONITORING'
  | 'CONVERSATION_ACTIVE'
  | 'AWAITING_CONTINUATION';

export type ManagerCategory =
  | 'dashboard'
  | 'operations'
  | 'inventory'
  | 'security'
  | 'cctv'
  | 'hindsight'
  | 'roi'
  | 'employees';

export interface ManagerNavigationEvent {
  category: ManagerCategory;
  cctvVideoId?: string;
  cctvCameraId?: string;
  securityEventId?: string;
  timestamp?: string;
  focusNote?: string;
}

export interface JarvisMessage {
  id: string;
  sender: 'MANAGER' | 'Alexa+';
  text: string;
  timestamp: string;
  actionCard?: {
    type: 'APPROVE_RESTOCK' | 'OPEN_KIOSK' | 'VIEW_SURVEILLANCE' | 'MODIFY_RESTOCK' | 'SECURITY_ALERT';
    title: string;
    description: string;
    targetId?: string;
    details?: Record<string, any>;
    status?: 'PENDING' | 'EXECUTED' | 'DISMISSED';
  };
  roiBreakdown?: {
    expectedBenefit: string;
    decisionCost: string;
    realizedImpact: string;
    discrepancyNote: string;
  };
  hindsightTrace?: {
    title: string;
    domain: string;
    lesson: string;
    convergenceStep?: number;
    convergenceHistory?: string[];
  };
}

export interface JarvisPrioritizedAlert {
  id: string;
  category: 'SECURITY' | 'QUEUE' | 'RESTOCK' | 'EMPLOYEE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  summary: string;
  sourceAgent: 'Security Agent' | 'Store Agent' | 'Customer Agent';
  actionRequired: boolean;
  actionType?: 'APPROVE_RESTOCK' | 'OPEN_KIOSK' | 'VIEW_SURVEILLANCE';
  targetId?: string;
  rawEvent?: any;
}

export interface JarvisPendingAction {
  id: string;
  type: 'APPROVE_RESTOCK' | 'MODIFY_RESTOCK' | 'DISMISS_RESTOCK' | 'OPEN_KIOSK' | 'VIEW_SURVEILLANCE';
  recommendationId?: string;
  kioskNumber?: number;
  customQuantity?: number;
  incidentId?: string;
  description: string;
  promptQuestion: string;
}

class JarvisManagerService {
  private messages: JarvisMessage[] = [];
  private listeners: (() => void)[] = [];
  private voiceState: JarvisVoiceState = 'IDLE';
  private voiceStateListeners: ((state: JarvisVoiceState) => void)[] = [];
  private pendingAction: JarvisPendingAction | null = null;
  private pendingContextQuestion: string | null = null;
  private isVoiceMuted = false;
  private hasInitializedGreeting = false;
  private emergencyAlertDispatched = new Set<string>();

  constructor() {
    this.initDefaultBriefing();
    this.monitorSecurityEvents();
  }

  // =========================================================================
  // SUBSCRIPTION & STATE
  // =========================================================================

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[Alexa+] Listener notification error:', err);
      }
    }
  }

  public subscribeVoiceState(listener: (state: JarvisVoiceState) => void): () => void {
    this.voiceStateListeners.push(listener);
    listener(this.voiceState);
    return () => {
      this.voiceStateListeners = this.voiceStateListeners.filter(l => l !== listener);
    };
  }

  public setVoiceState(state: JarvisVoiceState) {
    this.voiceState = state;
    for (const l of this.voiceStateListeners) {
      try {
        l(state);
      } catch (e) {
        console.error('[Alexa+] Voice state listener error:', e);
      }
    }
  }

  private conversationState: JarvisConversationState = 'WAKE_WORD_MONITORING';
  private conversationListeners: ((state: JarvisConversationState) => void)[] = [];
  private lastDiscussedTopic: string | null = null;

  public subscribeConversationState(listener: (state: JarvisConversationState) => void): () => void {
    this.conversationListeners.push(listener);
    listener(this.conversationState);
    return () => {
      this.conversationListeners = this.conversationListeners.filter(l => l !== listener);
    };
  }

  public setConversationState(state: JarvisConversationState) {
    this.conversationState = state;
    for (const l of this.conversationListeners) {
      try {
        l(state);
      } catch (e) {
        console.error('[Alexa+] Conversation state listener error:', e);
      }
    }
  }

  public getConversationState(): JarvisConversationState {
    return this.conversationState;
  }

  public getLastDiscussedTopic(): string | null {
    return this.lastDiscussedTopic;
  }

  public setLastDiscussedTopic(topic: string | null) {
    this.lastDiscussedTopic = topic;
  }

  private navListeners: ((event: ManagerNavigationEvent) => void)[] = [];

  public subscribeNavigation(listener: (event: ManagerNavigationEvent) => void): () => void {
    this.navListeners.push(listener);
    return () => {
      this.navListeners = this.navListeners.filter(l => l !== listener);
    };
  }

  public requestNavigation(event: ManagerNavigationEvent) {
    for (const l of this.navListeners) {
      try {
        l(event);
      } catch (err) {
        console.error('[Alexa+] Navigation listener error:', err);
      }
    }
  }

  public startConversation(initialGreeting = "Yes, Manager. How can I assist you with store operations?") {
    this.setConversationState('CONVERSATION_ACTIVE');
    return this.createJarvisResponse(initialGreeting);
  }

  public endConversation(spokenReason = "Ending conversation session. Say 'Hey Alexa' whenever you need me.") {
    this.setConversationState('WAKE_WORD_MONITORING');
    this.lastDiscussedTopic = null;
    return this.createJarvisResponse(spokenReason);
  }

  public continueConversation(spokenResponse = "Understood. Our conversation remains active. What else would you like to check?") {
    this.setConversationState('CONVERSATION_ACTIVE');
    return this.createJarvisResponse(spokenResponse);
  }

  public triggerInactivityPrompt() {
    this.setConversationState('AWAITING_CONTINUATION');
    return this.createJarvisResponse(
      "We haven't continued our conversation for a while. Would you like to continue, or should I end the conversation?"
    );
  }

  public getVoiceState(): JarvisVoiceState {
    return this.voiceState;
  }

  public getMessages(): JarvisMessage[] {
    return this.messages;
  }

  public getPendingAction(): JarvisPendingAction | null {
    return this.pendingAction;
  }

  public getPendingContextQuestion(): string | null {
    return this.pendingContextQuestion;
  }

  public setPendingContextQuestion(question: string | null) {
    this.pendingContextQuestion = question;
  }

  public setVoiceMuted(muted: boolean) {
    this.isVoiceMuted = muted;
  }

  public isMuted(): boolean {
    return this.isVoiceMuted;
  }

  /**
   * Proactive Stockout & Exception Voice Alert (User Request 10)
   * If Amul Taaza Milk is stocked out, Alexa+ proactively alerts the manager:
   * "Operational alert, Manager: Amul Taaza Milk has stocked out in Aisle 1. Store Agent recommends restocking 42 units based on converged Sunday peak demand. Should I approve the restock now?"
   */
  public triggerProactiveStockoutAlert() {
    const milkInv = db.getInventory().find(i => i.product_id === 'prod-taaza-milk');
    if (milkInv && milkInv.quantity === 0) {
      const speechText = "Operational alert, Manager: Amul Taaza Milk has stocked out in Aisle 1. Store Agent recommends restocking 42 units based on converged Sunday peak demand. Should I approve the restock now?";
      this.pendingContextQuestion = 'APPROVE_RESTOCK_42';
      this.pendingAction = {
        id: `act-restock-${Date.now()}`,
        type: 'APPROVE_RESTOCK',
        recommendationId: 'rec-taaza-milk',
        description: 'Restock 42 units of Amul Taaza Milk',
        promptQuestion: 'Should I approve the restock now?'
      };
      this.setConversationState('CONVERSATION_ACTIVE');
      return this.createJarvisResponse(speechText, {
        actionCard: {
          type: 'APPROVE_RESTOCK',
          title: 'URGENT RESTOCK: Amul Taaza Milk (0 units)',
          description: 'Store Agent recommends 42 units replenishment based on converged Sunday peak demand.',
          targetId: 'prod-taaza-milk',
          status: 'PENDING'
        }
      });
    }
    return null;
  }

  // =========================================================================
  // INITIALIZATION & PROACTIVE BRIEFING
  // =========================================================================

  private initDefaultBriefing() {
    if (this.hasInitializedGreeting) return;
    this.hasInitializedGreeting = true;

    const alerts = this.getPrioritizedAlerts();
    const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
    const highCount = alerts.filter(a => a.severity === 'HIGH').length;

    let greetingText = 'Good day, Manager. Alexa+ operational command interface active and synchronized with Customer, Store, and Security Agents.';
    if (criticalCount > 0 || highCount > 0) {
      greetingText += ` I have identified ${alerts.length} prioritized operational alerts requiring your attention. Say "Hey Alexa, show me the alerts" or ask for a briefing.`;
    } else {
      greetingText += ' All store systems are currently flowing within nominal parameters. Say "Hey Alexa, show me the alerts" or ask any operational query.';
    }

    this.messages.push({
      id: `msg-jarvis-init-${Date.now()}`,
      sender: 'Alexa+',
      text: greetingText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  /**
   * Continuous surveillance monitor: Triggers emergency proactive alert on Critical/High events
   */
  private monitorSecurityEvents() {
    if (typeof window === 'undefined') return;
    setInterval(() => {
      const events = db.getSecurityEvents();
      const latestCritical = events.find(e =>
        e.severity === 'critical' &&
        !this.emergencyAlertDispatched.has(e.id) &&
        e.status !== 'RESOLVED'
      );

      if (latestCritical) {
        this.emergencyAlertDispatched.add(latestCritical.id);
        this.triggerEmergencyVoiceAlert(latestCritical);
      }
    }, 4000);
  }

  /**
   * Emergency Proactive Voice Alert for Critical Events (Requirement 9)
   */
  public triggerEmergencyVoiceAlert(event: SecurityEvent) {
    const speechText = `Hey Manager, this is Alexa+. We have an emergency. A critical security event has been detected: ${event.details}. Security Agent has classified this event as Critical. Would you like me to open the surveillance view?`;

    this.pendingContextQuestion = 'VIEW_SURVEILLANCE';
    this.setConversationState('CONVERSATION_ACTIVE');

    this.pendingAction = {
      id: `act-emergency-${Date.now()}`,
      type: 'VIEW_SURVEILLANCE',
      incidentId: event.id,
      description: `Surveillance feed inspection for critical incident: ${event.details}`,
      promptQuestion: 'Would you like me to open the surveillance view?'
    };

    const jarvisMsg: JarvisMessage = {
      id: `msg-jarvis-alert-${Date.now()}`,
      sender: 'Alexa+',
      text: speechText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionCard: {
        type: 'VIEW_SURVEILLANCE',
        title: 'CRITICAL SECURITY ALERT',
        description: event.details,
        targetId: event.id,
        details: {
          severity: event.severity,
          type: event.event_type,
          location: (event.metadata?.kiosk_id as string) || 'Aisle 4',
          timestamp: new Date(event.timestamp).toLocaleTimeString()
        },
        status: 'PENDING'
      }
    };

    this.messages.push(jarvisMsg);
    this.notify();
    this.speak(speechText);
  }

  // =========================================================================
  // INTELLIGENCE SYNTHESIS & ALERT PRIORITIZATION
  // =========================================================================

  /**
   * Intelligently aggregates and prioritizes current operational alerts across:
   * 1. Security Agent (Critical & High incidents)
   * 2. Store Agent (Queue pressure / Kiosk opening recommendations)
   * 3. Store Agent (Restock approvals & stockout risks)
   * 4. Employee Operations (Unassigned verifications)
   */
  public getPrioritizedAlerts(): JarvisPrioritizedAlert[] {
    const alerts: JarvisPrioritizedAlert[] = [];

    // 1. Security Agent Alerts
    const securityEvents = db.getSecurityEvents().filter(e => e.status !== 'RESOLVED');
    for (const sec of securityEvents) {
      if (sec.severity === 'critical') {
        alerts.push({
          id: `alert-sec-${sec.id}`,
          category: 'SECURITY',
          severity: 'CRITICAL',
          title: `Critical Security Incident: ${sec.event_type}`,
          summary: sec.details,
          sourceAgent: 'Security Agent',
          actionRequired: true,
          actionType: 'VIEW_SURVEILLANCE',
          targetId: sec.id,
          rawEvent: sec
        });
      } else if (sec.severity === 'high') {
        alerts.push({
          id: `alert-sec-${sec.id}`,
          category: 'SECURITY',
          severity: 'HIGH',
          title: `High Priority Security Anomaly: ${sec.event_type}`,
          summary: sec.details,
          sourceAgent: 'Security Agent',
          actionRequired: true,
          actionType: 'VIEW_SURVEILLANCE',
          targetId: sec.id,
          rawEvent: sec
        });
      }
    }

    // 2. Store Agent Queue / Kiosk Pressure
    const queues = db.getCheckoutQueues();
    const congested = queues.filter(q => q.status === 'congested' || q.estimated_wait_mins > 5);
    const kiosk4 = queues.find(q => q.counter_number === 4);
    if (congested.length > 0 && kiosk4 && kiosk4.status === 'closed') {
      alerts.push({
        id: 'alert-queue-kiosk-4',
        category: 'QUEUE',
        severity: 'HIGH',
        title: 'Verification Kiosk Queue Pressure Exceeded',
        summary: `Verification Kiosk 2 & 3 queue dwell time has exceeded 5-minute SLA. Store Agent recommends opening Verification Kiosk 4 immediately.`,
        sourceAgent: 'Store Agent',
        actionRequired: true,
        actionType: 'OPEN_KIOSK',
        targetId: '4'
      });
    }

    // 3. Store Agent Pending Restock Recommendations
    const recs = db.getAIRecommendations().filter(r => r.status === 'pending');
    for (const rec of recs) {
      const isUrgent = rec.priority === 'urgent' || rec.type === 'stockout';
      alerts.push({
        id: `alert-rec-${rec.id}`,
        category: 'RESTOCK',
        severity: isUrgent ? 'HIGH' : 'MEDIUM',
        title: `Restocking Recommendation: ${rec.product_name || rec.title}`,
        summary: `${rec.suggested_action}. ${rec.description}`,
        sourceAgent: 'Store Agent',
        actionRequired: true,
        actionType: 'APPROVE_RESTOCK',
        targetId: rec.id,
        rawEvent: rec
      });
    }

    // Sort order: CRITICAL -> HIGH -> MEDIUM -> LOW
    const severityWeight: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1
    };

    return alerts.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
  }

  // =========================================================================
  // NATURAL LANGUAGE & INTENT INTERPRETATION
  // =========================================================================

  public async processManagerInput(inputRaw: string): Promise<JarvisMessage> {
    const input = inputRaw.trim();
    if (!input) {
      return this.createJarvisResponse('Manager, I am listening. Please state your command or ask about store alerts, Hindsight, or ROI.');
    }

    // Append manager message to transcript
    const managerMsg: JarvisMessage = {
      id: `msg-mgr-${Date.now()}`,
      sender: 'MANAGER',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.messages.push(managerMsg);
    this.notify();

    this.setVoiceState('PROCESSING');
    const lower = input.toLowerCase();

    // -----------------------------------------------------------------------
    // Flow 0A: Explicit Conversation Ending Commands
    // -----------------------------------------------------------------------
    if (
      lower === 'end' ||
      lower === 'stop' ||
      lower === 'finish' ||
      lower.includes('end conversation') ||
      lower.includes('stop conversation') ||
      lower.includes('exit conversation') ||
      lower.includes('close conversation') ||
      lower.includes('goodbye') ||
      lower.includes("that's all") ||
      lower.includes('bye alexa')
    ) {
      this.setConversationState('WAKE_WORD_MONITORING');
      this.lastDiscussedTopic = null;
      return this.createJarvisResponse("Ending conversation session. Say 'Hey Alexa' whenever you need me.");
    }

    // -----------------------------------------------------------------------
    // Flow 0B: Responses to Inactivity Continuation Prompt
    // -----------------------------------------------------------------------
    if (this.conversationState === 'AWAITING_CONTINUATION') {
      if (
        lower.includes('continue') ||
        lower.includes('keep going') ||
        lower === 'yes' ||
        lower === 'yeah' ||
        lower === 'sure' ||
        lower.includes('stay')
      ) {
        this.setConversationState('CONVERSATION_ACTIVE');
        return this.createJarvisResponse("Understood, Manager. Our conversation remains active. What would you like to check next?");
      }
      if (
        lower.includes('end') ||
        lower.includes('stop') ||
        lower.includes('finish') ||
        lower === 'no' ||
        lower.includes('close')
      ) {
        this.setConversationState('WAKE_WORD_MONITORING');
        this.lastDiscussedTopic = null;
        return this.createJarvisResponse("Ending conversation session. Say 'Hey Alexa' whenever you need me.");
      }
    }

    // Mark session as active whenever normal conversational commands are processed
    if (this.conversationState !== 'CONVERSATION_ACTIVE') {
      this.setConversationState('CONVERSATION_ACTIVE');
    }

    // -----------------------------------------------------------------------
    // Flow 0C: Pending Context & Action Confirmation Responses (VIEW_SURVEILLANCE, APPROVE_RESTOCK, OPEN_KIOSK)
    // -----------------------------------------------------------------------
    if (this.pendingAction?.type === 'VIEW_SURVEILLANCE' || this.pendingContextQuestion === 'VIEW_SURVEILLANCE') {
      const isAffirmative =
        /^(yes|yeah|yep|sure|ok|okay|please|do it|open|show|view|proceed|affirmative)/i.test(lower) ||
        lower.includes('yes') ||
        lower.includes('show') ||
        lower.includes('open') ||
        lower.includes('cctv') ||
        lower.includes('surveillance') ||
        lower.includes('camera') ||
        lower.includes('feed');

      const isNegative =
        /^(no|nope|don't|not now|later|cancel|dismiss|skip|ignore|negative)/i.test(lower) ||
        lower.includes('dismiss') ||
        lower.includes('cancel') ||
        lower.includes('ignore') ||
        lower === 'no';

      if (isAffirmative) {
        this.pendingAction = null;
        this.pendingContextQuestion = null;
        return this.handleSurveillanceCommand(input);
      } else if (isNegative) {
        this.pendingAction = null;
        this.pendingContextQuestion = null;
        return this.createJarvisResponse("Acknowledged, Manager. Keeping surveillance view closed. Standing by for your instructions.");
      }
    }

    if (this.pendingAction?.type === 'APPROVE_RESTOCK' || this.pendingContextQuestion === 'APPROVE_RESTOCK_42') {
      const isAffirmative =
        /^(yes|yeah|yep|sure|ok|okay|approve|confirm|proceed|do it|restock|order)/i.test(lower) ||
        lower.includes('approve') ||
        lower.includes('yes') ||
        lower.includes('restock');

      const isNegative =
        /^(no|nope|reject|cancel|dismiss|don't|later)/i.test(lower) ||
        lower === 'no';

      if (isAffirmative) {
        this.pendingAction = null;
        this.pendingContextQuestion = null;
        db.restockProduct('prod-taaza-milk', 42, 'Approved by Store Manager Vikram via Alexa+');
        const pendingRec = db.getAIRecommendations().find(r => r.status === 'pending' && (r.product_id === 'prod-taaza-milk' || r.id === 'rec-taaza-milk' || r.type === 'restock'));
        if (pendingRec) {
          storeAgent.approveRecommendation(pendingRec.id, 'Store Manager Vikram via Alexa+');
        }
        return this.createJarvisResponse("Restock of 42 units of Amul Taaza Milk approved and purchase order dispatched to supplier.", {
          actionCard: {
            type: 'APPROVE_RESTOCK',
            title: 'URGENT RESTOCK APPROVED',
            description: '42 units of Amul Taaza Milk replenishment dispatched',
            targetId: 'prod-taaza-milk',
            status: 'EXECUTED'
          }
        });
      } else if (isNegative) {
        this.pendingAction = null;
        this.pendingContextQuestion = null;
        return this.createJarvisResponse("Restock recommendation dismissed, Manager.");
      }
    }

    if (this.pendingAction?.type === 'OPEN_KIOSK') {
      const isAffirmative = /^(yes|yeah|sure|ok|okay|open|do it|approve|confirm)/i.test(lower);
      if (isAffirmative) {
        const act = this.pendingAction;
        this.pendingAction = null;
        this.pendingContextQuestion = null;
        return this.handleConfirmedAction(act);
      }
    }

    // -----------------------------------------------------------------------
    // Flow: Manager Spoken Authorization - Remote Kiosk 3 Activation (Section 3, 4, 5, 6)
    // "Hey Alexa+, Kiosk 2 is congested. Open Kiosk 3" / "Open Kiosk 3" / "Activate Kiosk 3"
    // -----------------------------------------------------------------------
    const isKiosk3Activation =
      (lower.includes('open') || lower.includes('activate') || lower.includes('start')) &&
      (lower.includes('kiosk 3') || lower.includes('kiosk three') || lower.includes('counter 3') || lower.includes('station 3')) ||
      (lower.includes('kiosk 2 is congested') && lower.includes('3')) ||
      (lower.includes('congested') && lower.includes('open') && lower.includes('3'));

    if (isKiosk3Activation) {
      this.pendingAction = null;
      this.pendingContextQuestion = null;

      // 1. Dispatch shared store backend command immediately
      await kioskService.activateKiosk({
        kioskId: 'KIOSK_03',
        requestedBy: 'manager',
        commandSource: 'Alexa+',
        message: 'Kiosk 3 is active. You can use it.'
      });

      // 2. Also update local Store Agent queue status if available
      try {
        storeAgent.openVerificationKiosk(3);
      } catch (e) {}

      // 3. Spoken natural response exactly as required: "Kiosk 3 is active. You can use it."
      return this.createJarvisResponse('Kiosk 3 is active. You can use it.', {
        actionCard: {
          type: 'OPEN_KIOSK',
          title: 'VERIFICATION KIOSK 3 ACTIVE',
          description: 'Remote kiosk activation command dispatched to physical Terminal 3',
          targetId: 'KIOSK_03',
          status: 'EXECUTED'
        }
      });
    }

    // Demo Reset Command for Kiosks ("Reset Kiosk 3" / "Reset kiosks")
    if (lower.includes('reset') && (lower.includes('kiosk') || lower.includes('demo') || lower.includes('terminal'))) {
      await kioskService.resetKiosks();
      return this.createJarvisResponse('Kiosk 3 has been reset to standby mode. Kiosks 1 and 2 remain active.', {
        actionCard: {
          type: 'OPEN_KIOSK',
          title: 'KIOSKS RESET TO DEMO BASELINE',
          description: 'Kiosk 3 returned to standby; Kiosks 1 and 2 active',
          status: 'EXECUTED'
        }
      });
    }

    // -----------------------------------------------------------------------
    // Flow: Direct Modify Quantity ("Modify it to 40 units")
    // -----------------------------------------------------------------------
    const modifyMatch = lower.match(/(?:modify|change|adjust)(?: it)? to (\d+)/i);
    if (modifyMatch || (lower.includes('modify') && /\d+/.test(lower))) {
      const targetQty = modifyMatch ? parseInt(modifyMatch[1], 10) : parseInt(lower.match(/\d+/)![0], 10);
      const pendingRec = db.getAIRecommendations().find(r => r.status === 'pending');
      const targetRecId = this.pendingAction?.recommendationId || pendingRec?.id;

      if (targetRecId) {
        const modRes = storeAgent.modifyRecommendation(targetRecId, { customQuantity: targetQty }, 'Store Manager via Alexa+');
        this.pendingAction = null;
        this.pendingContextQuestion = null;

        const roi = roiEngine.evaluateRecommendationROI({
          recommendationId: targetRecId,
          type: 'RESTOCK',
          suggestedQuantity: targetQty,
          unitPrice: 35,
          priority: 'high'
        });

        const respText = `Confirmed, Manager. I have modified the restock batch to ${targetQty} units and executed the replenishment action. Expected gross opportunity is ${roi.expectedBenefitFormatted}, decision cost is ${roi.decisionCostFormatted}, yielding a realized net impact of ${roi.realizedImpactFormatted}. Store Hindsight has recorded your preference calibration.`;

        return this.createJarvisResponse(respText, {
          actionCard: {
            type: 'MODIFY_RESTOCK',
            title: 'RESTOCK MODIFICATION EXECUTED',
            description: `Batch calibrated to ${targetQty} units`,
            details: { targetQty, actionId: modRes.actionId },
            status: 'EXECUTED'
          },
          roiBreakdown: {
            expectedBenefit: roi.expectedBenefitFormatted || 'â‚¹1,400',
            decisionCost: roi.decisionCostFormatted || 'â‚¹350',
            realizedImpact: roi.realizedImpactFormatted || 'â‚¹1,050',
            discrepancyNote: roi.discrepancyNote || 'Closed-loop calibrated impact'
          }
        });
      }
    }

    // -----------------------------------------------------------------------
    // Unified Dynamic Conversational Reasoning Layer (Groq LLM + Store Telemetry)
    // -----------------------------------------------------------------------
    let agentResponse: any = null;
    try {
      if (typeof window !== 'undefined') {
        const res = await fetch('/api/jarvis-manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(managerService.getAuthToken() ? { Authorization: `Bearer ${managerService.getAuthToken()}` } : {}) },
          body: JSON.stringify({
            input,
            history: this.messages.slice(-8).map(m => ({
              role: m.sender === 'MANAGER' ? 'user' : 'assistant',
              content: m.text
            })),
            pendingContextQuestion: this.pendingContextQuestion
          })
        });
        if (res.ok) {
          agentResponse = await res.json();
        }
      }
    } catch (err) {
      console.warn('[Alexa+] Network call to /api/jarvis-manager failed, using local server engine:', err);
    }

    if (!agentResponse) {
      agentResponse = await groqJarvisManagerServer.processRequest({
        input,
        history: this.messages.slice(-8).map(m => ({
          role: m.sender === 'MANAGER' ? 'user' : 'assistant',
          content: m.text
        })),
        pendingContextQuestion: this.pendingContextQuestion
      });
    }

    // Sync multi-turn confirmation context
    this.pendingContextQuestion = agentResponse.pendingContextQuestion || null;

    // Handle navigation request
    if (agentResponse.navigationEvent) {
      this.requestNavigation(agentResponse.navigationEvent);
      if (agentResponse.navigationEvent.category === 'cctv') {
        this.navigateToSurveillance(agentResponse.navigationEvent.cctvVideoId);
      }
    }

    // Execute verified backend actions
    if (agentResponse.actionCard?.type === 'OPEN_KIOSK' || agentResponse.action === 'OPEN_KIOSK_3') {
      const isTarget3 =
        agentResponse.actionCard?.targetId === 'KIOSK_03' ||
        agentResponse.action === 'OPEN_KIOSK_3' ||
        lower.includes('3') ||
        lower.includes('three');

      if (isTarget3) {
        await kioskService.activateKiosk({
          kioskId: 'KIOSK_03',
          requestedBy: 'manager',
          commandSource: 'Alexa+',
          message: 'Kiosk 3 is active. You can use it.'
        });
        try {
          storeAgent.openVerificationKiosk(3);
        } catch (e) {}
      } else {
        storeAgent.openVerificationKiosk(4);
      }
    } else if (agentResponse.actionCard?.type === 'APPROVE_RESTOCK' || agentResponse.action === 'APPROVE_RESTOCK_42') {
      db.restockProduct('prod-taaza-milk', 42, 'Approved by Store Manager Vikram via Alexa+');
      const pendingRec = db.getAIRecommendations().find(r => r.status === 'pending' && (r.product_id === 'prod-taaza-milk' || r.id === 'rec-taaza-milk' || r.type === 'restock'));
      if (pendingRec) {
        storeAgent.approveRecommendation(pendingRec.id, 'Store Manager Vikram via Alexa+');
      }
    }

    // Update conversation topic memory
    if (lower.includes('42 units') || lower.includes('why 42') || lower.includes('milk')) {
      this.lastDiscussedTopic = 'RESTOCK_42_UNITS';
    } else if (lower.includes('hindsight') || lower.includes('what changed')) {
      this.lastDiscussedTopic = 'HINDSIGHT_ADAPTATION';
    } else if (lower.includes('security') || lower.includes('cctv')) {
      this.lastDiscussedTopic = 'SECURITY';
    }

    return this.createJarvisResponse(agentResponse.message, {
      actionCard: agentResponse.actionCard,
      roiBreakdown: agentResponse.roiBreakdown,
      hindsightTrace: agentResponse.hindsightTrace
    });
  }

  // =========================================================================
  // ACTION HANDLERS & CONVERSATIONAL WORKFLOWS
  // =========================================================================

  private handleSeeAlertsCommand(): JarvisMessage {
    const alerts = this.getPrioritizedAlerts();

    if (alerts.length === 0) {
      return this.createJarvisResponse('Manager, I have scanned all systems. There are currently zero critical or high-priority alerts across Security, Store, and Employee operations. All checkout verification kiosks and inventory levels are operating within target SLAs.');
    }

    const critical = alerts.filter(a => a.severity === 'CRITICAL');
    const high = alerts.filter(a => a.severity === 'HIGH');
    const restockPending = alerts.find(a => a.category === 'RESTOCK' && a.actionRequired);
    const queuePending = alerts.find(a => a.category === 'QUEUE' && a.actionRequired);

    let speechText = `Manager, I found ${alerts.length} important alerts requiring your review.\n\n`;

    if (critical.length > 0) {
      speechText += `First, a Critical security incident was detected near ${critical[0].title}. Immediate responder verification is advised.\n\n`;
    }
    if (queuePending) {
      speechText += `Second, Store Agent recommends opening Verification Kiosk 4 due to increased checkout queue pressure.\n\n`;
    }
    if (restockPending) {
      speechText += `Third, the ${restockPending.title} requires your approval.\n\n`;
    }

    // Set first actionable pending item if available
    if (queuePending) {
      this.pendingAction = {
        id: 'act-kiosk-4',
        type: 'OPEN_KIOSK',
        kioskNumber: 4,
        description: 'Open Verification Kiosk 4 to alleviate front-end queue congestion',
        promptQuestion: 'Would you like me to open Verification Kiosk 4?'
      };
      speechText += 'Would you like me to open Verification Kiosk 4 now?';
    } else if (restockPending) {
      this.pendingAction = {
        id: `act-restock-${restockPending.targetId}`,
        type: 'APPROVE_RESTOCK',
        recommendationId: restockPending.targetId,
        description: restockPending.summary,
        promptQuestion: `Would you like me to approve ${restockPending.title}?`
      };
      speechText += `Would you like me to approve the ${restockPending.title}?`;
    }

    return this.createJarvisResponse(speechText, {
      actionCard: {
        type: queuePending ? 'OPEN_KIOSK' : 'APPROVE_RESTOCK',
        title: queuePending ? 'VERIFICATION KIOSK 4 PENDING' : (restockPending?.title || 'OPERATIONAL ACTION PENDING'),
        description: queuePending ? 'Queue threshold exceeded. Authorize kiosk activation.' : (restockPending?.summary || 'Review required'),
        status: 'PENDING'
      }
    });
  }

  private handleConfirmedAction(action: JarvisPendingAction): JarvisMessage {
    this.pendingAction = null;

    if (action.type === 'OPEN_KIOSK') {
      storeAgent.openVerificationKiosk(action.kioskNumber || 4);
      return this.createJarvisResponse(
        'Done. Verification Kiosk 4 is now active. Queue balancing dispatched and store traffic is re-routed.',
        {
          actionCard: {
            type: 'OPEN_KIOSK',
            title: 'VERIFICATION KIOSK 4 OPENED',
            description: 'Action verified and executed on backend terminal',
            status: 'EXECUTED'
          }
        }
      );
    }

    if (action.type === 'APPROVE_RESTOCK' && action.recommendationId) {
      const rec = db.getAIRecommendations().find(r => r.id === action.recommendationId);
      const res = storeAgent.approveRecommendation(action.recommendationId, 'Store Manager via Alexa+');
      const roi = roiEngine.evaluateRecommendationROI({
        recommendationId: action.recommendationId,
        type: 'RESTOCK',
        suggestedQuantity: rec?.suggested_quantity || 42,
        unitPrice: 35,
        priority: 'high'
      });

      const speech = `Done. Restocking action for ${rec?.product_name || 'inventory'} has been executed. Expected gross opportunity was ${roi.expectedBenefitFormatted}, decision cost was ${roi.decisionCostFormatted}, yielding a realized net impact of ${roi.realizedImpactFormatted}. Store Hindsight has retained this closed-loop outcome.`;

      return this.createJarvisResponse(speech, {
        actionCard: {
          type: 'APPROVE_RESTOCK',
          title: 'RESTOCK RECOMMENDATION APPROVED',
          description: `Dispatched: ${res.description}`,
          details: { actionId: res.actionId },
          status: 'EXECUTED'
        },
        roiBreakdown: {
          expectedBenefit: roi.expectedBenefitFormatted || 'â‚¹1,470',
          decisionCost: roi.decisionCostFormatted || 'â‚¹380',
          realizedImpact: roi.realizedImpactFormatted || 'â‚¹1,090',
          discrepancyNote: roi.discrepancyNote || 'Closed-loop realized outcome'
        }
      });
    }

    if (action.type === 'VIEW_SURVEILLANCE') {
      this.navigateToSurveillance(action.incidentId);
      return this.createJarvisResponse(
        'Opening CCTV surveillance view and focusing the incident camera feed.',
        {
          actionCard: {
            type: 'VIEW_SURVEILLANCE',
            title: 'SURVEILLANCE HUB ACTIVE',
            description: 'Target camera stream focused',
            status: 'EXECUTED'
          }
        }
      );
    }

    return this.createJarvisResponse('Action executed and authoritative system state updated.');
  }

  private handleSurveillanceCommand(query: string): JarvisMessage {
    const manifest = cctvManifestService.getManifest();
    const securityEvents = db.getSecurityEvents();
    const openSec = securityEvents.find(e => (e.status === 'OPEN' || !e.status) && (e.severity === 'high' || e.severity === 'critical'));

    let targetClip = manifest[0];
    let camId = 'CAM-04B';
    let camLabel = 'Camera 4 (CAM-04B)';
    let scenario = 'Product Concealment (Jacket / Clothing)';
    let time = '14:32';

    if (query.includes('electrical') || query.includes('arc') || (openSec && openSec.event_type === 'ELECTRICAL_HAZARD')) {
      targetClip = manifest.find(m => m.video_id.includes('electrical')) || manifest[2];
      camId = targetClip.camera_id;
      camLabel = targetClip.camera_label || 'Camera 1 Â· Aisle 4 Pillar';
      scenario = 'Electrical Hazard & Short Circuit';
      time = '16:42';
    } else if (query.includes('kiosk') || query.includes('mismatch') || (openSec && openSec.event_type === 'CHECKOUT_QUANTITY_MISMATCH')) {
      targetClip = manifest.find(m => m.video_id.includes('checkout_mismatch')) || manifest[1];
      camId = targetClip.camera_id;
      camLabel = targetClip.camera_label || 'Camera 5 Â· Checkout Bay 3';
      scenario = 'Checkout Discrepancy (Quantity Mismatch)';
      time = '18:15';
    } else if (query.includes('scuffle') || query.includes('fight') || (openSec && openSec.event_type === 'SAFETY_DISTURBANCE')) {
      targetClip = manifest.find(m => m.video_id.includes('confrontation') || m.video_id.includes('scuffle')) || manifest[3];
      camId = targetClip.camera_id;
      camLabel = targetClip.camera_label || 'Camera 3 Â· Aisle 3';
      scenario = targetClip.scenario_title || 'Safety Disturbance';
      time = '14:28';
    } else {
      // Default / Camera 4 Shoplifting / Concealment (Aisle 2)
      targetClip = manifest.find(m => m.video_id.includes('shoplifting')) || manifest[0];
      camId = targetClip.camera_id;
      camLabel = 'Camera 4 (CAM-04B)';
      scenario = targetClip.scenario_title || 'Product Concealment (Jacket / Clothing)';
      time = '14:32';
    }

    // Trigger contextual category navigation with targeted focus (Section 4 Requirement)
    this.requestNavigation({
      category: 'cctv',
      cctvVideoId: targetClip.video_id,
      cctvCameraId: camId,
      securityEventId: openSec?.id,
      timestamp: time,
      focusNote: `${camLabel} Â· High Severity ${scenario} detected at ${time}`
    });

    this.navigateToSurveillance(targetClip.video_id);

    const speech = `Opening CCTV surveillance hub and focusing ${camLabel}. Displaying high-severity ${scenario.toLowerCase()} detected at ${time} with temporal evidence timeline.`;

    return this.createJarvisResponse(
      speech,
      {
        actionCard: {
          type: 'VIEW_SURVEILLANCE',
          title: `CCTV FEED: ${camLabel}`,
          description: scenario,
          details: {
            camera: camId,
            timestamp: time,
            severity: targetClip.severity,
            sourceFile: targetClip.file_name,
            evidence: targetClip.evidence_frame_url
          },
          status: 'EXECUTED'
        }
      }
    );
  }

  private handleRestockConvergenceExplanation(): JarvisMessage {
    const step = storeAgent.getRestockConvergenceStep();
    const convergenceTrace = hindsightEngine.getTraceById('STORE_RESTOCK_CONVERGENCE');

    const speech = `Synthetic demonstration only â€” these seeded scenario values are not verified Hindsight Cloud memories or live store measurements. Manager, the demo trace illustrates convergence to 42 units across Sunday evening rush iterations:

1. Baseline: 30 units stocked out in 42 minutes with 18 unmet requests (~â‚¹1,450 lost sales).
2. Iteration 1: +8 units delta (38 units) pushed availability to 7:15 PM, but still experienced 4 unmet requests.
3. Iteration 2: +6 surge buffer (44 units) prevented stockout completely, but resulted in 3 excess units on Monday morning.
4. Optimum Convergence: Store Hindsight synthesized stockout loss vs residual holding cost, converging the equilibrium policy to exactly 42 units with zero stockouts and zero waste.`;

    return this.createJarvisResponse(speech, {
      hindsightTrace: {
        title: 'Sunday Evening Restock Policy Convergence (30 â†’ 38 â†’ 44 â†’ 42 Units)',
        domain: 'SYNTHETIC STORE DEMO',
        lesson: 'Equilibrium reached: 42 units balance peak footfall demand with zero spoilage.',
        convergenceStep: step,
        convergenceHistory: [
          'Week 1: 30 units (Baseline -> Depleted in 42m, 18 unmet requests)',
          'Week 2: 38 units (+26% -> 4 unmet requests at 7:15 PM)',
          'Week 3: 44 units (+46% -> 3 excess units overstock)',
          'Week 4: 42 units (Converged Optimum Equilibrium: 0 stockouts, 0 waste)'
        ]
      }
    });
  }

  private handleHindsightAdaptationSummary(): JarvisMessage {
    const traces = hindsightEngine.getAllTraces();
    const custPref = traces.find(t => t.id === 'CUST_PREF_SOURDOUGH');
    const storeConv = traces.find(t => t.id === 'STORE_RESTOCK_CONVERGENCE');
    const secFalse = traces.find(t => t.id === 'SEC_FALSE_POSITIVE_SHELF');

    const speech = `Synthetic demonstration summary â€” the following seeded examples are not verified Hindsight Cloud memories and do not prove production learning:

1. Customer Agent: Learned customer explicit choice for Artisanal Sourdough over Whole Wheat. Sourdough is dynamically elevated to #1 recommendation. Negative preference learning also suppresses rejected Avocado Oil.
2. Store Agent: Learned Sunday peak rush velocity, converging replenishment from baseline 30 units to 42 units (0 stockouts, 0 waste).
3. Security Agent: Learned that isolated shelf lingering without concealment is 80% benign label reading. Contextual risk was reduced from 0.72 to 0.18 to prevent employee alert fatigue.`;

    return this.createJarvisResponse(speech, {
      hindsightTrace: {
        title: 'Cross-Domain Hindsight Adaptation Summary',
        domain: 'SYNTHETIC CROSS-DOMAIN DEMOS',
        lesson: 'Experience â†’ Outcome â†’ Hindsight Gated â†’ Changed Future Decision across Customer, Store & Security.'
      }
    });
  }

  private handleRoiAndOutcomeExplanation(priorTopic?: string | null): JarvisMessage {
    const roiSummary = roiEngine.getStoreBusinessImpactSummary();
    const milkRoi = roiEngine.evaluateRecommendationROI({
      recommendationId: 'rec-taaza-milk',
      type: 'RESTOCK',
      suggestedQuantity: 42,
      unitPrice: 35,
      priority: 'high'
    });

    let speechPrefix = 'Manager, here is the closed-loop financial ROI analysis where Expected â‰  Realized:';
    if (priorTopic === 'RESTOCK_42_UNITS' || this.lastDiscussedTopic === 'RESTOCK_42_UNITS') {
      speechPrefix = `Manager, following up on our 42-unit replenishment decision: That decision performed with a realized net impact of ${milkRoi.realizedImpactFormatted || 'â‚¹1,090'} (Expected Gross Opportunity was ${milkRoi.expectedBenefitFormatted || 'â‚¹1,470'}, minus ${milkRoi.decisionCostFormatted || 'â‚¹380'} procurement & labor costs). Zero stockouts were recorded, saving an estimated â‚¹1,450 in lost revenue compared to baseline.`;
    }

    const speech = `${speechPrefix}
 
For the Amul Taaza Milk replenishment:
- Expected Gross Opportunity: ${milkRoi.expectedBenefitFormatted || 'â‚¹1,470'} (42 units at â‚¹35)
- Decision & Handling Cost: ${milkRoi.decisionCostFormatted || 'â‚¹380'}
- Realized Net Impact: ${milkRoi.realizedImpactFormatted || 'â‚¹1,090'} (Net financial return achieved)
 
Store-wide today, automated interventions have preserved ${roiSummary.totalSalesOpportunityPreserved.formattedValue} in sales and prevented ${roiSummary.totalWastageReduced.formattedValue} in waste, achieving a realized net business impact of ${roiSummary.netBusinessImpact.formattedValue}.`;
 
    return this.createJarvisResponse(speech, {
      roiBreakdown: {
        expectedBenefit: milkRoi.expectedBenefitFormatted || 'â‚¹1,470',
        decisionCost: milkRoi.decisionCostFormatted || 'â‚¹380',
        realizedImpact: milkRoi.realizedImpactFormatted || 'â‚¹1,090',
        discrepancyNote: milkRoi.discrepancyNote || 'Equilibrium stockout avoidance achieved'
      }
    });
  }

  private handleSecurityHindsightExplanation(): JarvisMessage {
    const secTrace = hindsightEngine.getTraceById('SEC_FALSE_POSITIVE_SHELF');

    const speech = `Synthetic security demo only â€” these rates and examples are not verified Hindsight Cloud memories or live security measurements. The seeded scenario describes isolated shelf lingering as low risk (0.18 vs baseline 0.72), but current alerts must be judged from current evidence. 

Historical evidence revealed shoppers were elderly or allergen-conscious consumers comparing ingredient labels. The alert was suppressed to normal monitoring to avoid customer embarrassment and responder alert fatigue.`;

    return this.createJarvisResponse(speech, {
      hindsightTrace: {
        title: secTrace?.title || 'Security Hindsight: Benign Comparison Shopping',
        domain: 'SYNTHETIC SECURITY DEMO',
        lesson: 'Standalone linger is overwhelmingly benign comparison shopping. Multi-signal evidence required before dispatch.'
      }
    });
  }

  private handleSecurityIssuesSummary(): JarvisMessage {
    const securityEvents = db.getSecurityEvents();
    const openEvents = securityEvents.filter(e => e.status !== 'RESOLVED');

    if (openEvents.length === 0) {
      return this.createJarvisResponse(
        'Manager, there are currently zero unresolved security incidents. All 5 surveillance cameras are online and the checkout verification gate reports optimal loss prevention integrity.'
      );
    }

    const highOrCritical = openEvents.filter(e => e.severity === 'high' || e.severity === 'critical');
    let speech = '';

    if (highOrCritical.length > 0) {
      const top = highOrCritical[0];
      speech = `Manager, a high-priority security event was detected at Camera 4: ${top.details}. You can say "Show me the CCTV footage" to inspect Camera 4 in real-time.`;
    } else {
      speech = `Manager, there are ${openEvents.length} security events logged in the sentinel ledger. No critical incidents require immediate physical intervention.`;
    }

    return this.createJarvisResponse(speech, {
      actionCard: {
        type: 'VIEW_SURVEILLANCE',
        title: 'SECURITY INCIDENT ACTIVE',
        description: highOrCritical[0]?.details || 'Review surveillance footage',
        status: 'PENDING'
      }
    });
  }

  private handleDailyOverviewCommand(): JarvisMessage {
    const overview = storeAgentTools.getStoreOverview();
    const queues = db.getCheckoutQueues();
    const security = db.getSecurityEvents();
    const roiSummary = roiEngine.getStoreBusinessImpactSummary();
    const recs = db.getAIRecommendations();

    const congestedQueues = queues.filter(q => q.status === 'congested' || q.estimated_wait_mins > 3.0);
    const openSecurity = security.filter(e => (e.status === 'OPEN' || !e.status) && (e.severity === 'high' || e.severity === 'critical'));
    const pendingRecs = recs.filter(r => r.status === 'pending');

    const issues: string[] = [];

    // 1. Kiosk Queue Check
    if (congestedQueues.length > 0) {
      const names = congestedQueues.map(q => q.kiosk_name || `Kiosk ${q.counter_number}`).join(', ');
      issues.push(`Kiosk verification wait time increased across ${names}.`);
    } else {
      const avgWait = queues.reduce((sum, q) => sum + q.estimated_wait_mins, 0) / (queues.length || 1);
      if (avgWait > 2.0) {
        issues.push('Kiosk verification wait time increased across Kiosks 1â€“3.');
      }
    }

    // 2. High Priority Security Check
    if (openSecurity.length > 0) {
      issues.push('A high-priority security event was detected at Camera 4.');
    }

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    let speech = '';
    if (issues.length > 0) {
      speech = `${greeting}, Manager. ${issues.length === 1 ? 'One item needs' : `${issues.length} things need`} your attention:\n\n` +
        issues.map(iss => `${iss}`).join('\n\n') +
        `\n\nNo other critical issues require your attention.`;
    } else {
      speech = `${greeting}, Manager. All systems are operating smoothly. Verification kiosks are flowing within target SLA, zero critical security incidents recorded, and today's net ROI stands at ${roiSummary.netBusinessImpact.formattedValue}. No critical issues require your attention.`;
    }

    return this.createJarvisResponse(speech);
  }

  private handleGeneralQuery(input: string): JarvisMessage {
    const overview = storeAgentTools.getStoreOverview();
    return this.createJarvisResponse(
      `Manager, I have queried our authoritative store telemetry, Hindsight memory banks, and ROI calculations. All systems are operational. Store status is currently ${overview.storeStatus}. Ask me to "Show alerts", "Explain why 42 units", or "Show surveillance" for deep operational control.`
    );
  }

  // =========================================================================
  // RESPONSE CREATION & SPEECH SYNTHESIS
  // =========================================================================

  private createJarvisResponse(
    text: string,
    extra?: Partial<JarvisMessage>
  ): JarvisMessage {
    const msg: JarvisMessage = {
      id: `msg-jarvis-${Date.now()}`,
      sender: 'Alexa+',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...extra
    };

    this.messages.push(msg);
    this.notify();
    this.speak(text);
    return msg;
  }

  public speak(text: string) {
    if (this.isVoiceMuted || typeof window === 'undefined' || !window.speechSynthesis) {
      if (this.conversationState === 'CONVERSATION_ACTIVE') {
        this.setVoiceState('LISTENING');
      } else {
        this.setVoiceState('IDLE');
      }
      return;
    }

    try {
      window.speechSynthesis.cancel();
      echoGuard.onSpeechEnd();
      // Strip markdown asterisks or bullet formatting for natural speech
      const cleanText = text
        .replace(/[*#_`]/g, '')
        .replace(/\n\n+/g, '. ')
        .replace(/\n+/g, ' ');

      const uttId = echoGuard.onSpeechStart(cleanText);

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 0.98;

      // Select preferred English voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('Guy')));
      if (preferred) utterance.voice = preferred;

      this.setVoiceState('SPEAKING');

      utterance.onend = () => {
        echoGuard.onSpeechEnd(uttId);
        setTimeout(() => {
          if (this.conversationState === 'CONVERSATION_ACTIVE') {
            this.setVoiceState('LISTENING');
          } else {
            this.setVoiceState('IDLE');
          }
        }, 80);
      };
      utterance.onerror = () => {
        echoGuard.onSpeechEnd(uttId);
        setTimeout(() => {
          if (this.conversationState === 'CONVERSATION_ACTIVE') {
            this.setVoiceState('LISTENING');
          } else {
            this.setVoiceState('IDLE');
          }
        }, 60);
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[Alexa+] Speech synthesis error:', e);
      echoGuard.onSpeechEnd();
      if (this.conversationState === 'CONVERSATION_ACTIVE') {
        this.setVoiceState('LISTENING');
      } else {
        this.setVoiceState('IDLE');
      }
    }
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      echoGuard.onSpeechEnd();
      if (this.conversationState === 'CONVERSATION_ACTIVE') {
        this.setVoiceState('LISTENING');
      } else {
        this.setVoiceState('IDLE');
      }
    }
  }

  private navigateToSurveillance(videoIdOrIncidentId?: string) {
    if (typeof document === 'undefined') return;
    const targetElement = document.getElementById('cctv-surveillance-hub');
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElement.classList.add('ring-2', 'ring-cyan-400', 'ring-offset-4', 'ring-offset-slate-950');
      setTimeout(() => {
        targetElement.classList.remove('ring-2', 'ring-cyan-400', 'ring-offset-4', 'ring-offset-slate-950');
      }, 4500);
    }
  }
}

export const jarvisManagerService = new JarvisManagerService();


