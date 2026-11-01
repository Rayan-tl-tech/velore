// Strict Safety Guard 1: Must run exclusively in 'test' environment
if (process.env.NODE_ENV !== 'test') {
  console.error(`⛔ SAFETY ABORT: Rate limit tests strictly require NODE_ENV='test'. Current value: '${process.env.NODE_ENV || 'undefined'}'.`);
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

async function runRateLimitTestSuite() {
  console.log('======================================================================');
  console.log('🛡️  VÉLOR — AUTOMATED RATE LIMITING TEST SUITE (STEP 9.3.4C)');
  console.log('======================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1 — Normal API request allowed within global limit (Standard Headers)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- Test 1: Normal API request allowed within global quota ---');
  {
    const snippet = `
      process.env.PORT = '5101';
      delete process.env.GLOBAL_RATE_LIMIT_MAX;
      import mongoose from 'mongoose';
      import { startServer, gracefulShutdown } from './index.js';

      const s = await startServer();
      const isTestDb = mongoose.connection.name === 'velor_test';
      console.log('PROBE_DBNAME:' + mongoose.connection.name);

      const res = await fetch('http://127.0.0.1:5101/api/products');
      const limitHeader = res.headers.get('ratelimit-limit');
      const remainingHeader = res.headers.get('ratelimit-remaining');
      const resetHeader = res.headers.get('ratelimit-reset');
      const legacyLimit = res.headers.get('x-ratelimit-limit');
      const legacyRemaining = res.headers.get('x-ratelimit-remaining');

      console.log('PROBE_STATUS:' + res.status);
      console.log('PROBE_LIMIT:' + limitHeader);
      console.log('PROBE_REMAINING:' + remainingHeader);
      console.log('PROBE_RESET:' + (resetHeader !== null));
      console.log('PROBE_LEGACY_ABSENT:' + (legacyLimit === null && legacyRemaining === null));

      await gracefulShutdown('SIGTERM');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5101' });

    const isTestDb = fullOutput.includes('PROBE_DBNAME:velor_test');
    const isStatus200 = fullOutput.includes('PROBE_STATUS:200');
    const isLimit300 = fullOutput.includes('PROBE_LIMIT:300');
    const isRemaining299 = fullOutput.includes('PROBE_REMAINING:299');
    const hasReset = fullOutput.includes('PROBE_RESET:true');
    const noLegacyHeaders = fullOutput.includes('PROBE_LEGACY_ABSENT:true');
    const cleanExit = code === 0;

    const passed = isTestDb && isStatus200 && isLimit300 && isRemaining299 && hasReset && noLegacyHeaders && cleanExit;
    recordTest(
      'Normal request allowed (HTTP 200, RateLimit-Limit: 300, RateLimit-Remaining: 299, no legacy headers)',
      passed,
      `Exit code: ${code}, status: 200 (${isStatus200}), limit: 300 (${isLimit300}), remaining: 299 (${isRemaining299}), legacy absent (${noLegacyHeaders}), db: velor_test (${isTestDb})`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2 — Rate limit threshold exceeded returns HTTP 429
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 2: Rate limit threshold exceeded returns HTTP 429 ---');
  {
    const snippet = `
      process.env.PORT = '5102';
      process.env.GLOBAL_RATE_LIMIT_MAX = '5';
      import { startServer, gracefulShutdown } from './index.js';

      await startServer();

      // Consume initial 5 requests
      for (let i = 0; i < 5; i++) {
        const r = await fetch('http://127.0.0.1:5102/api/products');
        if (r.status !== 200) {
          console.log('PROBE_EARLY_FAIL:' + i + ':' + r.status);
        }
      }

      // 6th request should be blocked with 429
      const blockedRes = await fetch('http://127.0.0.1:5102/api/products');
      const body = await blockedRes.json();
      const remaining = blockedRes.headers.get('ratelimit-remaining');

      console.log('PROBE_BLOCKED_STATUS:' + blockedRes.status);
      console.log('PROBE_BLOCKED_REMAINING:' + remaining);
      console.log('PROBE_BLOCKED_ERROR:' + (body && body.error));
      console.log('PROBE_BLOCKED_SUCCESS:' + (body && body.success));

      await gracefulShutdown('SIGTERM');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, {
      PORT: '5102',
      GLOBAL_RATE_LIMIT_MAX: '5',
    });

    const isStatus429 = fullOutput.includes('PROBE_BLOCKED_STATUS:429');
    const isRemainingZero = fullOutput.includes('PROBE_BLOCKED_REMAINING:0');
    const hasExpectedError = fullOutput.includes('PROBE_BLOCKED_ERROR:Too many requests from this IP. Please wait a moment before trying again.');
    const hasSuccessFalse = fullOutput.includes('PROBE_BLOCKED_SUCCESS:false');
    const cleanExit = code === 0;

    const passed = isStatus429 && isRemainingZero && hasExpectedError && hasSuccessFalse && cleanExit;
    recordTest(
      'Rate limit exceeded returns HTTP 429 with expected error payload and RateLimit-Remaining: 0',
      passed,
      `Exit code: ${code}, status 429: ${isStatus429}, remaining 0: ${isRemainingZero}, expected message: ${hasExpectedError}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3 — Health check endpoints exemption (/api/health never limited)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 3: Health check endpoints exemption ---');
  {
    const snippet = `
      process.env.PORT = '5103';
      process.env.GLOBAL_RATE_LIMIT_MAX = '3';
      import { startServer, gracefulShutdown } from './index.js';

      await startServer();

      // Probe health check 5 times (> max of 3)
      let allHealth200 = true;
      for (let i = 0; i < 5; i++) {
        const h = await fetch('http://127.0.0.1:5103/api/health');
        if (h.status !== 200) allHealth200 = false;
      }
      console.log('PROBE_HEALTH_ALL_200:' + allHealth200);

      // Exhaust regular API quota
      for (let i = 0; i < 3; i++) {
        await fetch('http://127.0.0.1:5103/api/products');
      }

      // Verify regular API is now 429
      const apiBlocked = await fetch('http://127.0.0.1:5103/api/products');
      console.log('PROBE_API_BLOCKED:' + (apiBlocked.status === 429));

      // Health check MUST STILL RETURN 200 even after IP quota is exhausted
      const healthAfterBlock = await fetch('http://127.0.0.1:5103/api/health');
      console.log('PROBE_HEALTH_STILL_200:' + (healthAfterBlock.status === 200));

      await gracefulShutdown('SIGTERM');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, {
      PORT: '5103',
      GLOBAL_RATE_LIMIT_MAX: '3',
    });

    const healthAlways200 = fullOutput.includes('PROBE_HEALTH_ALL_200:true');
    const apiWasBlocked = fullOutput.includes('PROBE_API_BLOCKED:true');
    const healthStill200 = fullOutput.includes('PROBE_HEALTH_STILL_200:true');
    const cleanExit = code === 0;

    const passed = healthAlways200 && apiWasBlocked && healthStill200 && cleanExit;
    recordTest(
      'Health check endpoint is completely exempted from rate limiting even when global quota is exhausted',
      passed,
      `Exit code: ${code}, initial health calls 200: ${healthAlways200}, API blocked: ${apiWasBlocked}, health still 200: ${healthStill200}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4 — CORS OPTIONS preflight exemption
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 4: CORS OPTIONS preflight exemption ---');
  {
    const snippet = `
      process.env.PORT = '5104';
      process.env.GLOBAL_RATE_LIMIT_MAX = '2';
      import { startServer, gracefulShutdown } from './index.js';

      await startServer();

      // Send 5 preflight OPTIONS requests
      let allOptions200 = true;
      for (let i = 0; i < 5; i++) {
        const opt = await fetch('http://127.0.0.1:5104/api/products', {
          method: 'OPTIONS',
          headers: {
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'GET',
          },
        });
        if (opt.status !== 200) allOptions200 = false;
      }
      console.log('PROBE_OPTIONS_ALL_200:' + allOptions200);

      // Exhaust regular API quota (2 requests)
      await fetch('http://127.0.0.1:5104/api/products');
      await fetch('http://127.0.0.1:5104/api/products');

      // 3rd GET request should be 429
      const blockedGet = await fetch('http://127.0.0.1:5104/api/products');
      console.log('PROBE_GET_BLOCKED_429:' + (blockedGet.status === 429));

      // OPTIONS preflight MUST STILL SUCCEED (200) even after rate limit triggered
      const optAfterBlock = await fetch('http://127.0.0.1:5104/api/products', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET',
        },
      });
      console.log('PROBE_OPTIONS_STILL_200:' + (optAfterBlock.status === 200));

      await gracefulShutdown('SIGTERM');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, {
      PORT: '5104',
      GLOBAL_RATE_LIMIT_MAX: '2',
    });

    const optionsInitial200 = fullOutput.includes('PROBE_OPTIONS_ALL_200:true');
    const getBlocked429 = fullOutput.includes('PROBE_GET_BLOCKED_429:true');
    const optionsStill200 = fullOutput.includes('PROBE_OPTIONS_STILL_200:true');
    const cleanExit = code === 0;

    const passed = optionsInitial200 && getBlocked429 && optionsStill200 && cleanExit;
    recordTest(
      'CORS preflight OPTIONS requests are never penalized and remain accessible after rate limit',
      passed,
      `Exit code: ${code}, preflight initial 200: ${optionsInitial200}, GET blocked 429: ${getBlocked429}, preflight still 200: ${optionsStill200}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5 — Conservation of specific route limiters
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 5: Conservation of specific route limiters (orders limiter) ---');
  {
    const snippet = `
      process.env.PORT = '5105';
      process.env.GLOBAL_RATE_LIMIT_MAX = '50';
      import { startServer, gracefulShutdown } from './index.js';

      await startServer();

      // POST /api/orders has orderLimiter (max: 15 / 1min)
      // Send 15 POST requests (they may fail validation/auth with 401/400, but not 429)
      for (let i = 0; i < 15; i++) {
        await fetch('http://127.0.0.1:5105/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      }

      // 16th POST request must be blocked by orderLimiter with 429 and its specific message
      const resOrder16 = await fetch('http://127.0.0.1:5105/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const orderBody = await resOrder16.json();
      console.log('PROBE_ORDER_16_STATUS:' + resOrder16.status);
      console.log('PROBE_ORDER_16_MSG:' + (orderBody && orderBody.error));

      // Global quota is 50, so GET /api/products should STILL succeed with 200
      const resProducts = await fetch('http://127.0.0.1:5105/api/products');
      console.log('PROBE_PRODUCTS_AFTER_ORDER_LIMIT:' + resProducts.status);

      await gracefulShutdown('SIGTERM');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, {
      PORT: '5105',
      GLOBAL_RATE_LIMIT_MAX: '50',
    });

    const isOrder429 = fullOutput.includes('PROBE_ORDER_16_STATUS:429');
    const hasOrderSpecificMsg = fullOutput.includes('PROBE_ORDER_16_MSG:Too many order requests. Please wait a moment before trying again.');
    const productsStill200 = fullOutput.includes('PROBE_PRODUCTS_AFTER_ORDER_LIMIT:200');
    const cleanExit = code === 0;

    const passed = isOrder429 && hasOrderSpecificMsg && productsStill200 && cleanExit;
    recordTest(
      'Specific route limiters (orderLimiter) trigger independently without blocking general API endpoints',
      passed,
      `Exit code: ${code}, order status 429: ${isOrder429}, specific order message: ${hasOrderSpecificMsg}, general products still 200: ${productsStill200}`
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

runRateLimitTestSuite().catch((err) => {
  console.error('❌ Unhandled error in rate limit test suite:', err);
  process.exit(1);
});
