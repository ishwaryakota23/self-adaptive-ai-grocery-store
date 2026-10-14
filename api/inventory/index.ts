import { backendAuthority } from '../../src/server/backendAuthority.js';
import { getRequestBody, handleCors, sendJson } from '../_utils.js';
import { authenticateManagerRequest } from '../_auth.js';

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  try {
    if (req.method === 'GET') {
      authenticateManagerRequest(req);
      const inventory = backendAuthority.getInventory();
      const movements = backendAuthority.getInventoryMovements();
      return sendJson(res, 200, { success: true, inventory, movements });
    }

    if (req.method === 'POST') {
      const manager = authenticateManagerRequest(req);

      const body = await getRequestBody(req);
      const productId = body.productId || body.product_id;
      const quantityToAdd = Number(body.quantity || body.quantityToAdd || 0);
      const reason = body.reason || 'Manager restock';

      if (!productId || quantityToAdd <= 0) {
        return sendJson(res, 400, { error: 'productId and positive quantity are required' });
      }

      backendAuthority.restockProduct(productId, quantityToAdd, reason, { role: manager.role, manager_id: manager.sub, name: manager.name } as any);
      return sendJson(res, 200, { success: true, message: `Restocked ${quantityToAdd} units of ${productId}` });
    }

    return sendJson(res, 405, { error: 'Method Not Allowed' });
  } catch (err: any) {
    return sendJson(res, 403, { success: false, error: err?.message || 'Inventory API error' });
  }
}
