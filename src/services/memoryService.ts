import { CustomerMemoryInsight, StoreMemoryInsight } from '../types/index.js';
import { db } from './db.js';
import { hindsightService } from './hindsightService.js';

/**
 * Hindsight Memory Layer Interface
 * 
 * ARCHITECTURAL SEPARATION:
 * The application database (Supabase / local DB) manages operational transactional state
 * (products, current inventory, orders, active cart).
 * 
 * The Hindsight Memory Service manages experiential, episodic, and semantic long-term memory
 * for both the Customer Agent and the Store Agent.
 */

export interface HindsightCustomerExperience {
  customerId: string;
  context: string;
  observation: string;
  preferencesDiscovered: string[];
  sentiment: 'positive' | 'neutral' | 'frustrated';
  outcome: string;
}

export interface HindsightStoreExperience {
  eventPattern: string;
  intervention: string;
  measuredResult: string;
  learnedRule: string;
  impactScore: number;
}

export class MemoryService {
  /**
   * Commit an episodic customer memory to Hindsight vector bank.
   */
  public async rememberCustomerExperience(exp: HindsightCustomerExperience): Promise<string> {
    const bankId = hindsightService.getCustomerBank(exp.customerId);
    const content = `Context: ${exp.context}. Observation: ${exp.observation}. Preferences: ${exp.preferencesDiscovered.join(', ')}. Outcome: ${exp.outcome}`;
    const docId = `hs-cust-${Date.now()}`;

    await hindsightService.retain(bankId, content, {
      tags: ['customer', 'experience', ...exp.preferencesDiscovered],
      documentId: docId,
      metadata: {
        sentiment: exp.sentiment,
        context: exp.context,
      }
    });

    return docId;
  }

  /**
   * Recall contextual customer memories using semantic similarity from Hindsight.
   */
  public async recallCustomerExperience(customerId: string, contextQuery: string): Promise<CustomerMemoryInsight[]> {
    const bankId = hindsightService.getCustomerBank(customerId);
    const hsRecall = await hindsightService.recall(bankId, contextQuery);

    const baseDbMemories = db.getCustomerMemories(customerId);

    if (hsRecall.success && hsRecall.results.length > 0) {
      const hsInsights: CustomerMemoryInsight[] = hsRecall.results.map((r, idx) => ({
        id: r.id || `hs-mem-${idx}`,
        customer_id: customerId,
        type: 'preference',
        title: 'Customer Experiential Insight',
        description: r.text,
        tag: r.tags?.[0] || 'preference',
        confidence: r.scores?.final ? Math.min(1.0, r.scores.final) : 0.95,
        first_observed: new Date().toISOString(),
        last_reinforced: new Date().toISOString(),
        times_applied: 1
      }));

      // Combine Hindsight memories with base DB memories without duplicates
      const seen = new Set(baseDbMemories.map(m => m.description.toLowerCase()));
      const filtered = hsInsights.filter(h => !seen.has(h.description.toLowerCase()));
      return [...filtered, ...baseDbMemories];
    }

    return baseDbMemories;
  }

  /**
   * Commit an operational store incident or resolved bottleneck to Hindsight store bank.
   */
  public async rememberStoreExperience(exp: HindsightStoreExperience): Promise<string> {
    const bankId = hindsightService.getStoreBank();
    const docId = `hs-store-${Date.now()}`;
    const content = [
      `OPERATIONAL INCIDENT & INTERVENTION:`,
      `Event Pattern: ${exp.eventPattern}`,
      `Intervention: ${exp.intervention}`,
      `Measured Result: ${exp.measuredResult}`,
      `Learned Rule: ${exp.learnedRule}`,
    ].join('\n');

    await hindsightService.retain(bankId, content, {
      tags: ['store', 'operation', 'rule'],
      documentId: docId,
      metadata: {
        impactScore: String(exp.impactScore)
      }
    });

    return docId;
  }

  /**
   * Query strategic store memory from Hindsight store bank.
   */
  public async recallStoreExperience(topic: string): Promise<StoreMemoryInsight[]> {
    const bankId = hindsightService.getStoreBank();
    const hsRecall = await hindsightService.recall(bankId, topic);

    const baseDbMemories = db.getStoreMemories();

    if (hsRecall.success && hsRecall.results.length > 0) {
      const hsInsights: StoreMemoryInsight[] = hsRecall.results.map((r, idx) => ({
        id: r.id || `hs-store-mem-${idx}`,
        type: 'demand_surge',
        title: 'Store Operational Lesson',
        observation: r.text,
        consequence: 'Operational adjustments applied based on learned experience',
        learned_rule: r.text,
        confidence: r.scores?.final ? Math.min(1.0, r.scores.final) : 0.95,
        recorded_at: new Date().toISOString(),
        is_hindsight_synced: true
      }));

      return [...hsInsights, ...baseDbMemories];
    }

    return baseDbMemories;
  }
}

export const memoryService = new MemoryService();
