declare const process: any;

import { HindsightClient, recallResponseToPromptString } from '@vectorize-io/hindsight-client';

export interface MemoryActivityLogEntry {
  id: string;
  timestamp: string;
  bankId: string;
  operation: 'retain' | 'recall' | 'reflect' | 'health';
  input: string;
  resultSummary: string;
  itemCount: number;
  success: boolean;
  durationMs: number;
  tags?: string[];
}

export interface CustomerExperienceInput {
  customerId: string;
  context?: string;
  observation: string;
  tags?: string[];
  documentId?: string;
  metadata?: Record<string, string>;
}

export interface StoreExperienceInput {
  situation: string;
  actionTaken: string;
  outcome: string;
  takeaway: string;
  category?: 'restock' | 'congestion' | 'promotion' | 'pricing' | 'shrinkage' | 'general';
  tags?: string[];
  documentId?: string;
  metadata?: Record<string, string>;
}

export interface RecallResultItem {
  id: string;
  text: string;
  type?: string;
  entities?: string[];
  tags?: string[];
  scores?: {
    final?: number;
    reranker?: number;
    semantic?: number;
    keyword?: number;
  };
}

export class HindsightService {
  private client: HindsightClient;
  private baseUrl: string;
  private activityLog: MemoryActivityLogEntry[] = [];
  private maxLogEntries = 100;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || (typeof process !== 'undefined' && process.env?.HINDSIGHT_BASE_URL) || 'http://localhost:8888';
    this.client = new HindsightClient({ baseUrl: this.baseUrl });
  }

  /**
   * Generates bank identifier for a specific customer.
   * Guarantees strict customer-level memory isolation.
   */
  public getCustomerBank(customerId: string): string {
    const cleanId = (customerId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `grocerai-customer-${cleanId}`;
  }

  /**
   * Store bank identifier for operational, supply-chain and staffing memories.
   */
  public getStoreBank(): string {
    return (typeof process !== 'undefined' && process.env?.HINDSIGHT_STORE_BANK) || 'grocerai-store-main';
  }

  /**
   * Health verification
   */
  public async isHealthy(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Retain a memory entry into a target bank.
   * Degrades gracefully without throwing if Hindsight is offline.
   */
  public async retain(
    bankId: string,
    content: string,
    options?: {
      tags?: string[];
      metadata?: Record<string, string>;
      documentId?: string;
      context?: string;
    }
  ): Promise<{ success: boolean; bankId: string; itemsCount: number; error?: string }> {
    const startTime = Date.now();
    try {
      const res = await this.client.retain(bankId, content, {
        tags: options?.tags,
        metadata: options?.metadata,
        documentId: options?.documentId,
        context: options?.context,
      });

      const count = res.items_count || 1;
      this.logActivity({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        bankId,
        operation: 'retain',
        input: content.length > 80 ? `${content.substring(0, 80)}...` : content,
        resultSummary: `Retained ${count} item(s) successfully`,
        itemCount: count,
        success: true,
        durationMs: Date.now() - startTime,
        tags: options?.tags,
      });

      return {
        success: true,
        bankId,
        itemsCount: count,
      };
    } catch (err: any) {
      if (
        err?.message?.includes('429') ||
        err?.message?.includes('Rate limit') ||
        err?.message?.includes('quota exhausted') ||
        err?.message?.includes('deferred by provider quota')
      ) {
        console.warn(`[HindsightService] Rate limit hit on ${bankId}. Waiting 15s before retry...`);
        await new Promise(r => setTimeout(r, 15000));
        try {
          const retryRes = await this.client.retain(bankId, content, {
            tags: options?.tags,
            metadata: options?.metadata,
            documentId: options?.documentId,
            context: options?.context,
          });
          const count = retryRes.items_count || 1;
          this.logActivity({
            id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toLocaleTimeString(),
            bankId,
            operation: 'retain',
            input: content.length > 80 ? `${content.substring(0, 80)}...` : content,
            resultSummary: `Retained ${count} item(s) on retry`,
            itemCount: count,
            success: true,
            durationMs: Date.now() - startTime,
            tags: options?.tags,
          });
          return { success: true, bankId, itemsCount: count };
        } catch (retryErr: any) {
          console.warn(`[HindsightService] Retry failed on ${bankId}:`, retryErr?.message || retryErr);
        }
      }

      console.warn(`[HindsightService] Retain failed on ${bankId}:`, err?.message || err);
      this.logActivity({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        bankId,
        operation: 'retain',
        input: content.length > 80 ? `${content.substring(0, 80)}...` : content,
        resultSummary: `Failed: ${err?.message || 'Connection error'}`,
        itemCount: 0,
        success: false,
        durationMs: Date.now() - startTime,
        tags: options?.tags,
      });

      return {
        success: false,
        bankId,
        itemsCount: 0,
        error: err?.message || 'Retain failed',
      };
    }
  }

  /**
   * Recall memories relevant to a natural-language query.
   * Returns parsed results and pre-formatted prompt string for LLM injection.
   */
  public async recall(
    bankId: string,
    query: string,
    options?: {
      tags?: string[];
      maxTokens?: number;
    }
  ): Promise<{
    success: boolean;
    results: RecallResultItem[];
    promptString: string;
    rawResponse?: any;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const res = await this.client.recall(bankId, query, {
        tags: options?.tags,
        maxTokens: options?.maxTokens || 1024,
      });

      const promptStr = recallResponseToPromptString(res) || '';
      const items: RecallResultItem[] = (res.results || []).map((r: any) => ({
        id: r.id,
        text: r.text,
        type: r.type,
        entities: r.entities,
        tags: r.tags,
        scores: r.scores,
      }));

      this.logActivity({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        bankId,
        operation: 'recall',
        input: query,
        resultSummary: `Recalled ${items.length} relevant memory item(s)`,
        itemCount: items.length,
        success: true,
        durationMs: Date.now() - startTime,
        tags: options?.tags,
      });

      return {
        success: true,
        results: items,
        promptString: promptStr,
        rawResponse: res,
      };
    } catch (err: any) {
      console.warn(`[HindsightService] Recall failed on ${bankId}:`, err?.message || err);
      this.logActivity({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        bankId,
        operation: 'recall',
        input: query,
        resultSummary: `Failed: ${err?.message || 'Connection error'}`,
        itemCount: 0,
        success: false,
        durationMs: Date.now() - startTime,
        tags: options?.tags,
      });

      return {
        success: false,
        results: [],
        promptString: '',
        error: err?.message || 'Recall failed',
      };
    }
  }

  /**
   * Reflect on memories to synthesize a reasoned conclusion.
   */
  public async reflect(
    bankId: string,
    query: string,
    options?: { context?: string }
  ): Promise<{ success: boolean; answer: string; error?: string }> {
    const startTime = Date.now();
    try {
      const res = await this.client.reflect(bankId, query, {
        context: options?.context,
      });

      const answer = res.text || '';
      this.logActivity({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        bankId,
        operation: 'reflect',
        input: query,
        resultSummary: `Reflected answer: ${answer.length} chars`,
        itemCount: 1,
        success: true,
        durationMs: Date.now() - startTime,
      });

      return {
        success: true,
        answer,
      };
    } catch (err: any) {
      console.warn(`[HindsightService] Reflect failed on ${bankId}:`, err?.message || err);
      this.logActivity({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        bankId,
        operation: 'reflect',
        input: query,
        resultSummary: `Failed: ${err?.message || 'Connection error'}`,
        itemCount: 0,
        success: false,
        durationMs: Date.now() - startTime,
      });

      return {
        success: false,
        answer: '',
        error: err?.message || 'Reflect failed',
      };
    }
  }

  // ============================================================================
  // DOMAIN CONVENIENCE METHODS: CUSTOMER AGENT
  // ============================================================================

  /**
   * Retain a customer experiential memory (preferences, dietary bounds, habits).
   */
  public async retainCustomerExperience(exp: CustomerExperienceInput): Promise<{ success: boolean; memoryId?: string }> {
    const bankId = this.getCustomerBank(exp.customerId);
    const tags = ['customer', 'experience', ...(exp.tags || [])];
    const docId = exp.documentId || `cust-exp-${Date.now()}`;

    const res = await this.retain(bankId, exp.observation, {
      tags,
      context: exp.context,
      documentId: docId,
      metadata: exp.metadata,
    });

    return {
      success: res.success,
      memoryId: docId,
    };
  }

  /**
   * Recall customer memories for shopping context.
   */
  public async recallCustomerMemories(customerId: string, query: string, tags?: string[]) {
    const bankId = this.getCustomerBank(customerId);
    return this.recall(bankId, query, { tags });
  }

  // ============================================================================
  // DOMAIN CONVENIENCE METHODS: STORE AGENT
  // ============================================================================

  /**
   * Retain an operational store experience (decision -> action -> outcome -> takeaway).
   */
  public async retainStoreOperationalExperience(exp: StoreExperienceInput): Promise<{ success: boolean; documentId: string }> {
    const bankId = this.getStoreBank();
    const docId = exp.documentId || `store-ops-${Date.now()}`;
    const category = exp.category || 'general';
    const tags = ['store', 'operation', category, ...(exp.tags || [])];

    const content = [
      `OPERATIONAL INCIDENT & RESOLUTION:`,
      `Situation: ${exp.situation}`,
      `Action Taken: ${exp.actionTaken}`,
      `Measured Outcome: ${exp.outcome}`,
      `Operational Takeaway & Rule: ${exp.takeaway}`,
    ].join('\n');

    const res = await this.retain(bankId, content, {
      tags,
      documentId: docId,
      metadata: {
        category,
        ...(exp.metadata || {}),
      },
    });

    return {
      success: res.success,
      documentId: docId,
    };
  }

  /**
   * Recall store operational memories for restock or dispatch intelligence.
   */
  public async recallStoreMemories(query: string, tags?: string[]) {
    const bankId = this.getStoreBank();
    return this.recall(bankId, query, { tags });
  }

  // ============================================================================
  // ACTIVITY LOGGING FOR MANAGER AUDIT / DASHBOARD
  // ============================================================================

  private logActivity(entry: MemoryActivityLogEntry) {
    this.activityLog.unshift(entry);
    if (this.activityLog.length > this.maxLogEntries) {
      this.activityLog.pop();
    }
  }

  public getActivityLog(): MemoryActivityLogEntry[] {
    return [...this.activityLog];
  }

  public clearActivityLog(): void {
    this.activityLog = [];
  }
}

export const hindsightService = new HindsightService();
