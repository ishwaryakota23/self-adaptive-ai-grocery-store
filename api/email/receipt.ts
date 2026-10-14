import { backendAuthority } from '../../src/server/backendAuthority.js';
import { emailProvider } from '../../src/server/email/emailProvider.js';
import { getRequestBody, handleCors, sendJson } from '../_utils.js';
import { authenticateCustomerIdentity } from '../_auth.js';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = await getRequestBody(req);
    const orderId = body.orderId || body.order_id;
    const toEmail = body.toEmail || body.email;

    if (!orderId || !toEmail) {
      return sendJson(res, 400, { error: 'orderId and recipient email are required' });
    }

    const identity = await authenticateCustomerIdentity(String(req.headers?.['x-customer-identity-token'] || ''));

    const order = backendAuthority.getOrders().find(o => o.id === orderId);
    if (!order) {
      return sendJson(res, 404, { error: `Order #${orderId} not found` });
    }

    const customer = order.customer_id ? backendAuthority.getCustomer(order.customer_id) : undefined;
    if (identity.customerId !== order.customer_id || !customer?.email || customer.email.trim().toLowerCase() !== String(toEmail).trim().toLowerCase()) {
      return sendJson(res, 403, { error: 'Receipt recipient must match the customer email on the order.' });
    }

    const result = await emailProvider.sendOrderConfirmationEmail(customer.email, order);

    return sendJson(res, result.success ? 200 : 400, {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      toEmail: customer.email
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      error: err?.message || 'Failed to dispatch receipt email'
    });
  }
}
