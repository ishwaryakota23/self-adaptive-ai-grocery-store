export interface HindsightConfig {
  baseUrl: string;
  apiKey: string;
}

export function resolveHindsightConfig(env: Record<string, string | undefined>): HindsightConfig {
  const baseUrl = env.HINDSIGHT_BASE_URL?.trim() || '';
  const apiKey = env.HINDSIGHT_API_KEY?.trim() || '';
  if (!baseUrl) throw new Error('Hindsight Cloud is not configured. Set server-side HINDSIGHT_BASE_URL and HINDSIGHT_API_KEY.');
  let parsed: URL;
  try { parsed = new URL(baseUrl); } catch { throw new Error('HINDSIGHT_BASE_URL must be a valid HTTPS URL (HTTP is allowed only for local development).'); }
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) {
    throw new Error('HINDSIGHT_BASE_URL must use HTTPS outside localhost.');
  }
  if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1' && !apiKey) {
    throw new Error('HINDSIGHT_API_KEY is required for a remote Hindsight service. Set it as a server-side secret.');
  }
  return { baseUrl, apiKey };
}

export function customerBankId(customerId: string): string {
  if (!/^[A-Za-z0-9_-]{1,50}$/.test(customerId || '')) throw new Error('A verified customer ID is required for customer memory access.');
  return `grocerai-customer-${customerId}`;
}

export function assertCustomerBankOwner(bankId: string, verifiedCustomerId: string): void {
  const match = /^grocerai-customer-([A-Za-z0-9_-]{1,50})$/.exec(bankId);
  if (match && (!verifiedCustomerId || match[1] !== verifiedCustomerId)) {
    throw new Error('Customer memory access is restricted to the verified customer identity.');
  }
}

export function configuredSystemBank(env: Record<string, string | undefined>, domain: 'STORE' | 'SECURITY'): string {
  void env;
  return domain === 'STORE' ? 'grocerai-store-main' : 'grocerai-security-main';
}

export function hasVerifiedOutcomeEvidence(outcome: {
  evidence_source?: string;
  observed_event?: string;
  action_taken?: string;
  reobserved_metric?: string;
  outcome_summary?: string;
}): boolean {
  return outcome.evidence_source === 'verified-operation' &&
    [outcome.observed_event, outcome.action_taken, outcome.reobserved_metric, outcome.outcome_summary]
      .every(value => typeof value === 'string' && value.trim().length >= 8);
}

export function sanitizeSecurityMemoryText(value: string): string {
  return value
    .replace(/\b(?:CID_SEC|SQ_HANDOFF)[A-Z0-9_-]*\b/gi, '[redacted credential]')
    .replace(/\b(?:CUST|SESS|EMP|CART)-[A-Z0-9_-]+\b/gi, '[redacted identifier]')
    .replace(/\b(?:otp|verification code|token|password)\b/gi, 'credential')
    .replace(/\b\+?\d[\d\s().-]{6,}\d\b/g, '[redacted number]');
}

export type HindsightDomain = 'CUSTOMER' | 'STORE' | 'SECURITY' | 'LAB';

export async function provisionBank(client: {
  createBank: (bankId: string, options: Record<string, unknown>) => Promise<unknown>;
  updateBankConfig?: (bankId: string, options: { auditLogEnabled: boolean }) => Promise<unknown>;
}, bankId: string, domain: HindsightDomain): Promise<void> {
  const missions: Record<HindsightDomain, string> = {
    CUSTOMER: 'Remember only durable preferences and experiences belonging to this verified customer. Never mix customer identities.',
    STORE: 'Remember verified store operational evidence, actions, measured outcomes, and lessons. Distinguish actual measurements from estimates.',
    SECURITY: 'Remember verified security evidence and resolutions. Do not infer guilt or treat prior incidents as proof.',
    LAB: 'Use only isolated synthetic demonstration data. Never mix it with production memories.'
  };
  await client.createBank(bankId, {
    name: `GrocerAI ${domain === 'LAB' ? 'Learning Lab' : `${domain} Memory`}`,
    reflectMission: missions[domain],
    retainMission: missions[domain],
    retainExtractionMode: 'verbose'
  });
  if (client.updateBankConfig) await client.updateBankConfig(bankId, { auditLogEnabled: true });
}

export async function retainAndRecallWithClient<TRecall>(
  client: {
    createBank: (bankId: string, options: Record<string, unknown>) => Promise<unknown>;
    updateBankConfig?: (bankId: string, options: { auditLogEnabled: boolean }) => Promise<unknown>;
    retain: (bankId: string, content: string, options?: Record<string, unknown>) => Promise<unknown>;
    recall: (bankId: string, query: string, options?: Record<string, unknown>) => Promise<TRecall>;
  }, bankId: string, content: string, query: string
): Promise<{ retained: unknown; recalled: TRecall }> {
  await provisionBank(client, bankId, bankId.startsWith('grocerai-customer-') ? 'CUSTOMER' : 'STORE');
  const retained = await client.retain(bankId, content);
  const recalled = await client.recall(bankId, query);
  return { retained, recalled };
}

export type ExistingCloudTestPhase = 'retain' | 'recall';

/**
 * Exercise the one manually provisioned test bank without creating or updating
 * any bank. The bank profile read fails honestly when that bank is unavailable.
 */
export async function runExistingCloudSyntheticTest<TRecall>(
  client: {
    listMemories: (bankId: string, options?: { limit?: number }) => Promise<unknown>;
    retain: (bankId: string, content: string, options?: Record<string, unknown>) => Promise<{ items_count?: number }>;
    recall: (bankId: string, query: string, options?: Record<string, unknown>) => Promise<TRecall>;
  },
  phase: ExistingCloudTestPhase,
  verificationId: string
): Promise<{ bankId: string; phase: ExistingCloudTestPhase; retainedCount?: number; recalled?: TRecall }> {
  if (!/^[a-f0-9-]{36}$/i.test(verificationId)) throw new Error('Use a UUID verification ID for the isolated Hindsight test.');
  const bankId = 'grocerai-hindsight-test';
  await client.listMemories(bankId, { limit: 1 });

  const marker = `GrocerAI isolated synthetic Cloud verification ${verificationId}`;
  if (phase === 'retain') {
    const result = await client.retain(bankId, `${marker}. This is test data, not a real customer or store event.`, {
      documentId: `grocerai-cloud-verification-${verificationId}`,
      tags: ['grocerai-synthetic-verification']
    });
    return { bankId, phase, retainedCount: result.items_count ?? 1 };
  }

  const recalled = await client.recall(bankId, `Find the synthetic verification memory marked ${marker}.`, {
    tags: ['grocerai-synthetic-verification'],
    maxTokens: 512
  });
  return { bankId, phase, recalled };
}
