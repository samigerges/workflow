#!/usr/bin/env node
import { spawn } from 'child_process';
import { join } from 'path';

// Start Vite with the correct configuration
const viteProcess = spawn('npx', [
  'vite', 
  '--config', 
  join(process.cwd(), 'vite.override.config.js'),
  '--host', 
  '0.0.0.0', 
  '--port', 
  '5000'
], {
  cwd: join(process.cwd(), 'client'),
  stdio: 'inherit'
});

viteProcess.on('error', (err) => {
  console.error('Failed to start development server:', err);
  process.exit(1);
});

viteProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`Development server exited with code ${code}`);
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  viteProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  viteProcess.kill('SIGINT');
});