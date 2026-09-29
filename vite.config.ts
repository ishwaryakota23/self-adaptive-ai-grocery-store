declare const process: any;

import { defineConfig, Plugin, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { groqCustomerAgentServer } from './src/server/groqCustomerAgent';
import { groqStoreAgentServer } from './src/server/groqStoreAgent';
import { storeAgentTools } from './src/services/storeAgentTools';
import { hindsightService } from './src/services/hindsightService';

function groqApiPlugin(): Plugin {
  return {
    name: 'groq-api-plugin',
    configureServer(server) {
      // Load .env into process.env server-side
      const env = loadEnv('', process.cwd(), '');
      Object.assign(process.env, env);

      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/groq-status' && req.method === 'GET') {
          const freshEnv = loadEnv('', process.cwd(), '');
          Object.assign(process.env, freshEnv);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            isConfigured: groqCustomerAgentServer.isConfigured(),
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
          }));
          return;
        }

        if (req.url === '/api/customer-agent' && req.method === 'POST') {
          const freshEnv = loadEnv('', process.cwd(), '');
          Object.assign(process.env, freshEnv);
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const agentResponse = await groqCustomerAgentServer.processRequest(payload);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(agentResponse));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                groqConfigured: groqCustomerAgentServer.isConfigured(),
                error: err?.message || 'Server error processing request'
              }));
            }
          });
          return;
        }

        if (req.url === '/api/store-agent' && req.method === 'POST') {
          const freshEnv = loadEnv('', process.cwd(), '');
          Object.assign(process.env, freshEnv);
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const agentResponse = await groqStoreAgentServer.processRequest(payload);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(agentResponse));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                groqConfigured: groqStoreAgentServer.isConfigured(),
                error: err?.message || 'Server error processing store agent request'
              }));
            }
          });
          return;
        }

        if (req.url === '/api/store-agent/overview' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            overview: storeAgentTools.getStoreOverview()
          }));
          return;
        }

        if (req.url === '/api/store-agent/actions' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const { action, recommendationId, modifications, reason, managerName } = payload;
              let result: any;
              if (action === 'approve') {
                result = storeAgentTools.approveRecommendation(recommendationId, managerName);
              } else if (action === 'modify') {
                result = storeAgentTools.modifyRecommendation(recommendationId, modifications || {}, managerName);
              } else if (action === 'dismiss') {
                result = storeAgentTools.dismissRecommendation(recommendationId, reason, managerName);
              } else if (action === 'execute') {
                result = storeAgentTools.executeApprovedRecommendation(recommendationId);
              } else if (action === 'generate') {
                result = storeAgentTools.generateStoreRecommendations();
              } else {
                throw new Error(`Unsupported store action: ${action}`);
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, result }));
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message || 'Action failed' }));
            }
          });
          return;
        }

        if (req.url === '/api/hindsight/status' && req.method === 'GET') {
          const healthy = await hindsightService.isHealthy();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            isHealthy: healthy,
            baseUrl: process.env.HINDSIGHT_BASE_URL || 'http://localhost:8888',
            storeBank: hindsightService.getStoreBank(),
            activityCount: hindsightService.getActivityLog().length
          }));
          return;
        }

        if (req.url === '/api/hindsight/activity' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            activities: hindsightService.getActivityLog()
          }));
          return;
        }

        if (req.url === '/api/hindsight/recall' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { bankId, query, tags } = JSON.parse(body || '{}');
              const result = await hindsightService.recall(bankId, query, { tags });
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message }));
            }
          });
          return;
        }

        if (req.url === '/api/hindsight/retain' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { bankId, content, options } = JSON.parse(body || '{}');
              const result = await hindsightService.retain(bankId, content, options);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message }));
            }
          });
          return;
        }

        next();
      });
    },
    configurePreviewServer(server) {
      const env = loadEnv('', process.cwd(), '');
      Object.assign(process.env, env);

      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/groq-status' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            isConfigured: groqCustomerAgentServer.isConfigured(),
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
          }));
          return;
        }

        if (req.url === '/api/customer-agent' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const agentResponse = await groqCustomerAgentServer.processRequest(payload);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(agentResponse));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                groqConfigured: groqCustomerAgentServer.isConfigured(),
                error: err?.message || 'Server error processing request'
              }));
            }
          });
          return;
        }

        if (req.url === '/api/store-agent' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const agentResponse = await groqStoreAgentServer.processRequest(payload);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(agentResponse));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                groqConfigured: groqStoreAgentServer.isConfigured(),
                error: err?.message || 'Server error processing store agent request'
              }));
            }
          });
          return;
        }

        if (req.url === '/api/store-agent/overview' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            overview: storeAgentTools.getStoreOverview()
          }));
          return;
        }

        if (req.url === '/api/store-agent/actions' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const { action, recommendationId, modifications, reason, managerName } = payload;
              let result: any;
              if (action === 'approve') {
                result = storeAgentTools.approveRecommendation(recommendationId, managerName);
              } else if (action === 'modify') {
                result = storeAgentTools.modifyRecommendation(recommendationId, modifications || {}, managerName);
              } else if (action === 'dismiss') {
                result = storeAgentTools.dismissRecommendation(recommendationId, reason, managerName);
              } else if (action === 'execute') {
                result = storeAgentTools.executeApprovedRecommendation(recommendationId);
              } else if (action === 'generate') {
                result = storeAgentTools.generateStoreRecommendations();
              } else {
                throw new Error(`Unsupported store action: ${action}`);
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, result }));
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message || 'Action failed' }));
            }
          });
          return;
        }

        if (req.url === '/api/hindsight/status' && req.method === 'GET') {
          const healthy = await hindsightService.isHealthy();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            isHealthy: healthy,
            baseUrl: process.env.HINDSIGHT_BASE_URL || 'http://localhost:8888',
            storeBank: hindsightService.getStoreBank(),
            activityCount: hindsightService.getActivityLog().length
          }));
          return;
        }

        if (req.url === '/api/hindsight/activity' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            activities: hindsightService.getActivityLog()
          }));
          return;
        }

        if (req.url === '/api/hindsight/recall' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { bankId, query, tags } = JSON.parse(body || '{}');
              const result = await hindsightService.recall(bankId, query, { tags });
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message }));
            }
          });
          return;
        }

        if (req.url === '/api/hindsight/retain' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { bankId, content, options } = JSON.parse(body || '{}');
              const result = await hindsightService.retain(bankId, content, options);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message }));
            }
          });
          return;
        }

        next();
      });
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
