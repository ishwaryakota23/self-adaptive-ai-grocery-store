declare const process: any;

// @ts-ignore
const fs = await import('fs');
// @ts-ignore
const path = await import('path');

// Load .env cleanly without external library
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

import groqStatusHandler from '../../api/groq-status.js';
import customerAgentHandler from '../../api/customer-agent.js';
import { customerAgent } from '../services/customerAgent.js';
import { db } from '../services/db.js';
import { sessionService } from '../services/sessionService.js';
import { groqCustomerAgentServer } from '../server/groqCustomerAgent.js';
import { groqStoreAgentServer } from '../server/groqStoreAgent.js';

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  status(code: number): MockResponse;
  json(data: any): MockResponse;
  setHeader(key: string, value: string): void;
  end(data?: any): void;
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    setHeader(key: string, value: string) {
      this.headers[key] = value;
    },
    end(data?: any) {
      if (data) this.body = data;
    }
  };
  return res;
}

async function runTests() {
  console.log('================================================================');
  console.log('  GROCERAI PRODUCTION FIX VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ': ' + detail : ''}`);
      failed++;
    }
  }

  // TEST 1: GROQ STATUS API HANDLER
  console.log('--- TEST GROUP 1: API ROUTES RUNTIME RESOLUTION ---');
  try {
    const req = { method: 'GET' };
    const res = createMockResponse();
    await groqStatusHandler(req, res);

    assert(res.statusCode === 200, '1. /api/groq-status returns HTTP 200', `Got status ${res.statusCode}`);
    assert(res.body?.isConfigured === true, '2. /api/groq-status reports isConfigured = true', JSON.stringify(res.body));
    assert(res.body?.model === 'qwen/qwen3.8-27b', '3. /api/groq-status reports model = qwen/qwen3.8-27b', `Got ${res.body?.model}`);
  } catch (err: any) {
    assert(false, '1-3. /api/groq-status handler threw error', err?.message);
  }

  // TEST 2: CUSTOMER AGENT API HANDLER
  try {
    const req = {
      method: 'POST',
      body: {
        sessionId: 'USER_TEST_VERIFY_1',
        customerId: 'USER_TEST_VERIFY_1',
        input: 'Do you have fresh tomatoes in stock?'
      }
    };
    const res = createMockResponse();
    await customerAgentHandler(req, res);

    assert(res.statusCode === 200, '4. /api/customer-agent returns HTTP 200', `Got status ${res.statusCode}`);
    assert(res.body?.success === true, '5. /api/customer-agent response success === true', JSON.stringify(res.body));
    assert(res.body?.groqConfigured === true, '6. /api/customer-agent reports groqConfigured = true');
    assert(!!res.body?.message, '7. /api/customer-agent returned non-empty message');
  } catch (err: any) {
    assert(false, '4-7. /api/customer-agent handler threw error', err?.message);
  }

  // TEST 3: FRESH CUSTOMER NO PANEER CARD
  console.log('\n--- TEST GROUP 2: FRESH CUSTOMER ISOLATION & NO PANEER LEAKAGE ---');
  const freshCustomerId = 'USER00999';
  const freshMission = db.getActiveMission(freshCustomerId);
  const freshCart = db.getCart(freshCustomerId);
  const freshNotifs = db.getNotifications(freshCustomerId);

  assert(freshMission !== undefined, '8. Fresh customer has initialized shopping mission structure');
  assert(freshMission?.items.length === 0, '9. Fresh customer shopping mission has 0 items (clean state)');
  assert(freshCart.length === 0, '10. Fresh customer cart is completely empty (no item leakage)');
  assert(freshNotifs.length === 0, '11. Fresh customer has 0 notifications (no paneer notification)');

  // Verify proactive greeting for fresh customer
  const freshGreeting = customerAgent.getProactiveGreeting('Test User', 'en');
  assert(!freshGreeting.toLowerCase().includes('paneer'), '12. Fresh customer greeting does not contain paneer');
  assert(!freshGreeting.toLowerCase().includes('pasta'), '13. Fresh customer greeting does not assume pasta night');

  // TEST 4: CUSTOMER A PANEER INTENT
  console.log('\n--- TEST GROUP 3: INTENT-DRIVEN PROACTIVE DYNAMICS ---');
  const custA_Id = 'USER_CUST_PANEER';
  customerAgent.clearSessionHistory(custA_Id);

  const paneerRes = await customerAgent.processInput(
    'Where can I find paneer in the store?',
    'en',
    db.getActiveMission(custA_Id),
    custA_Id,
    'text'
  );

  assert(paneerRes.productFound !== undefined, '14. Customer A (paneer request) productFound is resolved');
  assert(paneerRes.productFound?.id === 'prod-paneer', '15. Customer A productFound ID is prod-paneer');
  assert(paneerRes.aisle === 'Aisle 4', '16. Customer A product aisle is Aisle 4');

  // TEST 5: CUSTOMER B BREAD INTENT (NO PANEER)
  const custB_Id = 'USER_CUST_BREAD';
  customerAgent.clearSessionHistory(custB_Id);

  const breadRes = await customerAgent.processInput(
    'Where is the bread located?',
    'en',
    db.getActiveMission(custB_Id),
    custB_Id,
    'text'
  );

  assert(breadRes.productFound !== undefined, '17. Customer B (bread request) productFound is resolved');
  assert(breadRes.productFound?.id === 'prod-bread', '18. Customer B productFound ID is prod-bread');
  assert(breadRes.aisle === 'Aisle 6', '19. Customer B product aisle is Aisle 6');
  assert(!breadRes.message.toLowerCase().includes('paneer'), '20. Customer B response does not mention paneer');
  assert(breadRes.productFound?.id !== 'prod-paneer', '21. Customer B productFound is NOT paneer');

  // TEST 6: CUSTOMER C PASTA INTENT
  const custC_Id = 'USER_CUST_PASTA';
  customerAgent.clearSessionHistory(custC_Id);

  const pastaRes = await customerAgent.processInput(
    'Where is the penne pasta located?',
    'en',
    db.getActiveMission(custC_Id),
    custC_Id,
    'text'
  );

  assert(pastaRes.productFound !== undefined, '22. Customer C (pasta request) productFound is resolved');
  assert(pastaRes.productFound?.id === 'prod-pasta', '23. Customer C productFound ID is prod-pasta');
  assert(pastaRes.aisle === 'Aisle 3', '24. Customer C product aisle is Aisle 3');
  assert(!pastaRes.message.toLowerCase().includes('paneer'), '25. Customer C response does not mention paneer');

  // TEST 7: SESSION HISTORY ISOLATION
  console.log('\n--- TEST GROUP 4: SESSION ISOLATION INTEGRITY ---');
  const histA = customerAgent.getSessionHistory(custA_Id);
  const histB = customerAgent.getSessionHistory(custB_Id);
  const histC = customerAgent.getSessionHistory(custC_Id);

  assert(histA.some(m => m.content.toLowerCase().includes('paneer')), '26. Customer A history contains paneer');
  assert(!histB.some(m => m.content.toLowerCase().includes('paneer')), '27. Customer B history has ZERO paneer mentions');
  assert(!histC.some(m => m.content.toLowerCase().includes('paneer')), '28. Customer C history has ZERO paneer mentions');

  // TEST 8: SERVER-SIDE ENVIRONMENT & SECRET INTEGRITY
  console.log('\n--- TEST GROUP 5: SECURITY & SECRET PROTECTION ---');
  const apiKey = process.env.GROQ_API_KEY;
  assert(!!apiKey && apiKey.length > 10, '29. GROQ_API_KEY is loaded in server environment');
  assert(groqCustomerAgentServer.isConfigured() === true, '30. GroqCustomerAgentServer isConfigured === true');
  assert(groqStoreAgentServer.isConfigured() === true, '31. GroqStoreAgentServer isConfigured === true');
  assert(process.env.GROQ_MODEL === 'qwen/qwen3.8-27b', '32. GROQ_MODEL resolves to qwen/qwen3.8-27b');

  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
