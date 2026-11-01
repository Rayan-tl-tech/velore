// Strict Safety Guard 1: Must run exclusively in 'test' environment
if (process.env.NODE_ENV !== 'test') {
  console.error(`⛔ SAFETY ABORT: Health check tests strictly require NODE_ENV='test'. Current value: '${process.env.NODE_ENV || 'undefined'}'.`);
  process.exit(1);
}

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

async function runHealthTestSuite() {
  console.log('======================================================================');
  console.log('🛡️  VÉLOR — AUTOMATED HEALTH, LIVENESS & READINESS SUITE (STEP 9.3.4E)');
  console.log('======================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1 — Liveness & Readiness with MongoDB CONNECTED -> Both HTTP 200
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- Test 1: Liveness & Readiness with MongoDB Connected ---');
  {
    const snippet = `
      process.env.PORT = '5121';
      import mongoose from 'mongoose';
      import { startServer, gracefulShutdown } from './index.js';

      await startServer();
      const isConnected = mongoose.connection.readyState === 1;
      console.log('PROBE_DB_CONNECTED:' + isConnected);

      const liveRes = await fetch('http://127.0.0.1:5121/api/live', { headers: { Connection: 'close' } });
      const liveBody = await liveRes.json();
      console.log('PROBE_LIVE_STATUS:' + liveRes.status);
      console.log('PROBE_LIVE_PAYLOAD:' + (liveBody && liveBody.status === 'live'));

      const readyRes = await fetch('http://127.0.0.1:5121/api/ready', { headers: { Connection: 'close' } });
      const readyBody = await readyRes.json();
      console.log('PROBE_READY_STATUS:' + readyRes.status);
      console.log('PROBE_READY_PAYLOAD:' + (readyBody && readyBody.status === 'ready'));

      const rootRes = await fetch('http://127.0.0.1:5121/', { headers: { Connection: 'close' } });
      console.log('PROBE_ROOT_STATUS:' + rootRes.status);

      await gracefulShutdown('SIGTERM');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5121' });

    const dbConnected = fullOutput.includes('PROBE_DB_CONNECTED:true');
    const live200 = fullOutput.includes('PROBE_LIVE_STATUS:200');
    const livePayload = fullOutput.includes('PROBE_LIVE_PAYLOAD:true');
    const ready200 = fullOutput.includes('PROBE_READY_STATUS:200');
    const readyPayload = fullOutput.includes('PROBE_READY_PAYLOAD:true');
    const root200 = fullOutput.includes('PROBE_ROOT_STATUS:200');
    const cleanExit = code === 0 || fullOutput.includes('Graceful shutdown completed cleanly.');

    const passed = dbConnected && live200 && livePayload && ready200 && readyPayload && root200 && cleanExit;
    recordTest(
      'Connected DB: Liveness (200), Readiness (200), Root (200) all succeed with valid status payloads',
      passed,
      `Exit code: ${code}, DB connected: ${dbConnected}, live: 200 (${live200}), ready: 200 (${ready200}), root: 200 (${root200})`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2 — Liveness & Readiness with MongoDB DISCONNECTED -> Liveness 200, Readiness 503
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 2: Liveness & Readiness with MongoDB Disconnected ---');
  {
    const snippet = `
      process.env.PORT = '5122';
      import mongoose from 'mongoose';
      import { startServer, gracefulShutdown } from './index.js';

      await startServer();

      // Explicitly simulate MongoDB database outage / disconnection while HTTP process stays alive
      await mongoose.connection.close(false);
      console.log('PROBE_DB_CLOSED:' + (mongoose.connection.readyState === 0));

      // Liveness must REMAIN 200 (Node.js process is healthy and answering HTTP)
      const liveRes = await fetch('http://127.0.0.1:5122/api/live', { headers: { Connection: 'close' } });
      const liveBody = await liveRes.json();
      console.log('PROBE_LIVE_DISCONNECTED_STATUS:' + liveRes.status);
      console.log('PROBE_LIVE_STILL_OK:' + (liveBody && liveBody.status === 'live'));

      // Root "/" must REMAIN 200 (independent of DB)
      const rootRes = await fetch('http://127.0.0.1:5122/', { headers: { Connection: 'close' } });
      console.log('PROBE_ROOT_DISCONNECTED_STATUS:' + rootRes.status);

      // Readiness MUST FAIL WITH 503 (database is unavailable)
      const readyRes = await fetch('http://127.0.0.1:5122/api/ready', { headers: { Connection: 'close' } });
      const readyBody = await readyRes.json();
      console.log('PROBE_READY_DISCONNECTED_STATUS:' + readyRes.status);
      console.log('PROBE_READY_UNAVAILABLE:' + (readyBody && readyBody.status === 'unavailable'));

      // Backward-compatible /api/health also returns 503 degraded
      const healthRes = await fetch('http://127.0.0.1:5122/api/health', { headers: { Connection: 'close' } });
      console.log('PROBE_HEALTH_DISCONNECTED_STATUS:' + healthRes.status);

      await gracefulShutdown('SIGTERM');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5122' });

    const dbClosed = fullOutput.includes('PROBE_DB_CLOSED:true');
    const liveStill200 = fullOutput.includes('PROBE_LIVE_DISCONNECTED_STATUS:200');
    const liveStillOk = fullOutput.includes('PROBE_LIVE_STILL_OK:true');
    const rootStill200 = fullOutput.includes('PROBE_ROOT_DISCONNECTED_STATUS:200');
    const ready503 = fullOutput.includes('PROBE_READY_DISCONNECTED_STATUS:503');
    const readyUnavailable = fullOutput.includes('PROBE_READY_UNAVAILABLE:true');
    const health503 = fullOutput.includes('PROBE_HEALTH_DISCONNECTED_STATUS:503');
    const cleanExit = code === 0 || fullOutput.includes('Graceful shutdown completed cleanly.');

    const passed = dbClosed && liveStill200 && liveStillOk && rootStill200 && ready503 && readyUnavailable && health503 && cleanExit;
    recordTest(
      'Disconnected DB: Liveness remains 200, Root remains 200, Readiness correctly returns 503 Service Unavailable',
      passed,
      `Exit code: ${code}, DB readyState=0: ${dbClosed}, liveness: 200 (${liveStill200}), readiness: 503 (${ready503}), root: 200 (${rootStill200})`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3 — Health, Liveness & Readiness Endpoints Exemption from Rate Limiting
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 3: Health, Liveness & Readiness Rate Limiter Exemption ---');
  {
    const snippet = `
      process.env.PORT = '5123';
      process.env.GLOBAL_RATE_LIMIT_MAX = '2';
      import { startServer, gracefulShutdown } from './index.js';

      await startServer();

      // Exhaust regular API quota
      await fetch('http://127.0.0.1:5123/api/products', { headers: { Connection: 'close' } });
      await fetch('http://127.0.0.1:5123/api/products', { headers: { Connection: 'close' } });

      // 3rd request should be blocked with 429
      const blockedRes = await fetch('http://127.0.0.1:5123/api/products', { headers: { Connection: 'close' } });
      console.log('PROBE_API_BLOCKED_429:' + (blockedRes.status === 429));

      // All health/liveness/readiness probes MUST STILL SUCCEED even when IP quota is exhausted
      const liveRes = await fetch('http://127.0.0.1:5123/api/live', { headers: { Connection: 'close' } });
      console.log('PROBE_LIVE_EXEMPT:' + (liveRes.status === 200));

      const readyRes = await fetch('http://127.0.0.1:5123/api/ready', { headers: { Connection: 'close' } });
      console.log('PROBE_READY_EXEMPT:' + (readyRes.status === 200));

      const healthRes = await fetch('http://127.0.0.1:5123/api/health', { headers: { Connection: 'close' } });
      console.log('PROBE_HEALTH_EXEMPT:' + (healthRes.status === 200));

      const rootRes = await fetch('http://127.0.0.1:5123/', { headers: { Connection: 'close' } });
      console.log('PROBE_ROOT_EXEMPT:' + (rootRes.status === 200));

      await gracefulShutdown('SIGTERM');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, {
      PORT: '5123',
      GLOBAL_RATE_LIMIT_MAX: '2',
    });

    const apiBlocked = fullOutput.includes('PROBE_API_BLOCKED_429:true');
    const liveExempt = fullOutput.includes('PROBE_LIVE_EXEMPT:true');
    const readyExempt = fullOutput.includes('PROBE_READY_EXEMPT:true');
    const healthExempt = fullOutput.includes('PROBE_HEALTH_EXEMPT:true');
    const rootExempt = fullOutput.includes('PROBE_ROOT_EXEMPT:true');
    const cleanExit = code === 0 || fullOutput.includes('Graceful shutdown completed cleanly.');

    const passed = apiBlocked && liveExempt && readyExempt && healthExempt && rootExempt && cleanExit;
    recordTest(
      'Rate limiter exhaustion does not block /api/live, /api/ready, /api/health, or / (all exempt)',
      passed,
      `API blocked: ${apiBlocked}, live exempt: ${liveExempt}, ready exempt: ${readyExempt}, health exempt: ${healthExempt}, root exempt: ${rootExempt}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4 — Health probe aliases (/api/health/live and /api/health/ready)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 4: Health probe aliases (/api/health/live and /api/health/ready) ---');
  {
    const snippet = `
      process.env.PORT = '5124';
      import { startServer, gracefulShutdown } from './index.js';

      await startServer();

      const liveAlias = await fetch('http://127.0.0.1:5124/api/health/live', { headers: { Connection: 'close' } });
      const readyAlias = await fetch('http://127.0.0.1:5124/api/health/ready', { headers: { Connection: 'close' } });

      console.log('PROBE_LIVE_ALIAS_STATUS:' + liveAlias.status);
      console.log('PROBE_READY_ALIAS_STATUS:' + readyAlias.status);

      await gracefulShutdown('SIGTERM');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5124' });

    const liveAlias200 = fullOutput.includes('PROBE_LIVE_ALIAS_STATUS:200');
    const readyAlias200 = fullOutput.includes('PROBE_READY_ALIAS_STATUS:200');
    const cleanExit = code === 0 || fullOutput.includes('Graceful shutdown completed cleanly.');

    const passed = liveAlias200 && readyAlias200 && cleanExit;
    recordTest(
      'Aliases /api/health/live and /api/health/ready are supported and return HTTP 200',
      passed,
      `live alias: ${liveAlias200}, ready alias: ${readyAlias200}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n======================================================================');
  console.log('📊 TEST SUITE SUMMARY');
  console.log('======================================================================');
  console.log(`Total tests  : ${results.total}`);
  console.log(`Passed       : ${results.passed}`);
  console.log(`Failed       : ${results.failed}`);
  console.log('======================================================================\n');

  if (results.failed > 0) {
    console.error(`❌ Suite failed: ${results.failed}/${results.total} tests failed.`);
    process.exit(1);
  } else {
    console.log(`✅ All ${results.passed}/${results.total} tests passed successfully.`);
    process.exit(0);
  }
}

runHealthTestSuite().catch((err) => {
  console.error('❌ Unhandled error in health test suite:', err);
  process.exit(1);
});

