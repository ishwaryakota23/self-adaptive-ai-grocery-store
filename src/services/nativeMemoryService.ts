import type { MemoryAgent } from '../server/memoryEngine.js';
import { db } from './db.js';
import { managerService } from './managerService.js';

export interface MemoryActivityLogEntry {
  id: string; timestamp: string; bankId: string; operation: 'retain' | 'recall' | 'reflect' | 'health';
  input: string; resultSummary: string; itemCount: number; success: boolean; durationMs: number;
  tags?: string[]; source?: 'native-memory';
}
export type MemoryConnectionState = 'connected' | 'configuration_missing' | 'service_unavailable';
export type MemoryAvailability = 'available' | 'unavailable' | 'unknown';
export type MemoryDiagnosticCode = 'NATIVE_MEMORY_READY' | 'NATIVE_MEMORY_UNAVAILABLE';
export interface MemoryOperationalStatus {
  state: MemoryConnectionState; diagnosticCode?: MemoryDiagnosticCode; error?: string;
  storeBank: { id: string; availability: MemoryAvailability };
  securityBank: { id: string; availability: MemoryAvailability };
  diagnosticsAreReadOnly: true;
}
export interface RecallResultItem { id: string; text: string; type?: string; entities?: string[]; tags?: string[]; scores?: { final?: number; keyword?: number } }
export interface CustomerExperienceInput { customerId: string; context?: string; observation: string; tags?: string[]; metadata?: Record<string, string>; category?: string; documentId?: string }
export interface StoreExperienceInput { situation?: string; actionTaken?: string; outcome?: string; takeaway?: string; category?: string; tags?: string[]; metadata?: Record<string, string>; actionDescription?: string; actualOutcome?: string; takeawayLesson?: string; documentId?: string }
export interface SecurityExperienceInput { incidentType: string; pattern: string; investigationDetails: string; resolution: string; outcomeTakeaway: string; tags?: string[]; metadata?: Record<string, string> }
export interface MemoryWorthinessDecision { worthy: boolean; reason: string; category?: string; confidence?: number; sanitizedContent?: string }

type Scope = { agent: MemoryAgent; userId?: string; branchId?: string };
const getMemoryEngine = () => import('../server/memoryEngine.js');
const STORE_BANK = 'grocerai-store-main';
const SECURITY_BANK = 'grocerai-security-main';
function bankScope(bankId: string): Scope {
  const customer = /^grocerai-customer-([\w-]{1,50})$/.exec(bankId);
  if (customer) return { agent: 'customer', userId: customer[1] };
  if (bankId === STORE_BANK) return { agent: 'store', branchId: 'BRANCH-104' };
  if (bankId === SECURITY_BANK) return { agent: 'security', branchId: 'BRANCH-104' };
  const lab = /^grocerai-learning-lab-(customer|store|security)-([a-z0-9-]{1,80})(?:-run-[a-z0-9-]{12,20})?$/.exec(bankId);
  if (lab) return lab[1] === 'customer'
    ? { agent: 'customer', userId: `LAB-${lab[2]}` }
    : { agent: lab[1] as MemoryAgent, branchId: `LAB-${lab[2]}` };
  throw new Error('Memory scope is not authorized.');
}
const bankIdFor = (scope: Scope) => scope.agent === 'customer' ? `grocerai-customer-${scope.userId}` : scope.agent === 'store' ? STORE_BANK : SECURITY_BANK;

export class NativeMemoryService {
  private healthError = '';
  private status?: MemoryOperationalStatus;
  private activities: MemoryActivityLogEntry[] = [];
  private log(entry: Omit<MemoryActivityLogEntry, 'id' | 'timestamp' | 'source'>) {
    this.activities.unshift({ ...entry, id: `memory-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`, timestamp: new Date().toISOString(), source: 'native-memory' });
    this.activities = this.activities.slice(0, 100);
  }
  public getCustomerBank(customerId: string) { return `grocerai-customer-${customerId}`; }
  public getStoreBank() { return STORE_BANK; }
  public getSecurityBank() { return SECURITY_BANK; }
  public getLearningLabBank(domain: 'CUSTOMER' | 'STORE' | 'SECURITY', scenarioId: string) { return `grocerai-learning-lab-${domain.toLowerCase()}-${scenarioId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`; }
  public getOperationalStatusSnapshot() { return this.status; }
  public getHealthError() { return this.healthError; }
  public safeDiagnosticError(error: unknown) { return error instanceof Error ? error.message : 'Native memory service is unavailable.'; }
  public getActivityLog() { return this.activities.slice(); }
  public async fetchActivityLog() {
    if (typeof window === 'undefined') return this.getActivityLog();
    const response = await fetch('/api/memory/activity', { headers: { Authorization: `Bearer ${this.managerToken()}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.error || 'Memory activity is unavailable.');
    return data.activities || [];
  }
  public async fetchCloudActivityLog() { return this.fetchActivityLog(); }
  private managerToken() { try { return managerService.getAuthToken() || ''; } catch { return ''; } }
  private customerToken(customerId: string) {
    // The existing customer identity token remains the authoritative browser identity.
    try {
      return db.getActiveCustomerIdentityToken(customerId)?.secure_token || '';
    } catch { /* server-side caller */ }
    return '';
  }
  public evaluateMemoryWorthiness(candidate: { text: string; type: 'CUSTOMER' | 'STORE' | 'SECURITY' }): MemoryWorthinessDecision {
    const lowered = candidate.text.toLowerCase();
    if (/(password|otp|verification code|\bcvv\b|card number|upi pin|cid_sec|sq_handoff|access token)/i.test(candidate.text)) return { worthy: false, reason: 'Sensitive or temporary data is excluded from memory.' };
    if (candidate.text.trim().length < 8) return { worthy: false, reason: 'Memory content is too brief.' };
    if (candidate.type === 'CUSTOMER' && !/(prefer|like|dislike|hate|allerg|intoler|vegan|vegetarian|budget|substitut|correct|remember|organic|brand)/i.test(lowered)) return { worthy: false, reason: 'No durable customer preference or outcome was detected.' };
    return { worthy: true, reason: 'Eligible interaction or outcome.', category: candidate.type.toLowerCase(), confidence: 0.8 };
  }
  private async write(scope: Scope, content: string, options: any = {}) {
    const started = Date.now();
    let result;
    if (typeof window !== 'undefined') {
      const customerId = scope.agent === 'customer' ? scope.userId : undefined;
      const auth = customerId ? this.customerToken(customerId) : this.managerToken();
      const response = await fetch('/api/memory/retain', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify({ ...scope, content, kind: options.kind || options.tags?.[0] || 'experience', metadata: options.metadata || {}, sessionId: options.sessionId }) });
      result = await response.json().catch(() => ({}));
      if (!response.ok) result = { success: false, error: result.error || `Memory persistence failed (${response.status}).` };
    } else result = await (await getMemoryEngine()).storeMemory({ ...scope, content, kind: options.kind || options.tags?.[0] || 'experience', metadata: options.metadata, sessionId: options.sessionId });
    this.log({ operation: 'retain', bankId: bankIdFor(scope), input: content.slice(0, 100), resultSummary: result.success ? 'Persisted to Supabase PostgreSQL.' : `Persistence failed: ${result.error || 'unconfirmed'}`, itemCount: result.success ? 1 : 0, success: result.success, durationMs: Date.now() - started, tags: options.tags });
    return result;
  }
  public async retain(bankId: string, content: string | string[], options?: any) {
    try {
      const scope = bankScope(bankId);
      const writeOptions = { ...options, sessionId: options?.sessionId || (bankId.includes('learning-lab-') ? bankId : undefined) };
      const result = await this.write(scope, Array.isArray(content) ? content.join('\n') : content, writeOptions);
      return { success: result.success, bankId, itemsCount: result.success ? 1 : 0, error: result.error, documentId: result.memory?.id };
    } catch (error: any) { return { success: false, bankId, itemsCount: 0, error: error?.message || 'Memory persistence failed.' }; }
  }
  public async recall(bankId: string, query: string, options?: any) {
    try {
      const scope = bankScope(bankId); let result;
      if (typeof window !== 'undefined') {
        const auth = scope.agent === 'customer' ? this.customerToken(scope.userId!) : this.managerToken();
        const response = await fetch('/api/memory/recall', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify({ ...scope, sessionId: bankId.includes('learning-lab-') ? bankId : options?.sessionId, query, limit: options?.limit || 8 }) });
        const data = await response.json().catch(() => ({}));
        result = response.ok ? data : { success: false, memories: [], error: data.error || `Memory recall failed (${response.status}).` };
      } else result = await (await getMemoryEngine()).recallMemories({ ...scope, sessionId: bankId.includes('learning-lab-') ? bankId : options?.sessionId, query, limit: options?.limit });
      const results: RecallResultItem[] = (result.memories || []).map((m: any) => ({ id: m.id, text: m.content, type: m.kind, tags: [], scores: { final: m.score } }));
      this.log({ operation: 'recall', bankId, input: query, resultSummary: result.success ? `Retrieved ${results.length} memory record(s).` : `Recall failed: ${result.error || 'unconfirmed'}`, itemCount: results.length, success: result.success, durationMs: 0, tags: options?.tags });
      return { success: Boolean(result.success), results, promptString: results.map(item => item.text).join('\n'), error: result.error };
    } catch (error: any) { return { success: false, results: [], promptString: '', error: error?.message || 'Memory recall failed.' }; }
  }
  public async reflect(bankId: string, query: string, options?: any) {
    try {
      const scope = bankScope(bankId); let result;
      if (typeof window !== 'undefined') {
        const auth = scope.agent === 'customer' ? this.customerToken(scope.userId!) : this.managerToken();
        const response = await fetch('/api/memory/reflect', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify({ ...scope, sessionId: bankId.includes('learning-lab-') ? bankId : undefined, query }) });
        const data = await response.json().catch(() => ({})); result = response.ok ? data : { success: false, reflections: [], error: data.error };
      } else result = await (await getMemoryEngine()).reflectOnHistory({ ...scope, sessionId: bankId.includes('learning-lab-') ? bankId : undefined, query });
      const answer = result.reflections?.join(' ') || '';
      return { success: Boolean(result.success), answer, error: result.error };
    } catch (error: any) { return { success: false, answer: '', error: error?.message || 'Reflection failed.' }; }
  }
  public async retainCustomerExperience(exp: CustomerExperienceInput) {
    const gate = this.evaluateMemoryWorthiness({ text: exp.observation, type: 'CUSTOMER' });
    if (!gate.worthy) return { success: false, error: gate.reason };
    const result = await this.write({ agent: 'customer', userId: exp.customerId }, exp.observation, { ...exp, kind: exp.category || 'preference' });
    return { success: Boolean(result.success), memoryId: result.memory?.id, superseded: false, error: result.error };
  }
  public async recallCustomerMemories(customerId: string, query: string, tags?: string[]) { return this.recall(this.getCustomerBank(customerId), query, { tags }); }
  public async recallCustomerPreferences(customerId: string, query: string, tags?: string[]) { return this.recallCustomerMemories(customerId, query, tags); }
  public async retainCustomerSubstitutionExperience(customerId: string, requestedItem: string, acceptedSubstitute: string, accepted: boolean) {
    return this.retainCustomerExperience({ customerId, observation: accepted ? `Customer accepted substitute ${acceptedSubstitute} for ${requestedItem}.` : `Customer declined substitute ${acceptedSubstitute} for ${requestedItem}.`, category: 'substitution' });
  }
  public async retainCustomerPreferenceExperience(customerOrInput: any, productName?: string, preferred = true, _confidence?: number) {
    const exp = typeof customerOrInput === 'string' ? { customerId: customerOrInput, observation: `Customer ${preferred ? 'prefers' : 'declined'} ${productName || 'item'}.`, category: 'preference' } : { customerId: customerOrInput.customerId, observation: `Customer prefers ${customerOrInput.observedPattern || customerOrInput.preferenceTitle || 'the recorded choice'}.`, category: 'preference' };
    const result = await this.retainCustomerExperience(exp);
    return { success: result.success, documentId: result.memoryId || '', memoryId: result.memoryId, superseded: false };
  }
  public hasCustomerMemories(_customerId: string) { return false; }
  public getCustomerMemoriesForQuery(_customerId: string, _query: string, _maxResults = 4): { id: string; text: string; score: number }[] { return []; }
  public getStoreMemoriesForQuery(_query: string, _maxResults = 4): { id: string; text: string; category?: string; score: number; isStale?: boolean }[] { return []; }
  public getSecurityMemoriesForQuery(_query: string, _maxResults = 4): { id: string; text: string; score: number }[] { return []; }
  public getSecurityExperiences(): { id: string; text: string; measuredOutcome: string; timestamp: number; tags?: string[] }[] { return []; }
  public async retainStoreOperationalExperience(exp: StoreExperienceInput) {
    const content = [`Situation: ${exp.situation || ''}`, `Action: ${exp.actionTaken || exp.actionDescription || ''}`, `Outcome: ${exp.outcome || exp.actualOutcome || ''}`, `Takeaway: ${exp.takeaway || exp.takeawayLesson || ''}`].join('\n');
    const result = await this.write({ agent: 'store', branchId: 'BRANCH-104' }, content, { ...exp, kind: exp.category || 'operational-outcome' });
    return { success: Boolean(result.success), documentId: result.memory?.id || '', error: result.error };
  }
  public async retainStoreExperience(exp: any) { return this.retainStoreOperationalExperience({ situation: exp.situation, actionTaken: exp.actionTaken, outcome: exp.measuredOutcome, takeaway: exp.operationalRule }); }
  public async recallStoreMemories(query: string, tags?: string[]) { return this.recall(STORE_BANK, query, { tags }); }
  public async retainSecurityExperience(exp: SecurityExperienceInput) {
    const content = [`Incident type: ${exp.incidentType}`, `Pattern: ${exp.pattern}`, `Investigation: ${exp.investigationDetails}`, `Resolution: ${exp.resolution}`, `Outcome: ${exp.outcomeTakeaway}`].join('\n');
    const result = await this.write({ agent: 'security', branchId: 'BRANCH-104' }, content, { ...exp, kind: exp.incidentType });
    return { success: Boolean(result.success), documentId: result.memory?.id || '', error: result.error };
  }
  public async recallSecurityMemories(query: string, tags?: string[]) { return this.recall(SECURITY_BANK, query, { tags }); }
  public async isHealthy() {
    if (typeof window !== 'undefined') {
      try { const response = await fetch('/api/memory/status', { headers: { Authorization: `Bearer ${this.managerToken()}` } }); const data = await response.json(); this.status = data.status; this.healthError = data.error || ''; return Boolean(data.isHealthy); }
      catch (error: any) { this.healthError = error?.message || 'Native memory unavailable.'; return false; }
    }
    const { success, error } = await (await getMemoryEngine()).recallMemories({ agent: 'store', branchId: 'BRANCH-104', query: 'health-check', limit: 1 });
    this.healthError = error || ''; this.status = { state: success ? 'connected' : 'service_unavailable', diagnosticCode: success ? 'NATIVE_MEMORY_READY' : 'NATIVE_MEMORY_UNAVAILABLE', error, storeBank: { id: STORE_BANK, availability: success ? 'available' : 'unavailable' }, securityBank: { id: SECURITY_BANK, availability: success ? 'available' : 'unavailable' }, diagnosticsAreReadOnly: true };
    return success;
  }
  public async checkOperationalStatus(): Promise<MemoryOperationalStatus> { await this.isHealthy(); return this.status!; }
  public async prepareLearningLabBank(_bankId: string, _domain: 'CUSTOMER' | 'STORE' | 'SECURITY') { return; }
  public async resetLearningLabBank(_bankId: string) { return; }
  public async retainStoreOperationalExperienceMemory(exp: StoreExperienceInput) { return this.retainStoreOperationalExperience(exp); }
  public getSecurityBankId() { return SECURITY_BANK; }
}

export const memoryService = new NativeMemoryService();



