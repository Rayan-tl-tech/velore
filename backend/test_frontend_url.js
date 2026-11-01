// Strict Safety Guard 1: Must run exclusively in 'test' environment
if (process.env.NODE_ENV !== 'test') {
  console.error(`⛔ SAFETY ABORT: Frontend URL tests strictly require NODE_ENV='test'. Current value: '${process.env.NODE_ENV || 'undefined'}'.`);
  process.exit(1);
}

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateFrontendUrl, isLocalhostOrigin } from './index.js';

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

const mockProdEnv = {
  NODE_ENV: 'production',
  JWT_SECRET: 'test_jwt_secret_for_production_validation_must_be_long_enough',
  CLOUDINARY_CLOUD_NAME: 'mock_cloud',
  CLOUDINARY_API_KEY: 'mock_key',
  CLOUDINARY_API_SECRET: 'mock_secret',
};

async function runFrontendUrlTestSuite() {
  console.log('======================================================================');
  console.log('🛡️  VÉLOR — AUTOMATED FRONTEND_URL PRODUCTION VALIDATION (STEP 9.3.4D)');
  console.log('======================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1 — Production + Valid HTTPS FRONTEND_URL -> Accepted
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- Test 1: Production + Valid HTTPS FRONTEND_URL -> Accepted ---');
  {
    const snippet = `
      const { validateFrontendUrl } = await import('./index.js');
      console.log('PROBE_IMPORT_SUCCESS:true');
      const check = validateFrontendUrl(process.env.FRONTEND_URL, true);
      console.log('PROBE_VALID_HTTPS:' + check.valid);
      console.log('PROBE_ORIGIN_ALLOWED:' + (check.origins && check.origins[0] === 'https://velor.vercel.app'));
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, {
      ...mockProdEnv,
      FRONTEND_URL: 'https://velor.vercel.app',
    });

    const imported = fullOutput.includes('PROBE_IMPORT_SUCCESS:true');
    const validHttps = fullOutput.includes('PROBE_VALID_HTTPS:true');
    const originAllowed = fullOutput.includes('PROBE_ORIGIN_ALLOWED:true');
    const cleanExit = code === 0;

    const passed = imported && validHttps && originAllowed && cleanExit;
    recordTest(
      'Production + Valid HTTPS FRONTEND_URL is accepted and module evaluates cleanly',
      passed,
      `Exit code: ${code}, imported: ${imported}, valid HTTPS: ${validHttps}, origin allowed: ${originAllowed}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2 — Production + Missing FRONTEND_URL -> Rejected
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 2: Production + Missing FRONTEND_URL -> Rejected ---');
  {
    const snippet = `
      delete process.env.FRONTEND_URL;
      import { startServer } from './index.js';
      console.log('PROBE_SHOULD_NEVER_RUN');
      await startServer();
    `;

    const env = { ...mockProdEnv };
    delete env.FRONTEND_URL;

    const { code, fullOutput } = await runChildSnippet(snippet, env);

    const hasFatalError = fullOutput.includes('FATAL: FRONTEND_URL environment variable is missing in production mode.');
    const didNotStart = !fullOutput.includes('PROBE_SHOULD_NEVER_RUN');
    const exitCode1 = code === 1;

    const passed = hasFatalError && didNotStart && exitCode1;
    recordTest(
      'Production + Missing FRONTEND_URL is rejected with exit code 1 and explicit fatal error',
      passed,
      `Exit code: ${code}, fatal error logged: ${hasFatalError}, startServer blocked: ${didNotStart}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3 — Production + Insecure HTTP URL -> Rejected
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 3: Production + Insecure HTTP URL -> Rejected ---');
  {
    const snippet = `
      import { startServer } from './index.js';
      console.log('PROBE_SHOULD_NEVER_RUN');
      await startServer();
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, {
      ...mockProdEnv,
      FRONTEND_URL: 'http://velor.vercel.app',
    });

    const hasInsecureError = fullOutput.includes('FATAL: Insecure FRONTEND_URL "http://velor.vercel.app". Production frontend URL must use HTTPS.');
    const didNotStart = !fullOutput.includes('PROBE_SHOULD_NEVER_RUN');
    const exitCode1 = code === 1;

    const passed = hasInsecureError && didNotStart && exitCode1;
    recordTest(
      'Production + Insecure HTTP URL is rejected with exit code 1 and HTTPS requirement message',
      passed,
      `Exit code: ${code}, insecure error logged: ${hasInsecureError}, startServer blocked: ${didNotStart}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4 — Production + Localhost / 127.0.0.1 -> Rejected
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 4: Production + Localhost / 127.0.0.1 -> Rejected ---');
  {
    // Case 4a: https://localhost:5173
    const snippetA = `
      import { startServer } from './index.js';
      console.log('PROBE_SHOULD_NEVER_RUN');
      await startServer();
    `;

    const resA = await runChildSnippet(snippetA, {
      ...mockProdEnv,
      FRONTEND_URL: 'https://localhost:5173',
    });

    const hasLocalhostError = resA.fullOutput.includes('points to localhost/loopback, which is prohibited in production.');
    const exitCode1A = resA.code === 1;

    // Case 4b: https://127.0.0.1:3000
    const snippetB = `
      import { startServer } from './index.js';
      console.log('PROBE_SHOULD_NEVER_RUN');
      await startServer();
    `;

    const resB = await runChildSnippet(snippetB, {
      ...mockProdEnv,
      FRONTEND_URL: 'https://127.0.0.1:3000',
    });

    const hasLoopbackError = resB.fullOutput.includes('points to localhost/loopback, which is prohibited in production.');
    const exitCode1B = resB.code === 1;

    const passed = hasLocalhostError && exitCode1A && hasLoopbackError && exitCode1B;
    recordTest(
      'Production + Localhost and 127.0.0.1 are strictly rejected in all forms',
      passed,
      `localhost (code=${resA.code}, error=${hasLocalhostError}), 127.0.0.1 (code=${resB.code}, error=${hasLoopbackError})`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5 — Development and Test Environments Preservation
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 5: Development and Test Environments Preservation ---');
  {
    // Unit validation helper checks
    const devWithoutFrontend = validateFrontendUrl(undefined, false);
    const devWithLocalhost = validateFrontendUrl('http://localhost:5173', false);
    const testWithoutFrontend = validateFrontendUrl('', false);

    const unitChecksPass = devWithoutFrontend.valid && devWithLocalhost.valid && testWithoutFrontend.valid;

    // Integration check: spawn child in test mode with localhost FRONTEND_URL
    const snippet = `
      process.env.PORT = '5112';
      import { startServer, gracefulShutdown } from './index.js';

      console.log('PROBE_TEST_MODE_IMPORT:true');
      const s = await startServer();
      console.log('PROBE_TEST_MODE_STARTED:true');
      await gracefulShutdown('SIGTERM');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, {
      NODE_ENV: 'test',
      PORT: '5112',
      FRONTEND_URL: 'http://localhost:5173',
    });

    const testImported = fullOutput.includes('PROBE_TEST_MODE_IMPORT:true');
    const testStarted = fullOutput.includes('PROBE_TEST_MODE_STARTED:true');
    const cleanExit = code === 0;

    const passed = unitChecksPass && testImported && testStarted && cleanExit;
    recordTest(
      'Development and Test environments operate normally without production FRONTEND_URL restrictions',
      passed,
      `Unit checks pass: ${unitChecksPass}, integration exit code: ${code}, started: ${testStarted}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6 — Server Fails Fast and Never Executes startServer on Invalid Config
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 6: Fail-Fast Guarantee (startServer never reached) ---');
  {
    const snippet = `
      let serverReached = false;
      try {
        const { startServer } = await import('./index.js');
        serverReached = true;
        await startServer();
      } catch (err) {
        console.log('PROBE_CATCH_ERROR:' + err.message);
      }
      console.log('PROBE_SERVER_REACHED:' + serverReached);
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, {
      ...mockProdEnv,
      FRONTEND_URL: 'not-a-valid-url',
    });

    const hasInvalidUrlError = fullOutput.includes('is not a valid absolute URL.');
    const serverNeverReached = !fullOutput.includes('PROBE_SERVER_REACHED:true');
    const exitCode1 = code === 1;

    const passed = hasInvalidUrlError && serverNeverReached && exitCode1;
    recordTest(
      'Server fails fast during module evaluation and never attempts to start when production config is invalid',
      passed,
      `Exit code: ${code}, invalid URL error logged: ${hasInvalidUrlError}, server reached: ${!serverNeverReached}`
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

runFrontendUrlTestSuite().catch((err) => {
  console.error('❌ Unhandled error in frontend URL test suite:', err);
  process.exit(1);
});
