import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000';

async function runPhase2Tests() {
  console.log('🛡️  Starting VÉLOR Phase 2 Security Hardening Test Suite...\n');

  // Track overall stats
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

  // 1. SETUP TOKENS
  console.log('--- 1. Authenticating Test Accounts ---');
  // Admin
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test123@gmail.com', password: 'test123' }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.token;
  record('Admin Authentication', !!adminToken, 'Acquired admin JWT');

  // Customer (User A)
  const userALoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'client@velor.com', password: 'Client1234!' }),
  });
  const userALoginData = await userALoginRes.json();
  const userAToken = userALoginData.token;
  const userAId = userALoginData.user._id;
  record('Customer Authentication (User A)', !!userAToken, 'Acquired customer JWT');

  // User B (New registered user for IDOR testing)
  const userBEmail = `userb_${Date.now()}@test.com`;
  const userBRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User B', email: userBEmail, password: 'SecureUserB123!' }),
  });
  const userBRegData = await userBRegRes.json();
  const userBToken = userBRegData.token;
  const userBId = userBRegData.user?._id;
  record('Registration & Token for User B', !!userBToken, `User B ID: ${userBId}`);

  // 2. CATEGORY VALIDATION & REFERENTIAL INTEGRITY (MEDIUM-01 & MEDIUM-03)
  console.log('\n--- 2. Category Validation & Referential Integrity (MEDIUM-01 & MEDIUM-03) ---');

  // 2.1 Create valid category
  const tempCatName = `TestCat_${Date.now()}`;
  const createCatRes = await fetch(`${BASE_URL}/api/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: tempCatName }),
  });
  const createCatData = await createCatRes.json();
  const createdCatId = createCatData._id;
  record('Category Creation with Valid Name', createCatRes.status === 201 && !!createdCatId, `ID: ${createdCatId}`);

  // 2.2 Reject non-string name (NoSQL injection object)
  const nosqlCatRes = await fetch(`${BASE_URL}/api/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: { $ne: null } }),
  });
  record(
    'Category Creation with Object/NoSQL Injection Payload Rejected',
    nosqlCatRes.status === 400,
    `Status ${nosqlCatRes.status}`
  );

  // 2.3 Reject array as name
  const arrayCatRes = await fetch(`${BASE_URL}/api/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: ['invalid', 'array'] }),
  });
  record('Category Creation with Array Rejected', arrayCatRes.status === 400, `Status ${arrayCatRes.status}`);

  // 2.4 Reject arbitrary extra fields (Allowlist test)
  const extraFieldCatRes = await fetch(`${BASE_URL}/api/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: `ValidName_${Date.now()}`, arbitraryField: 'malicious', isAdmin: true }),
  });
  record(
    'Category Creation with Arbitrary Extra Fields Rejected (Allowlist)',
    extraFieldCatRes.status === 400,
    `Status ${extraFieldCatRes.status}`
  );

  // 2.5 Reject empty category name
  const emptyCatRes = await fetch(`${BASE_URL}/api/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: '   ' }),
  });
  record('Category Creation with Empty Name Rejected', emptyCatRes.status === 400, `Status ${emptyCatRes.status}`);

  // 2.6 Reject duplicate category name
  const dupCatRes = await fetch(`${BASE_URL}/api/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: tempCatName }),
  });
  record('Duplicate Category Name Rejected', dupCatRes.status === 400, `Status ${dupCatRes.status}`);

  // 2.7 Update valid category
  const updatedCatName = `${tempCatName}_Updated`;
  const updateCatRes = await fetch(`${BASE_URL}/api/categories/${createdCatId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: updatedCatName }),
  });
  const updateCatData = await updateCatRes.json();
  record(
    'Category Update with Valid Name',
    updateCatRes.status === 200 && updateCatData.name === updatedCatName,
    `Updated to: ${updateCatData.name}`
  );

  // 2.8 Update with bad type
  const badUpdateCatRes = await fetch(`${BASE_URL}/api/categories/${createdCatId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: { $gt: '' } }),
  });
  record('Category Update with Bad Type Rejected', badUpdateCatRes.status === 400, `Status ${badUpdateCatRes.status}`);

  // 2.9 Deletion integrity check: Deleting a category with active products MUST BE REJECTED
  const allProdsRes = await fetch(`${BASE_URL}/api/products`);
  const allProds = await allProdsRes.json();
  const prodWithCategory = allProds.find((p) => p.category && p.category._id);
  if (prodWithCategory) {
    const activeCatId = prodWithCategory.category._id;
    const deleteActiveCatRes = await fetch(`${BASE_URL}/api/categories/${activeCatId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteActiveCatData = await deleteActiveCatRes.json();
    record(
      'MEDIUM-03: Deleting Category Referenced by Active Products Rejected',
      deleteActiveCatRes.status === 409 || deleteActiveCatRes.status === 400,
      `Status: ${deleteActiveCatRes.status}, Error: "${deleteActiveCatData.error}"`
    );
  }

  // 2.10 Deletion of empty category succeeds
  const deleteEmptyCatRes = await fetch(`${BASE_URL}/api/categories/${createdCatId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  record(
    'MEDIUM-03: Deletion of Unused Category Permitted',
    deleteEmptyCatRes.status === 200,
    `Status ${deleteEmptyCatRes.status}`
  );

  // 3. OBJECTID VALIDATION (MEDIUM-04)
  console.log('\n--- 3. ObjectId Format Validation (MEDIUM-04) ---');

  const testEndpoints = [
    { url: `${BASE_URL}/api/products/invalid-id-12345`, method: 'GET', auth: null },
    { url: `${BASE_URL}/api/categories/invalid-cat-12345`, method: 'GET', auth: null },
    { url: `${BASE_URL}/api/orders/not-a-mongo-id`, method: 'GET', auth: userAToken },
    { url: `${BASE_URL}/api/users/not-a-mongo-id`, method: 'GET', auth: adminToken },
    { url: `${BASE_URL}/api/cart/not-a-mongo-id`, method: 'PUT', auth: userAToken, body: { quantity: 1 } },
    { url: `${BASE_URL}/api/users/favorites/not-a-mongo-id`, method: 'POST', auth: userAToken },
  ];

  for (const ep of testEndpoints) {
    const headers = {};
    if (ep.auth) headers.Authorization = `Bearer ${ep.auth}`;
    if (ep.body) headers['Content-Type'] = 'application/json';

    const res = await fetch(ep.url, {
      method: ep.method,
      headers,
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));

    // Must be 400 and NOT leak CastError details or stack traces
    const isClean400 = res.status === 400 && !JSON.stringify(data).includes('CastError');
    record(`ObjectId Validation: ${ep.method} ${ep.url.replace(BASE_URL, '')}`, isClean400, `Status: ${res.status}`);
  }

  // 4. RBAC BOUNDARY TESTS
  console.log('\n--- 4. RBAC & Administrative Boundary Tests ---');

  const adminOnlyEndpoints = [
    { method: 'POST', path: '/api/products', body: { name: 'X', price: 10, stock: 1 } },
    { method: 'DELETE', path: '/api/products/660000000000000000000001' },
    { method: 'POST', path: '/api/categories', body: { name: 'X' } },
    { method: 'DELETE', path: '/api/categories/660000000000000000000001' },
    { method: 'GET', path: '/api/users' },
    { method: 'PUT', path: '/api/users/660000000000000000000001/roles', body: { action: 'promote' } },
    { method: 'GET', path: '/api/orders' },
  ];

  for (const ep of adminOnlyEndpoints) {
    const res = await fetch(`${BASE_URL}${ep.path}`, {
      method: ep.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`, // Customer token
      },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    record(`RBAC: Non-admin blocked from ${ep.method} ${ep.path}`, res.status === 403, `Status ${res.status}`);
  }

  // 5. IDOR & BOLA TESTS
  console.log('\n--- 5. IDOR & Object-Level Access Control (BOLA) Tests ---');

  // User A creates an order
  const userAOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userAToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: allProds[0]._id, quantity: 1, size: 'M' }],
      customerInfo: { fullName: 'User A', phone: '0555000000', wilaya: 'Alger', commune: 'Alger', address: 'Rue A' },
      paymentMethod: 'cod',
    }),
  });
  const userAOrderData = await userAOrderRes.json();
  const orderAId = userAOrderData.order?._id;

  if (orderAId) {
    // User B tries to read User A's order by ID
    const userBAccessOrderRes = await fetch(`${BASE_URL}/api/orders/${orderAId}`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    record(
      "IDOR: User B cannot view User A's order by ID",
      userBAccessOrderRes.status === 403,
      `Status ${userBAccessOrderRes.status}`
    );

    // User A can view their own order
    const userAAccessOwnOrderRes = await fetch(`${BASE_URL}/api/orders/${orderAId}`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    record("Ownership: User A can view their own order", userAAccessOwnOrderRes.status === 200);

    // Admin can view any order
    const adminAccessOrderRes = await fetch(`${BASE_URL}/api/orders/${orderAId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    record("Admin Authority: Admin can view order", adminAccessOrderRes.status === 200);
  } else {
    record('User A Order Creation for IDOR Test', false, 'Could not create order for test');
  }

  // 5.2 Cart isolation: User B viewing their cart does NOT see User A's cart items
  const userBCartRes = await fetch(`${BASE_URL}/api/cart`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  const userBCartData = await userBCartRes.json();
  record(
    'BOLA: Cart strictly isolated to authenticated user',
    userBCartRes.status === 200 && userBCartData.user.toString() === userBId.toString()
  );

  // 6. NOSQL INJECTION & MASS ASSIGNMENT
  console.log('\n--- 6. NoSQL Injection & Mass Assignment Hardening ---');

  // 6.1 NoSQL injection on login
  const nosqlLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: { $ne: null }, password: { $gt: '' } }),
  });
  record('NoSQL Injection on Login Rejected', nosqlLoginRes.status === 400, `Status ${nosqlLoginRes.status}`);

  // 6.2 NoSQL injection on register
  const nosqlRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: { $ne: null }, email: { $gt: '' }, password: 'Password123!' }),
  });
  record('NoSQL Injection on Registration Rejected', nosqlRegRes.status === 400, `Status ${nosqlRegRes.status}`);

  // 6.3 Mass assignment on profile update
  const massAssignRes = await fetch(`${BASE_URL}/api/users/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userBToken}`,
    },
    body: JSON.stringify({
      name: 'User B Updated',
      role: 'admin',
      roles: ['admin', 'superadmin'],
      password: 'HackedPassword123!',
      _id: '660000000000000000000099',
    }),
  });
  const massAssignData = await massAssignRes.json();
  const rolesEscalated =
    Array.isArray(massAssignData.roles) && massAssignData.roles.includes('admin');
  record(
    'Mass Assignment: Privilege escalation blocked on profile update',
    massAssignRes.status === 200 && !rolesEscalated,
    `Roles remain: ${JSON.stringify(massAssignData.roles)}`
  );

  // 7. RATE LIMITING ON UPLOAD (MEDIUM-02)
  console.log('\n--- 7. Upload Rate Limiting & Upload Security (MEDIUM-02) ---');

  // 7.1 Unauthorized upload blocked
  const unauthUploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
  });
  record('Upload: Unauthenticated request blocked', unauthUploadRes.status === 401, `Status ${unauthUploadRes.status}`);

  const customerUploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}` },
  });
  record('Upload: Non-admin request blocked', customerUploadRes.status === 403, `Status ${customerUploadRes.status}`);

  // 7.2 Rate limiting trigger: send requests until 429 is reached
  console.log('  Testing upload rate limiter threshold (limit: 30)...');
  let hit429 = false;
  let retryAfterHeader = null;
  let rateLimitLimit = null;

  for (let i = 1; i <= 35; i++) {
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (res.headers.get('ratelimit-limit')) {
      rateLimitLimit = res.headers.get('ratelimit-limit');
    }

    if (res.status === 429) {
      hit429 = true;
      retryAfterHeader = res.headers.get('retry-after');
      break;
    }
  }

  record(
    'MEDIUM-02: Rate limiter triggers HTTP 429 on excessive upload attempts',
    hit429,
    `429 returned. RateLimit-Limit: ${rateLimitLimit}, Retry-After: ${retryAfterHeader}`
  );

  // 8. ERROR LEAKAGE & INFORMATION DISCLOSURE
  console.log('\n--- 8. Error Leakage & Information Disclosure Tests ---');

  const errorRes = await fetch(`${BASE_URL}/api/categories/nonexistent_invalid_id`);
  const errorText = await errorRes.text();
  const leaksInternal =
    errorText.includes('node_modules') ||
    errorText.includes('mongodb://') ||
    errorText.includes('process.env') ||
    errorText.includes('stack');

  record('No stack trace or internal filesystem paths leaked', !leaksInternal, 'Clean error response verified');

  // CLEANUP USER B
  await fetch(`${BASE_URL}/api/users/${userBId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  console.log('\n======================================================');
  console.log(`Phase 2 Tests Complete: ${results.passed} PASSED, ${results.failed} FAILED`);
  console.log('======================================================');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error('\n❌ Unhandled test failure:', err);
  process.exit(1);
});
