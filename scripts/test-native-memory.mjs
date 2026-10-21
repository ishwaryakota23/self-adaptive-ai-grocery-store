import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const browserStorage = new Map();
  globalThis.localStorage = { getItem: key => browserStorage.get(key) || null, setItem: (key, value) => browserStorage.set(key, value), removeItem: key => browserStorage.delete(key), clear: () => browserStorage.clear() };
  globalThis.sessionStorage = { getItem: key => browserStorage.get(`session_${key}`) || null, setItem: (key, value) => browserStorage.set(`session_${key}`, value), removeItem: key => browserStorage.delete(`session_${key}`), clear: () => {} };
  globalThis.window = { addEventListener() {}, dispatchEvent() { return true; }, location: { search: '', origin: 'http://localhost:3000' } };
  const rules = await vite.ssrLoadModule('/src/server/memoryRules.ts');
  const engine = await vite.ssrLoadModule('/src/server/memoryEngine.ts');
  const scenariosModule = await vite.ssrLoadModule('/src/services/nativeMemoryLearningScenarios.ts');
  const { authorizeMemoryScope } = await vite.ssrLoadModule('/api/memory/_scope.ts');
  const { issueManagerToken } = await vite.ssrLoadModule('/api/_auth.ts');
  const { groqCustomerAgentServer } = await vite.ssrLoadModule('/src/server/groqCustomerAgent.ts');
  const { loadStoreMemoryContext } = await vite.ssrLoadModule('/src/server/groqStoreAgent.ts');
  const { securityAgent } = await vite.ssrLoadModule('/src/services/securityAgent.ts');

  assert.ok(rules.scoreMemory('whole wheat under budget', 'Prefers whole wheat bread within budget', 'preference') >= 0.7);
  assert.ok(rules.scoreMemory('milk', 'Milk restock outcome') > rules.scoreMemory('milk', 'Bread preference'));
  assert.match(rules.sanitizeMemoryText('password: my-secret card 4111111111111111'), /\[redacted\]/);
  assert.deepEqual(rules.sanitizeMemoryMetadata({ phone: '123456789', category: 'restock', accessToken: 'secret' }), { category: 'restock' });

  const rows = [];
  let throwDatabase = false;
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.query = ''; this.sessionFilter = undefined; this.count = 50; }
    insert(payload) { this.payload = payload; return this; }
    select() { return this; }
    eq(field, value) { this.filters.push(row => row[field] === value); return this; }
    textSearch(_field, query) { this.query = query.toLowerCase(); return this; }
    or(value) { const match = /session_id\.eq\.([\w-]+)/.exec(value); this.sessionFilter = match?.[1]; return this; }
    order() { return this; }
    limit(count) { this.count = count; return this; }
    async single() {
      if (throwDatabase) throw new Error('database offline');
      const row = { id: `m${rows.length + 1}`, ...this.payload, created_at: new Date().toISOString() };
      rows.push(row); return { data: row, error: null };
    }
    then(resolve, reject) {
      if (throwDatabase) return Promise.reject(new Error('database offline')).then(resolve, reject);
      const terms = this.query.match(/[\p{L}\p{N}]{2,}/gu) || [];
      let data = rows.filter(row => this.filters.every(test => test(row)) && terms.some(term => `${row.content} ${row.kind}`.toLowerCase().includes(term)));
      if (this.sessionFilter) data = data.filter(row => row.session_id == null || row.session_id === this.sessionFilter);
      return Promise.resolve({ data: data.slice(-this.count), error: null }).then(resolve, reject);
    }
  }
  const fakeClient = { from: table => new Query(table) };
  engine.setMemoryClientProviderForTests(() => fakeClient);

  const saved = await engine.storeMemory({ agent: 'customer', userId: 'C-ALPHA', kind: 'preference', content: 'Customer prefers oat milk', metadata: { phone: '5551234567', preference: 'oat milk' } });
  assert.equal(saved.success, true);
  assert.deepEqual(rows[0].metadata, { preference: 'oat milk' });
  assert.equal((await engine.storeMemory({ agent: 'customer', content: 'Customer prefers almond milk' })).success, false, 'customer storage rejects missing identity scope');
  assert.equal((await engine.storeMemory({ agent: 'store', content: 'Verified queue outcome without branch scope' })).success, false, 'operational storage rejects missing branch scope');

  await engine.storeMemory({ agent: 'customer', userId: 'C-ALPHA', kind: 'preference', content: 'Customer declined soy milk' });
  await engine.storeMemory({ agent: 'customer', userId: 'C-BETA', kind: 'preference', content: 'Customer prefers oat milk' });
  const alphaRecall = await engine.recallMemories({ agent: 'customer', userId: 'C-ALPHA', query: 'oat milk' });
  assert.equal(alphaRecall.memories.length, 2);
  assert.ok(alphaRecall.memories.every(memory => memory.userId === 'C-ALPHA'));
  const betaRecall = await engine.recallMemories({ agent: 'customer', userId: 'C-BETA', query: 'oat milk' });
  assert.equal(betaRecall.memories.length, 1);
  assert.equal(betaRecall.memories[0].userId, 'C-BETA');
  const repeatedStore = await engine.storeMemory({ agent: 'store', branchId: 'B-1', kind: 'stockout', content: 'Verified oat milk stockout after approved restock.' });
  assert.equal(repeatedStore.success, true);
  await engine.storeMemory({ agent: 'store', branchId: 'B-1', kind: 'stockout', content: 'Verified second oat milk stockout after approved restock.' });
  const reflected = await engine.reflectOnHistory({ agent: 'store', branchId: 'B-1', query: 'oat milk stockout restock' });
  assert.equal(reflected.success, true);
  assert.match(reflected.reflections.join(' '), /Repeated stockout pattern/);
  const context = await engine.getRelevantContext({ agent: 'store', branchId: 'B-1', query: 'oat milk stockout restock' });
  assert.match(context.context, /Verified oat milk stockout/);
  const wrongBranch = await engine.recallMemories({ agent: 'store', branchId: 'B-2', query: 'oat milk stockout restock' });
  assert.equal(wrongBranch.memories.length, 0, 'branch scopes do not leak');

  await engine.storeMemory({ agent: 'customer', userId: 'C-AGENT', kind: 'preference', content: 'Customer prefers oat milk for breakfast.' });
  const previousGroqKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  const customerReply = await groqCustomerAgentServer.processRequest({ customerId: 'C-AGENT', sessionId: 'S-AGENT', input: 'Recommend oat milk for breakfast' });
  if (previousGroqKey !== undefined) process.env.GROQ_API_KEY = previousGroqKey;
  assert.ok(customerReply.recalledMemories?.some(text => text.includes('prefers oat milk')), 'Customer Agent receives retrieved preference context');
  const storeContext = await loadStoreMemoryContext('oat milk stockout restock', 'B-1');
  assert.ok(storeContext.recalled.some(text => text.includes('Verified oat milk stockout')), 'Store Agent context helper receives matching operational outcomes');
  await engine.storeMemory({ agent: 'security', branchId: 'BRANCH-104', kind: 'false-positive-resolution', content: 'Verified scan retry on multiple terminal incident resolved without customer risk.' });
  const securityReply = await securityAgent.analyzeAmbiguousAnomaly({ behaviorContext: 'multiple terminals rapid switching' });
  assert.ok(securityReply.historicalPatternsRecalled.some(text => text.includes('Verified scan retry')), 'Security Agent uses recalled incident context');

  const token = issueManagerToken({ sub: 'manager-test', name: 'Test manager', role: 'STORE_MANAGER', branchId: 'B-1' }).token;
  const scopedManager = await authorizeMemoryScope({ headers: { authorization: `Bearer ${token}` } }, { agent: 'store', branchId: 'B-OTHER', sessionId: 'S-1' });
  assert.equal(scopedManager.branchId, 'B-1', 'the authenticated manager branch overrides caller input');
  await assert.rejects(() => authorizeMemoryScope({ headers: {} }, { agent: 'security' }), /Manager authentication/);
  await assert.rejects(() => authorizeMemoryScope({ headers: {} }, { agent: 'customer', userId: 'C-ALPHA' }), /identity token is required/);

  const scenarios = scenariosModule.NATIVE_MEMORY_LEARNING_SCENARIOS;
  assert.equal(scenarios.length, 21);
  assert.equal(scenarios.filter(s => s.agent === 'CUSTOMER').length, 7);
  assert.equal(scenarios.filter(s => s.agent === 'STORE').length, 7);
  assert.equal(scenarios.filter(s => s.agent === 'SECURITY').length, 7);
  for (const scenario of scenarios) {
    const agent = scenario.agent.toLowerCase();
    const input = agent === 'customer'
      ? { agent, userId: `LAB-${scenario.id}`, sessionId: `test-${scenario.id}` }
      : { agent, branchId: `TEST-${scenario.id}`, sessionId: `test-${scenario.id}` };
    const stored = await engine.storeMemory({ ...input, kind: `${agent}-scenario-outcome`, content: `${scenario.observedEvent} Action: ${scenario.actionTaken} Outcome: ${scenario.actualOutcome}` });
    assert.equal(stored.success, true, `${scenario.id} memory write`);
    const recalled = await engine.getRelevantContext({ ...input, query: scenario.recallQuery });
    assert.equal(recalled.success, true, `${scenario.id} authorized recall`);
    assert.ok(recalled.memories.length > 0, `${scenario.id} recalls its own evidence`);
  }

  engine.setMemoryClientProviderForTests(() => null);
  const unavailableWrite = await engine.storeMemory({ agent: 'customer', userId: 'C-ALPHA', content: 'Customer prefers oat milk' });
  const unavailableRecall = await engine.recallMemories({ agent: 'customer', userId: 'C-ALPHA', query: 'oat milk' });
  assert.equal(unavailableWrite.success, false);
  assert.match(unavailableWrite.error, /not configured/);
  assert.equal(unavailableRecall.success, false);
  assert.match(unavailableRecall.error, /not configured/);
  const { db } = await vite.ssrLoadModule('/src/services/db.ts');
  const availableProduct = db.getProducts().find(product => (db.getInventoryByProductId(product.id)?.quantity || 0) > 0);
  assert.ok(availableProduct, 'test catalogue has an in-stock product');
  const groqKeyForCartCheck = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  const offlineCartReply = await groqCustomerAgentServer.processRequest({
    customerId: 'C-OFFLINE-CART', sessionId: 'S-OFFLINE-CART', input: 'add first',
    activeProductContext: { productOptions: [{ productId: availableProduct.id, name: availableProduct.name, brand: availableProduct.brand }] }
  });
  if (groqKeyForCartCheck !== undefined) process.env.GROQ_API_KEY = groqKeyForCartCheck;
  assert.equal(offlineCartReply.success, true, `memory outage does not block the ordinary cart action: ${offlineCartReply.message}`);
  assert.equal(offlineCartReply.memoryStatus, 'unavailable');
  assert.equal(offlineCartReply.retainedMemoryId, undefined, 'failed memory storage never returns a persisted memory ID');
  assert.match(offlineCartReply.message, /memory is currently unavailable/i);
  engine.setMemoryClientProviderForTests(() => ({ from: () => { throw new Error('database offline'); } }));
  const exceptionGroqKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  const exceptionCartReply = await groqCustomerAgentServer.processRequest({
    customerId: 'C-DB-ERROR-CART', sessionId: 'S-DB-ERROR-CART', input: 'add first',
    activeProductContext: { productOptions: [{ productId: availableProduct.id, name: availableProduct.name, brand: availableProduct.brand }] }
  });
  if (exceptionGroqKey !== undefined) process.env.GROQ_API_KEY = exceptionGroqKey;
  assert.equal(exceptionCartReply.success, true, 'database errors do not block the ordinary cart action');
  assert.equal(exceptionCartReply.memoryStatus, 'unavailable');
  assert.equal(exceptionCartReply.retainedMemoryId, undefined);
  assert.match(exceptionCartReply.message, /memory is currently unavailable/i);
  assert.equal((await engine.storeMemory({ agent: 'customer', userId: 'C-ALPHA', content: 'Customer prefers oat milk' })).success, false);
  assert.equal((await engine.recallMemories({ agent: 'customer', userId: 'C-ALPHA', query: 'oat milk' })).success, false);
  engine.setMemoryClientProviderForTests();
  console.log('Native memory tests passed: ranking, sanitization, storage, persistence adapter, recall, reflection, authorization, isolation, outage and cart resilience, honest persistence status, and all 21 scenarios.');
} finally {
  await vite.close();
}

// Vite's SSR-loaded service modules can leave optional app timers alive; this is
// a standalone test command, so exit after all assertions and cleanup complete.
process.exit(0);
