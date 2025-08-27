#!/usr/bin/env node
import { createServer } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  try {
    const server = await createServer({
      root: resolve(__dirname, 'client'),
      server: {
        host: '0.0.0.0',
        port: 5000
      }
    });
    
    await server.listen();
    server.printUrls();
  } catch (err) {
    console.error('Failed to start development server:', err);
    process.exit(1);
  }
}

startServer();