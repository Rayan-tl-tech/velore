// Strict Safety Guard 1: Must run exclusively in 'test' environment
if (process.env.NODE_ENV !== 'test') {
  console.error(`⛔ SAFETY ABORT: Server lifecycle tests strictly require NODE_ENV='test'. Current value: '${process.env.NODE_ENV || 'undefined'}'.`);
  process.exit(1);
}

import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
  dbIsolationVerified: false,
};

function recordTest(name, passed, details) {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`  ✅ [PASS] ${name}`);
    if (details) console.log(`     Details: ${details}`);
  } else {
    results.failed++;
    console.error(`  ❌ [FAIL] ${name}`);
    if (details) console.error(`     Error: ${details}`);
  }
  results.tests.push({ name, passed, details });
}

/**
 * Helper to run an isolated Node.js child process executing an ESM code snippet.
 */
function runChildSnippet(snippet, envVars = {}) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--input-type=module', '-e', snippet],
      {
        cwd: __dirname,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          ...envVars,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code, signal) => {
      resolve({ code, signal, stdout, stderr, fullOutput: stdout + stderr });
    });
  });
}

async function runLifecycleTestSuite() {
  console.log('======================================================================');
  console.log('🛡️  VÉLOR — AUTOMATED GRACEFUL SHUTDOWN & SERVER LIFECYCLE TEST SUITE');
  console.log('======================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1 — Startup ordering
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- Test 1: Startup Ordering & DB Readiness ---');
  {
    const snippet = `
      process.env.PORT = '5081';
      import mongoose from 'mongoose';
      import { startServer, gracefulShutdown, server } from './index.js';

      const s = await startServer();
      const readyState = mongoose.connection.readyState;
      const dbName = mongoose.connection.name;
      console.log('PROBE_READYSTATE:' + readyState);
      console.log('PROBE_DBNAME:' + dbName);
      console.log('PROBE_LISTENING:' + s.listening);

      await gracefulShutdown('SIGTERM');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5081' });

    const dbConnectedIdx = fullOutput.indexOf('Connected to MongoDB Atlas');
    const serverRunningIdx = fullOutput.indexOf('Server running on port 5081');
    const isOrdered = dbConnectedIdx !== -1 && serverRunningIdx !== -1 && dbConnectedIdx < serverRunningIdx;
    const hasReadyState1 = fullOutput.includes('PROBE_READYSTATE:1');
    const isTestDb = fullOutput.includes('PROBE_DBNAME:velor_test');
    const isListening = fullOutput.includes('PROBE_LISTENING:true');

    if (isTestDb) {
      results.dbIsolationVerified = true;
    }

    const passed = code === 0 && isOrdered && hasReadyState1 && isTestDb && isListening;
    recordTest(
      'Test 1 — Startup Ordering & DB Readiness',
      passed,
      `Ordered: ${isOrdered}, readyState: 1 (${hasReadyState1}), Database: velor_test (${isTestDb}), Exit code: ${code}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2 — SIGTERM Graceful Shutdown
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 2: SIGTERM Graceful Shutdown ---');
  {
    const snippet = `
      process.env.PORT = '5082';
      const m = await import('./index.js');
      await m.startServer();
      console.log('PROBE_STARTED');
      process.emit('SIGTERM');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5082' });

    const hasStarted = fullOutput.includes('PROBE_STARTED');
    const hasSigterm = fullOutput.includes('Received SIGTERM. Initiating graceful shutdown...');
    const hasHttpClosed = fullOutput.includes('HTTP server closed successfully.');
    const hasDbClosed = fullOutput.includes('MongoDB connection closed successfully.');
    const hasCleanExit = fullOutput.includes('Graceful shutdown completed cleanly.');

    const passed = code === 0 && hasStarted && hasSigterm && hasHttpClosed && hasDbClosed && hasCleanExit;
    recordTest(
      'Test 2 — SIGTERM Graceful Shutdown',
      passed,
      `SIGTERM caught: ${hasSigterm}, HTTP closed: ${hasHttpClosed}, DB closed: ${hasDbClosed}, Exit code: ${code}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3 — SIGINT Graceful Shutdown
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 3: SIGINT Graceful Shutdown ---');
  {
    const snippet = `
      process.env.PORT = '5083';
      const m = await import('./index.js');
      await m.startServer();
      console.log('PROBE_STARTED');
      process.emit('SIGINT');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5083' });

    const hasStarted = fullOutput.includes('PROBE_STARTED');
    const hasSigint = fullOutput.includes('Received SIGINT. Initiating graceful shutdown...');
    const hasHttpClosed = fullOutput.includes('HTTP server closed successfully.');
    const hasDbClosed = fullOutput.includes('MongoDB connection closed successfully.');
    const hasCleanExit = fullOutput.includes('Graceful shutdown completed cleanly.');

    const passed = code === 0 && hasStarted && hasSigint && hasHttpClosed && hasDbClosed && hasCleanExit;
    recordTest(
      'Test 3 — SIGINT Graceful Shutdown',
      passed,
      `SIGINT caught: ${hasSigint}, HTTP closed: ${hasHttpClosed}, DB closed: ${hasDbClosed}, Exit code: ${code}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4 — In-flight Requests Draining
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 4: In-flight Requests Draining During Shutdown ---');
  {
    const snippet = `
      process.env.PORT = '5084';
      const { app, startServer, gracefulShutdown } = await import('./index.js');

      // Inject temporary test route strictly in this child process memory
      app.get('/test-in-flight-drain', async (req, res) => {
        await new Promise(r => setTimeout(r, 400));
        res.json({ success: true, inFlightDrained: true });
      });

      await startServer();

      // Launch in-flight request
      const fetchPromise = fetch('http://127.0.0.1:5084/test-in-flight-drain');

      // Trigger shutdown while request is active
      setTimeout(() => {
        process.emit('SIGTERM');
      }, 50);

      const res = await fetchPromise;
      const data = await res.json();
      console.log('PROBE_FETCH_STATUS:' + res.status);
      console.log('PROBE_DRAINED:' + data.inFlightDrained);
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5084' });

    const hasStatus200 = fullOutput.includes('PROBE_FETCH_STATUS:200');
    const hasDrained = fullOutput.includes('PROBE_DRAINED:true');
    const hasHttpClosed = fullOutput.includes('HTTP server closed successfully.');
    const hasDbClosed = fullOutput.includes('MongoDB connection closed successfully.');

    const passed = code === 0 && hasStatus200 && hasDrained && hasHttpClosed && hasDbClosed;
    recordTest(
      'Test 4 — In-flight Requests Draining',
      passed,
      `Status 200: ${hasStatus200}, Payload received: ${hasDrained}, Exit code: ${code}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5 — Double Signal Idempotency
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 5: Double Signal Idempotency (isShuttingDown Lock) ---');
  {
    const snippet = `
      process.env.PORT = '5085';
      const m = await import('./index.js');
      await m.startServer();

      // Concurrently dispatch both signals
      process.emit('SIGTERM');
      process.emit('SIGINT');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5085' });

    const hasIgnored = fullOutput.includes('Shutdown already in progress. Ignoring additional signal: SIGINT');
    const hasDbClosed = fullOutput.includes('MongoDB connection closed successfully.');
    const hasCleanExit = fullOutput.includes('Graceful shutdown completed cleanly.');

    // Count how many times MongoDB closure was executed (must be exactly 1)
    const dbCloseCount = (fullOutput.match(/Closing MongoDB connection\.\.\./g) || []).length;

    const passed = code === 0 && hasIgnored && hasDbClosed && hasCleanExit && dbCloseCount === 1;
    recordTest(
      'Test 5 — Double Signal Idempotency',
      passed,
      `Lock intercepted second signal: ${hasIgnored}, DB closed exactly once: ${dbCloseCount === 1}, Exit code: ${code}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6 — Shutdown Watchdog Timeout
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 6: Shutdown Watchdog Timeout Interception ---');
  {
    // We configure a 600ms watchdog and simulate a hung HTTP server close
    const snippet = `
      process.env.PORT = '5086';
      process.env.SHUTDOWN_TIMEOUT_MS = '600';
      const { startServer, gracefulShutdown, server } = await import('./index.js');

      const s = await startServer();

      // Monkey-patch server.close to hang without triggering callback
      s.close = () => {
        console.log('PROBE_SERVER_CLOSE_CALLED_AND_STUCK');
      };

      await gracefulShutdown('SIGTERM');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, {
      PORT: '5086',
      SHUTDOWN_TIMEOUT_MS: '600',
    });

    const hasStuckLog = fullOutput.includes('PROBE_SERVER_CLOSE_CALLED_AND_STUCK');
    const hasWatchdogFired = fullOutput.includes('Graceful shutdown timed out after 0.6s. Forcing exit.');
    const passed = code === 1 && hasStuckLog && hasWatchdogFired;

    recordTest(
      'Test 6 — Shutdown Watchdog Timeout',
      passed,
      `Watchdog fired: ${hasWatchdogFired}, Forced non-zero exit: ${code === 1} (code=${code})`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 7 — Startup Failure & DB Cleanup (EADDRINUSE)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 7: Startup Failure & MongoDB Cleanup (EADDRINUSE) ---');
  {
    // Parent occupies port 5087
    const dummy = http.createServer((req, res) => res.end('occupied'));
    await new Promise((resolve) => dummy.listen(5087, resolve));

    const snippet = `
      process.env.PORT = '5087';
      const { startServer } = await import('./index.js');
      await startServer();
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5087' });

    // Release port 5087
    await new Promise((resolve) => dummy.close(resolve));

    const hasAddrInUse = fullOutput.includes('EADDRINUSE');
    const hasDbClosed = fullOutput.includes('MongoDB connection closed after startup failure.');
    const passed = code === 1 && hasAddrInUse && hasDbClosed;

    recordTest(
      'Test 7 — Startup Failure & DB Cleanup (EADDRINUSE)',
      passed,
      `EADDRINUSE caught: ${hasAddrInUse}, MongoDB cleaned: ${hasDbClosed}, Exit code: ${code}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Summary & Isolation Verdict
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n======================================================================');
  console.log('📊 LIFECYCLE TEST SUITE RESULTS SUMMARY');
  console.log('======================================================================');
  console.log(`TOTAL SCENARIOS : ${results.total}`);
  console.log(`PASSED          : ${results.passed}`);
  console.log(`FAILED          : ${results.failed}`);
  console.log(`DB ISOLATION    : ${results.dbIsolationVerified ? 'VERIFIED (velor_test strictly enforced)' : 'UNVERIFIED'}`);
  console.log(`FINAL VERDICT   : ${results.failed === 0 ? 'PASS' : 'FAIL'}`);
  console.log('======================================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runLifecycleTestSuite().catch((err) => {
  console.error('❌ Unexpected runner failure:', err);
  process.exit(1);
});

