import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';
import {
  assertCustomerBankOwner,
  configuredSystemBank,
  customerBankId,
  hasVerifiedOutcomeEvidence,
  resolveHindsightConfig,
  retainAndRecallWithClient,
  runExistingCloudSyntheticTest,
  sanitizeSecurityMemoryText
} from '../src/server/hindsightCloudPolicy.ts';

test('Cloud configuration requires URL and remote API key, and rejects insecure remote URLs', () => {
  assert.throws(() => resolveHindsightConfig({}), /HINDSIGHT_BASE_URL/);
  assert.throws(() => resolveHindsightConfig({ HINDSIGHT_BASE_URL: 'https://cloud.example' }), /HINDSIGHT_API_KEY/);
  assert.throws(() => resolveHindsightConfig({ HINDSIGHT_BASE_URL: 'http://cloud.example', HINDSIGHT_API_KEY: 'test' }), /HTTPS/);
  assert.deepEqual(resolveHindsightConfig({ HINDSIGHT_BASE_URL: 'http://localhost:8888' }), {
    baseUrl: 'http://localhost:8888', apiKey: ''
  });
  assert.deepEqual(resolveHindsightConfig({ HINDSIGHT_BASE_URL: 'https://cloud.example', HINDSIGHT_API_KEY: 'mock-key' }), {
    baseUrl: 'https://cloud.example', apiKey: 'mock-key'
  });
});

test('system and customer bank mapping remains deterministic and validates identity IDs', () => {
  assert.equal(configuredSystemBank({}, 'STORE'), 'grocerai-store-main');
  assert.equal(configuredSystemBank({}, 'SECURITY'), 'grocerai-security-main');
  assert.equal(configuredSystemBank({ HINDSIGHT_STORE_BANK: 'store-main' }, 'STORE'), 'grocerai-store-main');
  assert.equal(customerBankId('CUST-123'), 'grocerai-customer-CUST-123');
  assert.throws(() => customerBankId(''), /verified customer ID/);
  assert.throws(() => customerBankId('id with spaces'), /verified customer ID/);
});

test('customer bank cannot be accessed by a different verified identity', () => {
  const bankId = customerBankId('CUST-123');
  assertCustomerBankOwner(bankId, 'CUST-123');
  assert.throws(() => assertCustomerBankOwner(bankId, 'CUST-999'), /verified customer identity/);
  assert.throws(() => assertCustomerBankOwner(bankId, ''), /verified customer identity/);
  assertCustomerBankOwner('grocerai-store-main', '');
});

test('mocked retain and recall provision and use only the mapped bank', async () => {
  const calls = [];
  const mockClient = {
    async createBank(bankId, options) { calls.push(['createBank', bankId, options]); },
    async updateBankConfig(bankId, options) { calls.push(['updateBankConfig', bankId, options]); },
    async retain(bankId, content) { calls.push(['retain', bankId, content]); return { items_count: 1 }; },
    async recall(bankId, query) { calls.push(['recall', bankId, query]); return { results: [{ text: 'synthetic mock only' }] }; }
  };
  const bankId = customerBankId('TEST-SYNTHETIC-1');
  const result = await retainAndRecallWithClient(mockClient, bankId, 'synthetic observation', 'synthetic recall query');
  assert.equal(calls.map(call => call[0]).join(','), 'createBank,updateBankConfig,retain,recall');
  assert.ok(calls.every(call => call[1] === bankId));
  assert.deepEqual(result.recalled, { results: [{ text: 'synthetic mock only' }] });
  assert.equal(calls[0][2].retainMission.includes('Never mix customer identities'), true);
});

test('isolated manual Cloud test uses only the existing exact bank and never provisions it', async () => {
  const calls = [];
  const mockClient = {
    async listMemories(bankId, options) { calls.push(['listMemories', bankId, options]); return { items: [] }; },
    async retain(bankId, content, options) { calls.push(['retain', bankId, content, options]); return { items_count: 1 }; },
    async recall(bankId, query, options) { calls.push(['recall', bankId, query, options]); return { results: [{ text: 'mock-only synthetic result' }] }; }
  };
  const verificationId = '11111111-2222-4333-8444-555555555555';
  const retained = await runExistingCloudSyntheticTest(mockClient, 'retain', verificationId);
  const recalled = await runExistingCloudSyntheticTest(mockClient, 'recall', verificationId);
  assert.equal(retained.bankId, 'grocerai-hindsight-test');
  assert.equal(retained.retainedCount, 1);
  assert.equal(recalled.recalled.results[0].text, 'mock-only synthetic result');
  assert.deepEqual(calls.map(call => call[0]), ['listMemories', 'retain', 'listMemories', 'recall']);
  assert.ok(calls.every(call => call[1] === 'grocerai-hindsight-test'));
  await assert.rejects(runExistingCloudSyntheticTest(mockClient, 'retain', 'not-a-uuid'), /UUID/);
});

test('only complete verified non-demo outcomes qualify for production store memory', () => {
  const evidence = {
    evidence_source: 'verified-operation',
    observed_event: 'Inventory count recorded after replenishment',
    action_taken: 'Restocked 12 units through verified inventory operation',
    reobserved_metric: 'Authoritative inventory now reports 18 units on hand',
    outcome_summary: 'Restock completed and inventory count confirmed'
  };
  assert.equal(hasVerifiedOutcomeEvidence(evidence), true);
  assert.equal(hasVerifiedOutcomeEvidence({ ...evidence, evidence_source: 'unverified' }), false);
  assert.equal(hasVerifiedOutcomeEvidence({ ...evidence, evidence_source: 'synthetic-demo' }), false);
  assert.equal(hasVerifiedOutcomeEvidence({ ...evidence, reobserved_metric: '' }), false);
});

test('security memory sanitization removes credential and direct identity values', () => {
  const safe = sanitizeSecurityMemoryText('CUST-123 used CID_SEC_ABC123; OTP 12345678 was rejected, session SESS-8001 reviewed.');
  assert.equal(safe.includes('CUST-123'), false);
  assert.equal(safe.includes('CID_SEC_ABC123'), false);
  assert.equal(safe.includes('OTP'), false);
  assert.equal(safe.includes('12345678'), false);
  assert.equal(safe.includes('SESS-8001'), false);
});

test('read-only Hindsight dashboard status classifies network and HTTP failures safely', async () => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom'
  });
  try {
    const { runHindsightDashboardStatusChecks } = await vite.ssrLoadModule('/src/tests/hindsightDashboardStatus.safe.test.ts');
    const checks = await runHindsightDashboardStatusChecks();
    assert.ok(checks.length >= 7);
  } finally {
    await vite.close();
  }
});
