import { db } from './db.js';
import { backendAuthority } from '../server/backendAuthority.js';
import { memoryService } from './nativeMemoryService.js';
import { getRelevantContext, storeMemory } from '../server/memoryEngine.js';
import {
  SecurityEvent,
  SecurityEventType,
  PhysicalBasketItem,
  PhysicalCheckoutObservation,
  CheckoutComparisonItem,
  CheckoutVerificationResult
} from '../types/index.js';
import { emailProvider, SecurityAlertEmailContext, SendEmailResult } from '../server/email/emailProvider.js';

export function getDefaultTriggeringRule(eventType: SecurityEventType | string): string {
  switch (eventType) {
    case 'CHECKOUT_QUANTITY_MISMATCH':
      return 'DETERMINISTIC_3_SOURCE_COMPARISON';
    case 'CART_TAMPER_DETECTED':
      return 'CATALOG_PRICE_INTEGRITY_CHECK';
    case 'QUANTITY_TAMPER_DETECTED':
      return 'NON_NEGATIVE_INTEGER_INVENTORY_CHECK';
    case 'INVALID_CUSTOMER_QR':
    case 'EXPIRED_CUSTOMER_QR':
    case 'REVOKED_CUSTOMER_QR':
      return 'CUSTOMER_IDENTITY_QR_AUTHENTICITY_GATE';
    case 'CROSS_CUSTOMER_HIJACK_ATTEMPT':
    case 'SESSION_HIJACK_ATTEMPT':
      return 'CROSS_CUSTOMER_SESSION_ISOLATION_GATE';
    case 'INVALID_SESSION_QR':
      return 'SESSION_HANDOFF_TOKEN_INTEGRITY_CHECK';
    case 'CONCURRENT_PURCHASE_CONTENTION':
      return 'MUTEX_LOCK_INVENTORY_CONTENTION';
    case 'MANAGER_AUTH_FAILURE':
      return 'ROLE_BASED_ACCESS_CONTROL_TOKEN_VALIDATION';
    case 'RATE_LIMIT_EXCEEDED':
      return 'TOKEN_BUCKET_RATE_LIMITER';
    case 'AMBIGUOUS_ANOMALY_ESCALATED':
      return 'BEHAVIORAL_ANOMALY_ESCALATION_GATE';
    case 'PAYMENT_FAILURE':
      return 'GATEWAY_AUTHORITATIVE_STATUS_GATE';
    case 'POSSIBLE_PRODUCT_CONCEALMENT':
      return 'TEMPORAL_CONCEALMENT_SEQUENCE_DETECTOR';
    case 'REPEATED_PRODUCT_CONCEALMENT':
      return 'MULTI_EVENT_CONCEALMENT_TRAJECTORY_RULE';
    case 'ELECTRICAL_HAZARD':
      return 'ELECTRICAL_ARC_THERMAL_DETECTION_RULE';
    case 'POWER_OUTAGE':
      return 'FACILITY_POWER_GRID_PERSISTENCE_RULE';
    case 'LONG_DURATION_POWER_OUTAGE':
      return 'CRITICAL_INFRASTRUCTURE_FAILURE_THRESHOLD';
    case 'SAFETY_DISTURBANCE':
      return 'PROXIMITY_ALTERCATION_KINEMATICS_RULE';
    case 'AGGRESSIVE_INCIDENT':
      return 'VIOLENT_CONFRONTATION_SECURITY_GATE';
    case 'HIGH_AISLE_TRAFFIC':
      return 'FOOT_TRAFFIC_CONGESTION_SENSOR';
    case 'UNUSUAL_REPEATED_SHELF_ACTIVITY':
      return 'TEMPORAL_SHELF_REVISIT_FREQUENCY_RULE';
    case 'NORMAL_SHOPPING_ACTIVITY':
      return 'BENIGN_BEHAVIORAL_BASELINE_VERIFIER';
    default:
      return 'DETERMINISTIC_SECURITY_GATE';
  }
}

export function getDefaultRecommendedAction(eventType: SecurityEventType | string, severity: string): string {
  switch (eventType) {
    case 'CHECKOUT_QUANTITY_MISMATCH':
      return 'Assist customer with cart alignment or offer basket adjustment.';
    case 'POSSIBLE_PRODUCT_CONCEALMENT':
    case 'REPEATED_PRODUCT_CONCEALMENT':
      return 'Review CCTV evidence sequence and verify checkout and cart state before exit.';
    case 'ELECTRICAL_HAZARD':
      return 'Isolate affected aisle, halt customer traffic, dispatch certified technician, and notify store operations.';
    case 'POWER_OUTAGE':
    case 'LONG_DURATION_POWER_OUTAGE':
      return 'Activate emergency backup power, safeguard refrigerated sections, and manage customer exit safety.';
    case 'SAFETY_DISTURBANCE':
    case 'AGGRESSIVE_INCIDENT':
      return 'Security staff intervention required; defuse altercation and ensure customer safety.';
    case 'UNUSUAL_REPEATED_SHELF_ACTIVITY':
      return 'Discreet floor monitoring recommended. Verify if customer requires assistance finding items.';
    case 'HIGH_AISLE_TRAFFIC':
      return 'Open secondary checkout lane and dispatch staff to assist aisle flow.';
    case 'NORMAL_SHOPPING_ACTIVITY':
      return 'No intervention required; shopping flow within standard baseline.';
    case 'CART_TAMPER_DETECTED':
      return 'Inspect kiosk terminal and verify catalog pricing integrity against authoritative database.';
    case 'QUANTITY_TAMPER_DETECTED':
      return 'Verify item barcode and physical quantity in basket before releasing checkout lock.';
    case 'INVALID_CUSTOMER_QR':
    case 'EXPIRED_CUSTOMER_QR':
      return 'Guide customer to regenerate identity pass or authenticate via OTP.';
    case 'CROSS_CUSTOMER_HIJACK_ATTEMPT':
    case 'SESSION_HIJACK_ATTEMPT':
      return 'Check kiosk terminal for unreleased prior customer session; offer fresh shopping pass.';
    case 'MANAGER_AUTH_FAILURE':
      return 'Review administrative terminal access logs and verify authorized manager credentials.';
    case 'AMBIGUOUS_ANOMALY_ESCALATED':
      return 'Discreet floor support recommended. Customer-facing message: "An inconsistency was detected. Please verify your cart."';
    default:
      return severity === 'critical'
        ? 'Immediate manager review required. Inspect station logs and verify physical cart.'
        : 'Review alert details and assist customer with courteous verification.';
  }
}

export interface SecurityStatusSummary {
  status: 'OPTIMAL' | 'ELEVATED' | 'CRITICAL';
  totalEvents: number;
  highSeverityCount: number;
  recentIncidents: SecurityEvent[];
  lastScanTimestamp: string;
}

export interface AmbiguousAnomalyContext {
  customerId?: string;
  sessionId?: string;
  events?: Array<{
    type: string;
    details?: string;
    timestamp?: number;
  }>;
  behaviorContext?: string;
  isDeterministicSingleViolation?: boolean;
}

export interface SecurityAnalysisResult {
  requiresAI: boolean;
  classification: 'BENIGN_BEHAVIOR' | 'AMBIGUOUS_ANOMALY' | 'DETERMINISTIC_HANDLED';
  benignLikelihood: number; // 0 - 100
  suspicionScore: number; // 0 - 100
  escalated: boolean;
  recommendation: string;
  explanation: string;
  historicalPatternsRecalled: string[];
}

export interface SecurityMetrics {
  preventedUnauthorizedAccess: number;
  blockedCartTampering: number;
  preventedDuplicateTransactions: number;
  preventedDuplicateInventoryDeductions: number;
  falsePositivesResolved: number;
  confirmedIncidents: number;
  ambiguousAnomaliesEscalated: number;
  estimatedAvoidedLoss: number;
}

class SecurityAgent {
  private productPurchaseLocks = new Map<string, string>(); // productId -> customerId holding lock
  private orderDeductionHistory = new Set<string>(); // `${orderId}_${productId}`
  private processedSecurityEventIds = new Set<string>();
  private dispatchedEmailEventIds = new Set<string>();
  private lastProcessedSecurityEventTime = 0;

  /**
   * Validates Customer Identity QR Token authenticity.
   * Deterministic logic is the sole authority; Security Hindsight provides audit context.
   */
  public validateCustomerIdentityQR(token: string): { valid: boolean; error?: string } {
    const res = backendAuthority.validateCustomerIdentityQR(token);
    if (!res.valid) {
      const errLower = (res.error || '').toLowerCase();
      let eventType: SecurityEventType = 'INVALID_CUSTOMER_QR';
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'high';

      if (errLower.includes('expired')) {
        eventType = 'EXPIRED_CUSTOMER_QR';
        severity = 'low';
      } else if (errLower.includes('revoked')) {
        eventType = 'REVOKED_CUSTOMER_QR';
        severity = 'medium';
      }

      this.logEvent(
        eventType,
        severity,
        `Security Agent flagged ${eventType.replace(/_/g, ' ')}: ${token.substring(0, 16)}...`,
        { tokenPrefix: token.substring(0, 10), error: res.error }
      );

      // Retain security experience pattern
      memoryService.retainSecurityExperience({
        incidentType: 'QR_ANOMALY',
        pattern: `${eventType} scan with prefix ${token.substring(0, 8)}`,
        investigationDetails: res.error || 'Token lookup in secure repository failed or token expired/revoked.',
        resolution: 'Rejected entry at Kiosk; prompted user to verify with WhatsApp OTP.',
        outcomeTakeaway: 'Prevented unauthenticated profile attachment; customer successfully recovered via OTP.'
      });

      return { valid: false, error: res.error };
    }
    return { valid: true };
  }

  /**
   * Validates Customer Identity Token does not belong to another customer.
   * Enforces cross-customer separation (SEC-05).
   */
  public validateCrossCustomerIdentity(token: string, attemptingCustomerId: string): { valid: boolean; error?: string } {
    const res = backendAuthority.validateCustomerIdentityQR(token);
    if (!res.valid) {
      return { valid: false, error: res.error };
    }

    if (res.customer && res.customer.customer_id !== attemptingCustomerId) {
      this.logEvent(
        'CROSS_CUSTOMER_HIJACK_ATTEMPT',
        'critical',
        `Cross-customer identity mismatch: Token owner is ${res.customer.customer_id}, but presented by ${attemptingCustomerId}`,
        { tokenOwner: res.customer.customer_id, attemptingCustomerId },
        undefined,
        attemptingCustomerId
      );

      memoryService.retainSecurityExperience({
        incidentType: 'QR_ANOMALY',
        pattern: `Cross-customer identity token presentation: Token of ${res.customer.customer_id} used by ${attemptingCustomerId}`,
        investigationDetails: 'Customer identity verification identified attempted profile cross-linking.',
        resolution: 'Rejected authentication; requested primary customer identity verification.',
        outcomeTakeaway: 'Strict customer-token binding prevented identity cross-contamination.'
      });

      return { valid: false, error: 'Unauthorized: Identity token belongs to a different customer.' };
    }

    return { valid: true };
  }

  /**
   * Validates Session QR Handoff integrity and prevents cross-customer hijacking.
   */
  public validateSessionHandoff(token: string, targetSessionId?: string, customerId?: string): { valid: boolean; error?: string } {
    const res = backendAuthority.validateAndConsumeSessionHandoff(token, targetSessionId, customerId);
    if (!res.valid) {
      const isHijack = res.error?.includes('another customer') || res.error?.includes('different customer');
      this.logEvent(
        (isHijack ? 'CROSS_CUSTOMER_HIJACK_ATTEMPT' : 'INVALID_SESSION_QR') as SecurityEventType,
        isHijack ? 'critical' : 'high',
        `Security Agent rejected Session QR handoff: ${res.error || 'Invalid token'}`,
        { tokenPrefix: token.substring(0, 10), error: res.error },
        targetSessionId,
        customerId
      );

      if (isHijack) {
        memoryService.retainSecurityExperience({
          incidentType: 'SESSION_ANOMALY',
          pattern: `Cross-customer session takeover attempt (target: ${targetSessionId})`,
          investigationDetails: 'Customer identity on mobile companion differed from original kiosk session creator.',
          resolution: 'Blocked attachment immediately; maintained separate sessions.',
          outcomeTakeaway: 'Strict customer-session binding prevented cart tampering and mission hijacking.'
        });
      }
      return { valid: false, error: res.error };
    }
    return { valid: true };
  }

  /**
   * Validates Cart Integrity:
   * Checks that client-side item prices and calculations match authoritative catalog product prices.
   */
  public validateCartIntegrity(sessionIdOrCustomerId: string, reportedSubtotal?: number): {
    valid: boolean;
    authoritativeSubtotal: number;
    difference: number;
    tamperDetected: boolean;
  } {
    const authTotal = db.calculateAuthoritativeCartTotal(sessionIdOrCustomerId);
    const authSub = authTotal.subtotal;
    
    if (reportedSubtotal !== undefined && reportedSubtotal !== authSub) {
      const diff = Math.abs(reportedSubtotal - authSub);
      this.logEvent(
        'CART_TAMPER_DETECTED',
        'critical',
        `Cart integrity violation: Reported â‚¹${reportedSubtotal} differs from authoritative â‚¹${authSub} (diff â‚¹${diff})`,
        { reportedSubtotal, authoritativeSubtotal: authSub, difference: diff },
        sessionIdOrCustomerId.startsWith('SESS') ? sessionIdOrCustomerId : undefined,
        !sessionIdOrCustomerId.startsWith('SESS') ? sessionIdOrCustomerId : undefined
      );

      memoryService.retainSecurityExperience({
        incidentType: 'TRANSACTION_ANOMALY',
        pattern: `Client-side subtotal manipulation (attempted â‚¹${reportedSubtotal} vs authoritative â‚¹${authSub})`,
        investigationDetails: `Discrepancy of â‚¹${diff} detected during price calculation stage.`,
        resolution: 'Enforced catalog prices authoritatively; discarded client-supplied pricing.',
        outcomeTakeaway: 'Catalog source-of-truth prevented revenue leakage.'
      });

      return {
        valid: false,
        authoritativeSubtotal: authSub,
        difference: diff,
        tamperDetected: true
      };
    }

    return {
      valid: true,
      authoritativeSubtotal: authSub,
      difference: 0,
      tamperDetected: false
    };
  }

  /**
   * Validates item quantity integrity (SEC-10).
   * Ensures non-negative, non-zero, integer quantity within available stock.
   */
  public validateQuantityIntegrity(productId: string, requestedQuantity: number): { valid: boolean; error?: string } {
    if (typeof requestedQuantity !== 'number' || isNaN(requestedQuantity) || requestedQuantity <= 0 || !Number.isInteger(requestedQuantity)) {
      this.logEvent(
        'QUANTITY_TAMPER_DETECTED',
        'high',
        `Quantity tampering detected for product ${productId}: Invalid quantity ${requestedQuantity}`,
        { productId, requestedQuantity }
      );
      return { valid: false, error: 'Invalid quantity: Must be a positive integer.' };
    }

    const inv = db.getInventoryByProductId(productId);
    if (inv && requestedQuantity > inv.quantity) {
      return {
        valid: false,
        error: `Insufficient stock for product ${productId}. Requested: ${requestedQuantity}, Available: ${inv.quantity}`
      };
    }

    return { valid: true };
  }

  /**
   * Validates cart access rights (SEC-11).
   * Verifies session exists, is active, and matches authenticated customerId.
   */
  public validateCartAccess(sessionId: string, customerId: string): { valid: boolean; error?: string } {
    const session = db.getShoppingSession(sessionId) || backendAuthority.getShoppingSession(sessionId);
    if (!session) {
      this.logEvent(
        'UNAUTHORIZED_ACCESS',
        'high',
        `Unauthorized cart access: Session ${sessionId} does not exist`,
        { sessionId, customerId }
      );
      return { valid: false, error: 'Shopping session not found.' };
    }

    if (session.status !== 'active') {
      return { valid: false, error: `Shopping session is ${session.status}.` };
    }

    if (session.customer_id !== customerId) {
      this.logEvent(
        'SESSION_HIJACK_ATTEMPT',
        'critical',
        `Cart access rejected: Session ${sessionId} belongs to ${session.customer_id}, not ${customerId}`,
        { sessionId, sessionOwner: session.customer_id, attemptingCustomerId: customerId },
        sessionId,
        customerId
      );
      return { valid: false, error: 'Unauthorized: Session belongs to another customer.' };
    }

    return { valid: true };
  }

  /**
   * Concurrency lock and stock contention verification for final units (SEC-12).
   */
  public async validateConcurrentPurchase(
    productId: string,
    requestedQuantity: number,
    customerId: string
  ): Promise<{ success: boolean; acquiredLock: boolean; error?: string }> {
    const inv = db.getInventoryByProductId(productId);
    const available = inv ? inv.quantity : 0;

    if (available < requestedQuantity) {
      this.logEvent(
        'CONCURRENT_PURCHASE_CONTENTION',
        'medium',
        `Contention for product ${productId}: Customer ${customerId} requested ${requestedQuantity} but only ${available} available`,
        { productId, customerId, requestedQuantity, available }
      );
      return {
        success: false,
        acquiredLock: false,
        error: `Stock depleted. Only ${available} unit(s) available.`
      };
    }

    // Mutex lock for final available units (<= 2 units)
    if (available <= 2) {
      const existingHolder = this.productPurchaseLocks.get(productId);
      if (existingHolder && existingHolder !== customerId) {
        this.logEvent(
          'CONCURRENT_PURCHASE_CONTENTION',
          'high',
          `Concurrent lock contention on final unit of ${productId}: Held by ${existingHolder}, requested by ${customerId}`,
          { productId, existingHolder, customerId }
        );
        return {
          success: false,
          acquiredLock: false,
          error: 'Item currently locked by another checkout transaction. Please try again in a moment.'
        };
      }
      this.productPurchaseLocks.set(productId, customerId);
    }

    return { success: true, acquiredLock: true };
  }

  public releaseProductPurchaseLock(productId: string, customerId: string) {
    if (this.productPurchaseLocks.get(productId) === customerId) {
      this.productPurchaseLocks.delete(productId);
    }
  }

  /**
   * Sets or updates physical checkout basket observation from computer vision camera.
   */
  public setPhysicalCheckoutObservation(sessionId: string, items: PhysicalBasketItem[]): PhysicalCheckoutObservation {
    return backendAuthority.setPhysicalCheckoutObservation(sessionId, items);
  }

  public getPhysicalCheckoutObservation(sessionId: string): PhysicalCheckoutObservation | undefined {
    return backendAuthority.getPhysicalCheckoutObservation(sessionId);
  }

  public resetPhysicalCheckoutObservation(sessionId: string): void {
    backendAuthority.resetPhysicalCheckoutObservation(sessionId);
  }

  /**
   * Executes 3-Source Physical Checkout Verification:
   * 1. Digital Cart (Customer declaration)
   * 2. Physical Observation (Camera / CV sensor count)
   * 3. Authoritative Inventory (Store state & expected movement)
   * 
   * Retrieves native Security Agent memory as contextual evidence.
   */
  public async verifyPhysicalCheckout(sessionId: string, customerId?: string): Promise<CheckoutVerificationResult> {
    const result = backendAuthority.verifyPhysicalCheckout(sessionId, customerId);

    // If a discrepancy is detected, enrich it with recalled security memory.
    if (result.hasDiscrepancy) {
      try {
        const query = `quantity mismatch checkout correction ${result.comparison.map(c => c.product_name).join(' ')}`;
        const memories = await memoryService.recallSecurityMemories(query);
        result.recalledSecurityHindsight = (memories.results || []).map(m => {
          const lines = m.text.split('\n');
          return {
            pattern: lines.find(l => l.startsWith('Pattern:'))?.replace('Pattern:', '').trim() || lines[0] || '',
            resolution: lines.find(l => l.startsWith('Resolution:'))?.replace('Resolution:', '').trim() || '',
            takeaway: lines.find(l => l.startsWith('Outcome:'))?.replace('Outcome:', '').trim() || m.text
          };
        });
        if (memories.success && memories.results?.length) {
          const reflection = await memoryService.reflect(
            memoryService.getSecurityBank(),
            query,
            { context: `Current checkout comparison: ${JSON.stringify(result.comparison)}. Recalled evidence: ${memories.results.map(m => m.text).join(' | ')}. Treat the result as contextual inference only; use current checkout records as authority.` }
          );
          if (reflection.success) {
            result.recalledSecurityHindsight.push({
              pattern: 'Native memory reflection (inference)',
              resolution: '',
              takeaway: reflection.answer
            });
          }
        }
      } catch (err) {
        console.warn('[SecurityAgent] Native security memory recall failed gracefully:', err);
      }
    }

    return result;
  }

  /**
   * Resolves a checkout discrepancy via customer cart correction or physical basket adjustment.
   * Retains the meaningful resolution experience into Security Hindsight (Learning Loop).
   */
  public async resolveCheckoutDiscrepancy(params: {
    sessionId: string;
    resolutionType: 'CORRECTED_CART' | 'RETURNED_ITEM' | 'STAFF_VERIFIED';
    resolutionNote: string;
    updatedItems?: Array<{ product_id: string; quantity: number }>;
  }): Promise<{ success: boolean; verification: CheckoutVerificationResult; memoryRetained: boolean }> {
    const outcome = await backendAuthority.resolveCheckoutDiscrepancy(params);

    const memory = outcome.success
      ? await memoryService.retainSecurityExperience({
          incidentType: 'TRANSACTION_ANOMALY',
          pattern: 'Physical checkout quantity discrepancy',
          investigationDetails: 'The digital cart and physical basket differed; the customer or staff completed the selected correction.',
          resolution: `Resolved via ${params.resolutionType}: ${params.resolutionNote}`,
          outcomeTakeaway: 'Authoritative re-verification passed after the recorded correction.'
        })
      : { success: false };

    return { ...outcome, memoryRetained: memory.success };
  }

  /**
   * Validates Payment Transaction prior to execution.
   */
  public validatePaymentTransaction(
    sessionIdOrCustomerId: string,
    amount: number,
    paymentMethod: string
  ): { allowed: boolean; reason?: string } {
    const cartItems = db.getCart(sessionIdOrCustomerId);
    if (cartItems.length === 0) {
      this.logEvent(
        'PAYMENT_FAILURE',
        'high',
        `Rejected checkout on an empty cart via ${paymentMethod}`,
        {},
        sessionIdOrCustomerId.startsWith('SESS') ? sessionIdOrCustomerId : undefined
      );
      return { allowed: false, reason: 'Cannot checkout an empty cart.' };
    }

    const auth = db.calculateAuthoritativeCartTotal(sessionIdOrCustomerId);
    if (amount !== auth.total) {
      this.logEvent(
        'CART_TAMPER_DETECTED',
        'critical',
        `Payment amount tampering detected: Attempted â‚¹${amount}, Authoritative Total is â‚¹${auth.total}`,
        { attemptedAmount: amount, authoritativeTotal: auth.total },
        sessionIdOrCustomerId.startsWith('SESS') ? sessionIdOrCustomerId : undefined
      );
      return { allowed: false, reason: `Total amount mismatch. Authoritative total is â‚¹${auth.total}.` };
    }

    // Physical Checkout Verification Check
    const sessionId = sessionIdOrCustomerId.startsWith('SESS') ? sessionIdOrCustomerId : undefined;
    if (sessionId) {
      const physicalCheck = backendAuthority.verifyPhysicalCheckout(sessionId);
      if (!physicalCheck.verified) {
        return {
          allowed: false,
          reason: `Physical checkout verification required: ${physicalCheck.customerAlert?.message || 'Quantity mismatch detected'}`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Validates gateway payment status prior to order finalization (SEC-13, SEC-14).
   * Ensures client cannot finalize order if gateway payment is PENDING or FAILED.
   */
  public validatePaymentStatus(
    orderId: string,
    clientReportedStatus: string
  ): {
    allowedToFinalize: boolean;
    authoritativeStatus: 'SUCCESS' | 'PENDING' | 'FAILED';
    error?: string;
  } {
    const payment = Array.from(db.getPayments()).find(p => p.order_id === orderId) ||
      Array.from(backendAuthority.getPayments()).find(p => p.order_id === orderId);

    if (!payment) {
      return {
        allowedToFinalize: false,
        authoritativeStatus: 'FAILED',
        error: `Payment record not found for order ${orderId}`
      };
    }

    if (payment.status === 'PAYMENT_PENDING') {
      if (clientReportedStatus === 'SUCCESS') {
        this.logEvent(
          'PAYMENT_FAILURE',
          'high',
          `Premature finalization attempt: Client reported SUCCESS but authoritative gateway status is PENDING for Order ${orderId}`,
          { orderId, clientReportedStatus, authoritativeStatus: 'PENDING' }
        );
      }
      return {
        allowedToFinalize: false,
        authoritativeStatus: 'PENDING',
        error: 'Payment confirmation pending from gateway. Cannot finalize order.'
      };
    }

    if (payment.status === 'PAYMENT_FAILED') {
      this.logEvent(
        'PAYMENT_FAILURE',
        'high',
        `Finalization rejected: Payment for Order ${orderId} has status PAYMENT_FAILED`,
        { orderId }
      );
      return {
        allowedToFinalize: false,
        authoritativeStatus: 'FAILED',
        error: 'Payment failed at gateway. Order cannot be finalized and inventory remains intact.'
      };
    }

    return {
      allowedToFinalize: true,
      authoritativeStatus: 'SUCCESS'
    };
  }

  /**
   * Idempotent duplicate payment verification (SEC-15).
   */
  public validateDuplicatePayment(orderId: string): {
    alreadyFinalized: boolean;
    order?: any;
    message?: string;
  } {
    const existingOrder = db.getOrder(orderId) || backendAuthority.getOrders().find(o => (o as any).order_id === orderId || o.id === orderId);
    if (existingOrder) {
      return {
        alreadyFinalized: true,
        order: existingOrder,
        message: 'Order already finalized. Idempotent response returned.'
      };
    }
    return { alreadyFinalized: false };
  }

  /**
   * Prevents duplicate inventory deduction retries (SEC-17).
   */
  public validateDuplicateInventoryDeduction(orderId: string, productId: string): {
    alreadyDeducted: boolean;
    canDeduct: boolean;
  } {
    const key = `${orderId}_${productId}`;
    if (this.orderDeductionHistory.has(key)) {
      return { alreadyDeducted: true, canDeduct: false };
    }
    this.orderDeductionHistory.add(key);
    return { alreadyDeducted: false, canDeduct: true };
  }

  /**
   * Validates manager authorization token (SEC-18).
   * Rejects unauthorized manager endpoints deterministically.
   */
  public validateManagerAction(managerAuthToken: string, actionName: string): {
    allowed: boolean;
    manager?: any;
    error?: string;
  } {
    try {
      const session = backendAuthority.authenticateSession(managerAuthToken);
      backendAuthority.authorizeManager(session);
      return { allowed: true, manager: session };
    } catch (err: any) {
      this.logEvent(
        'MANAGER_AUTH_FAILURE',
        'critical',
        `Unauthorized manager action attempt for '${actionName}': ${err.message || 'Invalid manager token'}`,
        { actionName, error: err.message }
      );
      return { allowed: false, error: err.message || 'Unauthorized manager action' };
    }
  }

  /**
   * Rate limiting enforcement (SEC-19).
   */
  public checkRateLimit(key: string, limit = 5, windowMs = 60000): {
    allowed: boolean;
    remaining?: number;
    retryAfter?: number;
  } {
    const res = backendAuthority.checkRateLimit(key, limit, windowMs);
    if (!res.allowed) {
      this.logEvent(
        'RATE_LIMIT_EXCEEDED',
        'medium',
        `Rate limit exceeded for key: ${key}. Max ${limit} requests per window.`,
        { key, limit, retryAfter: res.retryAfterSec }
      );
    }
    return {
      allowed: res.allowed,
      retryAfter: res.retryAfterSec
    };
  }

  /**
   * Evaluates security risk using Contextual Modulation (Hindsight Experience).
   * Modulates risk score dynamically:
   * - Shelf linger without concealment/exit vector: 0.72 -> 0.18 (NORMAL_MONITORING, alert suppressed)
   * - Concealment + exit trajectory: elevates to 0.95 (HIGH, "Verification required")
   * Strictly adheres to non-accusatory language ("Verification required", "Discrepancy detected").
   */
  public evaluateRisk(observation: {
    shelfVisits?: number;
    lingerDurationSeconds?: number;
    concealmentDetected?: boolean;
    exitTrajectory?: boolean;
    itemsCountDiscrepancy?: number;
    behaviorContext?: string;
    customerSessionId?: string;
  }): {
    riskScore: number;
    baselineScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    classification: string;
    status: string;
    actionRequired: boolean;
    recommendedAction: string;
    rationale: string;
    isFalsePositiveSuppressed: boolean;
    retainedExperienceApplied: string;
  } {
    const shelfVisits = observation.shelfVisits || 0;
    const lingerSeconds = observation.lingerDurationSeconds || 0;
    const hasConcealment = !!observation.concealmentDetected;
    const hasExitVector = !!observation.exitTrajectory;
    const discrepancy = observation.itemsCountDiscrepancy || 0;
    const contextStr = (observation.behaviorContext || '').toLowerCase();

    // Concealment + exit trajectory = High Risk (0.95)
    if ((hasConcealment && hasExitVector) || (contextStr.includes('conceal') && (contextStr.includes('exit') || contextStr.includes('pocket')))) {
      return {
        riskScore: 0.95,
        baselineScore: 0.60,
        riskLevel: 'HIGH',
        classification: 'CONCEALMENT_EXIT_SEQUENCE',
        status: 'Verification required',
        actionRequired: true,
        recommendedAction: 'Verification required at exit checkpoint. Assist customer with polite cart verification.',
        rationale: 'Current observation contains both concealment and an exit-directed signal. Request a human verification; this is not a determination of intent.',
        isFalsePositiveSuppressed: false,
        retainedExperienceApplied: 'Multi-signal combination (concealment + exit vector) prioritized for verification.'
      };
    }

    // Shelf linger without concealment or exit vector = Benign (0.72 -> 0.18)
    if (shelfVisits >= 3 || lingerSeconds >= 60 || contextStr.includes('linger') || contextStr.includes('allergen') || contextStr.includes('compare')) {
      return {
        riskScore: 0.18,
        baselineScore: 0.72,
        riskLevel: 'LOW',
        classification: 'BENIGN_COMPARISON_SHOPPING',
        status: 'Discrepancy not detected / Normal monitoring',
        actionRequired: false,
        recommendedAction: 'No intervention required. Behavior verified as benign comparison shopping.',
        rationale: 'Current observation shows shelf comparison or lingering without concealment or exit-directed signals. Suppress standalone escalation and continue passive monitoring.',
        isFalsePositiveSuppressed: true,
        retainedExperienceApplied: 'Repeated shelf visits alone without concealment or exit-directed vector are overwhelmingly benign comparison shopping.'
      };
    }

    // Checkout discrepancy
    if (discrepancy > 0 || contextStr.includes('mismatch')) {
      return {
        riskScore: 0.05,
        baselineScore: 0.50,
        riskLevel: 'LOW',
        classification: 'BENIGN_SELF_CORRECTION',
        status: 'Discrepancy detected - Self-correction offered',
        actionRequired: false,
        recommendedAction: 'Display non-accusatory self-correction prompt on customer terminal.',
        rationale: 'A checkout mismatch alone does not establish intent. Offer a polite self-correction prompt and verify the cart.',
        isFalsePositiveSuppressed: false,
        retainedExperienceApplied: 'Checkout mismatches resolve cleanly via polite self-correction dialog without dispute.'
      };
    }

    // Default baseline
    return {
      riskScore: 0.10,
      baselineScore: 0.10,
      riskLevel: 'LOW',
      classification: 'NORMAL_SHOPPING_ACTIVITY',
      status: 'Normal monitoring',
      actionRequired: false,
      recommendedAction: 'Continue passive monitoring. No discrepancy detected.',
      rationale: 'Observed shopper activity conforms to regular browsing patterns.',
      isFalsePositiveSuppressed: false,
      retainedExperienceApplied: 'Routine shopping flow within standard baseline.'
    };
  }

  /**
   * AI INVOCATION GATE & AMBIGUOUS ANOMALY REASONING (SEC-20, SEC-21)
   *
   * Business Principles:
   * 1. â‚¹1 spend chesi â‚¹0.50 save cheyyakudadhu: No LLM when deterministic logic suffices.
   * 2. Mismatch â‰  theft: Never accuse customer of theft.
   * 3. Cannot bypass auth, cannot change payment/inventory.
   */
  public async analyzeAmbiguousAnomaly(context: AmbiguousAnomalyContext): Promise<SecurityAnalysisResult> {
    // Gate 1: Deterministic single rule violation check
    if (context.isDeterministicSingleViolation) {
      return {
        requiresAI: false,
        classification: 'DETERMINISTIC_HANDLED',
        benignLikelihood: 0,
        suspicionScore: 100,
        escalated: false,
        recommendation: 'Enforce deterministic security rule immediately without AI evaluation.',
        explanation: 'Deterministic validation (QR authenticity, catalog price, inventory count) is fully authoritative.',
        historicalPatternsRecalled: []
      };
    }

    // Gate 2: Recalls Security Hindsight for past experience patterns
    let historicalPatterns: string[] = [];
    try {
      const query = context.behaviorContext || (context.events?.map(e => e.type).join(' ') || 'shopping pattern');
      const memories = await getRelevantContext({ agent: 'security', branchId: 'BRANCH-104', query });
      historicalPatterns = memories.memories.map(m => m.content.split('\n')[0]);
      historicalPatterns.push(...memories.reflections);
    } catch (err) {
      console.warn('[SecurityAgent] Native memory recall failed gracefully:', err);
    }

    const behaviorLower = (context.behaviorContext || '').toLowerCase();
    const eventTypes = (context.events || []).map(e => e.type);

    // Scenario A: Legitimate unusual shopping behavior (SEC-20)
    // E.g., customer comparing items, returning to shelf, hesitation in aisle, family member handling
    const isComparison = behaviorLower.includes('compare') || behaviorLower.includes('ingredient') || behaviorLower.includes('returned to shelf');
    const isFamilyShopping = behaviorLower.includes('family') || behaviorLower.includes('child') || behaviorLower.includes('hesitation');
    const isNetworkRetry = behaviorLower.includes('kiosk retry') || behaviorLower.includes('screen refresh') || behaviorLower.includes('lag');

    if (isComparison || isFamilyShopping || isNetworkRetry) {
      this.logEvent(
        'BENIGN_BEHAVIOR_VERIFIED',
        'low',
        `Security Agent verified benign shopping behavior: ${context.behaviorContext || 'Comparison shopping'}`,
        { behaviorContext: context.behaviorContext },
        context.sessionId,
        context.customerId
      );

      return {
        requiresAI: true,
        classification: 'BENIGN_BEHAVIOR',
        benignLikelihood: 94,
        suspicionScore: 6,
        escalated: false,
        recommendation: 'No operational action required. Behavior classified as benign consumer exploration.',
        explanation: 'Customer activity matches established comparison shopping or multi-item inspection. No scanner bypass or cart discrepancy observed.',
        historicalPatternsRecalled: historicalPatterns
      };
    }

    // Scenario B: Ambiguous anomaly escalation (SEC-21)
    // E.g., repeated session switching, rapid cart price resets, multiple terminals
    const hasMultipleFailures = eventTypes.filter(t => t.includes('FAIL') || t.includes('INVALID') || t.includes('TAMPER')).length >= 2;
    const isRapidSwitching = behaviorLower.includes('multiple terminals') || behaviorLower.includes('rapid switching') || hasMultipleFailures;

    if (isRapidSwitching) {
      this.logEvent(
        'AMBIGUOUS_ANOMALY_ESCALATED',
        'medium',
        `Ambiguous sequence escalated for polite cart verification: ${context.behaviorContext || 'Multiple anomalous events'}`,
        { events: context.events, behaviorContext: context.behaviorContext },
        context.sessionId,
        context.customerId
      );

      return {
        requiresAI: true,
        classification: 'AMBIGUOUS_ANOMALY',
        benignLikelihood: 35,
        suspicionScore: 65,
        escalated: true,
        // MANDATORY INVARIANT: Never accuse shopper of theft.
        recommendation: 'Discreet floor support recommended. Customer-facing message: "An inconsistency was detected. Please verify your cart."',
        explanation: 'Cluster of multiple session switches and scan retries detected across terminals. Escalated for assistance without making accusations.',
        historicalPatternsRecalled: historicalPatterns
      };
    }

    // Contextual Risk Evaluation via evaluateRisk / Hindsight
    const evaluatedRisk = this.evaluateRisk({
      shelfVisits: behaviorLower.includes('shelf') ? 3 : 1,
      lingerDurationSeconds: behaviorLower.includes('linger') ? 75 : 0,
      concealmentDetected: behaviorLower.includes('conceal') || behaviorLower.includes('pocket'),
      exitTrajectory: behaviorLower.includes('exit'),
      behaviorContext: context.behaviorContext,
      customerSessionId: context.sessionId
    });

    if (evaluatedRisk.isFalsePositiveSuppressed) {
      return {
        requiresAI: true,
        classification: 'BENIGN_BEHAVIOR',
        benignLikelihood: 95,
        suspicionScore: Math.round(evaluatedRisk.riskScore * 100),
        escalated: false,
        recommendation: evaluatedRisk.recommendedAction,
        explanation: evaluatedRisk.rationale,
        historicalPatternsRecalled: [...historicalPatterns, evaluatedRisk.retainedExperienceApplied]
      };
    }

    if (evaluatedRisk.actionRequired) {
      return {
        requiresAI: true,
        classification: 'AMBIGUOUS_ANOMALY',
        benignLikelihood: 10,
        suspicionScore: Math.round(evaluatedRisk.riskScore * 100),
        escalated: true,
        recommendation: evaluatedRisk.recommendedAction,
        explanation: evaluatedRisk.rationale,
        historicalPatternsRecalled: [...historicalPatterns, evaluatedRisk.retainedExperienceApplied]
      };
    }

    // Default safe baseline
    return {
      requiresAI: true,
      classification: 'BENIGN_BEHAVIOR',
      benignLikelihood: 80,
      suspicionScore: Math.round(evaluatedRisk.riskScore * 100),
      escalated: false,
      recommendation: evaluatedRisk.recommendedAction,
      explanation: evaluatedRisk.rationale,
      historicalPatternsRecalled: historicalPatterns
    };
  }

  /**
   * Resolve a security incident and record experiential learning (SEC-24, SEC-25).
   */
  public async resolveIncident(
    incidentId: string,
    isFalsePositive: boolean,
    resolutionNote: string
  ): Promise<{ success: boolean; memoryRetained: boolean }> {
    const incidentType = isFalsePositive ? 'FALSE_POSITIVE' : 'TRUE_INCIDENT';
    const nativeMemory = await storeMemory({
      agent: 'security', branchId: 'BRANCH-104', kind: isFalsePositive ? 'false-positive-resolution' : 'verified-incident-outcome',
      content: `Incident ${incidentType} resolved. ${resolutionNote}`,
      metadata: { resolution: isFalsePositive ? 'false-positive' : 'confirmed' }
    });

    if (isFalsePositive) {
      this.logEvent(
        'FALSE_POSITIVE_RESOLVED',
        'low',
        `Incident ${incidentId} confirmed as false positive: ${resolutionNote}`,
        { incidentId, resolutionNote }
      );
    }

    return { success: true, memoryRetained: nativeMemory.success };
  }

  /**
   * Verifies that Hindsight memory CANNOT bypass authorization (SEC-26).
   * Hard backend authentication remains strictly mandatory regardless of past memory.
   */
  public validateAuthorizationWithMemory(token: string, customerId: string): { valid: boolean; error?: string } {
    // Hard deterministic check MUST happen first:
    const authCheck = this.validateCustomerIdentityQR(token);
    if (!authCheck.valid) {
      return {
        valid: false,
        error: `Authentication failed: ${authCheck.error}. Saved memory cannot grant authorization.`
      };
    }
    return { valid: true };
  }

  /**
   * Process incoming security event with Idempotency & Out-of-Order sequencing (SEC-28, SEC-29).
   */
  public processSecurityEvent(event: {
    id: string;
    event_type: SecurityEventType;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    details: string;
    timestamp?: string;
    metadata?: any;
    session_id?: string;
    customer_id?: string;
  }): {
    success: boolean;
    duplicate: boolean;
    outOfOrder: boolean;
    processed: boolean;
    event?: SecurityEvent;
  } {
    if (!event.id) {
      return { success: false, duplicate: false, outOfOrder: false, processed: false };
    }

    // Idempotency: Reject duplicate events (SEC-28)
    if (this.processedSecurityEventIds.has(event.id)) {
      return {
        success: true,
        duplicate: true,
        outOfOrder: false,
        processed: false
      };
    }

    this.processedSecurityEventIds.add(event.id);

    const eventTime = event.timestamp ? new Date(event.timestamp).getTime() : Date.now();
    let isOutOfOrder = false;

    // Out-of-order detection (SEC-29)
    if (this.lastProcessedSecurityEventTime > 0 && eventTime < this.lastProcessedSecurityEventTime - 5000) {
      isOutOfOrder = true;
    } else if (eventTime > this.lastProcessedSecurityEventTime) {
      this.lastProcessedSecurityEventTime = eventTime;
    }

    const logged = this.logEvent(
      event.event_type,
      event.severity || 'medium',
      event.details,
      { ...event.metadata, idempotencyKey: event.id, isOutOfOrder },
      event.session_id,
      event.customer_id
    );

    return {
      success: true,
      duplicate: false,
      outOfOrder: isOutOfOrder,
      processed: true,
      event: logged
    };
  }

  /**
   * Calculates Section 31 Business Loss Metrics for Security.
   */
  public getSecurityMetrics(): SecurityMetrics {
    const events = db.getSecurityEvents();
    const preventedUnauthorizedAccess = events.filter(e =>
      e.event_type === 'INVALID_CUSTOMER_QR' ||
      e.event_type === 'REVOKED_CUSTOMER_QR' ||
      e.event_type === 'EXPIRED_CUSTOMER_QR' ||
      e.event_type === 'UNAUTHORIZED_ACCESS' ||
      e.event_type === 'CROSS_CUSTOMER_HIJACK_ATTEMPT' ||
      e.event_type === 'SESSION_HIJACK_ATTEMPT' ||
      e.event_type === 'MANAGER_AUTH_FAILURE'
    ).length;

    const blockedCartTampering = events.filter(e =>
      e.event_type === 'CART_TAMPER_DETECTED' ||
      e.event_type === 'QUANTITY_TAMPER_DETECTED'
    ).length;

    const preventedDuplicateTransactions = events.filter(e =>
      e.event_type === 'CONCURRENT_PURCHASE_CONTENTION'
    ).length;

    const falsePositivesResolved = events.filter(e =>
      e.event_type === 'FALSE_POSITIVE_RESOLVED' ||
      e.event_type === 'BENIGN_BEHAVIOR_VERIFIED'
    ).length;

    const confirmedIncidents = events.filter(e =>
      e.severity === 'high' || e.severity === 'critical'
    ).length;

    const ambiguousAnomaliesEscalated = events.filter(e =>
      e.event_type === 'AMBIGUOUS_ANOMALY_ESCALATED'
    ).length;

    const avoidedLoss = events
      .filter(e => e.event_type === 'CART_TAMPER_DETECTED' && e.metadata && (e.metadata as any).difference)
      .reduce((sum, e) => sum + ((e.metadata as any)?.difference || 0), 0);

    return {
      preventedUnauthorizedAccess,
      blockedCartTampering,
      preventedDuplicateTransactions,
      preventedDuplicateInventoryDeductions: this.orderDeductionHistory.size,
      falsePositivesResolved,
      confirmedIncidents,
      ambiguousAnomaliesEscalated,
      estimatedAvoidedLoss: avoidedLoss
    };
  }

  /**
   * Recall past security patterns for investigation context.
   */
  public async recallSecurityContext(query: string) {
    const result = await getRelevantContext({ agent: 'security', branchId: 'BRANCH-104', query });
    return { success: result.success, results: result.memories.map(m => ({ id: m.id, text: m.content })), error: result.error };
  }

  /**
   * Dispatches a structured, neutral manager email alert for HIGH and CRITICAL security incidents.
   * Enforces strict deduplication so identical security event IDs are never emailed twice.
   * Failure to send email is handled non-blockingly and does NOT compromise audit or dashboard state.
   */
  public async dispatchManagerAlertEmail(
    event: SecurityEvent,
    aiAnalysis?: SecurityAnalysisResult
  ): Promise<SendEmailResult | null> {
    // Operational Gate: Only HIGH and CRITICAL severities trigger manager email
    if (event.severity !== 'high' && event.severity !== 'critical') {
      return null;
    }

    // Deduplication Gate: prevent duplicate emails for same security event ID
    if (this.dispatchedEmailEventIds.has(event.id) || event.emailDispatched) {
      return null;
    }
    const mgrEmail = (typeof process !== 'undefined' && (process.env?.MANAGER_ALERT_EMAIL || process.env?.STORE_MANAGER_EMAIL)) || '';
    if (!mgrEmail) {
      return { success: false, unconfigured: true, error: 'MANAGER_ALERT_EMAIL is not configured.' };
    }
    this.dispatchedEmailEventIds.add(event.id);

    // Neutral Language Guarantee: Never accuse shopper of theft or make derogatory claims
    const sanitizedDetails = (event.details || '')
      .replace(/\btheft\b/gi, 'unauthorized item movement')
      .replace(/\bstolen\b/gi, 'unverified item movement')
      .replace(/\bthief\b/gi, 'unauthorized person')
      .replace(/\bstealing\b/gi, 'unscanned basket discrepancy')
      .replace(/\bshoplifting\b/gi, 'unscanned basket movement')
      .replace(/\bshoplifter\b/gi, 'unauthorized person');

    const triggeringRule = event.triggering_rule || getDefaultTriggeringRule(event.event_type);
    const recommendedAction = event.recommendedAction || getDefaultRecommendedAction(event.event_type, event.severity);

    // Build deterministic check telemetry
    let deterministicCheck: SecurityAlertEmailContext['deterministicCheck'] = undefined;
    if (event.digital_quantity !== undefined || event.physical_quantity !== undefined) {
      const comparisonItems = (event.metadata?.comparison || []).map((c: any) => ({
        productName: c.product_name || c.product_id,
        digitalQuantity: c.digital_quantity,
        physicalQuantity: c.physical_quantity,
        inventory: c.current_inventory,
        status: c.status
      }));

      deterministicCheck = {
        checkType: triggeringRule,
        digitalQuantity: event.digital_quantity,
        physicalQuantity: event.physical_quantity,
        inventoryState: event.inventory_state,
        difference: (event.physical_quantity ?? 0) - (event.digital_quantity ?? 0),
        items: comparisonItems.length > 0 ? comparisonItems : undefined,
        rawResult: `Digital count: ${event.digital_quantity ?? 0}, Camera observed count: ${event.physical_quantity ?? 0}, Inventory: ${event.inventory_state ?? 'N/A'}`
      };
    } else if (event.metadata?.difference !== undefined || event.metadata?.authoritativeSubtotal !== undefined) {
      deterministicCheck = {
        checkType: triggeringRule,
        difference: event.metadata.difference,
        rawResult: `Authoritative: â‚¹${event.metadata.authoritativeSubtotal}, Reported: â‚¹${event.metadata.reportedSubtotal}, Difference: â‚¹${event.metadata.difference}`
      };
    } else if (event.metadata?.error) {
      deterministicCheck = {
        checkType: triggeringRule,
        rawResult: `Validation check reported: ${event.metadata.error}`
      };
    }

    // AI Assessment context: included ONLY when existing Security Agent AI was involved
    let aiAssessment: SecurityAlertEmailContext['aiAssessment'] = undefined;
    const effectiveAi = aiAnalysis || (event.metadata?.aiAnalysis as SecurityAnalysisResult | undefined);
    if (effectiveAi && effectiveAi.requiresAI) {
      aiAssessment = {
        classification: effectiveAi.classification,
        suspicionScore: effectiveAi.suspicionScore,
        benignLikelihood: effectiveAi.benignLikelihood,
        explanation: effectiveAi.explanation,
        recommendation: effectiveAi.recommendation,
        historicalPatternsRecalled: effectiveAi.historicalPatternsRecalled
      };
    }

    const context: SecurityAlertEmailContext = {
      eventId: event.id,
      eventType: event.event_type,
      severity: event.severity === 'critical' ? 'CRITICAL' : 'HIGH',
      status: event.status || 'OPEN',
      timestamp: event.timestamp,
      details: sanitizedDetails,
      triggeringRule,
      recommendedAction,
      sessionId: event.session_id,
      customerId: event.customer_id,
      orderId: event.order_id,
      deterministicCheck,
      aiAssessment
    };

    try {
      const result = await emailProvider.sendSecurityAlertEmail(mgrEmail, context);
      if (result.success) {
        event.emailDispatched = true;
        try {
          db.updateSecurityEvent(event.id, { emailDispatched: true });
        } catch {
          // Safe fallback
        }
      }
      return result;
    } catch (err: any) {
      console.warn('[SecurityAgent] Non-blocking manager alert email dispatch caught error:', err);
      return { success: false, error: err?.message || 'Email dispatch failed' };
    }
  }

  /**
   * Logs a security event to the persistent audit log.
   * Routes classification:
   * - MEDIUM: Manager Dashboard warning (status: 'OPEN'), ZERO email.
   * - HIGH: Manager Dashboard + Manager Email.
   * - CRITICAL: Prominent Dashboard alert + Manager Email.
   */
  public logEvent(
    eventType: SecurityEventType,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: string,
    metadata?: Record<string, any>,
    sessionId?: string,
    customerId?: string
  ): SecurityEvent {
    // Neutral language sanitizer
    const sanitizedDetails = details
      .replace(/\btheft\b/gi, 'unauthorized item movement')
      .replace(/\bstolen\b/gi, 'unverified item movement')
      .replace(/\bthief\b/gi, 'unauthorized person')
      .replace(/\bstealing\b/gi, 'unscanned basket discrepancy')
      .replace(/\bshoplifting\b/gi, 'unscanned basket movement')
      .replace(/\bshoplifter\b/gi, 'unauthorized person');

    const status: 'OPEN' | undefined = (severity === 'medium' || severity === 'high' || severity === 'critical') ? 'OPEN' : undefined;
    const triggering_rule = metadata?.triggering_rule || getDefaultTriggeringRule(eventType);
    const recommendedAction = metadata?.recommendedAction || getDefaultRecommendedAction(eventType, severity);

    const eventPayload = {
      event_type: eventType,
      severity,
      status,
      details: sanitizedDetails,
      metadata: metadata || {},
      session_id: sessionId,
      customer_id: customerId,
      triggering_rule,
      recommendedAction,
      digital_quantity: metadata?.digital_quantity,
      physical_quantity: metadata?.physical_quantity,
      inventory_state: metadata?.inventory_state,
      expected_inventory_after: metadata?.expected_inventory_after,
      emailDispatched: false
    };

    const backendSecEvent = backendAuthority.logSecurityEvent(eventPayload);
    const dbSecEvent = db.logSecurityEvent(eventPayload);
    const secEvent = backendSecEvent || dbSecEvent;

    // Discrepancy Gate:
    // - MEDIUM: Manager Dashboard warning (status: 'OPEN'), ZERO email.
    // - HIGH: Manager Dashboard + Manager Email.
    // - CRITICAL: Prominent Dashboard alert + Manager Email.
    if (severity === 'high' || severity === 'critical') {
      const aiAnalysis = metadata?.aiAnalysis as SecurityAnalysisResult | undefined;
      this.dispatchManagerAlertEmail(secEvent, aiAnalysis).catch(err => {
        console.warn('[SecurityAgent] Non-blocking manager alert email dispatch caught error:', err);
      });
    }

    return secEvent;
  }

  public isEmailDispatchedForEvent(eventId: string): boolean {
    return this.dispatchedEmailEventIds.has(eventId);
  }

  public getDispatchedEmailEventIds(): string[] {
    return Array.from(this.dispatchedEmailEventIds);
  }

  public resetDispatchedEmailCache(): void {
    this.dispatchedEmailEventIds.clear();
  }

  public getEvents(): SecurityEvent[] {
    return db.getSecurityEvents();
  }

  public getStatusSummary(): SecurityStatusSummary {
    const events = db.getSecurityEvents();
    const highAndCritical = events.filter(e => e.severity === 'high' || e.severity === 'critical');
    
    let status: 'OPTIMAL' | 'ELEVATED' | 'CRITICAL' = 'OPTIMAL';
    if (highAndCritical.length > 5) {
      status = 'CRITICAL';
    } else if (highAndCritical.length > 0) {
      status = 'ELEVATED';
    }

    return {
      status,
      totalEvents: events.length,
      highSeverityCount: highAndCritical.length,
      recentIncidents: events.slice(0, 5),
      lastScanTimestamp: events[0]?.timestamp || new Date().toISOString()
    };
  }
}

export const securityAgent = new SecurityAgent();


