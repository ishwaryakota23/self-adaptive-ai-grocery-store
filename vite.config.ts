declare const process: any;

import { defineConfig, Plugin, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import groqStatusHandler from './api/groq-status';
import customerAgentHandler from './api/customer-agent';
import storeAgentHandler from './api/store-agent/index';
import storeOverviewHandler from './api/store-agent/overview';
import storeActionsHandler from './api/store-agent/actions';
import hindsightStatusHandler from './api/hindsight/status';
import hindsightActivityHandler from './api/hindsight/activity';
import hindsightRecallHandler from './api/hindsight/recall';
import hindsightRetainHandler from './api/hindsight/retain';

function groqApiPlugin(): Plugin {
  const handleApiRequest = async (req: any, res: any, next: any) => {
    const url = (req.url || '').split('?')[0];

    // Reload fresh .env if modified locally
    const freshEnv = loadEnv('', process.cwd(), '');
    Object.assign(process.env, freshEnv);

    if (url === '/api/groq-status') return groqStatusHandler(req, res);
    if (url === '/api/customer-agent') return customerAgentHandler(req, res);
    if (url === '/api/store-agent') return storeAgentHandler(req, res);
    if (url === '/api/store-agent/overview') return storeOverviewHandler(req, res);
    if (url === '/api/store-agent/actions') return storeActionsHandler(req, res);
    if (url === '/api/hindsight/status') return hindsightStatusHandler(req, res);
    if (url === '/api/hindsight/activity') return hindsightActivityHandler(req, res);
    if (url === '/api/hindsight/recall') return hindsightRecallHandler(req, res);
    if (url === '/api/hindsight/retain') return hindsightRetainHandler(req, res);

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
    open: false
  }
});
