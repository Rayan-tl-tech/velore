// Strict Safety Guard 1: Must run exclusively in 'test' environment
if (process.env.NODE_ENV !== 'test') {
  console.error(`⛔ SAFETY ABORT: HTTP timeouts tests strictly require NODE_ENV='test'. Current value: '${process.env.NODE_ENV || 'undefined'}'.`);
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

/**
 * Helper to make an HTTP GET request with an optional custom agent.
 */
function makeHttpRequest(url, agent) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { agent }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          socket: res.socket,
        });
      });
    });
    req.on('error', reject);
  });
}

async function runHttpTimeoutsTestSuite() {
  console.log('======================================================================');
  console.log('🛡️  VÉLOR — AUTOMATED HTTP SERVER TIMEOUTS TEST SUITE (STEP 9.3.4A)');
  console.log('======================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1 — Default timeout values applied to live server
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- Test 1: Default HTTP Server Timeouts Configuration ---');
  {
    const snippet = `
      process.env.PORT = '5088';
      import mongoose from 'mongoose';
      import { startServer, gracefulShutdown } from './index.js';

      const s = await startServer();
      console.log('PROBE_KEEPALIVE:' + s.keepAliveTimeout);
      console.log('PROBE_HEADERS:' + s.headersTimeout);
      console.log('PROBE_REQUEST:' + s.requestTimeout);
      console.log('PROBE_TIMEOUT:' + s.timeout);
      console.log('PROBE_DBNAME:' + mongoose.connection.name);

      await gracefulShutdown('SIGTERM');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5088' });

    const hasKeepAlive65k = fullOutput.includes('PROBE_KEEPALIVE:65000');
    const hasHeaders66k = fullOutput.includes('PROBE_HEADERS:66000');
    const hasRequest120k = fullOutput.includes('PROBE_REQUEST:120000');
    const hasTimeout0 = fullOutput.includes('PROBE_TIMEOUT:0');
    const isTestDb = fullOutput.includes('PROBE_DBNAME:velor_test');
    const cleanExit = code === 0;

    const passed = hasKeepAlive65k && hasHeaders66k && hasRequest120k && hasTimeout0 && isTestDb && cleanExit;
    recordTest(
      'Default timeouts applied correctly (keepAlive=65s, headers=66s, request=120s, timeout=0)',
      passed,
      `Exit code: ${code}, keepAlive: ${hasKeepAlive65k}, headers: ${hasHeaders66k}, request: ${hasRequest120k}, timeout: ${hasTimeout0}, db: velor_test (${isTestDb})`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2 — Custom environment variable overrides
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 2: Custom Environment Variable Overrides ---');
  {
    const snippet = `
      process.env.PORT = '5089';
      import { startServer, gracefulShutdown } from './index.js';

      const s = await startServer();
      console.log('PROBE_CUSTOM_KEEPALIVE:' + s.keepAliveTimeout);
      console.log('PROBE_CUSTOM_HEADERS:' + s.headersTimeout);
      console.log('PROBE_CUSTOM_REQUEST:' + s.requestTimeout);

      await gracefulShutdown('SIGTERM');
    `;

    const customEnv = {
      PORT: '5089',
      HTTP_KEEP_ALIVE_TIMEOUT_MS: '75000',
      HTTP_HEADERS_TIMEOUT_MS: '76000',
      HTTP_REQUEST_TIMEOUT_MS: '90000',
    };

    const { code, fullOutput } = await runChildSnippet(snippet, customEnv);

    const hasCustomKeepAlive = fullOutput.includes('PROBE_CUSTOM_KEEPALIVE:75000');
    const hasCustomHeaders = fullOutput.includes('PROBE_CUSTOM_HEADERS:76000');
    const hasCustomRequest = fullOutput.includes('PROBE_CUSTOM_REQUEST:90000');
    const cleanExit = code === 0;

    const passed = hasCustomKeepAlive && hasCustomHeaders && hasCustomRequest && cleanExit;
    recordTest(
      'Custom environment variables override timeout defaults correctly',
      passed,
      `Exit code: ${code}, keepAlive=75000: ${hasCustomKeepAlive}, headers=76000: ${hasCustomHeaders}, request=90000: ${hasCustomRequest}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3 — Defensive clamp: headersTimeout must strictly exceed keepAliveTimeout
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 3: Defensive Safety Clamping (headersTimeout > keepAliveTimeout) ---');
  {
    const snippet = `
      process.env.PORT = '5090';
      import { startServer, gracefulShutdown } from './index.js';

      const s = await startServer();
      console.log('PROBE_CLAMP_KEEPALIVE:' + s.keepAliveTimeout);
      console.log('PROBE_CLAMP_HEADERS:' + s.headersTimeout);

      await gracefulShutdown('SIGTERM');
    `;

    // Attempt invalid configuration where headersTimeout <= keepAliveTimeout
    const misconfiguredEnv = {
      PORT: '5090',
      HTTP_KEEP_ALIVE_TIMEOUT_MS: '70000',
      HTTP_HEADERS_TIMEOUT_MS: '60000', // lower than keepAlive!
    };

    const { code, fullOutput } = await runChildSnippet(snippet, misconfiguredEnv);

    const hasKeepAlive70k = fullOutput.includes('PROBE_CLAMP_KEEPALIVE:70000');
    // headersTimeout should be defensively clamped to at least keepAlive + 1000 = 71000
    const hasClampedHeaders = fullOutput.includes('PROBE_CLAMP_HEADERS:71000');
    const cleanExit = code === 0;

    const passed = hasKeepAlive70k && hasClampedHeaders && cleanExit;
    recordTest(
      'headersTimeout is defensively clamped to keepAliveTimeout + 1000 when misconfigured',
      passed,
      `Exit code: ${code}, keepAlive: ${hasKeepAlive70k}, clampedHeaders: ${hasClampedHeaders}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4 — Fallback defaults on non-numeric or negative values
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 4: Robust Fallback on Invalid Environment Values ---');
  {
    const snippet = `
      process.env.PORT = '5091';
      import { startServer, gracefulShutdown } from './index.js';

      const s = await startServer();
      console.log('PROBE_FALLBACK_KEEPALIVE:' + s.keepAliveTimeout);
      console.log('PROBE_FALLBACK_HEADERS:' + s.headersTimeout);
      console.log('PROBE_FALLBACK_REQUEST:' + s.requestTimeout);

      await gracefulShutdown('SIGTERM');
    `;

    const invalidEnv = {
      PORT: '5091',
      HTTP_KEEP_ALIVE_TIMEOUT_MS: '-500',
      HTTP_HEADERS_TIMEOUT_MS: 'invalid_string',
      HTTP_REQUEST_TIMEOUT_MS: '0',
    };

    const { code, fullOutput } = await runChildSnippet(snippet, invalidEnv);

    const hasKeepAliveDefault = fullOutput.includes('PROBE_FALLBACK_KEEPALIVE:65000');
    const hasHeadersDefault = fullOutput.includes('PROBE_FALLBACK_HEADERS:66000');
    const hasRequestDefault = fullOutput.includes('PROBE_FALLBACK_REQUEST:120000');
    const cleanExit = code === 0;

    const passed = hasKeepAliveDefault && hasHeadersDefault && hasRequestDefault && cleanExit;
    recordTest(
      'Invalid/negative/zero env values safely fall back to production defaults',
      passed,
      `Exit code: ${code}, keepAlive fallback: ${hasKeepAliveDefault}, headers fallback: ${hasHeadersDefault}, request fallback: ${hasRequestDefault}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5 — Live HTTP request, Keep-Alive connection persistence & socket reuse
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 5: Live HTTP Request & Keep-Alive Connection Persistence ---');
  {
    const port = '5092';
    const child = spawn(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
          process.env.PORT = '${port}';
          import { startServer, gracefulShutdown } from './index.js';
          await startServer();
          console.log('SERVER_ONLINE');
          process.on('message', async (msg) => {
            if (msg === 'STOP') {
              await gracefulShutdown('SIGTERM');
              process.exit(0);
            }
          });
        `
      ],
      {
        cwd: __dirname,
        env: { ...process.env, NODE_ENV: 'test', PORT: port },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      }
    );

    let stdout = '';
    let isOnline = false;

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server failed to start within 10s')), 10000);
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
        if (stdout.includes('SERVER_ONLINE') && !isOnline) {
          isOnline = true;
          clearTimeout(timer);
          resolve();
        }
      });
      child.stderr.on('data', (chunk) => { stdout += chunk.toString(); });
      child.on('error', reject);
    });

    try {
      const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });

      // Request 1: Health endpoint
      const res1 = await makeHttpRequest(`http://127.0.0.1:${port}/api/health`, agent);
      const parsedBody1 = JSON.parse(res1.body);
      const req1Success = res1.statusCode === 200 && parsedBody1.status === 'ok' && parsedBody1.database === 'velor_test';

      // Request 2: Consecutive request on same keep-alive agent
      const res2 = await makeHttpRequest(`http://127.0.0.1:${port}/api/health`, agent);
      const parsedBody2 = JSON.parse(res2.body);
      const req2Success = res2.statusCode === 200 && parsedBody2.status === 'ok';

      // Verify socket reuse across persistent connection
      const socketReused = res1.socket === res2.socket;

      agent.destroy();

      // Gracefully terminate child server
      child.send('STOP');
      const exitCode = await new Promise((resolve) => child.on('close', resolve));

      const passed = req1Success && req2Success && socketReused && exitCode === 0;
      recordTest(
        'Live HTTP Keep-Alive connection succeeds and reuses socket seamlessly',
        passed,
        `Req1 status: ${res1.statusCode}, Req2 status: ${res2.statusCode}, Socket reused: ${socketReused}, Child exit: ${exitCode}`
      );
    } catch (testErr) {
      child.kill('SIGKILL');
      recordTest('Live HTTP Keep-Alive connection succeeds and reuses socket seamlessly', false, testErr.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n======================================================================');
  console.log(`📊 HTTP TIMEOUTS TEST SUMMARY: ${results.passed}/${results.total} PASSED (${results.failed} failed)`);
  console.log('======================================================================');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runHttpTimeoutsTestSuite().catch((err) => {
  console.error('Unhandled failure in HTTP timeouts test suite:', err);
  process.exit(1);
});

