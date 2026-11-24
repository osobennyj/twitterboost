#!/usr/bin/env node
import { spawn } from 'child_process';

const port = process.env.PORT || 3000;
const host = '0.0.0.0';

console.log(`Starting agent-sdk serve on ${host}:${port}`);

const child = spawn('npx', [
  '@grok/agent-sdk',
  'serve',
  '--dir', '.',
  '--host', host,
  '--port', String(port),
  '--mode', 'multi'
], {
  stdio: 'inherit',
  env: process.env
});

child.on('error', (err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
