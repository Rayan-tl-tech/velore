// Strict Safety Guard 1: Must run exclusively in 'test' environment
if (process.env.NODE_ENV !== 'test') {
  console.error(`⛔ SAFETY ABORT: Process error tests strictly require NODE_ENV='test'. Current value: '${process.env.NODE_ENV || 'undefined'}'.`);
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

async function runProcessErrorsTestSuite() {
  console.log('======================================================================');
  console.log('🛡️  VÉLOR — AUTOMATED PROCESS ERROR HANDLING & SHUTDOWN RESILIENCE');
  console.log('======================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1 — Unhandled Promise Rejection
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- Test 1: Unhandled Promise Rejection Handling ---');
  {
    const snippet = `
      process.env.PORT = '5091';
      import mongoose from 'mongoose';
      import { startServer } from './index.js';

      await startServer();
      const dbName = mongoose.connection.name;
      console.log('PROBE_DBNAME:' + dbName);

      // Trigger fatal unhandled rejection outside request scope
      Promise.reject(new Error('SIMULATED_ASYNC_BACKGROUND_FAILURE'));
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5091' });

    const hasDbName = fullOutput.includes('PROBE_DBNAME:velor_test');
    if (hasDbName) results.dbIsolationVerified = true;

    const hasFatalLog = fullOutput.includes('FATAL UNHANDLED REJECTION');
    const hasInitiated = fullOutput.includes('Received unhandledRejection. Initiating graceful shutdown...');
    const hasHttpClosed = fullOutput.includes('HTTP server closed successfully.');
    const hasDbClosed = fullOutput.includes('MongoDB connection closed successfully.');
    const hasExit1 = code === 1;

    const passed = hasDbName && hasFatalLog && hasInitiated && hasHttpClosed && hasDbClosed && hasExit1;
    recordTest(
      'Test 1 — Unhandled Promise Rejection',
      passed,
      `Fatal logged: ${hasFatalLog}, Shutdown initiated: ${hasInitiated}, HTTP/DB closed: ${hasHttpClosed && hasDbClosed}, Exit code: ${code} (expected 1)`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2 — Uncaught Exception Fail-Fast Termination
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 2: Uncaught Exception Fail-Fast Termination ---');
  {
    const snippet = `
      process.env.PORT = '5092';
      import { startServer } from './index.js';

      await startServer();

      // Trigger synchronous unhandled exception
      setTimeout(() => {
        throw new Error('SIMULATED_SYNC_UNCAUGHT_EXCEPTION');
      }, 50);
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5092' });

    const hasFatalLog = fullOutput.includes('FATAL UNCAUGHT EXCEPTION');
    const hasNoCleanShutdown = !fullOutput.includes('Graceful shutdown completed cleanly.');
    const hasExit1 = code === 1;

    const passed = hasFatalLog && hasNoCleanShutdown && hasExit1;
    recordTest(
      'Test 2 — Uncaught Exception Fail-Fast',
      passed,
      `Fatal logged: ${hasFatalLog}, Did not attempt async drain: ${hasNoCleanShutdown}, Exit code: ${code} (expected 1)`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3 — Fatal Error During an Existing SIGTERM Shutdown (Test A)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 3: Fatal Error During Ongoing SIGTERM Shutdown (Test A) ---');
  {
    const snippet = `
      process.env.PORT = '5093';
      import { startServer } from './index.js';

      await startServer();

      // Initiate normal SIGTERM
      process.emit('SIGTERM');

      // Wait a short delay to ensure normal shutdown has started, then trigger unhandled rejection
      setTimeout(() => {
        Promise.reject(new Error('CRASH_DURING_SHUTDOWN'));
      }, 15);
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5093' });

    const hasEscalationLog = fullOutput.includes('Fatal error occurred during active normal shutdown');
    const hasNoCleanExit = !fullOutput.includes('Graceful shutdown completed cleanly.');
    const hasExit1 = code === 1;
    const hasNotExit0 = code !== 0;

    const passed = hasEscalationLog && hasNoCleanExit && hasExit1 && hasNotExit0;
    recordTest(
      'Test 3 — Fatal Error During SIGTERM Escalation (Test A)',
      passed,
      `Escalation detected: ${hasEscalationLog}, No clean exit: ${hasNoCleanExit}, Exit code: ${code} (must be 1, never 0)`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4 — MongoDB Cleanup Failure Recovery
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 4: MongoDB Cleanup Failure Recovery ---');
  {
    const snippet = `
      process.env.PORT = '5094';
      import mongoose from 'mongoose';
      import { startServer, gracefulShutdown } from './index.js';

      await startServer();

      // Inject simulated failure into mongoose.connection.close
      mongoose.connection.close = async () => {
        throw new Error('SIMULATED_MONGO_CLOSE_FAILURE');
      };

      await gracefulShutdown('SIGTERM', 0);
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5094' });

    const hasDbCloseError = fullOutput.includes('Error closing MongoDB connection: SIMULATED_MONGO_CLOSE_FAILURE');
    const hasCleanupFailureLog = fullOutput.includes('Graceful shutdown finished with cleanup failure(s)');
    const hasExit1 = code === 1;

    const passed = hasDbCloseError && hasCleanupFailureLog && hasExit1;
    recordTest(
      'Test 4 — MongoDB Cleanup Failure',
      passed,
      `Error logged: ${hasDbCloseError}, Cleanup failure handled: ${hasCleanupFailureLog}, Exit code: ${code} (expected 1)`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5 — HTTP Cleanup Failure with Independent MongoDB Cleanup
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 5: HTTP Closure Failure with Independent DB Closure ---');
  {
    const snippet = `
      process.env.PORT = '5095';
      import { startServer, gracefulShutdown, server } from './index.js';

      const s = await startServer();

      // Monkey-patch server.close to pass an error
      s.close = (cb) => {
        if (typeof cb === 'function') cb(new Error('SIMULATED_HTTP_CLOSE_ERROR'));
      };

      await gracefulShutdown('SIGTERM', 0);
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5095' });

    const hasHttpError = fullOutput.includes('Error closing HTTP server: SIMULATED_HTTP_CLOSE_ERROR');
    const hasDbClosed = fullOutput.includes('MongoDB connection closed successfully.');
    const hasExit1 = code === 1;

    const passed = hasHttpError && hasDbClosed && hasExit1;
    recordTest(
      'Test 5 — HTTP Closure Failure & DB Independent Close',
      passed,
      `HTTP error logged: ${hasHttpError}, DB cleanup executed: ${hasDbClosed}, Exit code: ${code} (expected 1)`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6 — MongoDB Already Disconnected
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 6: MongoDB Already Disconnected Handling ---');
  {
    const snippet = `
      process.env.PORT = '5096';
      import mongoose from 'mongoose';
      import { startServer, gracefulShutdown } from './index.js';

      await startServer();

      // Manually close connection before shutdown
      await mongoose.connection.close(false);

      await gracefulShutdown('SIGTERM', 0);
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5096' });

    const hasCleanExit = fullOutput.includes('Graceful shutdown completed cleanly.');
    const hasNoDoubleClose = !fullOutput.includes('Error closing MongoDB connection');
    const hasExit0 = code === 0;

    const passed = hasCleanExit && hasNoDoubleClose && hasExit0;
    recordTest(
      'Test 6 — MongoDB Already Disconnected',
      passed,
      `Clean exit: ${hasCleanExit}, No duplicate close crash: ${hasNoDoubleClose}, Exit code: ${code} (expected 0)`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 7 — Normal SIGTERM/SIGINT Baseline
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 7: Normal SIGTERM / SIGINT Baseline ---');
  {
    const snippet = `
      process.env.PORT = '5097';
      import { startServer } from './index.js';

      await startServer();
      process.emit('SIGTERM');
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5097' });

    const hasCleanExit = fullOutput.includes('Graceful shutdown completed cleanly.');
    const hasHttpClosed = fullOutput.includes('HTTP server closed successfully.');
    const hasDbClosed = fullOutput.includes('MongoDB connection closed successfully.');
    const hasExit0 = code === 0;

    const passed = hasCleanExit && hasHttpClosed && hasDbClosed && hasExit0;
    recordTest(
      'Test 7 — Normal SIGTERM Baseline',
      passed,
      `Clean exit: ${hasCleanExit}, HTTP closed: ${hasHttpClosed}, DB closed: ${hasDbClosed}, Exit code: ${code} (expected 0)`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 8 — Multiple Unhandled Rejections Idempotency & Runtime Probes (Test B)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 8: Multiple Unhandled Rejections Idempotency (Test B) ---');
  {
    const snippet = `
      process.env.PORT = '5098';
      import mongoose from 'mongoose';
      import { startServer } from './index.js';

      const s = await startServer();

      // Instrument runtime counters
      let httpCloseCalls = 0;
      let dbCloseCalls = 0;
      let dbClosedBeforeProcessExit = false;

      const originalServerClose = s.close.bind(s);
      s.close = function (cb) {
        httpCloseCalls++;
        return originalServerClose(cb);
      };

      const originalDbClose = mongoose.connection.close.bind(mongoose.connection);
      mongoose.connection.close = async function (...args) {
        dbCloseCalls++;
        const res = await originalDbClose(...args);
        dbClosedBeforeProcessExit = (mongoose.connection.readyState === 0);
        return res;
      };

      process.on('exit', () => {
        console.log('PROBE_HTTP_CLOSE_COUNT:' + httpCloseCalls);
        console.log('PROBE_DB_CLOSE_COUNT:' + dbCloseCalls);
        console.log('PROBE_DB_CLOSED_BEFORE_EXIT:' + (mongoose.connection.readyState === 0 || dbClosedBeforeProcessExit));
      });

      // Dispatch 3 rapid unhandled rejections
      Promise.reject(new Error('REJECTION_BURST_1'));
      setTimeout(() => Promise.reject(new Error('REJECTION_BURST_2')), 5);
      setTimeout(() => Promise.reject(new Error('REJECTION_BURST_3')), 10);
    `;

    const { code, fullOutput } = await runChildSnippet(snippet, { PORT: '5098' });

    const hasFatalLog = fullOutput.includes('FATAL UNHANDLED REJECTION');
    const hasExit1 = code === 1;

    // Probe assertions from runtime counters
    const httpCloseCountMatch = fullOutput.match(/PROBE_HTTP_CLOSE_COUNT:(\d+)/);
    const dbCloseCountMatch = fullOutput.match(/PROBE_DB_CLOSE_COUNT:(\d+)/);
    const httpCloseCalls = httpCloseCountMatch ? Number(httpCloseCountMatch[1]) : -1;
    const dbCloseCalls = dbCloseCountMatch ? Number(dbCloseCountMatch[1]) : -1;
    const hasDbClosedBeforeExit = fullOutput.includes('PROBE_DB_CLOSED_BEFORE_EXIT:true');

    const singleHttpClose = httpCloseCalls === 1;
    const singleDbClose = dbCloseCalls === 1;

    const passed = hasFatalLog && singleHttpClose && singleDbClose && hasDbClosedBeforeExit && hasExit1;
    recordTest(
      'Test 8 — Multiple Unhandled Rejections Idempotency (Test B)',
      passed,
      `HTTP closed exactly once: ${singleHttpClose} (count=${httpCloseCalls}), DB closed exactly once: ${singleDbClose} (count=${dbCloseCalls}), DB closed before exit: ${hasDbClosedBeforeExit}, Exit code: ${code} (expected 1)`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Summary & Isolation Verdict
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n======================================================================');
  console.log('📊 PROCESS ERROR TEST SUITE RESULTS SUMMARY');
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

runProcessErrorsTestSuite().catch((err) => {
  console.error('❌ Unexpected runner failure:', err);
  process.exit(1);
});
