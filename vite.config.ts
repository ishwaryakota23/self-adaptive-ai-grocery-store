declare const process: any;

import { defineConfig, Plugin, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import groqStatusHandler from './api/groq-status.js';
import customerAgentHandler from './api/customer-agent.js';
import storeAgentHandler from './api/store-agent/index.js';
import storeOverviewHandler from './api/store-agent/overview.js';
import storeActionsHandler from './api/store-agent/actions.js';
import hindsightStatusHandler from './api/hindsight/status.js';
import hindsightActivityHandler from './api/hindsight/activity.js';
import hindsightRecallHandler from './api/hindsight/recall.js';
import hindsightRetainHandler from './api/hindsight/retain.js';
import hindsightReflectHandler from './api/hindsight/reflect.js';
import hindsightLabHandler from './api/hindsight/lab.js';
import hindsightTestBankHandler from './api/hindsight/test-bank.js';
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
    if (url === '/api/hindsight/status') return hindsightStatusHandler(req, res);
    if (url === '/api/hindsight/activity') return hindsightActivityHandler(req, res);
    if (url === '/api/hindsight/recall') return hindsightRecallHandler(req, res);
    if (url === '/api/hindsight/retain') return hindsightRetainHandler(req, res);
    if (url === '/api/hindsight/reflect') return hindsightReflectHandler(req, res);
    if (url === '/api/hindsight/lab') return hindsightLabHandler(req, res);
    if (url === '/api/hindsight/test-bank') return hindsightTestBankHandler(req, res);
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
