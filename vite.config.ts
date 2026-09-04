import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { GoogleGenAI } from '@google/genai';

function geminiApiPlugin() {
  return {
    name: 'gemini-api-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/copilot', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { question, verifiedContext } = JSON.parse(body || '{}');
            const env = loadEnv('', process.cwd(), '');
            const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'GEMINI_API_KEY missing on server' }));
              return;
            }

            const ai = new GoogleGenAI({ apiKey });
            const result = await ai.models.generateContent({
              model: 'gemini-3.6-flash',
              contents: `You are RetailIQ Copilot, an AI retail operations copilot assisting a store manager.
MANDATORY OPERATIONAL RULES:
1. You MUST NEVER fabricate or alter numbers.
2. Quote and use ONLY the verified ground truth figures provided in the verified data context below.
3. If the user asks for information outside this verified context, say: "I do not have enough data to answer that reliably."
4. Structure your response with clean markdown:
   - Direct concise executive answer
   - Verified SKU numbers & current runways
   - Clear prescriptive recommendation

Manager's Question: "${question}"

Verified Ground Truth Store Data:
${verifiedContext}`,
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, text: result.text }));
          } catch (err: any) {
            console.error('[Gemini Server Proxy Error]:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), geminiApiPlugin()],
});
