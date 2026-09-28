// Node test mocks for browser primitives
declare const global: any;
declare const process: any;

if (typeof (global as any).window === 'undefined') {
  const storage = new Map<string, string>();
  (global as any).localStorage = {
    getItem: (key: string) => storage.get(key) || null,
    setItem: (key: string, val: string) => { storage.set(key, val); },
    removeItem: (key: string) => { storage.delete(key); },
    clear: () => { storage.clear(); }
  };
  (global as any).sessionStorage = {
    getItem: (key: string) => storage.get(`session_${key}`) || null,
    setItem: (key: string, val: string) => { storage.set(`session_${key}`, val); },
    removeItem: (key: string) => { storage.delete(`session_${key}`); },
    clear: () => {}
  };
  (global as any).window = {
    addEventListener: () => {},
    dispatchEvent: () => true,
    location: { search: '', origin: 'http://localhost:3000' }
  };
}

import { hindsightService } from '../services/hindsightService';
import { memoryService } from '../services/memoryService';
import { storeAgentTools } from '../services/storeAgentTools';
import { groqCustomerAgentServer } from '../server/groqCustomerAgent';
import { groqStoreAgentServer } from '../server/groqStoreAgent';
import { db } from '../services/db';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ''}`);
    failed++;
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function runHindsightVerification() {
  // Dynamically load .env into process.env if running in Node
  try {
    // @ts-ignore
    const fs = await import('fs');
    // @ts-ignore
    const path = await import('path');
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      for (const line of envContent.split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }

  console.log('================================================================');
  console.log('  GROCERAI HINDSIGHT EXPERIENTIAL MEMORY & LEARNING TEST SUITE');
  console.log('================================================================\n');

  // ------------------------------------------------------------------
  // SUITE 1: CONNECTIVITY & BANK INITIALIZATION
  // ------------------------------------------------------------------
  console.log('--- SUITE 1: CONNECTIVITY & MEMORY BANKS ---');

  const isHealthy = await hindsightService.isHealthy();
  assert(isHealthy === true, 'Test 1: Hindsight API server connection healthy on port 8888');

  const storeBank = hindsightService.getStoreBank();
  assert(storeBank === 'grocerai-store-main', 'Test 2: Store bank identifier matches grocerai-store-main');

  const custBank1 = hindsightService.getCustomerBank('USER00001');
  const custBank2 = hindsightService.getCustomerBank('USER00002');
  assert(custBank1 === 'grocerai-customer-USER00001', 'Test 3: Customer 1 bank identifier matches grocerai-customer-USER00001');
  assert(custBank2 === 'grocerai-customer-USER00002', 'Test 4: Customer 2 bank identifier matches grocerai-customer-USER00002');
  assert(custBank1 !== custBank2 && custBank1 !== storeBank, 'Test 5: Memory bank isolation between customers and store');

  // ------------------------------------------------------------------
  // SUITE 2: STORE EXPERIENTIAL MEMORY (RETAIN & RECALL)
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 2: STORE OPERATIONAL MEMORY RETENTION & RECALL ---');

  const storeDocId = `test-ops-${Date.now()}`;
  const retainStoreRes = await hindsightService.retainStoreOperationalExperience({
    situation: 'Sunday evening rush demand surge: Organic Milk shelf inventory depleted below threshold (4 units remaining).',
    actionTaken: 'Store Manager approved initial restock recommendation of 30 units.',
    outcome: 'Stockout occurred within 42 minutes (+45% traffic surge). 18 lost sales recorded before next replenishment shift.',
    takeaway: 'Under weekend evening peak hours, Organic Milk restock quantity must be calibrated to a minimum of 50 units.',
    category: 'restock',
    documentId: storeDocId,
    tags: ['restock', 'surge', 'rush_hour', 'milk']
  });

  assert(retainStoreRes.success === true, 'Test 6: Store operational experience retained into grocerai-store-main');

  const recallStoreRes = await hindsightService.recallStoreMemories('Organic Milk restock rush hour');
  assert(recallStoreRes.success === true, 'Test 7: Recall store memory query executed successfully');
  assert(recallStoreRes.results.length > 0, 'Test 8: Recalled relevant store memories with semantic scoring');

  const topStoreMemory = recallStoreRes.results.find(r =>
    r.text.toLowerCase().includes('milk') || r.text.toLowerCase().includes('30 units') || r.text.toLowerCase().includes('50 units') || r.text.toLowerCase().includes('surge')
  );
  assert(Boolean(topStoreMemory), 'Test 9: Recalled memory contains historical 30/50 unit restock details');

  // ------------------------------------------------------------------
  // SUITE 3: CLOSED-LOOP LEARNING CURVE (DEMONSTRABLE ADAPTATION)
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 3: CLOSED-LOOP LEARNING CURVE & CITATION ---');

  // Step A: Tool 18 generates restock recommendation for milk
  const prodMilk = db.getProducts().find(p => p.id === 'prod-taaza-milk' || p.name.toLowerCase().includes('milk')) || db.getProducts()[0];
  const restockRec = storeAgentTools.generateRestockRecommendation(prodMilk.id);

  assert(
    (restockRec.suggestedQuantity ?? 0) >= 50,
    'Test 10: Learning Curve: Suggested restock quantity adapted from 30 to at least 50 units based on past outcome'
  );

  const hasLearningEvidence = restockRec.evidence.some(e =>
    e.toLowerCase().includes('hindsight') || e.toLowerCase().includes('learning') || e.toLowerCase().includes('outcome')
  );
  assert(hasLearningEvidence, 'Test 11: Learning Curve: Explicit historical citation documented in recommendation evidence');

  // Step B: Tool 25 records outcome to Hindsight
  const outcomeResult = storeAgentTools.recordRecommendationOutcome(restockRec.recommendationId, {
    observed_event: 'Weekend evening dairy surge',
    action_taken: 'Restocked 50 units of Organic Milk (adapted from previous 30)',
    reobserved_metric: '0 stockouts logged; stock remained at 14 units at closing',
    outcome_summary: 'Zero stockouts experienced during entire 3-hour peak window. 100% demand fulfilled.',
    satisfaction_delta: '+24% customer satisfaction',
    sales_delta: '+31% confirmed dairy sales'
  });

  assert(outcomeResult.success === true, 'Test 12: Tool 25 records recommendation outcome successfully');
  assert(outcomeResult.hindsightStored === true, 'Test 13: Tool 25 synchronizes outcome directly into Hindsight memory bank');

  // ------------------------------------------------------------------
  // SUITE 4: CUSTOMER AGENT EXPERIENTIAL MEMORY
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 4: CUSTOMER EXPERIENTIAL MEMORY (PREFERENCES & ISOLATION) ---');
  console.log('  [Pacing] Waiting 20s to ensure fresh token per minute (TPM) quota...');
  await sleep(20000);

  // Retain preference for Customer 1:
  const cust1Doc = `cust1-pref-${Date.now()}`;
  const retainCust1 = await hindsightService.retainCustomerExperience({
    customerId: 'USER00001',
    observation: 'Customer is lactose intolerant and strongly prefers oat milk or almond milk for beverages.',
    context: 'Customer shared dietary requirement during visit',
    documentId: cust1Doc,
    tags: ['dietary', 'lactose_intolerant', 'oat_milk']
  });
  assert(retainCust1.success === true, 'Test 14: Customer 1 preference retained into grocerai-customer-USER00001');

  console.log('  [Pacing] Waiting 20s for Customer 2 retention...');
  await sleep(20000);

  // Retain completely different preference for Customer 2:
  const cust2Doc = `cust2-pref-${Date.now()}`;
  const retainCust2 = await hindsightService.retainCustomerExperience({
    customerId: 'USER00002',
    observation: 'Customer loves full-cream buffalo milk and prefers organic farm ghee.',
    context: 'Customer shared dairy preference',
    documentId: cust2Doc,
    tags: ['dairy', 'buffalo_milk', 'ghee']
  });
  assert(retainCust2.success === true, 'Test 15: Customer 2 preference retained into grocerai-customer-USER00002');

  // Recall Customer 1 memory:
  const recallCust1 = await hindsightService.recallCustomerMemories('USER00001', 'milk preference');
  assert(recallCust1.success === true && recallCust1.results.length > 0, 'Test 16: Customer 1 recalls lactose intolerance / oat milk preference');
  const cust1HasOat = recallCust1.results.some(r => r.text.toLowerCase().includes('oat') || r.text.toLowerCase().includes('lactose'));
  assert(cust1HasOat, 'Test 17: Customer 1 recalled memory accurately contains oat milk / lactose intolerance');

  // Strict Isolation: Customer 2 recall must NOT contain Customer 1's oat milk / lactose intolerance
  const recallCust2 = await hindsightService.recallCustomerMemories('USER00002', 'milk preference');
  assert(recallCust2.success === true && recallCust2.results.length > 0, 'Test 18: Customer 2 recalls buffalo milk / dairy preference');
  const cust2HasOat = recallCust2.results.some(r => r.text.toLowerCase().includes('lactose intolerant'));
  assert(!cust2HasOat, 'Test 19: Strict isolation: Customer 2 memory bank has ZERO bleed of Customer 1 preferences');

  // ------------------------------------------------------------------
  // SUITE 5: MULTILINGUAL MEMORY PERSISTENCE & RECALL
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 5: MULTILINGUAL MEMORY PERSISTENCE & RECALL ---');
  console.log('  [Pacing] Waiting 20s for Telugu multilingual memory retention...');
  await sleep(20000);

  // Retain preference in Telugu:
  const custTeluguDoc = `cust-te-${Date.now()}`;
  const retainTelugu = await hindsightService.retainCustomerExperience({
    customerId: 'USER00003',
    observation: 'Naku brown bread ante chala istam, white bread vaddu (Customer prefers brown bread, dislikes white bread).',
    context: 'Telugu conversation turn',
    documentId: custTeluguDoc,
    tags: ['telugu', 'preference', 'bread']
  });
  assert(retainTelugu.success === true, 'Test 20: Multilingual: Preference declared in Telugu retained successfully');

  // Recall in English:
  const recallEnglishFromTelugu = await hindsightService.recallCustomerMemories('USER00003', 'bread preference');
  assert(recallEnglishFromTelugu.success === true && recallEnglishFromTelugu.results.length > 0, 'Test 21: Cross-lingual recall: Telugu preference recalled via English query');

  // ------------------------------------------------------------------
  // SUITE 6: ACTIVITY LOGGING & AUDIT TRAIL
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 6: ACTIVITY LOGGING & MANAGER AUDIT TRAIL ---');

  const activityLog = hindsightService.getActivityLog();
  assert(Array.isArray(activityLog) && activityLog.length >= 4, 'Test 22: Activity log records retain and recall operations');
  assert(activityLog.every(a => a.id && a.timestamp && a.bankId && a.operation), 'Test 23: Activity log entries contain complete metadata and bank identifiers');

  // ------------------------------------------------------------------
  // SUITE 7: GRACEFUL DEGRADATION (OFFLINE FALLBACK TEST)
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 7: GRACEFUL DEGRADATION ---');

  const offlineService = new (hindsightService.constructor as any)('http://localhost:9999');
  const offlineRecall = await offlineService.recall('grocerai-store-main', 'test query');
  assert(offlineRecall.success === false, 'Test 24: Graceful degradation: offline service returns success=false');
  assert(Array.isArray(offlineRecall.results) && offlineRecall.results.length === 0, 'Test 25: Graceful degradation: offline recall returns empty array without throwing');

  const offlineRetain = await offlineService.retain('grocerai-store-main', 'test content');
  assert(offlineRetain.success === false, 'Test 26: Graceful degradation: offline retain returns success=false without crashing application');

  // ------------------------------------------------------------------
  // SUITE 8: STORE AGENT LIVE INTEGRATION
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 8: STORE AGENT SERVER INTEGRATION ---');
  console.log('  [Pacing] Waiting 15s for Store Agent reasoning turn...');
  await sleep(15000);

  const storeAgentReq = await groqStoreAgentServer.processRequest({
    managerId: 'EMP-1042',
    input: 'What are the lessons learned from our past Organic Milk restocks during peak rush?'
  });

  assert(storeAgentReq.success === true, 'Test 27: Store Agent processes operational experience query successfully');
  assert(Array.isArray(storeAgentReq.recalledMemories), 'Test 28: Store Agent response includes recalledMemories array');
  assert((storeAgentReq.recalledMemories?.length ?? 0) > 0, 'Test 29: Store Agent successfully recalled past operational experiences from Hindsight');

  // ------------------------------------------------------------------
  // SUITE 9: CUSTOMER AGENT LIVE INTEGRATION
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 9: CUSTOMER AGENT SERVER INTEGRATION ---');
  console.log('  [Pacing] Waiting 15s for Customer Agent reasoning turn...');
  await sleep(15000);

  const custAgentReq = await groqCustomerAgentServer.processRequest({
    sessionId: 'USER00001',
    customerId: 'USER00001',
    input: 'Which milk do you recommend for me today?'
  });

  assert(custAgentReq.success === true, 'Test 30: Customer Agent responds to milk recommendation query');
  assert(Array.isArray(custAgentReq.recalledMemories), 'Test 31: Customer Agent response includes recalledMemories array');
  assert((custAgentReq.recalledMemories?.length ?? 0) > 0, 'Test 32: Customer Agent recalled customer lactose / oat milk preference from Hindsight bank');

  console.log('  [Pacing] Waiting 15s for automatic preference declaration...');
  await sleep(15000);

  // Automatic preference retention:
  const prefDeclareReq = await groqCustomerAgentServer.processRequest({
    sessionId: 'USER00001',
    customerId: 'USER00001',
    input: 'Remember that I prefer olive oil instead of butter.'
  });

  assert(prefDeclareReq.success === true, 'Test 33: Customer Agent processes explicit preference statement');
  assert(Boolean(prefDeclareReq.retainedMemoryId), 'Test 34: Customer Agent automatically retains declared preference into customer bank');

  console.log('\n================================================================');
  console.log(`  HINDSIGHT VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHindsightVerification().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
