#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const botPath = path.join(__dirname, '..', 'xemm-bot.js');

console.log('================================================================================');
console.log('GRACEFUL SHUTDOWN TEST');
console.log('================================================================================');
console.log('This test will:');
console.log('1. Start the XEMM bot');
console.log('2. Wait 10 seconds');
console.log('3. Send SIGTERM signal');
console.log('4. Verify graceful shutdown');
console.log('================================================================================\n');

// Start the bot
console.log('[TEST] Starting XEMM bot...');
const bot = spawn('node', [botPath], {
  stdio: 'pipe',
  env: { ...process.env }
});

let outputBuffer = '';

// Capture output
bot.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  outputBuffer += output;
});

bot.stderr.on('data', (data) => {
  const output = data.toString();
  process.stderr.write(output);
  outputBuffer += output;
});

// Handle bot exit
bot.on('exit', (code, signal) => {
  console.log('\n' + '='.repeat(80));
  console.log('[TEST] Bot exited');
  console.log(`  Exit code: ${code}`);
  console.log(`  Signal: ${signal}`);
  console.log('='.repeat(80));

  // Check if graceful shutdown occurred
  if (outputBuffer.includes('Graceful shutdown complete')) {
    console.log('✅ PASS: Graceful shutdown message found');
  } else {
    console.log('❌ FAIL: Graceful shutdown message NOT found');
  }

  if (outputBuffer.includes('All orders cancelled')) {
    console.log('✅ PASS: Order cancellation message found');
  } else {
    console.log('❌ FAIL: Order cancellation message NOT found');
  }

  if (outputBuffer.includes('SIGTERM')) {
    console.log('✅ PASS: SIGTERM signal received');
  } else {
    console.log('❌ FAIL: SIGTERM signal NOT received');
  }

  // Exit test with appropriate code
  process.exit(code === 0 ? 0 : 1);
});

// Wait 10 seconds then send SIGTERM
setTimeout(() => {
  console.log('\n' + '='.repeat(80));
  console.log('[TEST] Sending SIGTERM to bot (PID: ' + bot.pid + ')...');
  console.log('='.repeat(80) + '\n');
  bot.kill('SIGTERM');
}, 10000);

// Safety timeout - force kill after 20 seconds
setTimeout(() => {
  console.error('\n[TEST] ❌ Test timeout - force killing bot');
  bot.kill('SIGKILL');
  process.exit(1);
}, 20000);