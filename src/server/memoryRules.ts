export interface MemoryRuleRecord { id: string; agent: 'customer' | 'store' | 'security'; kind?: string; content: string; createdAt: string }
const PRIVATE_DATA = /(?:password|passwd|payment credential|card number|cvv|cvc|access token|refresh token|secret key)\s*[:=]?\s*\S+/ig;
export function sanitizeMemoryText(value: string): string {
  return value.replace(PRIVATE_DATA, '[redacted]').replace(/\b(?:upi|pin)\s*[:=]?\s*\d{4,8}\b/gi, '[redacted]').replace(/\b\d{13,19}\b/g, '[redacted]');
}
export function sanitizeMemoryMetadata(value: Record<string, unknown> = {}): Record<string, string | number | boolean> {
  const safe: Record<string, string | number | boolean> = {};
  const forbidden = /password|credential|secret|token|payment|card|cvv|cvc|email|phone|address|name/i;
  for (const [key, raw] of Object.entries(value).slice(0, 24)) {
    if (forbidden.test(key) || raw == null) continue;
    if (typeof raw === 'string') safe[key.slice(0, 64)] = sanitizeMemoryText(raw).slice(0, 500);
    else if (typeof raw === 'number' || typeof raw === 'boolean') safe[key.slice(0, 64)] = raw;
  }
  return safe;
}
export function scoreMemory(query: string, content: string, kind = ''): number {
  const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [])];
  if (!terms.length) return 0;
  const text = `${content} ${kind}`.toLowerCase();
  const hits = terms.reduce((n, term) => n + (text.includes(term) ? 1 : 0), 0);
  return hits / terms.length;
}
export function reflectOnRecords(records: MemoryRuleRecord[]): string[] {
  const buckets = new Map<string, MemoryRuleRecord[]>();
  for (const record of records) {
    const key = (record.kind || 'experience').toLowerCase();
    buckets.set(key, [...(buckets.get(key) || []), record]);
  }
  return [...buckets.entries()].filter(([, items]) => items.length >= 2)
    .map(([kind, items]) => `Repeated ${kind} pattern (${items.length} recorded outcomes); validate against current conditions.`);
}
