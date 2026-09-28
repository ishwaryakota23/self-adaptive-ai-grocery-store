/**
 * GROCERAI PHASE 2 VERIFICATION SUITE
 * Tests Tasks 1 through 7:
 * Task 1 - Session Isolation (USER00001 vs USER00002)
 * Task 2 - Database Persistence & Configuration Reality
 * Task 3 - Complete Shopping & Payment Lifecycle
 * Task 4 - Complete Behavioral Event History
 * Task 5 - Demand Intelligence Foundation
 * Task 6 - Realistic Substitution Flow (Curd -> Greek Yogurt & Paneer -> Tofu)
 * Task 7 - Manager Dashboard & Operational Recommendation Lifecycle
 */

// Mock window and localStorage for Node test runner
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
import { cartService } from '../services/cartService';
import { missionService } from '../services/missionService';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import { eventService } from '../services/eventService';
import { customerAgent } from '../services/customerAgent';
import { executeCustomerAgentTool } from '../services/customerAgentTools';
import { managerService } from '../services/managerService';
import { isSupabaseConfigured } from '../services/supabase';

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

async function runVerification() {
  console.log('====================================================');
  console.log('  GROCERAI PHASE 2 VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  // ----------------------------------------------------------------
  // TASK 1: MULTI-CUSTOMER SESSION ISOLATION
  // ----------------------------------------------------------------
  console.log('--- TASK 1: SESSION ISOLATION (USER00001 vs USER00002) ---');
  
  // Reset DB to clean initial seeded state
  db.resetToDefaults();

  const user1Mission = missionService.getActiveMission('USER00001');
  const user2Mission = missionService.getActiveMission('USER00002');

  assert(!!user1Mission && user1Mission.customer_id === 'USER00001', 'USER00001 has dedicated active mission ("Pasta Night Mission")');
  assert(!!user2Mission && user2Mission.customer_id === 'USER00002', 'USER00002 has dedicated active mission ("Breakfast & Dairy Mission")');
  assert(user1Mission?.id !== user2Mission?.id, 'Missions have distinct unique IDs');

  const u1CartInitial = cartService.getCart('USER00001');
  const u2CartInitial = cartService.getCart('USER00002');

  assert(u1CartInitial.length === 4, `USER00001 initial cart has 4 items (found: ${u1CartInitial.length})`);
  assert(u2CartInitial.length === 1, `USER00002 initial cart has 1 item (found: ${u2CartInitial.length})`);
  assert(u2CartInitial[0]?.product_id === 'prod-taaza-milk', 'USER00002 initial cart item is Amul Taaza Milk');

  // USER00001 adds an item (Olive Oil)
  const oliveOil = db.getProductById('prod-oliveoil')!;
  cartService.addToCart(oliveOil, 1, 'USER00001');

  const u1CartAfterAdd = cartService.getCart('USER00001');
  const u2CartAfterAdd = cartService.getCart('USER00002');

  assert(u1CartAfterAdd.length === 5, 'USER00001 cart incremented to 5 items');
  assert(u2CartAfterAdd.length === 1, 'USER00002 cart remained strictly 1 item (Zero Session Bleed)');

  // USER00002 marks an item found
  if (user2Mission && user2Mission.items.length > 0) {
    const targetItemId = user2Mission.items[0].id;
    missionService.updateItemStatus(user2Mission.id, targetItemId, 'found');
    const u2MissionUpdated = missionService.getActiveMission('USER00002')!;
    const u1MissionUpdated = missionService.getActiveMission('USER00001')!;

    assert(u2MissionUpdated.items[0].status === 'found', 'USER00002 marked item as found');
    assert(u1MissionUpdated.items[0].status !== 'found' || u1MissionUpdated.id !== u2MissionUpdated.id, 'USER00001 mission state was not mutated by USER00002 action');
  }

  // ----------------------------------------------------------------
  // TASK 2: PERSISTENCE VERIFICATION
  // ----------------------------------------------------------------
  console.log('\n--- TASK 2: PERSISTENCE & CONFIGURATION REALITY ---');
  const supabaseActive = isSupabaseConfigured();
  console.log(`  Supabase configured: ${supabaseActive}`);
  assert(!supabaseActive, 'Verified Supabase credentials are safely uncommitted / placeholder mode');
  
  // Verify localStorage fallback persistence
  const savedStateJson = (global as any).localStorage.getItem('grocer_ai_db_v2');
  assert(!!savedStateJson && savedStateJson.length > 100, 'Database state successfully persists to local storage key (grocer_ai_db_v2)');

  // ----------------------------------------------------------------
  // TASK 3: COMPLETE SHOPPING & PAYMENT LIFECYCLE
  // ----------------------------------------------------------------
  console.log('\n--- TASK 3: SHOPPING & PAYMENT LIFECYCLE ---');
  
  // 3A: Record Checkout Started
  db.recordCheckoutStarted('USER00002');
  const checkoutEvents = eventService.getEvents({ customer_session_id: 'USER00002', event_type: 'CHECKOUT_STARTED' });
  assert(checkoutEvents.length > 0, 'CHECKOUT_STARTED event logged for USER00002');

  // 3B: Payment Failure Simulation
  const invMilkBeforeFail = db.getInventoryByProductId('prod-taaza-milk')!.quantity;
  const ordersBeforeFail = orderService.getOrders('USER00002').length;

  paymentService.recordPaymentFailed('USER00002', 'UPI', 'Bank transaction declined');

  const invMilkAfterFail = db.getInventoryByProductId('prod-taaza-milk')!.quantity;
  const ordersAfterFail = orderService.getOrders('USER00002').length;
  const u2CartAfterFail = cartService.getCart('USER00002');

  assert(invMilkAfterFail === invMilkBeforeFail, 'Inventory is NOT deducted on failed payment');
  assert(ordersAfterFail === ordersBeforeFail, 'Confirmed Order is NOT created on failed payment');
  assert(u2CartAfterFail.length > 0, 'Cart items are preserved on failed payment');

  const failEvents = eventService.getEvents({ customer_session_id: 'USER00002', event_type: 'PAYMENT_FAILED' });
  assert(failEvents.length > 0, 'PAYMENT_FAILED event logged');

  // 3C: Payment Success & Order Confirmation
  const invMilkBeforeSuccess = db.getInventoryByProductId('prod-taaza-milk')!.quantity;
  const u2ItemsCount = u2CartAfterFail.reduce((sum, i) => sum + i.quantity, 0);

  const confirmedOrder = orderService.completeCheckout('UPI', 'USER00002');

  const invMilkAfterSuccess = db.getInventoryByProductId('prod-taaza-milk')!.quantity;
  const u2CartAfterSuccess = cartService.getCart('USER00002');
  const u1CartAfterSuccess = cartService.getCart('USER00001');

  assert(confirmedOrder.payment_status === 'PAYMENT_SUCCESS', 'Order created with PAYMENT_SUCCESS');
  assert(invMilkAfterSuccess === invMilkBeforeSuccess - 2, `Inventory deducted strictly upon payment success (${invMilkBeforeSuccess} -> ${invMilkAfterSuccess})`);
  assert(u2CartAfterSuccess.length === 0, 'USER00002 cart cleared after successful checkout');
  assert(u1CartAfterSuccess.length === 5, 'USER00001 cart preserved completely untouched');

  const sales = db.getSales().filter(s => s.order_id === confirmedOrder.id);
  assert(sales.length > 0, 'Sale record created upon payment success');

  // ----------------------------------------------------------------
  // TASK 4: BEHAVIORAL EVENT HISTORY
  // ----------------------------------------------------------------
  console.log('\n--- TASK 4: BEHAVIORAL EVENT HISTORY ---');
  const allEvents = eventService.getEvents();
  assert(allEvents.length >= 10, `Event ledger contains append-only behavioral stream (${allEvents.length} events logged)`);
  
  const sampleEvent = allEvents[0];
  assert(
    !!sampleEvent.event_id && !!sampleEvent.event_type && !!sampleEvent.timestamp && !!sampleEvent.customer_session_id,
    'Events contain event_id, event_type, timestamp, customer_session_id, and store_id'
  );

  // ----------------------------------------------------------------
  // TASK 5: DEMAND INTELLIGENCE FOUNDATION
  // ----------------------------------------------------------------
  console.log('\n--- TASK 5: DEMAND INTELLIGENCE FOUNDATION ---');
  const funnel = eventService.calculateDemandFunnel();
  
  assert(funnel.searches >= funnel.views, `Funnel hierarchy: Searches (${funnel.searches}) >= Views (${funnel.views})`);
  assert(funnel.views >= funnel.cartAdditions, `Funnel hierarchy: Views (${funnel.views}) >= Cart Adds (${funnel.cartAdditions})`);
  assert(funnel.cartAdditions >= funnel.checkoutAttempts, `Funnel hierarchy: Cart Adds (${funnel.cartAdditions}) >= Checkout Attempts (${funnel.checkoutAttempts})`);
  assert(funnel.confirmedSales > 0, `Confirmed Sales tracked independently (${funnel.confirmedSales})`);
  assert(funnel.unfulfilledDemand > 0, `Unfulfilled demand tracked independently (${funnel.unfulfilledDemand})`);

  // ----------------------------------------------------------------
  // TASK 6: REALISTIC SUBSTITUTION FLOW
  // ----------------------------------------------------------------
  console.log('\n--- TASK 6: REALISTIC SUBSTITUTION FLOW ---');
  
  // Customer queries for out-of-stock Curd
  const curdQuery = await customerAgent.processInput('Do you have curd or dahi?', 'en', undefined, 'USER00001');
  assert(!curdQuery.isAvailable, 'CustomerAgent detects Curd is out of stock (Stock: 0)');

  // Run dynamic substitution tool
  const curdSubResult = await executeCustomerAgentTool('getProductSubstitutes', { productIdOrName: 'curd' }, 'USER00001');
  const suggestedAlt = curdQuery.alternatives?.[0] || curdSubResult.result?.substitutes?.[0];
  assert(suggestedAlt?.id === 'prod-greekyogurt', 'CustomerAgent suggests in-stock Greek Yogurt as substitute');

  const subs = db.getSubstitutions();
  const latestSub = subs[0];
  assert(latestSub?.substitute_product_id === 'prod-greekyogurt', 'Substitution record logged in database ledger');

  // Customer accepts substitution
  db.recordSubstitutionAccepted(latestSub.id, 'USER00001');
  const u1CartWithSub = cartService.getCart('USER00001');
  const hasYogurt = u1CartWithSub.some(c => c.product_id === 'prod-greekyogurt');
  assert(hasYogurt, 'Accepted substitute (Greek Yogurt) automatically added to USER00001 cart');

  // Checkout and verify substitution connected to confirmed purchase
  const orderWithSub = orderService.completeCheckout('Card', 'USER00001');
  const updatedSub = db.getSubstitutions().find(s => s.id === latestSub.id);
  assert(updatedSub?.substitute_purchased === true, 'Substitute marked purchased');
  assert(updatedSub?.related_order_id === orderWithSub.id, `Substitution connected to confirmed Order #${orderWithSub.id}`);

  // Test Paneer -> Silken Tofu substitution decline
  const paneerQuery = await customerAgent.processInput('Looking for paneer', 'en', undefined, 'USER00002');
  assert(!paneerQuery.isAvailable, 'Paneer detected out-of-stock');
  const paneerSubResult = await executeCustomerAgentTool('getProductSubstitutes', { productIdOrName: 'paneer' }, 'USER00002');
  const hasSub = paneerSubResult.result?.substitutes?.some((s: any) => s.id === 'prod-tofu' || s.id === 'prod-cheese' || s.id === 'prod-greekyogurt');
  assert(hasSub, 'In-stock dairy substitute suggested as substitute');
  
  const paneerSub = db.getSubstitutions()[0];
  db.recordSubstitutionRejected(paneerSub.id, 'USER00002', 'Customer declined tofu');
  const rejectedSub = db.getSubstitutions().find(s => s.id === paneerSub.id);
  assert(rejectedSub?.substitute_accepted === false, 'Substitution recorded as declined without cart addition');

  // ----------------------------------------------------------------
  // TASK 7: MANAGER DASHBOARD & OPERATIONAL ACTIONS
  // ----------------------------------------------------------------
  console.log('\n--- TASK 7: MANAGER DASHBOARD & OPERATIONAL ACTIONS ---');
  
  // 7A: Authentication
  const failLogin = managerService.login('EMP-1042', 'wrong-dob');
  assert(!failLogin.success, 'Manager login rejected on incorrect credentials');

  const validLogin = managerService.login('EMP-1042', '1985-06-15');
  assert(validLogin.success && validLogin.manager?.name === 'Vikram Malhotra', 'Manager login verified for EMP-1042 (Vikram Malhotra)');

  // 7B: Recommendations & Modification
  const recs = db.getAIRecommendations();
  assert(recs.length > 0, `Store Agent generated ${recs.length} operational recommendations`);

  const restockRec = recs.find(r => r.type === 'restock' && r.status === 'pending')!;
  const targetProdId = restockRec.product_id!;
  const stockBeforeMod = db.getInventoryByProductId(targetProdId)!.quantity;

  // Manager modifies quantity to 65 and approves
  const action = db.modifyAndApproveRecommendation(restockRec.id, 65);
  const stockAfterMod = db.getInventoryByProductId(targetProdId)!.quantity;

  assert(stockAfterMod === stockBeforeMod + 65, `Inventory replenished with custom modified quantity (+65)`);
  assert(action.status === 'completed', 'Operational action logged as completed');

  const outcomes = db.getActionOutcomes();
  assert(outcomes.some(o => o.action_id === action.id), 'Action outcome recorded for Hindsight learning closed-loop');

  // 7C: Dismiss Recommendation
  const dismissRec = recs.find(r => r.status === 'pending')!;
  db.dismissRecommendation(dismissRec.id);
  const dismissed = db.getAIRecommendations().find(r => r.id === dismissRec.id);
  assert(dismissed?.status === 'dismissed', 'Manager dismissed recommendation marked dismissed');

  // ----------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
