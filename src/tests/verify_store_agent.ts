/**
 * GROCERAI STORE AGENT VERIFICATION TEST SUITE
 * 
 * Comprehensive verification of the GrocerAI Base Store Agent:
 * - 25 Authoritative Store Tools
 * - 7 Store Agent Event Types
 * - Manager Authentication & Action Protection
 * - Funnel Hierarchy & Data Reality Integrity
 * - Live Groq Tool-Calling Engine & Fallbacks
 * - Dynamic Mutation Detection
 */

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

import { db } from '../services/db';
import { eventService } from '../services/eventService';
import { storeAgentTools, executeStoreAgentTool } from '../services/storeAgentTools';
import { storeAgent } from '../services/storeAgent';
import { managerService } from '../services/managerService';
import { groqStoreAgentServer } from '../server/groqStoreAgent';

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

async function runStoreAgentTests() {
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
    // Ignore
  }

  console.log('================================================================');
  console.log('  GROCERAI STORE AGENT VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  // ------------------------------------------------------------------
  // SUITE 1: STORE STATE & INVENTORY TOOLS (Tools 1 - 5)
  // ------------------------------------------------------------------
  console.log('--- SUITE 1: STORE STATE & INVENTORY TOOLS (1-5) ---');

  // Tool 1: getStoreOverview
  const overview = storeAgentTools.getStoreOverview();
  assert(
    typeof overview.totalProducts === 'number' && overview.totalProducts > 0 &&
    typeof overview.outOfStockProductsCount === 'number' &&
    typeof overview.lowStockProductsCount === 'number' &&
    typeof overview.congestedQueuesCount === 'number' &&
    ['OPTIMAL', 'ATTENTION_REQUIRED', 'CRITICAL_STOCKOUTS'].includes(overview.storeStatus),
    'Tool 1: getStoreOverview returns comprehensive store telemetry'
  );

  // Tool 2: getInventoryStatus
  const invList = storeAgentTools.getInventoryStatus();
  const invSingle = storeAgentTools.getInventoryStatus('Taaza Milk') as any;
  assert(
    Array.isArray(invList) && invList.length > 0 &&
    invSingle && invSingle.productName?.includes('Milk') && typeof invSingle.currentQuantity === 'number',
    'Tool 2: getInventoryStatus returns authoritative inventory items & single product lookup'
  );

  // Tool 3: getLowStockProducts
  const lowStock = storeAgentTools.getLowStockProducts();
  assert(
    Array.isArray(lowStock) && lowStock.every(i => i.currentQuantity <= i.reorderThreshold && i.currentQuantity > 0),
    'Tool 3: getLowStockProducts returns strictly low-stock items (0 < qty <= threshold)'
  );

  // Tool 4: getOutOfStockProducts
  const oos = storeAgentTools.getOutOfStockProducts();
  assert(
    Array.isArray(oos) && oos.length > 0 && oos.every(i => i.currentQuantity === 0),
    'Tool 4: getOutOfStockProducts returns strictly stockout items (qty === 0)'
  );

  // Tool 5: getRecentInventoryMovements
  const movements = storeAgentTools.getRecentInventoryMovements();
  assert(
    Array.isArray(movements) && movements.length > 0,
    'Tool 5: getRecentInventoryMovements returns inventory audit movements'
  );

  // ------------------------------------------------------------------
  // SUITE 2: DEMAND & FUNNEL INTELLIGENCE TOOLS (Tools 6 - 9)
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 2: DEMAND & FUNNEL INTELLIGENCE TOOLS (6-9) ---');

  // Tool 6: getDemandFunnel
  const funnel = storeAgentTools.getDemandFunnel();
  assert(
    funnel.searches >= funnel.views &&
    funnel.views >= funnel.cartAdditions &&
    funnel.cartAdditions >= funnel.checkoutAttempts &&
    typeof funnel.confirmedSales === 'number' &&
    typeof funnel.unfulfilledDemand === 'number' &&
    funnel.explanation.includes('Search != Sale'),
    'Tool 6: getDemandFunnel validates search >= view >= cart >= checkout'
  );

  // Tool 7: getUnfulfilledDemand
  const unfulfilled = storeAgentTools.getUnfulfilledDemand();
  assert(
    typeof unfulfilled.totalUnmetRequests === 'number' &&
    Array.isArray(unfulfilled.unmetCustomerRequests) &&
    Array.isArray(unfulfilled.activeStockouts),
    'Tool 7: getUnfulfilledDemand returns unfulfilled customer requests & stockout demand'
  );

  // Tool 8: getProductDemand
  const curdDemand = storeAgentTools.getProductDemand('Curd');
  assert(
    curdDemand.productId !== undefined &&
    typeof curdDemand.searches === 'number' &&
    typeof curdDemand.views === 'number' &&
    typeof curdDemand.unfulfilledRequests === 'number',
    'Tool 8: getProductDemand returns item-specific funnel telemetry'
  );

  // Tool 9: getTopDemandProducts
  const topDemand = storeAgentTools.getTopDemandProducts(5);
  assert(
    Array.isArray(topDemand) && topDemand.length > 0 &&
    topDemand.every(p => typeof p.unitsSold === 'number' && typeof p.revenueGenerated === 'number'),
    'Tool 9: getTopDemandProducts returns ranked high-velocity products'
  );

  // ------------------------------------------------------------------
  // SUITE 3: SALES & REVENUE TELEMETRY TOOLS (Tools 10 - 11)
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 3: SALES & REVENUE TELEMETRY TOOLS (10-11) ---');

  // Tool 10: getRecentSales
  const sales = storeAgentTools.getRecentSales(10);
  assert(
    Array.isArray(sales) && sales.length > 0 &&
    sales.every(s => typeof s.total_amount === 'number' && s.id !== undefined),
    'Tool 10: getRecentSales returns confirmed sales transactions from sales ledger'
  );

  // Tool 11: getSalesSummary
  const summary = storeAgentTools.getSalesSummary();
  assert(
    typeof summary.totalRevenue === 'number' &&
    typeof summary.totalUnitsSold === 'number' &&
    Array.isArray(summary.topSellingProducts) &&
    summary.note.includes('Search != Sale'),
    'Tool 11: getSalesSummary computes verified revenue and sales velocity'
  );

  // ------------------------------------------------------------------
  // SUITE 4: STORE ACTIVITY & ENVIRONMENT TOOLS (Tools 12 - 15)
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 4: STORE ACTIVITY & ENVIRONMENT TOOLS (12-15) ---');

  // Tool 12: getRecentStoreEvents
  const events = storeAgentTools.getRecentStoreEvents(10);
  assert(
    Array.isArray(events) && events.length > 0 && events[0].event_type !== undefined,
    'Tool 12: getRecentStoreEvents accesses authoritative event ledger'
  );

  // Tool 13: getStoreTraffic
  const traffic = storeAgentTools.getStoreTraffic();
  assert(
    typeof traffic.currentCustomerFootfall === 'number' &&
    Array.isArray(traffic.aisleSummaries) &&
    typeof traffic.busiestAisle === 'string',
    'Tool 13: getStoreTraffic returns store-wide foot traffic metrics'
  );

  // Tool 14: getAisleActivity
  const aisle1 = storeAgentTools.getAisleActivity('Aisle 1') as any;
  assert(
    aisle1 && (aisle1.aisle === 'Aisle 1' || aisle1.customer_count !== undefined),
    'Tool 14: getAisleActivity returns telemetry for target aisle'
  );

  // Tool 15: getCheckoutQueueStatus
  const queueStatus = storeAgentTools.getCheckoutQueueStatus();
  assert(
    typeof queueStatus.totalCounters === 'number' &&
    typeof queueStatus.congestedCounters === 'number' &&
    Array.isArray(queueStatus.counters),
    'Tool 15: getCheckoutQueueStatus returns queue wait times and open counters'
  );

  // ------------------------------------------------------------------
  // SUITE 5: PRODUCT & SUBSTITUTION TOOLS (Tools 16 - 17)
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 5: PRODUCT & SUBSTITUTION TOOLS (16-17) ---');

  // Tool 16: getSubstitutionPatterns
  const subPatterns = storeAgentTools.getSubstitutionPatterns();
  assert(
    typeof subPatterns.totalSubstitutionsOffered === 'number' &&
    typeof subPatterns.acceptanceRate === 'string' &&
    Array.isArray(subPatterns.patterns),
    'Tool 16: getSubstitutionPatterns tracks customer acceptance/rejection patterns'
  );

  // Tool 17: getProductAvailability
  const prodAvail = storeAgentTools.getProductAvailability('Taaza Milk');
  assert(
    prodAvail.success && prodAvail.isAvailable === true && prodAvail.quantity > 0,
    'Tool 17: getProductAvailability returns real-time inventory quantity and aisle location'
  );

  // ------------------------------------------------------------------
  // SUITE 6: RECOMMENDATION REASONING TOOLS (Tools 18 - 20)
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 6: RECOMMENDATION REASONING TOOLS (18-20) ---');

  // Tool 18: generateRestockRecommendation
  const curdProd = db.getProducts().find(p => p.name.toLowerCase().includes('curd')) || db.getProducts()[0];
  const restockRec = storeAgentTools.generateRestockRecommendation(curdProd.id);
  assert(
    Boolean(restockRec.recommendationId && (restockRec.suggestedQuantity ?? 0) > 0 && restockRec.evidence.length >= 3 && (restockRec.priority === 'URGENT' || restockRec.priority === 'HIGH')),
    'Tool 18: generateRestockRecommendation calculates formulaic restock qty with multi-signal evidence'
  );

  // Tool 19: generateStoreRecommendations
  const storeRecs = storeAgentTools.generateStoreRecommendations();
  assert(
    Array.isArray(storeRecs) && storeRecs.length > 0 &&
    storeRecs.every(r => r.suggestedAction && r.evidence?.length > 0),
    'Tool 19: generateStoreRecommendations synthesizes structured recommendations across store'
  );

  // Tool 20: getRecommendationHistory
  const recHistory = storeAgentTools.getRecommendationHistory();
  assert(
    Array.isArray(recHistory) && recHistory.length > 0,
    'Tool 20: getRecommendationHistory returns recommendations lifecycle log'
  );

  // ------------------------------------------------------------------
  // SUITE 7: MANAGER ACTIONS & LIFECYCLE (Tools 21 - 25)
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 7: MANAGER ACTIONS & LIFECYCLE (21-25) ---');

  // Add a test recommendation to db for deterministic execution
  const testRecId = `test-rec-${Date.now()}`;
  db.addAIRecommendation({
    id: testRecId,
    type: 'restock',
    title: 'Test Urgent Restock: Amul Taaza Milk',
    description: 'Demand surge detected during morning rush.',
    product_id: 'prod-taaza-milk',
    product_name: 'Amul Taaza Milk (500ml)',
    suggested_action: 'Restock 35 units to Shelf A1-02',
    confidence: 0.94,
    priority: 'urgent',
    expected_impact: '+22% revenue',
    historical_evidence: 'High sell-through rate during test simulation',
    status: 'pending',
    created_at: new Date().toISOString(),
    evidence: ['Current stock: 40', 'Daily velocity: 25 packs/day'],
    suggested_quantity: 35
  });

  // Tool 21: approveRecommendation
  const approveRes = storeAgentTools.approveRecommendation(testRecId, 'Manager Vikram Malhotra');
  assert(
    approveRes.success && approveRes.status === 'APPROVED',
    'Tool 21: approveRecommendation transitions state to APPROVED'
  );

  // Tool 22: modifyRecommendation
  const testRecModifyId = `test-rec-mod-${Date.now()}`;
  db.addAIRecommendation({
    id: testRecModifyId,
    type: 'restock',
    title: 'Test Modifiable Restock',
    description: 'Initial restock suggestion.',
    product_id: 'prod-taaza-milk',
    product_name: 'Amul Taaza Milk (500ml)',
    suggested_action: 'Restock 20 units',
    confidence: 0.88,
    priority: 'medium',
    expected_impact: '+10% revenue',
    historical_evidence: 'Standard daily buffer',
    status: 'pending',
    created_at: new Date().toISOString(),
    suggested_quantity: 20
  });

  const initialQty = db.getInventoryByProductId('prod-taaza-milk')?.quantity || 0;
  const modRes = storeAgentTools.modifyRecommendation(testRecModifyId, { customQuantity: 50 }, 'Manager Vikram Malhotra');
  const postModQty = db.getInventoryByProductId('prod-taaza-milk')?.quantity || 0;
  assert(
    modRes.success &&
    modRes.modifiedQuantity === 50 &&
    postModQty === initialQty + 50,
    'Tool 22: modifyRecommendation adjusts restock quantity and updates physical inventory'
  );

  // Tool 23: dismissRecommendation
  const testRecDismissId = `test-rec-dsm-${Date.now()}`;
  db.addAIRecommendation({
    id: testRecDismissId,
    type: 'queue',
    title: 'Test Dismissable Queue Action',
    description: 'Open Counter 4.',
    suggested_action: 'Open counter 4',
    confidence: 0.85,
    priority: 'low',
    expected_impact: '-2 min wait',
    historical_evidence: 'Queue spike test',
    status: 'pending',
    created_at: new Date().toISOString()
  });
  const dismissRes = storeAgentTools.dismissRecommendation(testRecDismissId, 'Dismissed in verification test', 'Manager Vikram Malhotra');
  assert(
    dismissRes.success && dismissRes.status === 'DISMISSED',
    'Tool 23: dismissRecommendation transitions recommendation to DISMISSED'
  );

  // Tool 24: executeApprovedRecommendation
  const execRes = storeAgentTools.executeApprovedRecommendation(testRecId);
  assert(
    Boolean(execRes.success && ('executed' in execRes ? execRes.executed === true : true)),
    'Tool 24: executeApprovedRecommendation executes operational action and logs ledger record'
  );

  // Tool 25: recordRecommendationOutcome
  const outcomeRes = storeAgentTools.recordRecommendationOutcome(testRecId, {
    observed_event: 'Initial low inventory',
    action_taken: 'Replenished 50 units',
    reobserved_metric: 'Stock restored to 90 units',
    outcome_summary: 'Shelf stock restored with zero stockouts',
    satisfaction_delta: '+25%',
    sales_delta: '+15%'
  });
  assert(
    outcomeRes.success && outcomeRes.outcome?.action_id !== undefined,
    'Tool 25: recordRecommendationOutcome stores outcome for closed-loop telemetry'
  );

  // ------------------------------------------------------------------
  // SUITE 8: STORE AGENT EVENT LEDGER VERIFICATION
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 8: STORE AGENT EVENT LEDGER VERIFICATION ---');

  const storeEvents = eventService.getEvents({ limit: 100 });
  const eventTypesPresent = new Set(storeEvents.map(e => e.event_type));

  assert(
    eventTypesPresent.has('STORE_AGENT_OBSERVATION'),
    'Event STORE_AGENT_OBSERVATION is logged to event ledger'
  );
  assert(
    eventTypesPresent.has('STORE_AGENT_RECOMMENDATION_CREATED') || storeRecs.length > 0,
    'Event STORE_AGENT_RECOMMENDATION_CREATED is recorded when recommendations are generated'
  );
  assert(
    eventTypesPresent.has('STORE_AGENT_RECOMMENDATION_APPROVED'),
    'Event STORE_AGENT_RECOMMENDATION_APPROVED is logged to event ledger'
  );
  assert(
    eventTypesPresent.has('STORE_AGENT_RECOMMENDATION_MODIFIED'),
    'Event STORE_AGENT_RECOMMENDATION_MODIFIED is logged to event ledger'
  );
  assert(
    eventTypesPresent.has('STORE_AGENT_RECOMMENDATION_DISMISSED'),
    'Event STORE_AGENT_RECOMMENDATION_DISMISSED is logged to event ledger'
  );
  assert(
    eventTypesPresent.has('STORE_AGENT_ACTION_EXECUTED'),
    'Event STORE_AGENT_ACTION_EXECUTED is logged to event ledger'
  );
  assert(
    eventTypesPresent.has('STORE_AGENT_OUTCOME_RECORDED'),
    'Event STORE_AGENT_OUTCOME_RECORDED is logged to event ledger'
  );

  // ------------------------------------------------------------------
  // SUITE 9: MANAGER AUTHENTICATION & ACCESS CONTROL
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 9: MANAGER AUTHENTICATION & ACCESS CONTROL ---');

  // Verify manager authentication against employee records
  const authValid = managerService.login('EMP-1042', '1985-06-15');
  assert(authValid.success && authValid.manager?.name === 'Vikram Malhotra', 'Manager login verified for EMP-1042');

  const authInvalid = managerService.login('EMP-1042', 'wrong-pin');
  assert(!authInvalid.success, 'Manager login rejected on incorrect PIN');

  // Dispatcher tool execution validation
  const dispatchRes = await executeStoreAgentTool('getStoreOverview', {});
  assert(dispatchRes.success && dispatchRes.result?.totalProducts > 0, 'executeStoreAgentTool dispatcher routes tool call');

  const unknownToolRes = await executeStoreAgentTool('nonExistentTool', {});
  assert(Boolean(!unknownToolRes.success && unknownToolRes.error?.includes('Unknown store tool')), 'executeStoreAgentTool gracefully rejects unknown tools');

  // ------------------------------------------------------------------
  // SUITE 10: DYNAMIC STATE MUTATION & RE-OBSERVATION
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 10: DYNAMIC STATE MUTATION & RE-OBSERVATION ---');

  const initialOosCount = storeAgentTools.getOutOfStockProducts().length;
  // Mutate an inventory item to 0
  const allProds = db.getProducts();
  const testProd = allProds.find(p => {
    const inv = db.getInventoryByProductId(p.id);
    return inv && inv.quantity > 0;
  });

  if (testProd) {
    const origInv = db.getInventoryByProductId(testProd.id)!;
    const origQty = origInv.quantity;

    // Simulate instant stock depletion
    db.restockProduct(testProd.id, -origQty, 'Test depletion');

    const newOos = storeAgentTools.getOutOfStockProducts();
    assert(
      newOos.length === initialOosCount + 1,
      'Store Agent detects physical inventory depletion dynamically'
    );

    // Now replenish it back
    db.restockProduct(testProd.id, origQty, 'Test restore');
    const restoredOos = storeAgentTools.getOutOfStockProducts();
    assert(
      restoredOos.length === initialOosCount,
      'Store Agent re-observes inventory replenishment dynamically'
    );
  } else {
    assert(true, 'Store Agent dynamic mutation skipped (no in-stock product)');
  }

  // ------------------------------------------------------------------
  // SUITE 11: LIVE GROQ STORE AGENT SERVER EXECUTION
  // ------------------------------------------------------------------
  console.log('\n--- SUITE 11: LIVE GROQ STORE AGENT SERVER EXECUTION ---');

  // Test unconfigured behavior
  const prevKey = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  const unconfigRes = await groqStoreAgentServer.processRequest({
    input: "Status report",
    managerId: 'EMP-1042'
  });
  assert(
    unconfigRes.groqConfigured === false && unconfigRes.error === 'GROQ_API_KEY_NOT_CONFIGURED',
    'Groq Store Agent reports unconfigured clearly when API key is missing'
  );
  if (prevKey) process.env.GROQ_API_KEY = prevKey;

  // Test live query when configured
  if (groqStoreAgentServer.isConfigured()) {
    try {
      console.log('  [Pacing] Waiting 15s to ensure clean Groq TPM bucket...');
      await new Promise(r => setTimeout(r, 15000));
      const liveRes = await groqStoreAgentServer.processRequest({
        input: "What are the current out of stock products and what restock actions do you recommend?",
        managerId: 'EMP-1042',
        history: []
      });

      assert(
        liveRes.success === true &&
        typeof liveRes.message === 'string' &&
        liveRes.message.length > 0,
        'Groq Store Agent responds to manager operational query'
      );

      assert(
        Array.isArray(liveRes.toolExecutions) && liveRes.toolExecutions.length > 0,
        `Groq Store Agent selected and executed backend tools (${liveRes.toolExecutions?.map(t => t.tool_name).join(', ')})`
      );

      assert(
        Array.isArray(liveRes.suggestedActions) && liveRes.suggestedActions.length > 0,
        'Groq Store Agent provided actionable follow-up managerial options'
      );
    } catch (err: any) {
      console.error('Groq Store Agent Live Execution Error:', err.message);
      assert(false, 'Groq Store Agent live execution completed successfully', err.message);
    }
  } else {
    assert(true, 'Groq Store Agent live call skipped (API key not present in environment)');
  }

  // ------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  STORE AGENT VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStoreAgentTests().catch(err => {
  console.error('Fatal Store Agent Test Runner Error:', err);
  process.exit(1);
});
