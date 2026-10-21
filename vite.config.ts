declare const process: any;

import { defineConfig, Plugin, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import groqStatusHandler from './api/groq-status.js';
import customerAgentHandler from './api/customer-agent.js';
import storeAgentHandler from './api/store-agent/index.js';
import storeOverviewHandler from './api/store-agent/overview.js';
import storeActionsHandler from './api/store-agent/actions.js';
import memoryStatusHandler from './api/memory/status.js';
import memoryActivityHandler from './api/memory/activity.js';
import memoryRecallHandler from './api/memory/recall.js';
import memoryRetainHandler from './api/memory/retain.js';
import memoryReflectHandler from './api/memory/reflect.js';
import otpHandler from './api/auth/otp.js';
import managerAuthHandler from './api/auth/manager.js';
import supabaseConfigHandler from './api/auth/supabase-config.js';
import sessionsHandler from './api/sessions/index.js';
import cartHandler from './api/cart/index.js';
import checkoutHandler from './api/checkout/index.js';
import inventoryHandler from './api/inventory/index.js';
import securityHandler from './api/security/index.js';
import jarvisManagerHandler from './api/jarvis-manager.js';
import kiosksHandler from './api/kiosks/index.js';
import networkIpHandler from './api/network-ip.js';
import sessionSyncHandler from './api/session-sync.js';

function groqApiPlugin(): Plugin {
  const handleApiRequest = async (req: any, res: any, next: any) => {
    const url = (req.url || '').split('?')[0];

    // Reload fresh .env if modified locally
    const freshEnv = loadEnv('', process.cwd(), '');
    Object.assign(process.env, freshEnv);

    if (url === '/api/network-ip') return networkIpHandler(req, res);
    if (url === '/api/session-sync') return sessionSyncHandler(req, res);
    if (url === '/api/jarvis-manager') return jarvisManagerHandler(req, res);
    if (url === '/api/kiosks' || url === '/api/kiosks/activate' || url === '/api/kiosks/reset') return kiosksHandler(req, res);

    if (url === '/api/groq-status') return groqStatusHandler(req, res);
    if (url === '/api/customer-agent') return customerAgentHandler(req, res);
    if (url === '/api/store-agent') return storeAgentHandler(req, res);
    if (url === '/api/store-agent/overview') return storeOverviewHandler(req, res);
    if (url === '/api/store-agent/actions') return storeActionsHandler(req, res);
    if (url === '/api/memory/status') return memoryStatusHandler(req, res);
    if (url === '/api/memory/activity') return memoryActivityHandler(req, res);
    if (url === '/api/memory/recall') return memoryRecallHandler(req, res);
    if (url === '/api/memory/retain') return memoryRetainHandler(req, res);
    if (url === '/api/memory/reflect') return memoryReflectHandler(req, res);
    if (url === '/api/auth/otp') return otpHandler(req, res);
    if (url === '/api/auth/manager') return managerAuthHandler(req, res);
    if (url === '/api/auth/supabase-config') return supabaseConfigHandler(req, res);
    if (url === '/api/sessions') return sessionsHandler(req, res);
    if (url === '/api/cart') return cartHandler(req, res);
    if (url === '/api/checkout') return checkoutHandler(req, res);
    if (url === '/api/inventory') return inventoryHandler(req, res);
    if (url === '/api/security') return securityHandler(req, res);

    next();
  };

  return {
    name: 'groq-api-plugin',
    configureServer(server) {
      server.middlewares.use(handleApiRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleApiRequest);
    }
  };
}

export default defineConfig({
  plugins: [react(), groqApiPlugin()],
  server: {
    port: 3000,
    open: false,
    host: true
  }
});
