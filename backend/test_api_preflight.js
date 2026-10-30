process.env.NODE_ENV = 'test';

const HEALTH_URL = process.env.API_HEALTH_URL || 'http://localhost:5000/api/health';

/**
 * Pure evaluation function for health check payload.
 * Verifies the three mandatory conditions:
 *   1. health.connected === true
 *   2. health.env === 'test'
 *   3. health.database === 'velor_test'
 *
 * @param {object} health
 * @returns {{ ok: boolean, reason: string, message: string, env?: string, database?: string, connected?: boolean }}
 */
export function evaluateHealth(health) {
  if (!health || typeof health !== 'object') {
    return {
      ok: false,
      reason: 'INVALID_HEALTH_DATA',
      message: '❌ Prévalidation échouée : Données de santé invalides ou absentes.',
    };
  }

  // Cas 4 — Base non connectée
  if (health.connected !== true) {
    return {
      ok: false,
      reason: 'DATABASE_NOT_CONNECTED',
      message: `❌ Prévalidation échouée : La base de données MongoDB n'est pas connectée (connected: ${health.connected}).`,
    };
  }

  // Cas 2 — Mauvais environnement ou mauvaise base de données
  if (health.env !== 'test' || health.database !== 'velor_test') {
    const detectedEnv = health.env || '(non défini / production)';
    const detectedDb = health.database || '(non définie / masquée)';
    return {
      ok: false,
      reason: 'WRONG_ENVIRONMENT',
      env: detectedEnv,
      database: detectedDb,
      message:
        `⛔ REFUS D'EXÉCUTION : Environnement non autorisé détecté !\n` +
        `   - Environnement détecté   : '${detectedEnv}' (attendu: 'test')\n` +
        `   - Base de données détectée : '${detectedDb}' (attendue: 'velor_test')\n` +
        `   - Le serveur backend doit être redémarré avec NODE_ENV=test (ex: 'npm run test:server').\n` +
        `   - Les tests API sont STRICTEMENT interdits sur toute base autre que 'velor_test'.`,
    };
  }

  // Cas 1 — Tout est correct
  return {
    ok: true,
    reason: 'VALID',
    env: health.env,
    database: health.database,
    connected: health.connected,
    message: `✅ Prévalidation réussie : Serveur validé en environnement 'test' sur la base isolée 'velor_test' (connected: true).`,
  };
}

/**
 * Performs HTTP health check against the target backend URL.
 *
 * @param {string} targetUrl
 * @returns {Promise<{ ok: boolean, reason: string, message: string, [key: string]: any }>}
 */
export async function performPreflightCheck(targetUrl = HEALTH_URL) {
  let res;
  try {
    res = await fetch(targetUrl);
  } catch (error) {
    const errorDetail = error.cause?.message || error.message;
    return {
      ok: false,
      reason: 'SERVER_UNREACHABLE',
      error: errorDetail,
      message:
        `❌ Prévalidation échouée : Le serveur backend est inaccessible à l'adresse ${targetUrl} (${errorDetail}).\n` +
        `   Veuillez démarrer le serveur backend avec NODE_ENV=test (ex: 'npm run test:server').`,
    };
  }

  // Vérification obligatoire du statut HTTP avant toute analyse du corps de réponse
  if (!res.ok) {
    return {
      ok: false,
      reason: 'HTTP_ERROR',
      statusCode: res.status,
      message: `❌ Prévalidation échouée : Le serveur a répondu avec une erreur HTTP ${res.status} (${res.statusText || 'Error'}).`,
    };
  }

  let data;
  try {
    data = await res.json();
  } catch (jsonErr) {
    return {
      ok: false,
      reason: 'INVALID_JSON_RESPONSE',
      message: `❌ Prévalidation échouée : La réponse du serveur (${targetUrl}) n'est pas un JSON valide (HTTP ${res.status}).`,
    };
  }

  return evaluateHealth(data);
}

/**
 * Main preflight runner:
 * Executes the preflight verification and dynamically imports test_suite.js
 * ONLY IF all three conditions are strictly met.
 *
 * @param {string} targetUrl
 */
export async function runPreflightAndTests(targetUrl = HEALTH_URL) {
  console.log(`🔍 Vérification préalable (preflight) du serveur backend sur ${targetUrl}...`);
  const check = await performPreflightCheck(targetUrl);

  if (!check.ok) {
    console.error(`\n${check.message}\n`);
    console.error('⛔ Interruption immédiate : test_suite.js NE SERA PAS EXÉCUTÉ.\n');
    process.exit(1);
  }

  console.log(`${check.message}`);
  console.log('🚀 Lancement de la suite de tests API (test_suite.js)...\n');
  await import('./test_suite.js');
}

import { fileURLToPath } from 'url';

const isMainModule = () => {
  if (process.env.PREFLIGHT_TEST_MODE === 'true') return false;
  if (!process.argv[1]) return true; // Invoked via node -e "import('./test_api_preflight.js')"
  try {
    const currentFilePath = fileURLToPath(import.meta.url);
    return currentFilePath === process.argv[1] || process.argv[1].endsWith('test_api_preflight.js');
  } catch {
    return false;
  }
};

// Auto-run when executed directly or via node -e, unless imported by an external test runner
if (isMainModule()) {
  runPreflightAndTests().catch((err) => {
    console.error('❌ Erreur inattendue lors de la prévalidation :', err);
    process.exit(1);
  });
}
