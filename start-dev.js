#!/usr/bin/env node
import { spawn } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Change to client directory and start Vite with proper configuration
const clientDir = resolve(__dirname, 'client');

const viteProcess = spawn('npx', ['vite', 'dev'], {
  cwd: clientDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    HOST: '0.0.0.0',
    PORT: '5000'
  }
});

viteProcess.on('error', (err) => {
  console.error('Failed to start development server:', err);
  process.exit(1);
});

viteProcess.on('close', (code) => {
  process.exit(code);
});