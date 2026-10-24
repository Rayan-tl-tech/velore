import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

// Helper to extract cookie from Set-Cookie header
function extractCookie(res, cookieName = 'refreshToken') {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

async function runPhase3Tests() {
  console.log('🛡️  Starting VÉLOR Phase 3 Authentication & Token Security Test Suite...\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  const record = (name, pass, details = '') => {
    results.tests.push({ name, pass, details });
    if (pass) {
      results.passed++;
      console.log(`  ✅ PASS: ${name} ${details ? '(' + details + ')' : ''}`);
    } else {
      results.failed++;
      console.error(`  ❌ FAIL: ${name} - ${details}`);
    }
  };

  // ─── 1. ACCESS TOKEN TESTS ───
  console.log('--- 1. Access Token Lifecycle & Verification Tests ---');

  // 1.1 Login to acquire access token & refresh cookie
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
    },
    body: JSON.stringify({ email: 'client@velor.com', password: 'Client1234!' }),
  });
  const loginData = await loginRes.json();
  const validAccessToken = loginData.accessToken || loginData.token;
  const initialRefreshCookie = extractCookie(loginRes, 'refreshToken');

  record('Login returns access token', !!validAccessToken, 'JWT acquired');
  record('Login sets HttpOnly refreshToken cookie', !!initialRefreshCookie, 'Cookie acquired');

  // Verify cookie flags in Set-Cookie header
  const setCookieHeader = loginRes.headers.get('set-cookie') || '';
  const hasHttpOnly = /httponly/i.test(setCookieHeader);
  const hasPath = /path=\/api\/auth/i.test(setCookieHeader);
  record('Cookie has HttpOnly flag', hasHttpOnly);
  record('Cookie has restricted Path=/api/auth', hasPath);

  // 1.2 Valid access token accesses protected endpoint
  const profileRes = await fetch(`${BASE_URL}/api/users/profile`, {
    headers: { Authorization: `Bearer ${validAccessToken}` },
  });
  record('Valid access token accesses protected resource (200 OK)', profileRes.status === 200);

  // 1.3 Missing access token is rejected
  const missingTokenRes = await fetch(`${BASE_URL}/api/users/profile`);
  record('Missing access token returns 401 Unauthorized', missingTokenRes.status === 401);

  // 1.4 Malformed access token is rejected
  const malformedTokenRes = await fetch(`${BASE_URL}/api/users/profile`, {
    headers: { Authorization: 'Bearer this-is-not-a-valid-jwt-token' },
  });
  record('Malformed access token returns 401 Unauthorized', malformedTokenRes.status === 401);

  // 1.5 Tampered signature access token is rejected
  const tamperedToken = validAccessToken.slice(0, -6) + 'abcdef';
  const tamperedRes = await fetch(`${BASE_URL}/api/users/profile`, {
    headers: { Authorization: `Bearer ${tamperedToken}` },
  });
  record('Tampered access token returns 401 Unauthorized', tamperedRes.status === 401);

  // 1.6 Expired access token is rejected with expired flag
  const expiredToken = jwt.sign(
    { id: loginData.user._id, roles: loginData.user.roles },
    JWT_SECRET,
    { expiresIn: '0s' } // Expired immediately
  );
  // Wait 10ms to ensure expiry
  await new Promise((r) => setTimeout(r, 20));
  const expiredRes = await fetch(`${BASE_URL}/api/users/profile`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  const expiredData = await expiredRes.json();
  record(
    'Expired access token returns 401 with expired flag',
    expiredRes.status === 401 && expiredData.expired === true
  );

  // ─── 2. REFRESH TOKEN ROTATION TESTS ───
  console.log('\n--- 2. Refresh Token Rotation Tests ---');

  // 2.1 Missing cookie on refresh endpoint is rejected
  const noCookieRefreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
    },
  });
  record('Missing refresh cookie returns 401', noCookieRefreshRes.status === 401);

  // 2.2 Invalid/tampered refresh cookie is rejected
  const badCookieRefreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
      Cookie: 'refreshToken=invalid_random_cookie_value_1234567890',
    },
  });
  record('Invalid refresh cookie returns 401', badCookieRefreshRes.status === 401);

  // 2.3 Valid refresh token rotates and returns new access token + new cookie
  const refresh1Res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
      Cookie: `refreshToken=${initialRefreshCookie}`,
    },
  });
  const refresh1Data = await refresh1Res.json();
  const rotatedCookie1 = extractCookie(refresh1Res, 'refreshToken');
  const newAccessToken1 = refresh1Data.accessToken || refresh1Data.token;

  record(
    'First refresh succeeds (200 OK)',
    refresh1Res.status === 200 && !!newAccessToken1 && !!rotatedCookie1,
    'Received new access token & new cookie'
  );
  record(
    'Rotated cookie is distinct from initial cookie',
    rotatedCookie1 !== initialRefreshCookie,
    'Different token string confirmed'
  );

  // 2.4 Second refresh using rotated cookie succeeds
  const refresh2Res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
      Cookie: `refreshToken=${rotatedCookie1}`,
    },
  });
  const refresh2Data = await refresh2Res.json();
  const rotatedCookie2 = extractCookie(refresh2Res, 'refreshToken');
  const newAccessToken2 = refresh2Data.accessToken || refresh2Data.token;

  record(
    'Second refresh with rotated cookie succeeds',
    refresh2Res.status === 200 && !!newAccessToken2 && !!rotatedCookie2
  );

  // ─── 3. REUSE DETECTION (COMPROMISE DETECTION) ───
  console.log('\n--- 3. Refresh Token Reuse Detection Tests ---');

  // Re-attempt refresh using the OLD initialRefreshCookie (which was already rotated in step 2.3)
  const reuseAttemptRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
      Cookie: `refreshToken=${initialRefreshCookie}`,
    },
  });
  const reuseData = await reuseAttemptRes.json();
  record(
    'Reuse Detection: Replay of old rotated refresh token rejected with 401',
    reuseAttemptRes.status === 401,
    `Error: "${reuseData.error}"`
  );

  // Because reuse was detected, the compromised session family should be invalidated
  const compromisedChildRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
      Cookie: `refreshToken=${rotatedCookie2}`,
    },
  });
  record(
    'Reuse Detection: Subsequent tokens in session family invalidated',
    compromisedChildRes.status === 401,
    'Compromised family terminated'
  );

  // ─── 4. LOGOUT & SERVER-SIDE REVOCATION ───
  console.log('\n--- 4. Logout & Server-Side Session Revocation Tests ---');

  // Log in again to get fresh session
  const loginAgainRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
    },
    body: JSON.stringify({ email: 'client@velor.com', password: 'Client1234!' }),
  });
  const logoutTestCookie = extractCookie(loginAgainRes, 'refreshToken');

  // Execute logout
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
      Cookie: `refreshToken=${logoutTestCookie}`,
    },
  });
  const logoutData = await logoutRes.json();
  record('Logout returns 200 OK', logoutRes.status === 200 && logoutData.success === true);

  // Verify Set-Cookie cleared the cookie
  const logoutSetCookie = logoutRes.headers.get('set-cookie') || '';
  const cookieCleared =
    logoutSetCookie.includes('refreshToken=;') ||
    logoutSetCookie.includes('Max-Age=0') ||
    logoutSetCookie.includes('Expires=Thu, 01 Jan 1970');
  record('Logout clears the refresh cookie in client headers', cookieCleared);

  // Refresh with revoked/logged-out cookie MUST fail
  const refreshAfterLogoutRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
      Cookie: `refreshToken=${logoutTestCookie}`,
    },
  });
  record('Refresh token fails after logout (Server-side revocation)', refreshAfterLogoutRes.status === 401);

  // ─── 5. CSRF PROTECTION ───
  console.log('\n--- 5. CSRF Protection Tests ---');

  // Untrusted Origin attempting to refresh cookie
  const maliciousOriginRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://evil-attacker-site.com',
      Cookie: `refreshToken=${logoutTestCookie}`,
    },
  });
  record(
    'CSRF: Untrusted Origin rejected with 403 Forbidden',
    maliciousOriginRes.status === 403,
    `Status ${maliciousOriginRes.status}`
  );

  // Untrusted Origin attempting logout
  const maliciousLogoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://evil-attacker-site.com',
      Cookie: `refreshToken=${logoutTestCookie}`,
    },
  });
  record(
    'CSRF: Untrusted Origin blocked from logout with 403 Forbidden',
    maliciousLogoutRes.status === 403,
    `Status ${maliciousLogoutRes.status}`
  );

  // ─── 6. ADMIN RBAC & PRIVILEGE BOUNDARY ───
  console.log('\n--- 6. Admin RBAC & Privilege Boundary Tests ---');

  // Customer access token accessing admin users list -> 403
  const customerAdminRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${validAccessToken}` },
  });
  record('Customer token blocked from admin endpoints (403 Forbidden)', customerAdminRes.status === 403);

  // Admin logs in and acquires access token
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
    },
    body: JSON.stringify({ email: 'test123@gmail.com', password: 'test123' }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminAccessToken = adminLoginData.accessToken || adminLoginData.token;

  // Admin access token accessing admin users list -> 200
  const adminUsersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${adminAccessToken}` },
  });
  record('Admin token accesses admin endpoints (200 OK)', adminUsersRes.status === 200);

  // Expired admin access token -> 401
  const expiredAdminToken = jwt.sign(
    { id: adminLoginData.user._id, roles: ['admin'] },
    JWT_SECRET,
    { expiresIn: '0s' }
  );
  await new Promise((r) => setTimeout(r, 20));
  const expiredAdminRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${expiredAdminToken}` },
  });
  record('Expired admin token rejected with 401 Unauthorized', expiredAdminRes.status === 401);

  // ─── 7. LOGOUT-ALL MULTI-DEVICE REVOCATION ───
  console.log('\n--- 7. Multi-Device Revocation (Logout-All) Tests ---');

  // User logs in on Device 1
  const dev1Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    body: JSON.stringify({ email: 'client@velor.com', password: 'Client1234!' }),
  });
  const dev1Data = await dev1Res.json();
  const dev1Token = dev1Data.accessToken || dev1Data.token;
  const dev1Cookie = extractCookie(dev1Res, 'refreshToken');

  // User logs in on Device 2
  const dev2Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    body: JSON.stringify({ email: 'client@velor.com', password: 'Client1234!' }),
  });
  const dev2Cookie = extractCookie(dev2Res, 'refreshToken');

  record('Two concurrent sessions established', !!dev1Cookie && !!dev2Cookie && dev1Cookie !== dev2Cookie);

  // Device 1 triggers logout-all
  const logoutAllRes = await fetch(`${BASE_URL}/api/auth/logout-all`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${dev1Token}`,
      Origin: 'http://localhost:5173',
      Cookie: `refreshToken=${dev1Cookie}`,
    },
  });
  record('Logout-all endpoint succeeds (200 OK)', logoutAllRes.status === 200);

  // Device 2 refresh MUST now fail because all sessions were revoked
  const dev2RefreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
      Cookie: `refreshToken=${dev2Cookie}`,
    },
  });
  record('Device 2 session revoked after logout-all (Multi-session revocation)', dev2RefreshRes.status === 401);

  console.log('\n======================================================');
  console.log(`Phase 3 Tests Complete: ${results.passed} PASSED, ${results.failed} FAILED`);
  console.log('======================================================');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runPhase3Tests().catch((err) => {
  console.error('\n❌ Unhandled test failure:', err);
  process.exit(1);
});
