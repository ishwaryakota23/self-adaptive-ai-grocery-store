import os from 'os';
import { randomBytes } from 'crypto';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../src/server/supabaseAdmin.js';
import { getRequestBody, handleCors, sendJson } from './_utils.js';
import { resolveApplicationOrigin } from '../src/server/sessionHandoffOrigin.js';
import { buildSessionMobileUrl } from '../src/services/sessionHandoffUrl.js';

type ItemInput = { productId: string; quantity: number };

function getLocalLanIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal && (
          net.address.startsWith('10.') || 
          net.address.startsWith('192.168.') || 
          net.address.startsWith('172.')
        )) {
          return net.address;
        }
      }
    }
  } catch {}
  return 'localhost';
}

function getApplicationOrigin(req: any, clientOrigin?: string): string {
  return resolveApplicationOrigin({
    clientOrigin,
    requestHost: req?.headers?.host,
    requestProtocol: req?.headers?.['x-forwarded-proto'] || 'http',
    lanIp: getLocalLanIp()
  });
}

function parseToken(value: string): string {
  const raw = (value || '').trim();
  try {
    const parsed = new URL(raw);
    return parsed.searchParams.get('session_token') || parsed.searchParams.get('handoff') || '';
  } catch { /* opaque token */ }
  try {
    const parsed = JSON.parse(raw);
    return parsed.tok || parsed.token || parsed.secure_token || '';
  } catch { return raw; }
}

export function assertActiveHandoff(handoff: any, now = Date.now()): void {
  if (!handoff) throw new Error('This session pass is invalid. Scan a fresh QR from the kiosk.');
  if (handoff.status === 'used') throw new Error('This session pass has already been used. Ask the kiosk for a fresh QR.');
  if (handoff.status === 'expired' || new Date(handoff.expires_at).getTime() <= now) throw new Error('This session pass has expired. Ask the kiosk for a fresh QR.');
  if (handoff.status === 'revoked') throw new Error('This session pass was revoked. Ask the kiosk for a fresh QR.');
  if (handoff.status !== 'active') throw new Error('This session pass is invalid. Ask the kiosk for a fresh QR.');
}

async function loadAuthorizedState(client: any, suppliedToken: string, expectedSessionId?: string | null) {
  const token = parseToken(suppliedToken);
  if (!token || token.length < 40) throw new Error('Session handoff token is invalid.');
  const { data: handoff, error: handoffError } = await client.from('session_handoffs')
    .select('session_id,customer_id,status,expires_at,qr_payload,used_at,secure_token')
    .eq('secure_token', token).maybeSingle();
  if (handoffError) throw new Error(`Session handoff storage is unavailable: ${handoffError.message}`);
  if (!handoff) {
    const { data: consumed, error: consumedError } = await client.from('session_handoffs')
      .select('used_at').like('qr_payload', `%${token}%`).maybeSingle();
    if (consumedError) throw new Error(`Session handoff storage is unavailable: ${consumedError.message}`);
    if (consumed?.used_at) throw new Error('This session QR has already been scanned. Ask the kiosk for a fresh QR.');
  }
  assertActiveHandoff(handoff);

  const { data: session, error: sessionError } = await client.from('shopping_sessions')
    .select('session_id,customer_id,status,device_type,interaction_mode,started_at,last_activity_at')
    .eq('session_id', handoff.session_id).maybeSingle();
  if (sessionError) throw new Error(`Shopping session lookup failed: ${sessionError.message}`);
  if (!session || session.status !== 'active' || session.customer_id !== handoff.customer_id) {
    throw new Error('The shopping session is no longer active or does not match this pass.');
  }
  if (expectedSessionId && session.session_id !== expectedSessionId) throw new Error('The session identifier does not match this secure pass.');
  const { data: state, error: stateError } = await client.from('shopping_session_state')
    .select('items,revision,updated_at').eq('session_id', session.session_id).maybeSingle();
  if (stateError) throw new Error(`Shared cart is unavailable. Apply the session cart migration first. ${stateError.message}`);
  if (!state) throw new Error('No shared cart snapshot exists for this session. Restart the kiosk handoff.');
  return { token, handoff, session, state };
}

export async function exchangeQrForSyncToken(client: any, loaded: Awaited<ReturnType<typeof loadAuthorizedState>>) {
  const qrToken = parseToken(loaded.handoff.qr_payload || '');
  if (qrToken !== loaded.token) return loaded.token;
  if (loaded.handoff.used_at) throw new Error('This session QR has already been scanned. Ask the kiosk for a fresh QR.');
  const syncToken = randomBytes(32).toString('base64url');
  const { data, error } = await client.from('session_handoffs')
    .update({ used_at: new Date().toISOString(), secure_token: syncToken })
    .eq('secure_token', loaded.token).eq('status', 'active').is('used_at', null).select('secure_token').maybeSingle();
  if (error) throw new Error(`Could not securely exchange the session QR: ${error.message}`);
  if (!data?.secure_token) throw new Error('This session QR has already been scanned. Ask the kiosk for a fresh QR.');
  return syncToken;
}

async function loadCustomerOwnedState(client: any, sessionId: string, customerId: string, identityToken: string) {
  if (!sessionId || !customerId || !identityToken) throw new Error('A verified customer, active session, and identity pass are required for kiosk cart sync.');
  const [{ data: session, error: sessionError }, { data: identity, error: identityError }] = await Promise.all([
    client.from('shopping_sessions').select('session_id,customer_id,status,device_type,interaction_mode,started_at,last_activity_at').eq('session_id', sessionId).maybeSingle(),
    client.from('customer_identity_tokens').select('customer_id,status').eq('secure_token', identityToken).eq('customer_id', customerId).eq('status', 'active').maybeSingle()
  ]);
  if (sessionError) throw new Error(`Shopping session lookup failed: ${sessionError.message}`);
  if (identityError) throw new Error(`Customer identity lookup failed: ${identityError.message}`);
  if (!identity || !session || session.status !== 'active' || session.customer_id !== customerId) throw new Error('The verified customer does not own this active shopping session.');
  const { data: state, error: stateError } = await client.from('shopping_session_state').select('items,revision').eq('session_id', sessionId).maybeSingle();
  if (stateError) throw new Error(`Shared cart is unavailable. Apply the session cart migration first. ${stateError.message}`);
  if (!state) throw new Error('No shared cart snapshot exists for this session. Restart the kiosk handoff.');
  return { session, state };
}

async function hydrateCart(client: any, items: ItemInput[]) {
  if (!Array.isArray(items) || items.length > 100) throw new Error('Cart payload is invalid.');
  const normalized = new Map<string, number>();
  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
      throw new Error('Cart item quantity or product ID is invalid.');
    }
    normalized.set(item.productId, item.quantity);
  }
  const ids = [...normalized.keys()];
  if (!ids.length) return [];
  const [{ data: products, error: productsError }, { data: inventory, error: inventoryError }] = await Promise.all([
    client.from('products').select('id,app_product_id,name,brand,description,price,image_url,aisle,shelf_location,weight_or_volume,category_id').in('app_product_id', ids),
    client.from('inventory').select('product_id,quantity,status')
  ]);
  if (productsError) throw new Error(`Catalog lookup failed: ${productsError.message}`);
  if (inventoryError) throw new Error(`Inventory lookup failed: ${inventoryError.message}`);
  const productById = new Map((products || []).map((p: any) => [p.app_product_id, p]));
  const stockById = new Map((inventory || []).map((i: any) => [i.product_id, i]));
  return ids.map(productId => {
    const product: any = productById.get(productId);
    if (!product) throw new Error(`Product ${productId} is not in the authoritative catalog.`);
    const stock: any = stockById.get(product.id);
    const quantity = normalized.get(productId)!;
    if (!stock || stock.status === 'out_of_stock' || stock.quantity < quantity) {
      throw new Error(`Insufficient current inventory for ${product.name}.`);
    }
    return { product_id: product.app_product_id, product, quantity, price_snapshot: Number(product.price) };
  });
}

function cartResponse(items: any[], revision: number) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  return { items, revision, subtotal, tax, total: subtotal + tax, itemCount: items.reduce((sum, i) => sum + i.quantity, 0) };
}

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if (!isSupabaseAdminConfigured()) return sendJson(res, 503, { success: false, error: 'Shared session sync requires SUPABASE_URL and the server-only SUPABASE_SECRET_KEY.' });
  const client = getSupabaseAdminClient();
  if (!client) return sendJson(res, 503, { success: false, error: 'Supabase server client could not be initialized.' });

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost');
      const loaded = await loadAuthorizedState(client, url.searchParams.get('token') || '', url.searchParams.get('session_id') || url.searchParams.get('session'));
      const syncToken = await exchangeQrForSyncToken(client, loaded);
      const items = await hydrateCart(client, loaded.state.items || []);
      const { data: customer, error: customerError } = await client.from('customers').select('customer_id,email,email_verified_at,whatsapp_number,name,language,metadata,created_at,updated_at').eq('customer_id', loaded.session.customer_id).maybeSingle();
      if (customerError) throw new Error(`Customer profile lookup failed: ${customerError.message}`);
      const origin = getApplicationOrigin(req);
      const kioskUrl = new URL('/kiosk', origin);
      kioskUrl.searchParams.set('handoff', syncToken);
      kioskUrl.searchParams.set('action', 'verify');
      return sendJson(res, 200, { success: true, session: loaded.session, customer, syncToken, kioskUrl: kioskUrl.toString(), cart: cartResponse(items, Number(loaded.state.revision)) });
    }

    if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
    const body = await getRequestBody(req);

    if (body.action === 'cart_read_owner') {
      const owned = await loadCustomerOwnedState(client, String(body.sessionId || ''), String(body.customerId || ''), String(body.identityToken || ''));
      const items = await hydrateCart(client, owned.state.items || []);
      return sendJson(res, 200, { success: true, session: owned.session, cart: cartResponse(items, Number(owned.state.revision)) });
    }

    if (body.action === 'cart_sync_owner') {
      const owned = await loadCustomerOwnedState(client, String(body.sessionId || ''), String(body.customerId || ''), String(body.identityToken || ''));
      const expectedRevision = Number(body.expectedRevision);
      const currentRevision = Number(owned.state.revision);
      const currentItems = await hydrateCart(client, owned.state.items || []);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) return sendJson(res, 400, { success: false, error: 'A valid cart revision is required.' });
      if (expectedRevision !== currentRevision) return sendJson(res, 409, { success: false, conflict: true, error: 'The cart changed on another device. The latest cart has been loaded.', session: owned.session, cart: cartResponse(currentItems, currentRevision) });
      const items = await hydrateCart(client, body.items || []);
      const { data: updated, error: updateError } = await client.from('shopping_session_state').update({
        items: items.map((item: any) => ({ productId: item.product_id, quantity: item.quantity })),
        revision: currentRevision + 1, updated_at: new Date().toISOString()
      }).eq('session_id', owned.session.session_id).eq('revision', currentRevision).select('revision').maybeSingle();
      if (updateError) throw new Error(`Could not save cart changes: ${updateError.message}`);
      if (!updated) return sendJson(res, 409, { success: false, conflict: true, error: 'The cart changed on another device. Refresh before retrying.', session: owned.session, cart: cartResponse(currentItems, currentRevision) });
      return sendJson(res, 200, { success: true, session: owned.session, cart: cartResponse(items, currentRevision + 1) });
    }

    if (body.action === 'handoff_generate') {
      const sessionId = String(body.sessionId || '');
      const customerId = String(body.customerId || '');
      const identityToken = String(body.identityToken || '');
      if (!sessionId || !customerId || !identityToken) return sendJson(res, 400, { success: false, error: 'An active session and verified customer identity are required.' });

      const [{ data: session, error: sessionError }, { data: identity, error: identityError }] = await Promise.all([
        client.from('shopping_sessions').select('session_id,customer_id,status').eq('session_id', sessionId).maybeSingle(),
        client.from('customer_identity_tokens').select('customer_id,status').eq('secure_token', identityToken).eq('customer_id', customerId).eq('status', 'active').maybeSingle()
      ]);
      if (sessionError) throw new Error(`Shopping session lookup failed: ${sessionError.message}`);
      if (identityError) throw new Error(`Customer identity lookup failed: ${identityError.message}`);
      if (!session || session.status !== 'active' || session.customer_id !== customerId || !identity) {
        return sendJson(res, 403, { success: false, error: 'The verified customer identity does not own this active shopping session.' });
      }

      const { data: existingState, error: stateLookupError } = await client.from('shopping_session_state').select('items,revision').eq('session_id', sessionId).maybeSingle();
      if (stateLookupError) throw new Error(`Shared cart is unavailable. Apply migration 20261010_persistent_session_cart_sync.sql. ${stateLookupError.message}`);
      if (!existingState) {
        const initial = await hydrateCart(client, body.items || []);
        const { error } = await client.from('shopping_session_state').insert({
          session_id: sessionId, customer_id: customerId,
          items: initial.map((item: any) => ({ productId: item.product_id, quantity: item.quantity })),
          revision: 1, updated_at: new Date().toISOString()
        });
        if (error && error.code !== '23505') throw new Error(`Could not persist the initial cart: ${error.message}`);
      }

      const { data: currentState, error: currentError } = await client.from('shopping_session_state').select('items,revision').eq('session_id', sessionId).single();
      if (currentError || !currentState) throw new Error(`Could not load the shared cart: ${currentError?.message || 'missing state'}`);
      const cart = await hydrateCart(client, currentState.items || []);

      // Revoke older handoffs for this session, preserving other sessions and all agent memories.
      const { error: revokeError } = await client.from('session_handoffs').update({ status: 'revoked' }).eq('session_id', sessionId).eq('status', 'active');
      if (revokeError) throw new Error(`Could not rotate the session pass: ${revokeError.message}`);
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const origin = getApplicationOrigin(req, body.clientOrigin);
      const mobileUrl = new URL(buildSessionMobileUrl(origin, sessionId, token));
      const kioskUrl = new URL('/kiosk', origin);
      kioskUrl.searchParams.set('handoff', token);
      kioskUrl.searchParams.set('action', 'verify');
      const { error: handoffError } = await client.from('session_handoffs').insert({
        session_id: sessionId, customer_id: customerId, secure_token: token,
        qr_payload: mobileUrl.toString(), status: 'active', expires_at: expiresAt
      });
      if (handoffError) throw new Error(`Could not persist the session pass: ${handoffError.message}`);
      return sendJson(res, 200, {
        success: true,
        handoff: { handoff_id: token, session_id: sessionId, customer_id: customerId, secure_token: token, qr_payload: mobileUrl.toString(), status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt },
        mobileUrl: mobileUrl.toString(), kioskUrl: kioskUrl.toString(),
        cart: cartResponse(cart, Number(currentState.revision))
      });
    }

    if (body.action === 'cart_sync') {
      const loaded = await loadAuthorizedState(client, String(body.token || ''));
      const expectedRevision = Number(body.expectedRevision);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) return sendJson(res, 400, { success: false, error: 'A valid cart revision is required.' });
      const currentRevision = Number(loaded.state.revision);
      if (expectedRevision !== currentRevision) {
        const currentItems = await hydrateCart(client, loaded.state.items || []);
        return sendJson(res, 409, { success: false, conflict: true, error: 'The cart changed on another device. The latest cart has been loaded.', session: loaded.session, cart: cartResponse(currentItems, currentRevision) });
      }
      const items = await hydrateCart(client, body.items || []);
      const nextRevision = currentRevision + 1;
      const { data: updated, error: updateError } = await client.from('shopping_session_state').update({
        items: items.map((item: any) => ({ productId: item.product_id, quantity: item.quantity })),
        revision: nextRevision, updated_at: new Date().toISOString()
      }).eq('session_id', loaded.session.session_id).eq('revision', currentRevision).select('revision').maybeSingle();
      if (updateError) throw new Error(`Could not save cart changes: ${updateError.message}`);
      if (!updated) {
        const latest = await loadAuthorizedState(client, loaded.token);
        const currentItems = await hydrateCart(client, latest.state.items || []);
        return sendJson(res, 409, { success: false, conflict: true, error: 'The cart changed on another device. The latest cart has been loaded.', session: latest.session, cart: cartResponse(currentItems, Number(latest.state.revision)) });
      }
      return sendJson(res, 200, { success: true, session: loaded.session, cart: cartResponse(items, nextRevision) });
    }

    return sendJson(res, 400, { success: false, error: 'Unsupported session synchronization action.' });
  } catch (err: any) {
    const message = err?.message || 'Session synchronization failed.';
    const status = /session pass|session handoff token|session QR|already been scanned|invalid, expired, or revoked|no longer active|not active|does not own|invalid\. or revoked/i.test(message) ? 401 : 400;
    return sendJson(res, status, { success: false, error: message });
  }
}
