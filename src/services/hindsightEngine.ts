import { memoryService } from './nativeMemoryService.js';
import { db } from './db.js';
import { Product } from '../types/index.js';

export interface PolicyProgressionStep {
  step: number;
  iterationLabel: string;
  policyValue: string;
  measuredOutcome: string;
  takeaway: string;
  status: 'completed' | 'current';
  impactMetric?: string;
  quantityProposed?: number;
  converged?: boolean;
}

export interface AdaptiveExperienceTrace {
  id: string;
  domain: 'CUSTOMER' | 'STORE' | 'SECURITY';
  title: string;
  scenarioType: string;
  agentName: 'Customer Agent' | 'Store Agent' | 'Security Agent';

  // 1. PAST EXPERIENCE & DECISION
  pastSituation: string;
  pastExperience?: string;
  pastDecision: string;
  pastHumanAction: string; // e.g. "Customer repeatedly selected Sourdough over Whole Wheat"

  // 2. ACTUAL OUTCOME
  actualOutcome: string;
  outcomeType: 'POSITIVE' | 'NEGATIVE' | 'FALSE_POSITIVE' | 'CONFIRMED_INCIDENT' | 'BENIGN_CORRECTION';
  businessImpact: {
    metric: string;
    value: string;
    financialImpact?: string; // e.g. "â‚¹2,850 recovered sales", "14.5 employee hours saved"
    hoursSaved?: number;
  };
  financialImpact?: {
    metric?: string;
    value?: string;
    financialImpact?: string;
    hoursSaved?: number;
  };

  // 3. HINDSIGHT RETAINED
  retainedLesson: string;
  retainedExperience?: string;
  hindsightDocumentId: string;
  confidenceScore: number;

  // 4. CURRENT CONTEXT
  currentContext: string;

  // 5. CHANGED AGENT BEHAVIOR & DECISION
  previousBehavior: string;
  currentDecision: string;
  whyThisDecision: string;
  differenceDescription: string; // Concrete "What is different now?"

  // 6. POLICY EVOLUTION (For multi-iteration convergence)
  progressionSteps?: PolicyProgressionStep[];
  policyProgression?: PolicyProgressionStep[];

  // 7. NEW OUTCOME & CONTINUOUS LEARNING
  currentOutcome?: string;
  newOutcome?: string;
  updatedHindsightNote?: string;
}

export interface DomainAdaptationMetrics {
  metric1: { label: string; value: string; change: string; positive: boolean };
  metric2: { label: string; value: string; change: string; positive: boolean };
  metric3: { label: string; value: string; change: string; positive: boolean };
  roiImpact: { label: string; value: string; note: string };
  acceptanceRate?: number;
  explicitCorrectionsRetained?: number;
  stockoutDropPercentage?: number;
  recoveredSalesWeekly?: number;
  queueSLAPreventionRate?: number;
  falseAlarmDropPercentage?: number;
  shrinkagePreventedMonthly?: number;
  benignResolutions?: number;
}

class HindsightEngine {
  private traces: Map<string, AdaptiveExperienceTrace> = new Map();
  private currentRestockConvergenceStep: number = 4; // Default to converged 42 units, supports 1->2->3->4

  constructor() {
    this.initializeDefaultTraces();
  }

  public getRestockConvergenceStep(): number {
    return this.currentRestockConvergenceStep;
  }

  public setRestockConvergenceStep(step: number): void {
    this.currentRestockConvergenceStep = Math.max(1, Math.min(4, step));
  }

  public resetRestockConvergenceStep(): void {
    this.currentRestockConvergenceStep = 1;
  }

  public advanceRestockConvergenceStep(): {
    step: number;
    recommendedQty: number;
    previousOutcome: string;
    newDecision: string;
  } {
    const nextStep = Math.min(4, this.currentRestockConvergenceStep + 1);
    this.currentRestockConvergenceStep = nextStep;

    const qty = nextStep === 1 ? 30 : nextStep === 2 ? 38 : nextStep === 3 ? 44 : 42;
    const prevOutcome = nextStep === 2
      ? 'Week 1 Baseline: 30 units stocked out in 42m; 18 unmet requests (~â‚¹1,450 lost sales).'
      : nextStep === 3
      ? 'Week 2 Adjustment: 38 units (+26%) delayed stockout to 7:15 PM; 4 unmet requests.'
      : nextStep === 4
      ? 'Week 3 Over-Correction: 44 units (+46%) met all demand but left 3 residual packs on Monday morning.'
      : 'Initial baseline deployment (30 units).';

    const newDecision = nextStep === 2
      ? 'Store Agent adapted restock recommendation to 38 units (+8 shortage delta).'
      : nextStep === 3
      ? 'Store Agent adapted restock recommendation to 44 units to absorb late evening surge.'
      : nextStep === 4
      ? 'Store Agent rebalanced restock recommendation to exactly 42 units (Converged Equilibrium).'
      : 'Baseline recommendation: 30 units.';

    return {
      step: nextStep,
      recommendedQty: qty,
      previousOutcome: prevOutcome,
      newDecision
    };
  }

  private initializeDefaultTraces() {
    // =========================================================================
    // 1. CUSTOMER AGENT ADAPTIVE SCENARIOS
    // =========================================================================

    // Scenario 1: Product Preference (Artisanal Sourdough over Standard Whole Wheat)
    this.traces.set('CUST_PREF_SOURDOUGH', {
      id: 'CUST_PREF_SOURDOUGH',
      domain: 'CUSTOMER',
      agentName: 'Customer Agent',
      title: 'Customer Product Preference: Artisanal Sourdough vs Whole Wheat',
      scenarioType: 'PRODUCT_PREFERENCE',
      pastSituation: 'Customer started a bakery breakfast mission. Agent recommended default high-volume Whole Wheat Bread (â‚¹45).',
      pastDecision: 'Ranked Whole Wheat Bread #1 based on universal popularity.',
      pastHumanAction: 'Customer ignored Whole Wheat Bread and explicitly selected Artisanal Sourdough (â‚¹65) across 2 consecutive shopping trips.',
      actualOutcome: 'Demonstrated positive affinity for Artisanal Sourdough; rejected default whole wheat.',
      outcomeType: 'POSITIVE',
      businessImpact: {
        metric: 'Basket Value Uplift',
        value: '+â‚¹20/basket',
        financialImpact: '+44% higher category transaction value'
      },
      retainedLesson: 'Customer demonstrates consistent preference for artisanal sourdough over standard whole wheat; elevate sourdough relevance in future breakfast missions.',
      hindsightDocumentId: 'hindsight-cust-sourdough-01',
      confidenceScore: 0.94,
      currentContext: 'Customer begins a new "Breakfast & Bakery Refill" shopping trip on mobile companion.',
      previousBehavior: 'Recommend universal baseline: Whole Wheat Bread ranked #1.',
      currentDecision: 'Artisanal Sourdough dynamically prioritized as #1 personalized recommendation. Whole Wheat shifted to secondary option. Customer must still explicitly click to add.',
      whyThisDecision: 'Demonstrated repeat selection pattern (2 prior instances) overrides universal popularity baseline.',
      differenceDescription: 'Recommendation priority inverted: Artisanal Sourdough relevance score boosted from 0.62 â†’ 0.96 (+55%).',
      progressionSteps: [
        {
          step: 1,
          iterationLabel: 'Visit 1 (Baseline)',
          policyValue: 'Recommend Whole Wheat (#1)',
          measuredOutcome: 'Customer manually searched and bought Sourdough (â‚¹65)',
          takeaway: 'First positive choice signal recorded',
          status: 'completed'
        },
        {
          step: 2,
          iterationLabel: 'Visit 2 (Confirmation)',
          policyValue: 'Neutral parity between Whole Wheat & Sourdough',
          measuredOutcome: 'Customer again picked Sourdough',
          takeaway: 'Repeat selection confirms durable preference (Hindsight Gated: 0.94 confidence)',
          status: 'completed'
        },
        {
          step: 3,
          iterationLabel: 'Visit 3 (Current Adaptive State)',
          policyValue: 'Prioritize Artisanal Sourdough (#1 Personalized)',
          measuredOutcome: 'Instant 1-tap customer acceptance in 8 seconds',
          takeaway: 'Personalization verified; friction reduced by 40s',
          status: 'current',
          impactMetric: 'Saved 40s shopping time'
        }
      ]
    });

    // Scenario 2: Recommendation Rejected (Negative Outcome Learning â€” Avocado Oil vs Mustard Oil)
    this.traces.set('CUST_REJECT_AVOCADO_OIL', {
      id: 'CUST_REJECT_AVOCADO_OIL',
      domain: 'CUSTOMER',
      agentName: 'Customer Agent',
      title: 'Negative Feedback Learning: Suppressing Rejected Recommendations',
      scenarioType: 'RECOMMENDATION_REJECTED',
      pastSituation: 'Customer browsed Cooking Oils category. Agent repeatedly promoted high-margin Imported Avocado Oil (â‚¹450).',
      pastDecision: 'Pushed Avocado Oil 3 times as "Top Pick".',
      pastHumanAction: 'Customer dismissed Avocado Oil every time, choosing Cold-Pressed Mustard Oil (â‚¹180) instead.',
      actualOutcome: 'Repeated negative interaction: customer clearly does not want avocado oil.',
      outcomeType: 'NEGATIVE',
      businessImpact: {
        metric: 'Recommendation Fatigue',
        value: '-80% irritation drop',
        financialImpact: 'Eliminated wasted recommendation slots'
      },
      retainedLesson: 'Negative feedback learning: repeated dismissal of Avocado Oil indicates price/cuisine mismatch. Suppress Avocado Oil and prioritize Cold-Pressed Mustard Oil.',
      hindsightDocumentId: 'hindsight-cust-mustard-reject-02',
      confidenceScore: 0.92,
      currentContext: 'Customer searches for "healthy cooking oil for everyday Indian meals".',
      previousBehavior: 'Repeatedly push Avocado Oil due to store margin optimization.',
      currentDecision: 'Avocado Oil recommendation priority demoted (-60%). Cold-Pressed Mustard Oil presented as #1 verified match.',
      whyThisDecision: 'Hindsight enforces negative outcome learning: repeated rejection reduces priority to prevent recommendation blindness.',
      differenceDescription: 'Avocado Oil demoted from Slot #1 to Slot #6; Mustard Oil elevated to Slot #1 with note "Matches your usual kitchen preference".',
      progressionSteps: [
        {
          step: 1,
          iterationLabel: 'Attempt 1',
          policyValue: 'Promote Avocado Oil (â‚¹450)',
          measuredOutcome: 'Ignored by customer',
          takeaway: 'Initial negative signal',
          status: 'completed'
        },
        {
          step: 2,
          iterationLabel: 'Attempt 2',
          policyValue: 'Promote Avocado Oil with 10% discount badge',
          measuredOutcome: 'Explicitly dismissed; customer bought Mustard Oil (â‚¹180)',
          takeaway: 'Confirmed cuisine mismatch; Hindsight retains suppression directive',
          status: 'completed'
        },
        {
          step: 3,
          iterationLabel: 'Current Adaptive Policy',
          policyValue: 'Suppress Avocado Oil; elevate Cold-Pressed Mustard Oil',
          measuredOutcome: 'Customer accepted Mustard Oil recommendation on first screen',
          takeaway: 'Demonstrated negative feedback adaptation successful',
          status: 'current',
          impactMetric: 'Zero recommendation rejection'
        }
      ]
    });

    // Scenario 3: Product Substitution (Rolled Oats Stockout -> True Elements Accepted)
    this.traces.set('CUST_SUBSTITUTE_OATS', {
      id: 'CUST_SUBSTITUTE_OATS',
      domain: 'CUSTOMER',
      agentName: 'Customer Agent',
      title: 'Adaptive Substitution: Recalling Verified Substitute Acceptance',
      scenarioType: 'PRODUCT_SUBSTITUTION',
      pastSituation: 'Primary choice Organic Tattva Rolled Oats was out of stock. Agent suggested True Elements Rolled Oats as alternative.',
      pastDecision: 'Evaluated similarity index (92% ingredient match) and proposed substitution.',
      pastHumanAction: 'Customer tapped "Accept Substitute" and completed checkout with True Elements.',
      actualOutcome: 'Substitution successfully accepted without cart abandonment.',
      outcomeType: 'POSITIVE',
      businessImpact: {
        metric: 'Stockout Abandonment Prevented',
        value: '100% sale captured',
        financialImpact: 'â‚¹240 purchase preserved'
      },
      retainedLesson: 'True Elements Rolled Oats is a verified acceptable substitute for Organic Tattva Oats for this shopper. Prioritize it immediately during future stockouts.',
      hindsightDocumentId: 'hindsight-cust-sub-oats-03',
      confidenceScore: 0.96,
      currentContext: 'Organic Tattva Rolled Oats encounters sudden stockout during Sunday rush.',
      previousBehavior: 'Display generic out-of-stock badge with full unranked cereal catalog.',
      currentDecision: 'Instantly surfaces True Elements Rolled Oats with badge: "Previously accepted substitute by you". 1-tap replacement offered.',
      whyThisDecision: 'Recalls customer specific past substitution acceptance from episodic memory.',
      differenceDescription: 'Replaces generic "Out of Stock" barrier with trusted pre-verified alternative.',
      progressionSteps: [
        {
          step: 1,
          iterationLabel: 'Prior Stockout',
          policyValue: 'Generic substitution prompt (3 options)',
          measuredOutcome: 'Customer selected True Elements Rolled Oats',
          takeaway: 'Customer-specific substitute affinity established',
          status: 'completed'
        },
        {
          step: 2,
          iterationLabel: 'Current Adaptive State',
          policyValue: 'Direct 1-click True Elements substitute with historical badge',
          measuredOutcome: 'Immediate customer confirmation without hesitation',
          takeaway: 'Zero basket abandonment',
          status: 'current',
          impactMetric: '100% substitution conversion'
        }
      ]
    });

    // Scenario 4: Explicit Customer Correction ("No sweetened yogurt, only Greek yogurt")
    this.traces.set('CUST_EXPLICIT_CORRECTION', {
      id: 'CUST_EXPLICIT_CORRECTION',
      domain: 'CUSTOMER',
      agentName: 'Customer Agent',
      title: 'Explicit Customer Correction: Respecting Direct User Guidance',
      scenarioType: 'CUSTOMER_FEEDBACK_CORRECTION',
      pastSituation: 'Customer asked for high-protein snacks. Agent suggested strawberry flavored fruit yogurt.',
      pastDecision: 'Recommended Fruit Yogurt based on generic top dessert sales.',
      pastHumanAction: 'Customer explicitly corrected agent: "No, I do not want flavored or sweetened yogurts. Only plain unsweetened Greek yogurt."',
      actualOutcome: 'Direct corrective user feedback received.',
      outcomeType: 'NEGATIVE',
      businessImpact: {
        metric: 'User Trust & Alignment',
        value: '100% compliance',
        financialImpact: 'Avoided customer assistant churn'
      },
      retainedLesson: 'Explicit user rule: zero added sugar / plain Greek yogurt only. Never suggest fruit or sweetened dairy.',
      hindsightDocumentId: 'hindsight-cust-greek-yogurt-04',
      confidenceScore: 1.0,
      currentContext: 'Customer says: "Suggest a healthy post-workout protein snack".',
      previousBehavior: 'Suggest top-selling strawberry flavored yogurt.',
      currentDecision: 'Recommends Epigamia Natural Plain Greek Yogurt (0g added sugar, 15g protein). All fruit-flavored yogurts filtered out.',
      whyThisDecision: 'Explicit customer correction has 1.0 confidence gating and supersedes all general popularity models.',
      differenceDescription: 'Sweetened products removed from consideration pool; high-protein unsweetened items surfaced exclusively.',
      progressionSteps: [
        {
          step: 1,
          iterationLabel: 'Baseline Interaction',
          policyValue: 'Generic popularity: Strawberry Yogurt',
          measuredOutcome: 'User corrected: "No sweetened yogurt, only plain Greek yogurt"',
          takeaway: 'Explicit boundary established (Confidence 1.0)',
          status: 'completed'
        },
        {
          step: 2,
          iterationLabel: 'Current Adaptive State',
          policyValue: 'Filter out all flavored dairy; surface Epigamia Plain Greek Yogurt',
          measuredOutcome: 'Customer accepted immediately with "Perfect, adding to cart"',
          takeaway: 'Trust verified; zero repetition of past error',
          status: 'current',
          impactMetric: 'Zero repeat errors'
        }
      ]
    });

    // =========================================================================
    // 2. STORE AGENT ADAPTIVE SCENARIOS
    // =========================================================================

    // Scenario 5: Restock Policy Convergence (Organic Milk Sunday Surge 30 -> 38 -> 44 -> 42 units)
    this.traces.set('STORE_RESTOCK_CONVERGENCE', {
      id: 'STORE_RESTOCK_CONVERGENCE',
      domain: 'STORE',
      agentName: 'Store Agent',
      title: 'Store Restock Policy Convergence: Eliminating Sunday Stockouts',
      scenarioType: 'RESTOCKING_CONVERGENCE',
      pastSituation: 'Sunday evening rush (5 PM - 8 PM) regularly experiences +45% surge in Organic Whole Milk demand.',
      pastDecision: 'Historical baseline policy allocated 30 units per shelf restock cycle.',
      pastHumanAction: 'Manager approved 30 units. Stock was completely depleted in 42 minutes.',
      actualOutcome: 'Critical stockout: 18 unfulfilled customer requests logged; estimated â‚¹1,450 lost sales.',
      outcomeType: 'NEGATIVE',
      businessImpact: {
        metric: 'Stockout Loss Recovered',
        value: 'â‚¹2,850/week recovered',
        financialImpact: '0% stockouts achieved'
      },
      retainedLesson: 'Sunday evening demand exceeds 30-unit allocation by ~40%. Calibrate restock target incrementally using actual sales depletion velocity.',
      hindsightDocumentId: 'hindsight-store-milk-restock-05',
      confidenceScore: 0.98,
      currentContext: 'Store Agent evaluates inventory replenishment for Sunday afternoon shift ahead of evening rush.',
      previousBehavior: 'Default replenishment policy: 30 units.',
      currentDecision: 'Policy converged to exactly 42 units. Covers 100% of peak demand without Monday residual waste.',
      whyThisDecision: 'Multi-iteration outcome learning converged policy: 30 (severe stockout) â†’ 38 (mild stockout) â†’ 44 (slight overstock) â†’ 42 (optimal demand coverage).',
      differenceDescription: 'Restock recommendation increased from 30 â†’ 42 units (+40%), backed by 3 iterations of measured sales data.',
      progressionSteps: [
        {
          step: 1,
          iterationLabel: 'Week 1 (Baseline)',
          policyValue: '30 units',
          quantityProposed: 30,
          measuredOutcome: 'Stockout at 5:42 PM; 18 unmet requests; â‚¹1,450 lost sales',
          takeaway: 'Under-allocation detected; surge exceeds capacity by ~40%',
          status: 'completed'
        },
        {
          step: 2,
          iterationLabel: 'Week 2 (First Adjustment)',
          policyValue: '38 units (+26%)',
          quantityProposed: 38,
          measuredOutcome: 'Stockout delayed to 7:15 PM; 4 unmet requests',
          takeaway: 'Shortage reduced by 78%, but peak demand still unmet',
          status: 'completed'
        },
        {
          step: 3,
          iterationLabel: 'Week 3 (Over-Correction)',
          policyValue: '44 units (+46%)',
          quantityProposed: 44,
          measuredOutcome: 'All demand fulfilled; 3 residual packs remained on Monday morning',
          takeaway: 'Slight over-allocation; 3 units carried over',
          status: 'completed'
        },
        {
          step: 4,
          iterationLabel: 'Week 4 (Converged Equilibrium)',
          policyValue: '42 units (Converged Optimum)',
          quantityProposed: 42,
          converged: true,
          measuredOutcome: '100% demand covered; 0 stockouts; 0 residual carryover',
          takeaway: 'Policy mathematically converged to real demand equilibrium',
          status: 'current',
          impactMetric: '100% demand fulfillment'
        }
      ]
    });

    // Scenario 6: Checkout Queue SLA (Preemptive Counter Opening on Rush Traffic)
    this.traces.set('STORE_QUEUE_PREEMPTION', {
      id: 'STORE_QUEUE_PREEMPTION',
      domain: 'STORE',
      agentName: 'Store Agent',
      title: 'Checkout Queue SLA: Preemptive Express Counter Opening',
      scenarioType: 'CHECKOUT_QUEUE_PREEMPTION',
      pastSituation: 'Sunday 6:30 PM: Counter 1 queue reached 7.4 minutes wait with 8 customers in line.',
      pastDecision: 'Agent waited until wait time exceeded 5-minute SLA before proposing Counter 2.',
      pastHumanAction: 'Manager approved Counter 2 opening. Queue wait dropped from 7.4m â†’ 2.1m.',
      actualOutcome: 'Significant customer satisfaction recovery, but 8 customers experienced 7m+ delay before action took effect.',
      outcomeType: 'POSITIVE',
      businessImpact: {
        metric: 'Queue SLA Compliance',
        value: '98.5% compliance',
        financialImpact: 'Average wait dropped from 7.4m â†’ 2.1m'
      },
      retainedLesson: 'Opening Counter 2 successfully resolves checkout surges. However, waiting for SLA breach is suboptimal: trigger Counter 2 opening preemptively when estimated wait exceeds 3.2 mins before 5m breach.',
      hindsightDocumentId: 'hindsight-store-queue-express-06',
      confidenceScore: 0.95,
      currentContext: 'Live checkout camera observes 4 shoppers moving toward checkout area at 6:18 PM.',
      previousBehavior: 'Wait until Counter 1 queue wait exceeds 5 minutes before generating recommendation.',
      currentDecision: 'Preemptively recommends opening Counter 2 as Express Lane at 3.2 mins estimated wait before 5m breach, avoiding congestion.',
      whyThisDecision: 'Past Hindsight proved reactive opening incurs a 7-minute customer wait lag; predictive preemption preserves SLA.',
      differenceDescription: 'Trigger shifted from reactive (wait > 5m) to predictive (inflow >= 4 shoppers at 6-8 PM).',
      progressionSteps: [
        {
          step: 1,
          iterationLabel: 'Reactive Baseline',
          policyValue: 'Open Counter 2 after SLA breach (>5m wait)',
          measuredOutcome: 'Customers experienced 7.4m wait before queue cleared',
          takeaway: 'Intervention works, but reactive timing hurts satisfaction',
          status: 'completed'
        },
        {
          step: 2,
          iterationLabel: 'Predictive Adaptive Policy',
          policyValue: 'Preemptively open Counter 2 when inflow >= 4 during 6-8 PM',
          measuredOutcome: 'Queue never exceeded 2.4 minutes; zero SLA breaches',
          takeaway: 'Continuous flow maintained; throughput +32%',
          status: 'current',
          impactMetric: '-71% wait time'
        }
      ]
    });

    // Scenario 7: Staffing Reallocation Under Peak Security Verifications
    this.traces.set('STORE_STAFF_REALLOCATION', {
      id: 'STORE_STAFF_REALLOCATION',
      domain: 'STORE',
      agentName: 'Store Agent',
      title: 'Dynamic Staffing Reallocation: Exit Verification Station Coverage',
      scenarioType: 'EMPLOYEE_COVERAGE_REALLOCATION',
      pastSituation: 'Two checkout discrepancy verification alerts occurred simultaneously at Exit Gate 02 with only 1 responder on duty.',
      pastDecision: 'Store Agent recommended reallocating 1 Floor Associate from Aisle 4 to Exit Verification Station.',
      pastHumanAction: 'Manager approved reallocation. Associate Vikram Das assisted with verification checks.',
      actualOutcome: 'Verification latency dropped from 78 seconds to 29 seconds. Customer exit flow restored.',
      outcomeType: 'POSITIVE',
      businessImpact: {
        metric: 'Exit Bottleneck Clearance',
        value: '-63% verification latency',
        financialImpact: 'Eliminated exit gate congestion',
        hoursSaved: 14.5
      },
      retainedLesson: 'When pending verification alerts >= 2, reallocating 1 floor associate to Exit Station reduces customer friction by 60%+ without harming aisle maintenance.',
      hindsightDocumentId: 'hindsight-store-staff-realloc-07',
      confidenceScore: 0.94,
      currentContext: '2 verification events are currently OPEN at Exit Station Gate 02.',
      previousBehavior: 'Maintain rigid static post assignments regardless of verification queue.',
      currentDecision: 'Automatically generates Staff Reallocation Recommendation: "Dispatch Vikram Das (Floor Associate) to Exit Verification Station #02".',
      whyThisDecision: 'Hindsight outcome proved temporary cross-station support reduces customer wait by 49 seconds per shopper.',
      differenceDescription: 'Dynamic shift from static roster to load-balanced operational assistance.',
      progressionSteps: [
        {
          step: 1,
          iterationLabel: 'Static Roster Policy',
          policyValue: 'Fixed 1-officer exit coverage',
          measuredOutcome: 'Verification delay reached 78s; exit queue formed',
          takeaway: 'Single responder cannot handle concurrent verification surges',
          status: 'completed'
        },
        {
          step: 2,
          iterationLabel: 'Dynamic Reallocation Policy',
          policyValue: 'Trigger cross-deployment when pending verifications >= 2',
          measuredOutcome: 'Average response dropped to 29s; smooth customer flow',
          takeaway: 'Operational efficiency maximized across floor & exit',
          status: 'current',
          impactMetric: '-49s latency per shopper'
        }
      ]
    });

    // =========================================================================
    // 3. SECURITY AGENT ADAPTIVE SCENARIOS
    // =========================================================================

    // Scenario 8: Repeated Shelf Visits (False Positive Learning â€” Comparison Shopping)
    this.traces.set('SEC_FALSE_POSITIVE_SHELF', {
      id: 'SEC_FALSE_POSITIVE_SHELF',
      domain: 'SECURITY',
      agentName: 'Security Agent',
      title: 'False Positive Learning: Repeated Shelf Visits (Allergen Inspection)',
      scenarioType: 'REPEATED_SHELF_VISITS_BENIGN',
      pastSituation: 'Customer revisited Aisle 4 shelf 4 times and inspected multiple items repeatedly.',
      pastDecision: 'Security rule initially flagged MEDIUM concern for "unusual repeated shelf activity" and alerted responder.',
      pastHumanAction: 'Employee approached politely: customer was elderly shopper comparing ingredient labels for nut allergens.',
      actualOutcome: 'Verified 100% false positive. Shopper purchased 2 items and left happy.',
      outcomeType: 'FALSE_POSITIVE',
      businessImpact: {
        metric: 'Alert Fatigue Drop',
        value: '-72% false alarms',
        financialImpact: 'Saved 14.5 responder hours/week'
      },
      retainedLesson: 'Repeated shelf visits alone without concealment or exit-directed vector are overwhelmingly benign comparison shopping (4 of 5 historical instances false positives). Do not escalate standalone.',
      hindsightDocumentId: 'hindsight-sec-false-shelf-08',
      confidenceScore: 0.91,
      currentContext: 'Shopper in Aisle 4 revisits cereal shelf 3 times to inspect nutritional facts.',
      previousBehavior: 'Trigger MEDIUM alert, sound audio chime, and dispatch security associate.',
      currentDecision: 'Classified as BENIGN_COMPARISON_SHOPPING. Alert status set to NORMAL monitoring. Zero audible chime; zero responder dispatch.',
      whyThisDecision: 'Hindsight history shows 80% false positive rate for isolated shelf lingering. Requiring multi-signal evidence avoids customer embarrassment and alert fatigue.',
      differenceDescription: 'Escalation suppressed: downgraded from MEDIUM ALERT to NORMAL_MONITORING based on verified benign outcome history.',
      progressionSteps: [
        {
          step: 1,
          iterationLabel: 'Initial Strict Rule',
          policyValue: '3+ shelf revisits = Medium Alert + Dispatch',
          measuredOutcome: 'Employee review confirmed customer was reading allergen labels (False Positive)',
          takeaway: 'Standalone linger is a weak indicator (80% false positive rate)',
          status: 'completed'
        },
        {
          step: 2,
          iterationLabel: 'Adaptive Contextual Rule',
          policyValue: 'Linger alone = Normal monitoring; requires secondary concealment or exit vector to escalate',
          measuredOutcome: 'Zero false dispatches; customer shops without interruption',
          takeaway: 'Shopper trust preserved; responder focuses on genuine anomalies',
          status: 'current',
          impactMetric: '72% fewer false dispatches'
        }
      ]
    });

    // Scenario 9: Multi-Signal Sequence (Linger + Concealment + Exit Movement = Contextual Escalation)
    this.traces.set('SEC_CONCEALMENT_EXIT_SEQUENCE', {
      id: 'SEC_CONCEALMENT_EXIT_SEQUENCE',
      domain: 'SECURITY',
      agentName: 'Security Agent',
      title: 'Contextual Escalation: Concealment Sequence + Rapid Exit Vector',
      scenarioType: 'CONCEALMENT_EXIT_SEQUENCE',
      pastSituation: 'Optical camera observed shopper place premium cosmetics into outer jacket, followed immediately by rapid path toward unmonitored exit corridor.',
      pastDecision: 'Security Agent combined concealment gesture + exit path vector and dispatched responder.',
      pastHumanAction: 'Responder conducted polite receipt check at exit checkpoint. Confirmed 2 unpaid items.',
      actualOutcome: 'Confirmed security anomaly resolved courteously. Inventory recovered.',
      outcomeType: 'CONFIRMED_INCIDENT',
      businessImpact: {
        metric: 'Shrinkage Loss Prevented',
        value: 'â‚¹3,200 recovered',
        financialImpact: 'High-confidence detection verified'
      },
      retainedLesson: 'Multi-signal combination (product transfer into clothing + rapid exit trajectory) is a verified high-confidence pattern (>95% confirmed incidents). Prioritize immediate courteous verification.',
      hindsightDocumentId: 'hindsight-sec-conceal-seq-09',
      confidenceScore: 0.97,
      currentContext: 'CCTV Camera #04 detects shopper placing packaged items into personal coat pocket and turning toward the exit corridor.',
      previousBehavior: 'Treat as isolated linger event with delayed verification.',
      currentDecision: 'Instantly escalates to HIGH PRIORITY: "Verified Multi-Signal Anomaly: Concealment + Exit Vector". Audio alert sent to responder station.',
      whyThisDecision: 'Contextual Hindsight differentiates: isolated shelf visits are benign, but concealment + exit vector matches verified historical confirmed patterns.',
      differenceDescription: 'Contextual risk elevated from LOW to HIGH; priority assigned to Exit Verification Station #02.',
      progressionSteps: [
        {
          step: 1,
          iterationLabel: 'Single-Signal Observation',
          policyValue: 'Isolated gesture detection',
          measuredOutcome: 'Ambiguous confidence (60%)',
          takeaway: 'Single camera frame insufficient for confident action',
          status: 'completed'
        },
        {
          step: 2,
          iterationLabel: 'Sequence Correlation (Current State)',
          policyValue: 'Concealment Gesture + Rapid Exit Corridor Path = HIGH ALERT',
          measuredOutcome: 'Confirmed incident verified accurately at exit check',
          takeaway: 'High-accuracy sequence verification verified in Hindsight',
          status: 'current',
          impactMetric: '96% detection accuracy'
        }
      ]
    });

    // Scenario 10: Checkout Quantity Mismatch (Benign Customer Self-Correction)
    this.traces.set('SEC_CHECKOUT_BENIGN_CORRECTION', {
      id: 'SEC_CHECKOUT_BENIGN_CORRECTION',
      domain: 'SECURITY',
      agentName: 'Security Agent',
      title: 'Checkout Discrepancy: Benign Customer Self-Correction Architecture',
      scenarioType: 'CHECKOUT_MISMATCH_BENIGN',
      pastSituation: 'Exit computer vision basket camera detected 4 items while customer digital cart recorded 3 paid items.',
      pastDecision: 'Displayed polite non-accusatory self-correction prompt: "1 unscanned item noticed. Add to cart to proceed?"',
      pastHumanAction: 'Customer tapped "Add to digital cart", completed the simulated checkout, and exited without dispute.',
      actualOutcome: 'Reconciliation successful; customer appreciated seamless self-correction; zero confrontation.',
      outcomeType: 'BENIGN_CORRECTION',
      businessImpact: {
        metric: 'Zero-Friction Loss Prevention',
        value: '100% payments captured',
        financialImpact: 'â‚¹85 captured without confrontation'
      },
      retainedLesson: 'Checkout discrepancies are benign self-correction opportunities 92% of the time. Never frame as security violation; preserve customer dignity with seamless 1-tap cart addition.',
      hindsightDocumentId: 'hindsight-sec-checkout-benign-10',
      confidenceScore: 0.98,
      currentContext: 'Customer at Exit Station has 1 unscanned milk packet in physical basket.',
      previousBehavior: 'Lock exit gate, trigger red flashing light, and accuse customer of unpaid merchandise.',
      currentDecision: 'Renders polite green verification dialog: "Looks like an extra milk packet was added! Tap below to add to bill & complete exit."',
      whyThisDecision: 'Hindsight experience confirms 92% of checkout mismatches are accidental oversights that resolve smoothly when empowered by self-correction.',
      differenceDescription: 'Zero accusation, zero gate-locking; non-adversarial 1-tap reconciliation flow active.',
      progressionSteps: [
        {
          step: 1,
          iterationLabel: 'Adversarial Legacy Approach',
          policyValue: 'Halt exit gate; treat quantity discrepancy as theft alert',
          measuredOutcome: 'Customer embarrassed; dispute created; brand perception damaged',
          takeaway: 'Discrepancy != theft; 92% are honest scanning oversights',
          status: 'completed'
        },
        {
          step: 2,
          iterationLabel: 'Adaptive Self-Correction Policy',
          policyValue: 'Polite 1-tap self-correction dialog before demo checkout',
          measuredOutcome: '100% of shoppers self-correct within 12 seconds; full revenue collected',
          takeaway: 'Dignified loss prevention delivers highest revenue capture & customer NPS',
          status: 'current',
          impactMetric: '100% peaceful reconciliation'
        }
      ]
    });

    // Ensure all aliases and fields are guaranteed
    for (const [id, trace] of this.traces.entries()) {
      if (!trace.pastExperience) trace.pastExperience = trace.pastSituation;
      if (!trace.retainedExperience) trace.retainedExperience = trace.retainedLesson;
      if (!trace.currentOutcome) trace.currentOutcome = trace.actualOutcome;
      if (!trace.newOutcome) trace.newOutcome = trace.currentOutcome;
      if (!trace.policyProgression) trace.policyProgression = trace.progressionSteps;
      if (!trace.financialImpact) trace.financialImpact = trace.businessImpact;
    }
  }

  // =========================================================================
  // PUBLIC ACCESSORS & SCENARIO API
  // =========================================================================

  public getAllTraces(): AdaptiveExperienceTrace[] {
    return Array.from(this.traces.values());
  }

  public getTracesByDomain(domain: 'CUSTOMER' | 'STORE' | 'SECURITY'): AdaptiveExperienceTrace[] {
    return Array.from(this.traces.values()).filter(t => t.domain === domain);
  }

  public getTraceById(id: string): AdaptiveExperienceTrace | undefined {
    return this.traces.get(id);
  }

  // =========================================================================
  // EXECUTABLE AGENT BEHAVIORAL HOOKS
  // =========================================================================

  public isReturningCustomer(customerId: string): boolean {
    if (!customerId) return false;
    // Known returning demo customers
    const returningDemoIds = ['CUST-1001', 'CUST-1002', 'USER00001', 'USER00002', 'USER00003'];
    if (returningDemoIds.includes(customerId)) return true;

    try {
      // Check past order history
      const pastOrders = db.getOrders().filter(o => o.customer_id === customerId);
      if (pastOrders.length > 0) return true;

      // Check past completed sessions
      const sessions = ((db as any).state?.shoppingSessions || []).filter((s: any) => s.customer_id === customerId && s.status === 'COMPLETED');
      if (sessions.length > 0) return true;

      // Check past recalled memories
      if (memoryService.hasCustomerMemories(customerId)) return true;
    } catch {
      // safe fallback
    }

    return false;
  }

  /**
   * CUSTOMER AGENT: Re-weights and personalizes product catalog using Customer Hindsight.
   * Gated strictly to returning customers with purchase/interaction history,
   * or explicit dietary preferences configured by the customer.
   */
  public applyCustomerHindsightToProducts(customerId: string, products: Product[]): Array<Product & {
    adaptationTrace?: AdaptiveExperienceTrace;
    personalizedScore: number;
    reasonBadge?: string;
    _hindsightTag?: string;
    _hindsightReason?: string;
    _hindsightSuppressed?: boolean;
    isDeprioritized?: boolean;
  }> {
    const isReturning = this.isReturningCustomer(customerId);
    const customer = db.getCustomer(customerId);
    const prefs = customer ? db.getCustomerPreferences(customerId) : undefined;
    const rawPrefs = (prefs?.dietary_preferences || (customer as any)?.dietary_preferences || []) as string[];
    const dietaryPrefs = rawPrefs.map((p: string) => p.toLowerCase());
    const hasDietaryCustomizations = dietaryPrefs.length > 0;

    return products.map(prod => {
      let score = typeof prod.rating === 'number' ? prod.rating / 5 : 0.8; // Baseline score
      let reasonBadge: string | undefined = undefined;
      let adaptationTrace: AdaptiveExperienceTrace | undefined = undefined;
      let isDeprioritized = false;

      const pName = prod.name.toLowerCase();
      const pTags = (prod.tags || []).map((t: string) => t.toLowerCase());

      // 1. EXPLICIT CUSTOMER CUSTOMIZATIONS (Works for both new and returning if explicitly configured)
      if (hasDietaryCustomizations) {
        if (dietaryPrefs.some((d: string) => d.includes('vegan')) && pTags.includes('vegan')) {
          score += 0.45;
          reasonBadge = 'ðŸŒ± Matches your Vegan preference';
        } else if (dietaryPrefs.some((d: string) => d.includes('protein')) && (pTags.includes('high protein') || pTags.includes('protein'))) {
          score += 0.40;
          reasonBadge = 'ðŸ’ª Matches your High Protein preference';
        } else if (dietaryPrefs.some((d: string) => d.includes('organic')) && prod.is_organic) {
          score += 0.35;
          reasonBadge = 'ðŸŒ¿ Matches your Organic preference';
        } else if (dietaryPrefs.some((d: string) => d.includes('sugar') || d.includes('unsweetened')) && pName.includes('greek yogurt') && !pName.includes('strawberry')) {
          score += 0.50;
          reasonBadge = 'ðŸŽ¯ Matches your plain unsweetened requirement';
        }
      }

      // 2. RETURNING CUSTOMER HINDSIGHT ONLY (Strictly suppressed for brand new customers)
      if (isReturning) {
        // Sourdough preference (Customer explicit choice history)
        if (pName.includes('sourdough')) {
          score += 0.85;
          reasonBadge = 'â­ Hindsight: Preferred Choice (Artisan Sourdough)';
          adaptationTrace = this.traces.get('CUST_PREF_SOURDOUGH');
        } else if (pName.includes('white bread') || pName.includes('whole wheat bread') || pName.includes('brown bread')) {
          score -= 0.15;
        }

        // Avocado Oil rejection penalty (Negative feedback learning: 3 consecutive rejections)
        if (pName.includes('avocado')) {
          score -= 0.90;
          reasonBadge = 'â¬‡ï¸ Hindsight: Deprioritized (Rejected 3x per your feedback: "Too expensive")';
          isDeprioritized = true;
          adaptationTrace = this.traces.get('CUST_REJECT_AVOCADO_OIL');
        } else if (pName.includes('mustard oil')) {
          score += 0.35;
          reasonBadge = 'â­ Preferred cooking oil in past orders';
        }

        // Oats substitute (Accepted substitution)
        if (pName.includes('true elements') || pName.includes('oats')) {
          score += 0.40;
          reasonBadge = 'ðŸ”„ Hindsight: Verified Accepted Substitute (Rolled Oats)';
          adaptationTrace = this.traces.get('CUST_SUBSTITUTE_OATS');
        }

        // Plain Greek yogurt explicit correction
        if (pName.includes('greek yogurt') && !pName.includes('strawberry') && !pName.includes('mango')) {
          score += 0.50;
          if (!reasonBadge) reasonBadge = 'ðŸŽ¯ Matches your plain unsweetened requirement';
          adaptationTrace = this.traces.get('CUST_EXPLICIT_CORRECTION');
        } else if (pName.includes('yogurt') && (pName.includes('strawberry') || pName.includes('sweet') || pName.includes('flavored'))) {
          score -= 0.80;
          isDeprioritized = true;
          reasonBadge = 'ðŸš« Filtered: You requested no sweetened dairy';
        }

        // Dynamic customer memory recall from Hindsight bank
        try {
          const custMemories = memoryService.getCustomerMemoriesForQuery(customerId, pName, 2);
          for (const m of custMemories) {
            const mLower = m.text.toLowerCase();
            if (mLower.includes('prefer') || mLower.includes('like') || mLower.includes('istam') || mLower.includes('sourdough')) {
              score += 0.40;
              if (!reasonBadge) reasonBadge = 'â­ Preferred Choice per your past purchases';
            } else if (mLower.includes('reject') || mLower.includes('dislike') || mLower.includes('expensive') || mLower.includes('nachaledu') || mLower.includes('avocado')) {
              score -= 0.60;
              isDeprioritized = true;
              if (!reasonBadge) reasonBadge = 'â¬‡ï¸ Deprioritized per your feedback';
            }
          }
        } catch {
          // Safe offline fallback
        }
      }

      return {
        ...prod,
        personalizedScore: Math.max(0, Math.min(1.0, score)),
        reasonBadge,
        _hindsightTag: reasonBadge,
        _hindsightReason: isDeprioritized ? reasonBadge : undefined,
        _hindsightSuppressed: isDeprioritized,
        adaptationTrace,
        isDeprioritized
      };
    }).sort((a, b) => b.personalizedScore - a.personalizedScore);
  }

  /**
   * STORE AGENT: Calculates adaptive restock allocation accounting for Hindsight convergence (30 -> 38 -> 44 -> 42)
   */
  public getAdaptiveRestockDecision(
    productId: string,
    context?: { day?: string; hour?: number; currentStock?: number; unfulfilledDemand?: number; isRushHour?: boolean }
  ): {
    recommendedQty: number;
    adaptedQuantity: number;
    baselineQty: number;
    policyConvergence: string[];
    adaptationTrace: AdaptiveExperienceTrace;
    reasoning: string;
    rationale: string;
    confidence: number;
    convergenceStep: number;
  } {
    const trace = this.traces.get('STORE_RESTOCK_CONVERGENCE')!;
    const isSundayRush = context?.isRushHour || context?.day?.toLowerCase() === 'sunday' || (context?.hour || 0) >= 16 || (context?.unfulfilledDemand || 0) > 0;
    const step = this.currentRestockConvergenceStep;

    if (isSundayRush) {
      if (step === 1) {
        return {
          recommendedQty: 30,
          adaptedQuantity: 30,
          baselineQty: 30,
          policyConvergence: ['30 units (Baseline - Initial Allocation)'],
          adaptationTrace: trace,
          reasoning: 'Initial baseline replenishment policy allocates 30 units for Sunday evening rush.',
          rationale: 'Baseline policy: 30 units.',
          confidence: 0.85,
          convergenceStep: 1
        };
      } else if (step === 2) {
        return {
          recommendedQty: 38,
          adaptedQuantity: 38,
          baselineQty: 30,
          policyConvergence: [
            '30 units (Week 1 Baseline: Stockout in 42m, 18 unmet requests)',
            '38 units (Iteration 1: +8 Shortage Delta Adjusted)'
          ],
          adaptationTrace: trace,
          reasoning: 'Store Hindsight recalled Week 1 stockout: 30 units depleted in 42m with 18 unmet requests (~â‚¹1,450 lost sales). Shortage delta (+8 units) applied -> 38 units.',
          rationale: 'Shortage delta from Week 1 outcome (+8 units) -> Recommending 38 units (+26%).',
          confidence: 0.92,
          convergenceStep: 2
        };
      } else if (step === 3) {
        return {
          recommendedQty: 44,
          adaptedQuantity: 44,
          baselineQty: 30,
          policyConvergence: [
            '30 units (Week 1: Stockout)',
            '38 units (Week 2: 4 unmet requests at 7:15 PM)',
            '44 units (Iteration 2: +6 Surge Buffer Adjusted)'
          ],
          adaptationTrace: trace,
          reasoning: 'Store Hindsight recalled Week 2 shortage: 38 units still experienced 4 unmet requests at 7:15 PM. Shortage buffer (+6 units) applied -> 44 units.',
          rationale: 'Compensating for residual shortage (+6 units) -> Recommending 44 units (+46%).',
          confidence: 0.95,
          convergenceStep: 3
        };
      } else {
        return {
          recommendedQty: 42,
          adaptedQuantity: 42,
          baselineQty: 30,
          policyConvergence: [
            '30 units (Week 1: Stockout in 42m)',
            '38 units (Week 2: Mild shortage at 7:15 PM)',
            '44 units (Week 3: 3 residual units overstock)',
            '42 units (Week 4: Converged Equilibrium - 0 stockouts, 0 waste)'
          ],
          adaptationTrace: trace,
          reasoning: 'Hindsight learned from 3 prior Sunday outcomes: baseline 30 stocked out in 42m; 38 stocked out at 7:15 PM; 44 had 3 excess units. Rebalanced policy converged to exactly 42 units with 0 stockouts and 0 waste.',
          rationale: 'Policy converged across 4 iterations (30 -> 38 -> 44 -> 42 units) to cover peak rush with zero waste.',
          confidence: 0.98,
          convergenceStep: 4
        };
      }
    }

    return {
      recommendedQty: 25,
      adaptedQuantity: 25,
      baselineQty: 25,
      policyConvergence: ['25 units (Weekday Standard)'],
      adaptationTrace: trace,
      reasoning: 'Standard weekday velocity requires baseline 25 units.',
      rationale: 'Baseline weekday stock is sufficient.',
      confidence: 0.90,
      convergenceStep: 1
    };
  }

  /**
   * SECURITY AGENT: Evaluates multi-signal context vs past false positive learning
   */
  public evaluateContextualSecurityRisk(observation: {
    shelfVisits?: number;
    concealmentDetected?: boolean;
    exitTrajectory?: boolean;
    itemsCountDiscrepancy?: number;
    location?: string;
    eventType?: string;
    behaviorContext?: string;
    customerSessionId?: string;
  }): {
    assessmentLevel: 'BENIGN' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    reasoning: string;
    action: string;
    adaptationTrace: AdaptiveExperienceTrace;
    isFalsePositiveSuppressed: boolean;
    adaptedRiskScore: number;
    recommendedAction: string;
    requiresDiscreetAssistance: boolean;
    verifiedBenignSelfCorrection: boolean;
    rationale: string;
    retainedRuleApplied: string;
  } {
    const ctx = (observation.behaviorContext || '').toLowerCase();
    const eventType = observation.eventType || '';

    // Case 1: Multi-signal Sequence (Linger + Concealment + Exit Trajectory)
    const isConcealmentExit = observation.concealmentDetected && observation.exitTrajectory;
    const isConcealmentCtx = (ctx.includes('conceal') || ctx.includes('pocket')) && (ctx.includes('exit') || ctx.includes('movement'));

    if (isConcealmentExit || isConcealmentCtx) {
      const trace = this.traces.get('SEC_CONCEALMENT_EXIT_SEQUENCE')!;
      return {
        assessmentLevel: 'HIGH',
        title: 'Multi-Signal Correlation: Concealment Sequence + Rapid Exit Vector',
        reasoning: 'While shelf lingering alone is benign, product concealment into outer garment paired with direct trajectory toward exit corridor represents a verified high-confidence pattern (>95% confirmed incidents in Hindsight).',
        action: 'Courteous exit checkpoint assistance requested at Gate 02.',
        adaptationTrace: trace,
        isFalsePositiveSuppressed: false,
        adaptedRiskScore: 0.95,
        recommendedAction: 'Discreet floor associate assistance requested at Gate 02. Verify cart state politely.',
        requiresDiscreetAssistance: true,
        verifiedBenignSelfCorrection: false,
        rationale: 'High-risk multi-signal sequence verified: pocket concealment + exit path.',
        retainedRuleApplied: trace.retainedLesson
      };
    }

    // Case 2: Checkout discrepancy / benign self-correction
    const isDiscrepancy = (observation.itemsCountDiscrepancy || 0) > 0 || eventType === 'CHECKOUT_QUANTITY_MISMATCH' || ctx.includes('extra carton') || ctx.includes('checkout') || ctx.includes('mismatch') || ctx.includes('cart');
    if (isDiscrepancy) {
      const trace = this.traces.get('SEC_CHECKOUT_BENIGN_CORRECTION')!;
      return {
        assessmentLevel: 'MEDIUM',
        title: 'Checkout Quantity Discrepancy â€” Benign Self-Correction Pathway',
        reasoning: 'Hindsight experiential memory confirms 92% of checkout mismatches are accidental scanning oversights that resolve smoothly when presented with an empowering 1-tap self-correction prompt.',
        action: 'Display polite non-accusatory self-correction dialog on customer checkout terminal.',
        adaptationTrace: trace,
        isFalsePositiveSuppressed: false,
        adaptedRiskScore: 0.05,
        recommendedAction: 'Unlock checkout flow. Customer verified honest self-correction.',
        requiresDiscreetAssistance: false,
        verifiedBenignSelfCorrection: true,
        rationale: 'Discrepancy resolved via polite self-correction dialog without dispute.',
        retainedRuleApplied: trace.retainedLesson
      };
    }

    // Case 3: Shelf linger alone without concealment (False positive learning)
    const isLinger = (observation.shelfVisits || 0) >= 3 || ctx.includes('hesitat') || ctx.includes('linger') || ctx.includes('pasta shelf') || ctx.includes('comparing');
    if (isLinger) {
      const trace = this.traces.get('SEC_FALSE_POSITIVE_SHELF')!;
      return {
        assessmentLevel: 'BENIGN',
        title: 'Normal Comparison Shopping â€” False Positive Escalation Suppressed',
        reasoning: 'Hindsight history demonstrates that repeated shelf lingering alone without concealment is benign comparison shopping 80% of the time (e.g. reading allergy labels). Standalone alert escalation suppressed to eliminate responder fatigue.',
        action: 'Log as normal comparison shopping. Zero audible chime; zero employee dispatch.',
        adaptationTrace: trace,
        isFalsePositiveSuppressed: true,
        adaptedRiskScore: 0.18,
        recommendedAction: 'No intervention required. Behavior verified as benign comparison shopping.',
        requiresDiscreetAssistance: false,
        verifiedBenignSelfCorrection: false,
        rationale: 'Shelf linger alone suppressed based on historical 80% false positive learning.',
        retainedRuleApplied: trace.retainedLesson
      };
    }

    const defaultTrace = this.traces.get('SEC_FALSE_POSITIVE_SHELF')!;
    return {
      assessmentLevel: 'BENIGN',
      title: 'Routine Store Movement',
      reasoning: 'Observed shopper activity conforms to regular browsing patterns.',
      action: 'Continuous background monitoring active.',
      adaptationTrace: defaultTrace,
      isFalsePositiveSuppressed: false,
      adaptedRiskScore: 0.10,
      recommendedAction: 'No intervention required.',
      requiresDiscreetAssistance: false,
      verifiedBenignSelfCorrection: false,
      rationale: 'Routine browsing within normal baseline.',
      retainedRuleApplied: defaultTrace.retainedLesson
    };
  }

  // =========================================================================
  // DOMAIN METRICS & ROI COMPUTATION
  // =========================================================================

  public getMetricsSummary(): {
    customer: DomainAdaptationMetrics & { acceptanceRate: number; explicitCorrectionsRetained: number };
    store: DomainAdaptationMetrics & { stockoutDropPercentage: number; recoveredSalesWeekly: number; queueSLAPreventionRate: number };
    security: DomainAdaptationMetrics & { falseAlarmDropPercentage: number; shrinkagePreventedMonthly: number; benignResolutions: number };
  } {
    return {
      customer: {
        metric1: { label: 'Recommendation Acceptance', value: '88.4%', change: '+36.2%', positive: true },
        metric2: { label: 'Repeat Preference Consistency', value: '91.0%', change: '+14.5%', positive: true },
        metric3: { label: 'Substitute Acceptance Rate', value: '84.2%', change: '+29.0%', positive: true },
        roiImpact: {
          label: 'Customer Shopping Velocity',
          value: '42s faster per trip',
          note: 'Demonstrated reduction in repeated preference interrogations & friction'
        },
        acceptanceRate: 0.884,
        explicitCorrectionsRetained: 2
      },
      store: {
        metric1: { label: 'Stockout Reduction Rate', value: '85.0%', change: '-85.0% stockouts', positive: true },
        metric2: { label: 'Policy Convergence Accuracy', value: '98.0%', change: '42 units converged', positive: true },
        metric3: { label: 'Peak Queue Wait Reduction', value: '2.1 mins', change: '-71% wait time', positive: true },
        roiImpact: {
          label: 'Recovered Sales Throughput',
          value: 'â‚¹18,500 / week',
          note: 'Measured revenue from eliminated Sunday stockouts & queue preemption'
        },
        stockoutDropPercentage: 0.85,
        recoveredSalesWeekly: 18500,
        queueSLAPreventionRate: 0.94
      },
      security: {
        metric1: { label: 'False Positive Drop', value: '-82.0%', change: '82% fewer false alarms', positive: true },
        metric2: { label: 'Sequence Detection Accuracy', value: '96.4%', change: '+34.0% confidence', positive: true },
        metric3: { label: 'Average Response Time', value: '29 secs', change: '-49s latency', positive: true },
        roiImpact: {
          label: 'Responder Staff Hours Saved',
          value: '14.5 hrs / week',
          note: 'Saved from eliminating spurious shelf-lingering dispatches'
        },
        falseAlarmDropPercentage: 0.82,
        shrinkagePreventedMonthly: 28000,
        benignResolutions: 14
      }
    };
  }
}

export const hindsightEngine = new HindsightEngine();


