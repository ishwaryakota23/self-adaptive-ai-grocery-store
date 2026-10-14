import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../../src/server/supabaseAdmin.js';
import { issueManagerToken } from '../_auth.js';
import { getRequestBody, handleCors, sendJson } from '../_utils.js';

const failedAttempts = new Map<string, { count: number; windowStartedAt: number }>();

// Keep the documented local hackathon demo credentials usable when the local
// Supabase project has not been seeded yet. Production always requires the DB.
const LOCAL_DEMO_MANAGERS = [
  {
    employee_id: 'EMP-1042', dob: '1985-06-15', name: 'Ishwarya Kota',
    role: 'STORE_MANAGER', branch_id: 'BRANCH-104', branch_name: 'Indiranagar Flagship Superstore'
  },
  {
    employee_id: 'EMP-2088', dob: '1990-11-20', name: 'Vikram Malhotra',
    role: 'STORE_MANAGER', branch_id: 'BRANCH-104', branch_name: 'Indiranagar Flagship Superstore'
  }
];

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const body = await getRequestBody(req);
    const employeeId = String(body.employeeId || body.employee_id || '').trim();
    const dob = String(body.dob || '').trim();
    const clientKey = String(req.headers?.['x-forwarded-for'] || 'unknown').split(',')[0].trim();
    const now = Date.now();
    const attempts = failedAttempts.get(clientKey);
    if (attempts && now - attempts.windowStartedAt < 60_000 && attempts.count >= 8) {
      return sendJson(res, 429, { success: false, error: 'Too many sign-in attempts. Wait one minute and retry.' });
    }
    if (!employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return sendJson(res, 400, { success: false, error: 'Enter a valid employee ID and date of birth.' });
    }
    if (process.env.NODE_ENV === 'production' && !isSupabaseAdminConfigured()) {
      return sendJson(res, 503, { success: false, error: 'Manager sign-in requires a configured manager account and server database.' });
    }

    const client = getSupabaseAdminClient();
    let manager: any = null;
    let lookupFailed = false;
    if (client) {
      const result = await client.from('manager_accounts')
        .select('employee_id,dob,name,role,branch_id,branch_name')
        .eq('employee_id', employeeId).maybeSingle();
      manager = result.data;
      lookupFailed = Boolean(result.error);
    } else {
      lookupFailed = true;
    }

    if (process.env.NODE_ENV !== 'production') {
      const demoManager = LOCAL_DEMO_MANAGERS.find(account => account.employee_id === employeeId && account.dob === dob);
      if (demoManager) manager = demoManager;
      else if (lookupFailed) manager = null;
    }
    if (lookupFailed && !manager) throw new Error('Manager sign-in could not be verified. Check the local Supabase configuration or seed the manager account.');
    if (!manager || manager.dob !== dob || !['STORE_MANAGER', 'ADMIN'].includes(manager.role)) {
      const current = attempts && now - attempts.windowStartedAt < 60_000
        ? attempts : { count: 0, windowStartedAt: now };
      current.count++;
      failedAttempts.set(clientKey, current);
      return sendJson(res, 401, { success: false, error: 'Invalid manager credentials.' });
    }
    failedAttempts.delete(clientKey);
    const auth = issueManagerToken({
      sub: manager.employee_id,
      name: manager.name,
      role: manager.role,
      branchId: manager.branch_id
    });
    return sendJson(res, 200, {
      success: true,
      token: auth.token,
      expiresAt: auth.expiresAt,
      manager: {
        employee_id: manager.employee_id,
        name: manager.name,
        role: manager.role,
        branch_id: manager.branch_id,
        branch_name: manager.branch_name
      }
    });
  } catch (err: any) {
    return sendJson(res, 503, { success: false, error: err?.message || 'Manager sign-in is unavailable.' });
  }
}
