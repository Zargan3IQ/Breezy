import { ServerResponse } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';

export const createServiceProxy = (target: string) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        console.error(`[gateway] proxy error -> ${target}:`, err.message);

        const response = res as ServerResponse;

        if (!response.headersSent) {
          response.writeHead(502, { 'Content-Type': 'application/json' });
        }

        response.end(JSON.stringify({ message: 'Bad gateway' }));
      },
    },
  });
};