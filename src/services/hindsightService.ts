declare const process: any;

import { HindsightClient, recallResponseToPromptString, sdk, createClient, createConfig } from '@vectorize-io/hindsight-client';
import { db } from './db.js';
import { managerService } from './managerService.js';
import { configuredSystemBank, customerBankId, provisionBank, resolveHindsightConfig, HindsightDomain, runExistingCloudSyntheticTest, ExistingCloudTestPhase, sanitizeSecurityMemoryText } from '../server/hindsightCloudPolicy.js';

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
  source?: 'hindsight-service-operation';
}

export type HindsightConnectionState = 'connected' | 'configuration_missing' | 'authentication_failed' | 'network_unreachable' | 'endpoint_unsupported' | 'sdk_incompatible' | 'http_error' | 'service_unavailable';
export type HindsightBankAvailability = 'available' | 'unavailable' | 'unknown';
export type HindsightDiagnosticCode =
  | 'HINDSIGHT_CONNECTED'
  | 'HINDSIGHT_CONFIGURATION_MISSING'
  | 'HINDSIGHT_AUTHENTICATION_FAILED'
  | 'HINDSIGHT_DNS_FAILURE'
  | 'HINDSIGHT_CONNECTION_TIMEOUT'
  | 'HINDSIGHT_CONNECTION_REFUSED'
  | 'HINDSIGHT_TLS_FAILURE'
  | 'HINDSIGHT_NETWORK_UNREACHABLE'
  | 'HINDSIGHT_ENDPOINT_UNSUPPORTED'
  | 'HINDSIGHT_SDK_INCOMPATIBLE'
  | 'HINDSIGHT_HTTP_ERROR'
  | 'HINDSIGHT_SERVICE_UNAVAILABLE';
export interface HindsightOperationalStatus {
  state: HindsightConnectionState;
  diagnosticCode?: HindsightDiagnosticCode;
  error?: string;
  apiVersion?: string;
  storeBank: { id: string; availability: HindsightBankAvailability; diagnosticCode?: 'HINDSIGHT_BANK_NOT_FOUND'; error?: string };
  securityBank: { id: string; availability: HindsightBankAvailability; diagnosticCode?: 'HINDSIGHT_BANK_NOT_FOUND'; error?: string };
  diagnosticsAreReadOnly: true;
}

export interface CustomerExperienceInput {
  customerId: string;
  context?: string;
  observation: string;
  tags?: string[];
  documentId?: string;
  metadata?: Record<string, string>;
  confidence?: number;
  category?: 'preference' | 'dislike' | 'brand' | 'dietary' | 'recommendation_outcome' | 'substitution' | 'mission' | 'feedback' | 'language';
}

export interface StoreExperienceInput {
  situation?: string;
  actionTaken?: string;
  outcome?: string;
  takeaway?: string;
  category?: 'restock' | 'congestion' | 'promotion' | 'pricing' | 'shrinkage' | 'general' | 'demand' | string;
  tags?: string[];
  documentId?: string;
  metadata?: Record<string, string>;
  actionDescription?: string;
  expectedOutcome?: string;
  actualOutcome?: string;
  takeawayLesson?: string;
  isPositiveOutcome?: boolean;
}

export interface SecurityExperienceInput {
  incidentType: 'QR_ANOMALY' | 'SESSION_ANOMALY' | 'TRANSACTION_ANOMALY' | 'FALSE_POSITIVE' | 'TRUE_INCIDENT' | 'BENIGN_CORRECTION' | string;
  pattern: string;
  investigationDetails: string;
  resolution: string;
  outcomeTakeaway: string;
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

export interface MemoryWorthinessDecision {
  worthy: boolean;
  reason: string;
  category?: string;
  confidence?: number;
  sanitizedContent?: string;
}

export class HindsightService {
  private client?: HindsightClient;
  private auditClient?: any;
  private configuredBaseUrl?: string;
  private healthError = '';
  private lastOperationalStatus?: HindsightOperationalStatus;
  private clientBaseUrl?: string;
  private clientApiKey?: string;
  private activityLog: MemoryActivityLogEntry[] = [];
  private maxLogEntries = 100;

  // Active Customer Preference Tracking (for conflict superseding)
  private customerActivePreferences: Map<string, Map<string, { value: string; timestamp: number }>> = new Map();

  private safeError(error: any): string {
    return String(error?.message || 'Hindsight service is unavailable.')
      .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
      .replace(/(api[_-]?key[=: ]+)\S+/gi, '$1[redacted]')
      .slice(0, 400);
  }

  constructor(baseUrl?: string) {
    // Keep only an explicit server-side override here. In Vite development,
    // .env is loaded by request middleware after this module is imported, so
    // resolve process.env lazily when the first server operation occurs.
    if (typeof window === 'undefined' && typeof process !== 'undefined') {
      this.configuredBaseUrl = baseUrl?.trim() || undefined;
    }
  }

  private getClient(): HindsightClient {
    if (typeof window !== 'undefined') throw new Error('Hindsight SDK calls are server-only.');
    const env = typeof process !== 'undefined' ? process.env || {} : {};
    const config = resolveHindsightConfig({
      HINDSIGHT_BASE_URL: this.configuredBaseUrl || env.HINDSIGHT_BASE_URL,
      HINDSIGHT_API_KEY: env.HINDSIGHT_API_KEY
    });
    // Rebuild clients when the dev server reloads .env. Keep credentials only
    // in server memory and never include them in diagnostics or logs.
    if (!this.client || this.clientBaseUrl !== config.baseUrl || this.clientApiKey !== config.apiKey) {
      this.client = new HindsightClient({
        baseUrl: config.baseUrl,
        ...(config.apiKey ? { apiKey: config.apiKey } : {})
      });
      this.auditClient = createClient(createConfig({
        baseUrl: config.baseUrl,
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}
      }));
      this.clientBaseUrl = config.baseUrl;
      this.clientApiKey = config.apiKey;
    }
    return this.client;
  }

  private statusCode(error: any): number | undefined {
    return Number(error?.status || error?.statusCode || error?.response?.status || error?.cause?.status) || undefined;
  }

  private withResponse(error: any, response?: Response): any {
    return {
      name: error?.name,
      message: error?.message || String(error || ''),
      code: error?.code,
      cause: error?.cause,
      status: error?.status,
      statusCode: error?.statusCode,
      response
    };
  }

  private transportCode(error: any): string {
    let current = error;
    for (let depth = 0; current && depth < 5; depth += 1) {
      if (typeof current.code === 'string') return current.code.toUpperCase();
      current = current.cause;
    }
    return '';
  }

  private classifyConnectionError(error: any): HindsightConnectionState {
    const status = this.statusCode(error);
    if (status === 401 || status === 403) return 'authentication_failed';
    if (status === 404) return 'endpoint_unsupported';
    if (status === 410) return 'sdk_incompatible';
    if (status && status >= 400 && status < 500) return 'http_error';
    if (status && status >= 500) return 'service_unavailable';
    const code = this.transportCode(error);
    if (/^(ENOTFOUND|EAI_AGAIN|EAI_FAIL|EAI_NONAME)$/.test(code)) return 'network_unreachable';
    if (/^(ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|UND_ERR_BODY_TIMEOUT|ESOCKETTIMEDOUT|ABORT_ERR)$/.test(code) ||
      error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'network_unreachable';
    if (code === 'ECONNREFUSED') return 'network_unreachable';
    if (/^(CERT_|ERR_TLS|ERR_SSL|ERR_OSSL|UNABLE_TO_VERIFY_LEAF_SIGNATURE|DEPTH_ZERO_SELF_SIGNED_CERT)/.test(code)) return 'network_unreachable';
    if (/fetch failed|network|timeout|aborted/i.test(String(error?.message || ''))) return 'network_unreachable';
    return 'service_unavailable';
  }

  private diagnosticCode(error: any, state: HindsightConnectionState): HindsightDiagnosticCode {
    if (state === 'connected') return 'HINDSIGHT_CONNECTED';
    if (state === 'configuration_missing') return 'HINDSIGHT_CONFIGURATION_MISSING';
    if (state === 'authentication_failed') return 'HINDSIGHT_AUTHENTICATION_FAILED';
    if (state === 'endpoint_unsupported') return 'HINDSIGHT_ENDPOINT_UNSUPPORTED';
    if (state === 'sdk_incompatible') return 'HINDSIGHT_SDK_INCOMPATIBLE';
    if (state === 'http_error') return 'HINDSIGHT_HTTP_ERROR';
    if (state === 'service_unavailable') return 'HINDSIGHT_SERVICE_UNAVAILABLE';

    const code = this.transportCode(error);
    if (/^(ENOTFOUND|EAI_AGAIN|EAI_FAIL|EAI_NONAME)$/.test(code)) return 'HINDSIGHT_DNS_FAILURE';
    if (/^(ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|UND_ERR_BODY_TIMEOUT|ESOCKETTIMEDOUT|ABORT_ERR)$/.test(code) ||
      error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'HINDSIGHT_CONNECTION_TIMEOUT';
    if (code === 'ECONNREFUSED') return 'HINDSIGHT_CONNECTION_REFUSED';
    if (/^(CERT_|ERR_TLS|ERR_SSL|ERR_OSSL|UNABLE_TO_VERIFY_LEAF_SIGNATURE|DEPTH_ZERO_SELF_SIGNED_CERT)/.test(code)) return 'HINDSIGHT_TLS_FAILURE';
    return 'HINDSIGHT_NETWORK_UNREACHABLE';
  }

  private statusError(error: any): string {
    const state = this.classifyConnectionError(error);
    if (state === 'authentication_failed') return 'Hindsight rejected the configured API credentials (HTTP 401/403). Check the server-side HINDSIGHT_API_KEY.';
    if (state === 'network_unreachable') {
      const code = this.diagnosticCode(error, state);
      if (code === 'HINDSIGHT_DNS_FAILURE') return 'Hindsight Cloud DNS resolution failed (HINDSIGHT_DNS_FAILURE).';
      if (code === 'HINDSIGHT_CONNECTION_TIMEOUT') return 'The Hindsight Cloud connection timed out (HINDSIGHT_CONNECTION_TIMEOUT).';
      if (code === 'HINDSIGHT_CONNECTION_REFUSED') return 'The Hindsight Cloud connection was refused (HINDSIGHT_CONNECTION_REFUSED).';
      if (code === 'HINDSIGHT_TLS_FAILURE') return 'Hindsight Cloud TLS verification failed (HINDSIGHT_TLS_FAILURE).';
      return 'The Hindsight Cloud host could not be reached (HINDSIGHT_NETWORK_UNREACHABLE).';
    }
    if (state === 'endpoint_unsupported') return 'The Hindsight endpoint does not support this status operation; a supported health check will be tried.';
    if (state === 'sdk_incompatible') return 'The Hindsight API rejected an SDK endpoint as removed or incompatible (HINDSIGHT_SDK_INCOMPATIBLE).';
    if (state === 'http_error') return 'Hindsight Cloud returned an HTTP client error (HINDSIGHT_HTTP_ERROR).';
    return 'Hindsight Cloud status could not be verified. Check server logs and the configured Cloud endpoint.';
  }

  /** Read-only Cloud status check. It never provisions a bank or touches memories. */
  public async checkOperationalStatus(): Promise<HindsightOperationalStatus> {
    const storeBank: HindsightOperationalStatus['storeBank'] = { id: this.getStoreBank(), availability: 'unknown' };
    const securityBank: HindsightOperationalStatus['securityBank'] = { id: this.getSecurityBank(), availability: 'unknown' };
    let status: HindsightOperationalStatus = {
      state: 'service_unavailable', storeBank, securityBank, diagnosticsAreReadOnly: true
    };
    let lastStatusError: any;
    try {
      this.getClient();
      let version: any;
      let versionError: any;
      try {
        const result = await sdk.getVersion({ client: this.auditClient, signal: AbortSignal.timeout(5000) });
        if (result.error) throw this.withResponse(result.error, result.response);
        version = result.data;
        if (!version || typeof version.api_version !== 'string') {
          status.state = 'sdk_incompatible';
          status.error = 'Hindsight Cloud returned an unsupported version response (HINDSIGHT_SDK_INCOMPATIBLE).';
        } else {
          status.state = 'connected';
          status.apiVersion = version.api_version;
        }
      } catch (error: any) {
        versionError = error;
        lastStatusError = error;
        status.state = this.classifyConnectionError(error);
      }

      // /health is only a reachability fallback; bank config reads verify auth.
      if (status.state === 'endpoint_unsupported') {
        const health = await sdk.healthEndpointHealthGet({ client: this.auditClient, signal: AbortSignal.timeout(5000) });
        if (!health.error) status.state = 'service_unavailable'; // reachability alone does not prove authenticated access
        else {
          lastStatusError = this.withResponse(health.error, health.response);
          status.state = this.classifyConnectionError(lastStatusError);
        }
      }

      if (status.state === 'connected' || status.state === 'endpoint_unsupported' || status.state === 'service_unavailable') {
        const banks = [storeBank, securityBank];
        let bankAuthenticationFailed = false;
        let bankCheckError: any;
        const checks = await Promise.all(banks.map(async bank => {
          const result = await sdk.getBankConfig({
            client: this.auditClient,
            path: { bank_id: bank.id },
            signal: AbortSignal.timeout(5000)
          });
          if (!result.error) bank.availability = 'available';
          else {
            const bankStatus = this.statusCode(result.error) || this.statusCode(result.response);
            bank.availability = bankStatus === 404 ? 'unavailable' : 'unknown';
            if (bankStatus === 404) {
              bank.diagnosticCode = 'HINDSIGHT_BANK_NOT_FOUND';
              bank.error = 'Bank does not exist in the configured Hindsight Cloud account.';
            } else {
              const error = this.withResponse(result.error, result.response);
              bank.error = this.statusError(error);
              bankCheckError ||= error;
            }
            if (bankStatus === 401 || bankStatus === 403) bankAuthenticationFailed = true;
          }
          return bank.availability;
        }));
        if (bankAuthenticationFailed) status.state = 'authentication_failed';
        else if (bankCheckError && status.state === 'connected') {
          lastStatusError = bankCheckError;
          status.state = this.classifyConnectionError(bankCheckError);
        }
        else if (status.state !== 'connected') {
          if (checks.includes('available')) status.state = 'connected';
          else if (status.state === 'endpoint_unsupported') status.state = 'endpoint_unsupported';
          else status.state = versionError ? this.classifyConnectionError(versionError) : 'service_unavailable';
        }
      }

      if (status.state !== 'connected') {
        status.error = this.statusError(lastStatusError || new Error(status.state));
      }
    } catch (error: any) {
      const message = String(error?.message || '');
      lastStatusError = error;
      status.state = /not configured|HINDSIGHT_BASE_URL|HINDSIGHT_API_KEY/i.test(message)
        ? 'configuration_missing'
        : this.classifyConnectionError(error);
      status.error = status.state === 'configuration_missing'
        ? 'Hindsight Cloud configuration is missing or invalid. Set server-side HINDSIGHT_BASE_URL and HINDSIGHT_API_KEY.'
        : this.statusError(error);
    }
    status.diagnosticCode = this.diagnosticCode(lastStatusError, status.state);
    this.lastOperationalStatus = status;
    this.healthError = status.error || '';
    return status;
  }

  public getOperationalStatusSnapshot(): HindsightOperationalStatus | undefined {
    return this.lastOperationalStatus;
  }

  private domainForBank(bankId: string): HindsightDomain {
    if (bankId.startsWith('grocerai-customer-')) return 'CUSTOMER';
    if (bankId === this.getSecurityBank()) return 'SECURITY';
    if (bankId.startsWith('grocerai-learning-lab-')) return 'LAB';
    if (bankId === this.getStoreBank()) return 'STORE';
    throw new Error('Hindsight bank is not authorized for this application.');
  }

  private async ensureBank(bankId: string, domain = this.domainForBank(bankId)): Promise<void> {
    await provisionBank(this.getClient(), bankId, domain);
  }

  private apiHeaders(bankId?: string): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const customerId = bankId?.match(/^grocerai-customer-(.+)$/)?.[1];
    const token = customerId
      ? db.getActiveCustomerIdentityToken(customerId)?.secure_token
      : managerService.getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  // ============================================================================
  // DOMAIN BANKS (STRICT THREE DOMAINS)
  // ============================================================================

  /**
   * Domain 1: Customer Bank (Isolated per customer)
   */
  public getCustomerBank(customerId: string): string {
    return customerBankId(customerId);
  }

  /**
   * Domain 2: Store Operational Bank
   */
  public getStoreBank(): string {
    return configuredSystemBank(typeof window === 'undefined' && typeof process !== 'undefined' ? process.env || {} : {}, 'STORE');
  }

  /**
   * Domain 3: Security Bank (Dedicated security memory)
   */
  public getSecurityBank(): string {
    return configuredSystemBank(typeof window === 'undefined' && typeof process !== 'undefined' ? process.env || {} : {}, 'SECURITY');
  }

  public getLearningLabBank(domain: 'CUSTOMER' | 'STORE' | 'SECURITY', scenarioId: string): string {
    const slug = scenarioId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `grocerai-learning-lab-${domain.toLowerCase()}-${slug}`;
  }

  public async prepareLearningLabBank(bankId: string, domain: 'CUSTOMER' | 'STORE' | 'SECURITY'): Promise<void> {
    if (!/^grocerai-learning-lab-(customer|store|security)-[a-z0-9-]{1,80}$/.test(bankId)) throw new Error('Learning Lab bank ID is invalid.');
    const labDomain = domain;
    if (!bankId.startsWith(`grocerai-learning-lab-${labDomain.toLowerCase()}-`)) throw new Error('Learning Lab bank domain does not match the requested agent.');
    await this.ensureBank(bankId, 'LAB');
  }

  public async resetLearningLabBank(bankId: string): Promise<void> {
    if (!/^grocerai-learning-lab-(customer|store|security)-[a-z0-9-]{1,80}-run-[a-z0-9-]{12,20}$/.test(bankId)) throw new Error('Only an isolated Learning Lab run bank can be deleted.');
    await this.getClient().deleteBank(bankId);
  }

  /** Manually invoked integration check for the pre-existing Cloud test bank. */
  public async runExistingCloudSyntheticTest(phase: ExistingCloudTestPhase, verificationId: string) {
    // Deliberately bypass ensureBank/provisionBank: this test must never create
    // or alter a Hindsight bank.
    try {
      return await runExistingCloudSyntheticTest(this.getClient(), phase, verificationId);
    } catch (error: any) {
      throw new Error(this.safeError(error));
    }
  }

  // ============================================================================
  // RETENTION GATING & MEMORY-WORTHINESS EVALUATION
  // ============================================================================

  public evaluateMemoryWorthiness(candidate: {
    text: string;
    type: 'CUSTOMER' | 'STORE' | 'SECURITY';
    metadata?: Record<string, any>;
  }): MemoryWorthinessDecision {
    const textLower = candidate.text.toLowerCase();

    // 1. REJECT TEMPORARY TRANSACTIONAL & SECURITY SENSITIVE DATA
    const forbiddenPatterns = [
      'otp',
      'verification code',
      'token',
      'password',
      'cid_sec',
      'sq_handoff',
      'cart quantity',
      'session_id',
      'current cart',
      'clicked on',
      'viewed product',
      'card number',
      'cvv',
      'upi pin'
    ];

    for (const pattern of forbiddenPatterns) {
      if (textLower.includes(pattern)) {
        return {
          worthy: false,
          reason: `Rejected: Contains temporary or sensitive transactional pattern '${pattern}'`
        };
      }
    }

    // 2. REJECT SHORT TRANSIENT FILLER
    if (candidate.text.trim().length < 8) {
      return {
        worthy: false,
        reason: 'Rejected: Content too brief to contain durable experiential learning'
      };
    }

    // 3. CATEGORIZE & ACCEPT MEANINGFUL PATTERNS
    if (candidate.type === 'CUSTOMER') {
      if (textLower.includes('like') || textLower.includes('prefer') || textLower.includes('istam') || textLower.includes('pasand')) {
        return { worthy: true, reason: 'Explicit customer preference', category: 'preference', confidence: 1.0 };
      }
      if (textLower.includes('dislike') || textLower.includes("don't like") || textLower.includes('nachaledu') || textLower.includes('hate')) {
        return { worthy: true, reason: 'Explicit customer dislike', category: 'dislike', confidence: 1.0 };
      }
      if (textLower.includes('gluten') || textLower.includes('lactose') || textLower.includes('vegan') || textLower.includes('organic')) {
        return { worthy: true, reason: 'Dietary constraint', category: 'dietary', confidence: 1.0 };
      }
      if (textLower.includes('brand') || textLower.includes('amul') || textLower.includes('harvest')) {
        return { worthy: true, reason: 'Brand preference', category: 'brand', confidence: 0.9 };
      }
      if (textLower.includes('accepted substitute') || textLower.includes('rejected substitute')) {
        return { worthy: true, reason: 'Substitution outcome', category: 'substitution', confidence: 0.85 };
      }
      if (textLower.includes('mission') || textLower.includes('breakfast') || textLower.includes('pasta night')) {
        return { worthy: true, reason: 'Mission outcome pattern', category: 'mission', confidence: 0.8 };
      }
      return { worthy: true, reason: 'General behavioral experience', category: 'behavior', confidence: 0.7 };
    }

    if (candidate.type === 'STORE') {
      if (textLower.includes('stockout') || textLower.includes('out of stock')) {
        return { worthy: true, reason: 'Critical stockout experience', category: 'restock', confidence: 1.0 };
      }
      if (textLower.includes('restock') || textLower.includes('replenish')) {
        return { worthy: true, reason: 'Restock operational outcome', category: 'restock', confidence: 0.95 };
      }
      if (textLower.includes('unfulfilled demand') || textLower.includes('unmet demand')) {
        return { worthy: true, reason: 'Unfulfilled customer demand', category: 'demand', confidence: 0.9 };
      }
      if (textLower.includes('queue') || textLower.includes('congestion') || textLower.includes('counter')) {
        return { worthy: true, reason: 'Checkout queue resolution', category: 'congestion', confidence: 0.85 };
      }
      return { worthy: true, reason: 'Store operational event', category: 'general', confidence: 0.75 };
    }

    if (candidate.type === 'SECURITY') {
      return { worthy: true, reason: 'Security anomaly or resolution pattern', category: 'security', confidence: 0.9 };
    }

    return { worthy: false, reason: 'Does not meet memory-worthiness threshold' };
  }

  // ============================================================================
  // HEALTH & GRACEFUL DEGRADATION
  // ============================================================================

  public async isHealthy(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const res = await fetch('/api/hindsight/status', { headers: this.apiHeaders() });
        if (!res.ok) { const body = await res.json().catch(() => ({})); this.lastOperationalStatus = undefined; this.healthError = body.error || `Hindsight status failed with HTTP ${res.status}.`; return false; }
        const data = await res.json();
        this.healthError = data.error || '';
        if (data.status && typeof data.status === 'object') this.lastOperationalStatus = data.status;
        return Boolean(data.isHealthy);
      }
      const status = await this.checkOperationalStatus();
      return status.state === 'connected';
    } catch (error: any) {
      this.lastOperationalStatus = undefined;
      this.healthError = this.safeError(error);
      return false;
    }
  }

  public getHealthError(): string { return this.healthError; }

  public safeDiagnosticError(error: any): string {
    const state = this.classifyConnectionError(error);
    if (state === 'authentication_failed') return 'Hindsight Cloud rejected the configured API credentials (HTTP 401/403).';
    if (state === 'network_unreachable') return 'Hindsight Cloud audit logs are unavailable because the API host could not be reached. Check DNS, TLS, and outbound network access.';
    if (state === 'endpoint_unsupported') return 'The configured Hindsight Cloud endpoint does not support this audit-log operation.';
    return 'Hindsight Cloud audit logs could not be loaded. Check the server configuration and audit-log permissions.';
  }

  public async fetchActivityLog(): Promise<MemoryActivityLogEntry[]> {
    if (typeof window === 'undefined') return this.fetchCloudActivityLog();
    const response = await fetch('/api/hindsight/activity', { headers: this.apiHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.error || `Hindsight activity request failed with HTTP ${response.status}.`);
    return data.activities || [];
  }

  public async fetchCloudActivityLog(): Promise<MemoryActivityLogEntry[]> {
    const client = this.getClient();
    void client;
    const banks = [this.getStoreBank(), this.getSecurityBank()];
    const pages = await Promise.all(banks.map(bankId => sdk.listAuditLogs({
      client: this.auditClient,
      path: { bank_id: bankId },
      query: { limit: 100 }
    })));
    const entries = pages.flatMap((page: any, index) => {
      if (page.error) throw new Error(this.safeDiagnosticError(page.error));
      return (page.data?.items || []).map((item: any) => {
        const response = item.response || {};
        const request = item.request || {};
        return {
          id: item.id,
          timestamp: item.ended_at || item.started_at || '',
          bankId: item.bank_id || banks[index],
          operation: item.action === 'retain' || item.action === 'recall' || item.action === 'reflect' ? item.action : 'health',
          input: String(request.query || request.content || item.action || 'Hindsight Cloud operation').slice(0, 120),
          resultSummary: response.error ? String(response.error).slice(0, 240) : `${item.action} completed through ${item.transport || 'Hindsight API'}`,
          itemCount: Number(response.items_count || response.results_count || 0),
          success: !response.error,
          durationMs: Number(item.duration_ms || 0),
          source: 'hindsight-service-operation' as const
        };
      });
    });
    return entries.sort((a: MemoryActivityLogEntry, b: MemoryActivityLogEntry) => b.timestamp.localeCompare(a.timestamp));
  }

  // ============================================================================
  // CORE RETAIN, RECALL & REFLECT (WITH OFFLINE RESILIENCE)
  // ============================================================================

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
    const docId = options?.documentId || `doc-${Date.now()}`;
    const tags = options?.tags || [];

    try {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const res = await fetch('/api/hindsight/retain', {
          method: 'POST',
          headers: this.apiHeaders(bankId),
          body: JSON.stringify({ bankId, content, options })
        });
        const json = await res.json();
        if (res.ok && json.success) {
          this.logActivity({
            id: `act-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            bankId,
            operation: 'retain',
            input: content.substring(0, 80),
            resultSummary: `Retained via API into ${bankId}`,
            itemCount: json.itemsCount || 1,
            success: true,
            durationMs: Date.now() - startTime,
            tags
          });
          return json;
        }
        const error = json.error || `Hindsight retain failed with HTTP ${res.status}`;
        this.logActivity({ id: `act-${Date.now()}`, timestamp: new Date().toLocaleTimeString(), bankId, operation: 'retain', input: content.substring(0, 80), resultSummary: error, itemCount: 0, success: false, durationMs: Date.now() - startTime, tags });
        return { success: false, bankId, itemsCount: 0, error };
      } else {
        await this.ensureBank(bankId);
        const res = await this.getClient().retain(bankId, content, {
          tags: options?.tags,
          metadata: options?.metadata,
          documentId: docId,
          context: options?.context
        });
        const count = res.items_count || 1;
        this.logActivity({
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          bankId,
          operation: 'retain',
          input: content.substring(0, 80),
          resultSummary: `Retained ${count} item(s) into ${bankId}`,
          itemCount: count,
          success: true,
          durationMs: Date.now() - startTime,
          tags
        });
        return { success: true, bankId, itemsCount: count };
      }
    } catch (err: any) {
      const error = this.safeError(err);
      this.logActivity({
        id: `act-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        bankId,
        operation: 'retain',
        input: content.substring(0, 80),
        resultSummary: `Hindsight unavailable: ${error}`,
        itemCount: 0,
        success: false,
        durationMs: Date.now() - startTime,
        tags
      });
      return { success: false, bankId, itemsCount: 0, error };
    }

    return { success: false, bankId, itemsCount: 0, error: 'Hindsight is unavailable' };
  }

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
    error?: string;
  }> {
    const startTime = Date.now();

    // Try remote / daemon first
    try {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const res = await fetch('/api/hindsight/recall', {
          method: 'POST',
          headers: this.apiHeaders(bankId),
          body: JSON.stringify({ bankId, query, tags: options?.tags })
        });
        const json = await res.json();
        if (res.ok) {
          this.logActivity({ id: `act-${Date.now()}`, timestamp: new Date().toLocaleTimeString(), bankId, operation: 'recall', input: query, resultSummary: `Hindsight returned ${json.results?.length || 0} memories`, itemCount: json.results?.length || 0, success: Boolean(json.success), durationMs: Date.now() - startTime, tags: options?.tags });
          return json;
        }
        throw new Error(json.error || `Hindsight recall failed with HTTP ${res.status}`);
      } else {
        await this.ensureBank(bankId);
        const res = await this.getClient().recall(bankId, query, {
          tags: options?.tags,
          maxTokens: options?.maxTokens || 512
        });
        if (res) {
          const items: RecallResultItem[] = (res.results || []).map((r: any) => ({
            id: r.id,
            text: r.text,
            scores: r.scores,
            tags: r.tags
          }));
          this.logActivity({ id: `act-${Date.now()}`, timestamp: new Date().toLocaleTimeString(), bankId, operation: 'recall', input: query, resultSummary: `Hindsight returned ${items.length} memories`, itemCount: items.length, success: true, durationMs: Date.now() - startTime, tags: options?.tags });
          return {
            success: true,
            results: items,
            promptString: recallResponseToPromptString(res) || items.map(i => i.text).join('\n')
          };
        }
      }
    } catch (err: any) {
      const error = this.safeError(err);
      this.logActivity({ id: `act-${Date.now()}`, timestamp: new Date().toLocaleTimeString(), bankId, operation: 'recall', input: query, resultSummary: `Hindsight unavailable: ${error}`, itemCount: 0, success: false, durationMs: Date.now() - startTime, tags: options?.tags });
      return { success: false, results: [], promptString: '', error };
    }
    return { success: false, results: [], promptString: '', error: 'Hindsight returned no response' };
  }

  public async reflect(
    bankId: string,
    query: string,
    options?: { context?: string }
  ): Promise<{ success: boolean; answer: string; error?: string }> {
    const startTime = Date.now();
    try {
      const res = typeof window !== 'undefined' && typeof window.fetch === 'function'
        ? await fetch('/api/hindsight/reflect', { method: 'POST', headers: this.apiHeaders(bankId), body: JSON.stringify({ bankId, query, context: options?.context }) }).then(async response => {
            const json = await response.json();
            if (!response.ok) throw new Error(json.error || `Hindsight reflect failed with HTTP ${response.status}`);
            return json;
          })
        : (await this.ensureBank(bankId), await this.getClient().reflect(bankId, query, { context: options?.context }));
      const answer = (res as any).answer || (res as any).text || '';
      this.logActivity({ id: `act-${Date.now()}`, timestamp: new Date().toLocaleTimeString(), bankId, operation: 'reflect', input: query, resultSummary: answer ? 'Hindsight reflection received' : 'Hindsight returned an empty reflection', itemCount: answer ? 1 : 0, success: Boolean(answer), durationMs: Date.now() - startTime });
      if (!answer) return { success: false, answer: '', error: 'Hindsight returned an empty reflection' };
      return { success: true, answer };
    } catch (err: any) {
      const error = this.safeError(err);
      this.logActivity({
        id: `act-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        bankId,
        operation: 'reflect',
        input: query,
        resultSummary: `Hindsight unavailable: ${error}`,
        itemCount: 0,
        success: false,
        durationMs: Date.now() - startTime
      });

      return { success: false, answer: '', error };
    }
  }

  // ============================================================================
  // DOMAIN 1: CUSTOMER EXPERIENTIAL MEMORY & CONFLICT RESOLUTION
  // ============================================================================

  public async retainCustomerExperience(exp: CustomerExperienceInput): Promise<{ success: boolean; memoryId?: string; superseded?: boolean }> {
    const gate = this.evaluateMemoryWorthiness({
      text: exp.observation,
      type: 'CUSTOMER',
      metadata: exp.metadata
    });

    if (!gate.worthy) {
      return { success: false };
    }

    const bankId = this.getCustomerBank(exp.customerId);
    const docId = exp.documentId || `cust-exp-${Date.now()}`;
    const tags = ['customer', exp.category || 'experience', ...(exp.tags || [])];

    // Check conflict & superseding:
    let superseded = false;
    if (!this.customerActivePreferences.has(exp.customerId)) {
      this.customerActivePreferences.set(exp.customerId, new Map());
    }
    const prefMap = this.customerActivePreferences.get(exp.customerId)!;

    if (exp.category === 'brand' || exp.category === 'preference') {
      const topic = exp.metadata?.topic || (exp.observation.includes('bread') ? 'bread' : 'general');
      const existing = prefMap.get(topic);
      if (existing) {
        superseded = true;
        // Prepend conflict resolution note
        exp.observation = `[UPDATED PREFERENCE - SUPERSEDES PREVIOUS] ${exp.observation} (Customer revised choice from prior preference on ${new Date().toLocaleDateString()})`;
      }
    }

    const res = await this.retain(bankId, exp.observation, {
      tags,
      context: exp.context,
      documentId: docId,
      metadata: {
        category: exp.category || 'preference',
        confidence: String(gate.confidence || 1.0),
        ...(exp.metadata || {})
      }
    });

    if (res.success && (exp.category === 'brand' || exp.category === 'preference')) {
      const topic = exp.metadata?.topic || (exp.observation.includes('bread') ? 'bread' : 'general');
      prefMap.set(topic, { value: exp.observation, timestamp: Date.now() });
    }
    return { success: res.success, memoryId: res.success ? docId : undefined, superseded: res.success ? superseded : false };
  }

  /**
   * Helper to retain customer substitution outcome directly
   */
  public async retainCustomerSubstitutionExperience(
    customerId: string,
    requestedItem: string,
    acceptedSubstitute: string,
    isAccepted: boolean
  ): Promise<{ success: boolean; memoryId?: string; superseded?: boolean }> {
    return this.retainCustomerExperience({
      customerId,
      observation: isAccepted
        ? `Customer accepted substitute ${acceptedSubstitute} for out-of-stock ${requestedItem}. Surface immediately as verified substitute.`
        : `Customer declined substitute ${acceptedSubstitute} for out-of-stock ${requestedItem}.`,
      category: 'substitution',
      tags: ['substitution', isAccepted ? 'accepted' : 'rejected', requestedItem.toLowerCase(), acceptedSubstitute.toLowerCase()]
    });
  }

  public hasCustomerMemories(customerId: string): boolean {
    void customerId;
    return false;
  }

  public async recallCustomerMemories(customerId: string, query: string, tags?: string[]) {
    const bankId = this.getCustomerBank(customerId);
    return this.recall(bankId, query, { tags });
  }

  // ============================================================================
  // DOMAIN 2: STORE OPERATIONAL EXPERIENTIAL MEMORY
  // ============================================================================

  public async retainStoreOperationalExperience(exp: StoreExperienceInput): Promise<{ success: boolean; documentId: string }> {
    const situation = exp.situation?.trim() || '';
    const actionTaken = (exp.actionTaken || exp.actionDescription || '').trim();
    const outcome = (exp.outcome || exp.actualOutcome || '').trim();
    const takeaway = (exp.takeaway || exp.takeawayLesson || '').trim();
    if ([situation, actionTaken, outcome, takeaway].some(value => value.length < 8)) {
      return { success: false, documentId: '' };
    }
    const rawCategory = (exp.category || 'general').toLowerCase();
    const category = (rawCategory.includes('restock') ? 'restock' : rawCategory.includes('dismiss') ? 'general' : rawCategory) as any;

    const gate = this.evaluateMemoryWorthiness({
      text: `${situation} ${actionTaken} ${outcome} ${takeaway}`,
      type: 'STORE',
      metadata: exp.metadata
    });

    if (!gate.worthy) {
      return { success: false, documentId: '' };
    }

    const bankId = this.getStoreBank();
    const docId = exp.documentId || `store-ops-${Date.now()}`;
    const tags = ['store', 'operation', category, ...(exp.tags || [])];

    const content = [
      `OPERATIONAL INCIDENT & RESOLUTION:`,
      `Situation: ${situation}`,
      `Action Taken: ${actionTaken}`,
      `Measured Outcome: ${outcome}`,
      `Operational Takeaway & Rule: ${takeaway}`,
    ].join('\n');

    const res = await this.retain(bankId, content, {
      tags,
      documentId: docId,
      metadata: {
        category,
        ...(exp.metadata || {})
      }
    });

    return { success: res.success, documentId: res.success ? docId : '' };
  }

  public async recallStoreMemories(query: string, tags?: string[]) {
    const bankId = this.getStoreBank();
    return this.recall(bankId, query, { tags });
  }

  // ============================================================================
  // DOMAIN 3: SECURITY EXPERIENTIAL MEMORY
  // ============================================================================

  public async retainSecurityExperience(exp: SecurityExperienceInput): Promise<{ success: boolean; documentId: string }> {
    const bankId = this.getSecurityBank();
    const docId = exp.documentId || `sec-exp-${Date.now()}`;
    const tags = ['security', exp.incidentType.toLowerCase(), ...(exp.tags || [])];

    const content = [
      `SECURITY EVENT PATTERN & RESOLUTION:`,
      `Incident Type: ${sanitizeSecurityMemoryText(exp.incidentType)}`,
      `Observed Pattern: ${sanitizeSecurityMemoryText(exp.pattern)}`,
      `Investigation: ${sanitizeSecurityMemoryText(exp.investigationDetails)}`,
      `Resolution: ${sanitizeSecurityMemoryText(exp.resolution)}`,
      `Takeaway: ${sanitizeSecurityMemoryText(exp.outcomeTakeaway)}`
    ].join('\n');

    if (!this.evaluateMemoryWorthiness({ text: content, type: 'SECURITY' }).worthy) {
      return { success: false, documentId: '' };
    }

    const res = await this.retain(bankId, content, {
      tags,
      documentId: docId,
      metadata: {
        incidentType: exp.incidentType,
        ...(exp.metadata || {})
      }
    });

    return { success: res.success, documentId: res.success ? docId : '' };
  }

  public async recallSecurityMemories(query: string, tags?: string[]) {
    const bankId = this.getSecurityBank();
    return this.recall(bankId, query, { tags });
  }

  public async recallCustomerPreferences(customerId: string, query: string, tags?: string[]) {
    return this.recallCustomerMemories(customerId, query, tags);
  }

  public async retainStoreExperience(exp: {
    incidentType?: string;
    situation: string;
    actionTaken: string;
    measuredOutcome: string;
    operationalRule?: string;
    tags?: string[];
  }): Promise<{ success: boolean; documentId: string }> {
    const bankId = this.getStoreBank();
    const docId = `store-exp-${Date.now()}`;
    const tags = ['store', 'operation', ...(exp.tags || [])];
    const content = [
      `OPERATIONAL INCIDENT & RESOLUTION:`,
      `Incident Type: ${exp.incidentType || 'OPERATIONAL_ADAPTATION'}`,
      `Situation: ${exp.situation}`,
      `Action Taken: ${exp.actionTaken}`,
      `Measured Outcome: ${exp.measuredOutcome}`,
      `Operational Takeaway & Rule: ${exp.operationalRule || exp.measuredOutcome}`
    ].join('\n');

    const res = await this.retain(bankId, content, { tags, documentId: docId });
    return { success: res.success, documentId: res.success ? docId : '' };
  }

  public async retainCustomerPreferenceExperience(
    expOrCustomerId: string | {
      customerId: string;
      preferenceType?: string;
      preferenceTitle?: string;
      observedPattern?: string;
      confidence?: number;
      tags?: string[];
    },
    productOrItemName?: string,
    isPreferred = true,
    confidence = 0.9
  ): Promise<{ success: boolean; documentId: string; memoryId?: string; superseded?: boolean }> {
    if (typeof expOrCustomerId === 'object') {
      const exp = expOrCustomerId;
      const bankId = this.getCustomerBank(exp.customerId);
      const docId = `cust-pref-${Date.now()}`;
      const tags = ['customer', 'preference', ...(exp.tags || [])];
      const content = [
        `CUSTOMER PREFERENCE PROFILE:`,
        `Preference Type: ${exp.preferenceType || 'preference'}`,
        `Customer: ${exp.customerId}`,
        exp.preferenceTitle ? `Title: ${exp.preferenceTitle}` : '',
        `Observed Pattern: ${exp.observedPattern || ''}`,
        `Takeaway: Customer prefers ${exp.observedPattern || ''}`
      ].filter(Boolean).join('\n');

      const res = await this.retain(bankId, content, { tags, documentId: docId });
      return { success: res.success, documentId: res.success ? docId : '', memoryId: res.success ? docId : undefined };
    }

    const customerId = expOrCustomerId;
    const name = productOrItemName || 'item';
    const res = await this.retainCustomerExperience({
      customerId,
      observation: isPreferred
        ? `Customer explicitly preferred and chose ${name}. Elevate in future recommendations.`
        : `Customer rejected or dismissed ${name}. Deprioritize in future recommendations.`,
      category: isPreferred ? 'preference' : 'dislike',
      confidence,
      tags: ['preference', isPreferred ? 'positive' : 'negative', name.toLowerCase()]
    });
    return {
      success: res.success,
      documentId: res.memoryId || '',
      memoryId: res.memoryId,
      superseded: res.superseded
    };
  }

  /**
   * Synchronous query against local customer memory bank
   */
  public getCustomerMemoriesForQuery(
    customerId: string,
    query: string,
    maxResults = 4
  ): { id: string; text: string; score: number }[] {
    void customerId;
    void query;
    void maxResults;
    return [];
  }

  /**
   * Synchronous query against local store memory bank (for deterministic speed & offline testability)
   */
  public getStoreMemoriesForQuery(
    query: string,
    maxResults = 4
  ): { id: string; text: string; category?: string; score: number; isStale?: boolean }[] {
    void query;
    void maxResults;
    return [];
  }

  /**
   * Synchronous query against local security memory bank
   */
  public getSecurityMemoriesForQuery(
    query: string,
    maxResults = 4
  ): { id: string; text: string; score: number }[] {
    void query;
    void maxResults;
    return [];
  }

  /**
   * Returns all security experiences currently retained in memory
   */
  public getSecurityExperiences(): Array<{
    id: string;
    text: string;
    measuredOutcome: string;
    timestamp: number;
    tags?: string[];
  }> {
    return [];
  }

  // ============================================================================
  // AUDIT ACTIVITY LOGS
  // ============================================================================

  private logActivity(entry: MemoryActivityLogEntry) {
    entry.source = 'hindsight-service-operation';
    this.activityLog.unshift(entry);
    if (this.activityLog.length > this.maxLogEntries) {
      this.activityLog.pop();
    }
  }

  public getActivityLog(): MemoryActivityLogEntry[] {
    // Manager activity views must not expose customer memory query text.
    return this.activityLog.filter(entry => !entry.bankId.startsWith('grocerai-customer-')).map(entry => ({ ...entry }));
  }

  public clearActivityLog(): void {
    this.activityLog = [];
  }
}

export const hindsightService = new HindsightService();
