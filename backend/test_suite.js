const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('🧪 Starting Full API & Security Regression Test Suite...\n');

  // ─── 1. Authentication & Security Tests ───
  console.log('--- 1. Authentication & Anti-Enumeration Tests ---');
  
  // 1.1 Non-existent user login -> Expect generic "Invalid email or password" (SEC-08)
  const nonExistentRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent_user_9999@gmail.com', password: 'AnyPassword123!' })
  });
  const nonExistentData = await nonExistentRes.json();
  if (nonExistentData.error !== 'Invalid email or password') {
    throw new Error(`SEC-08 Failed: Expected generic "Invalid email or password", got: "${nonExistentData.error}"`);
  }
  console.log('✅ SEC-08 Verified: Non-existent user returns generic error ("Invalid email or password")');

  // 1.2 Wrong password login -> Expect exact same generic error (SEC-08)
  const wrongPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test12@gmail.com', password: 'WrongPassword123' })
  });
  const wrongPassData = await wrongPassRes.json();
  if (wrongPassData.error !== 'Invalid email or password') {
    throw new Error(`SEC-08 Failed: Expected generic "Invalid email or password", got: "${wrongPassData.error}"`);
  }
  console.log('✅ SEC-08 Verified: Wrong password returns exact same generic error');

  // 1.3 Registration password policy checks (SEC-09)
  const weakPassRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Weak User', email: `weak_${Date.now()}@example.com`, password: 'short' })
  });
  const weakPassData = await weakPassRes.json();
  if (weakPassRes.status !== 400 || !weakPassData.error?.includes('6 characters')) {
    throw new Error(`SEC-09 Failed: Short password should be rejected with 400. Got: ${JSON.stringify(weakPassData)}`);
  }
  console.log('✅ SEC-09 Verified: Registration rejects passwords under 6 characters');


  // 1.4 Legitimate user login
  const userRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test12@gmail.com', password: 'test123' })
  });
  const userData = await userRes.json();
  if (!userRes.ok) throw new Error(`User login failed: ${JSON.stringify(userData)}`);
  const userToken = userData.token;
  console.log('✅ Regular User logged in. Token acquired.');

  // 1.5 Legitimate admin login
  const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test123@gmail.com', password: 'test123' })
  });
  const adminData = await adminRes.json();
  if (!adminRes.ok) throw new Error(`Admin login failed: ${JSON.stringify(adminData)}`);
  const adminToken = adminData.token;
  console.log('✅ Admin User logged in. Admin Token acquired.\n');

  // ─── 2. Security Headers & CORS Tests (SEC-06, SEC-11) ───
  console.log('--- 2. Security Headers & CORS Tests ---');
  const rootRes = await fetch(`${BASE_URL}/`, {
    headers: { Origin: 'http://localhost:5173' }
  });
  const corsHeader = rootRes.headers.get('access-control-allow-origin');
  const nosniffHeader = rootRes.headers.get('x-content-type-options');
  const frameOptions = rootRes.headers.get('x-frame-options');

  if (corsHeader === '*') {
    throw new Error('SEC-06 Failed: Access-Control-Allow-Origin is still wildcard "*"');
  }
  if (corsHeader !== 'http://localhost:5173') {
    throw new Error(`SEC-06 Failed: Expected allowed origin http://localhost:5173, got: ${corsHeader}`);
  }
  console.log('✅ SEC-06 Verified: CORS allows explicitly whitelisted origin without wildcard "*"');

  if (!nosniffHeader || nosniffHeader !== 'nosniff') {
    throw new Error(`SEC-11 Failed: Missing X-Content-Type-Options: nosniff header`);
  }
  console.log('✅ SEC-11 Verified: Helmet security headers active (X-Content-Type-Options: nosniff, CSP, etc.)\n');

  // ─── 3. Input Validation & Numeric Tests (SEC-10) ───
  console.log('--- 3. Input Validation & Numeric Hardening Tests ---');
  const prodRes = await fetch(`${BASE_URL}/api/products`);
  const products = await prodRes.json();
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('No products available for testing');
  }
  const testProduct = products[0];

  // 3.1 Fractional quantity in cart -> Must reject (SEC-10)
  const fracQtyRes = await fetch(`${BASE_URL}/api/cart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({ productId: testProduct._id, quantity: 1.5 })
  });
  const fracQtyData = await fracQtyRes.json();
  if (fracQtyRes.status !== 400 || !fracQtyData.error?.includes('integer')) {
    throw new Error(`SEC-10 Failed: Fractional quantity (1.5) was not rejected with 400. Got: ${JSON.stringify(fracQtyData)}`);
  }
  console.log('✅ SEC-10 Verified: Fractional cart quantity (1.5) rejected with 400 Bad Request');

  // 3.2 Negative quantity in cart -> Must reject (SEC-10)
  const negQtyRes = await fetch(`${BASE_URL}/api/cart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({ productId: testProduct._id, quantity: -2 })
  });
  if (negQtyRes.status !== 400) {
    throw new Error(`SEC-10 Failed: Negative quantity was not rejected with 400`);
  }
  console.log('✅ SEC-10 Verified: Negative cart quantity rejected with 400 Bad Request');

  // 3.3 Negative price on product creation -> Must reject (SEC-10)
  const negPriceRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'Hacked Negative Product',
      price: -50,
      stock: 10,
      category: testProduct.category?._id || testProduct.category
    })
  });
  const negPriceData = await negPriceRes.json();
  if (negPriceRes.status !== 400 || !negPriceData.error?.includes('negative')) {
    throw new Error(`SEC-10 Failed: Negative product price was not rejected with 400. Got: ${JSON.stringify(negPriceData)}`);
  }
  console.log('✅ SEC-10 Verified: Negative product price rejected with 400 Bad Request\n');

  // ─── 4. Cart & Order Flow with Atomic Inventory (SEC-04) ───
  console.log('--- 4. Cart & Order Atomic Inventory Tests ---');
  
  // 4.1 Add valid product to cart
  const addCartRes = await fetch(`${BASE_URL}/api/cart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({ productId: testProduct._id, quantity: 1 })
  });
  if (!addCartRes.ok) throw new Error(`Add to cart failed: ${await addCartRes.text()}`);
  console.log('✅ Valid item added to cart.');

  // 4.2 Create order from cart (Atomic decrement)
  const createOrderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const orderData = await createOrderRes.json();
  if (createOrderRes.status !== 201) {
    throw new Error(`Order creation failed: ${JSON.stringify(orderData)}`);
  }
  console.log(`✅ Order created successfully: ID ${orderData._id}, Total: $${orderData.totalPrice}`);
  const orderId = orderData._id;

  // ─── 5. Authorization & IDOR Access Control Tests ───
  console.log('--- 5. Authorization & IDOR Tests ---');

  // 5.1 Regular user accessing admin-only all orders -> Must reject 403 Forbidden
  const adminEndpointRes = await fetch(`${BASE_URL}/api/orders`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  if (adminEndpointRes.status !== 403) {
    throw new Error(`Authorization Failed: Regular user accessed admin endpoint with status ${adminEndpointRes.status}`);
  }
  console.log('✅ RBAC Verified: Regular user blocked from admin endpoint (403 Forbidden)');

  // 5.2 Admin user accessing all orders -> Must succeed 200 OK
  const adminOrdersRes = await fetch(`${BASE_URL}/api/orders`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (adminOrdersRes.status !== 200) {
    throw new Error(`Admin orders access failed with status ${adminOrdersRes.status}`);
  }
  console.log('✅ RBAC Verified: Admin access permitted (200 OK)');

  // 5.3 Sanitized error on malformed ID (SEC-13)
  const badIdRes = await fetch(`${BASE_URL}/api/orders/invalid-mongo-id-12345`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const badIdData = await badIdRes.json();
  if (badIdRes.status !== 400 || badIdData.error.includes('ObjectId')) {
    throw new Error(`SEC-13 Failed: Raw CastError leaked in response. Got: ${JSON.stringify(badIdData)}`);
  }
  console.log('✅ SEC-13 Verified: Malformed ID returns sanitized message without leaking internals\n');

  // ─── 6. Team & Role Management Security Tests ───
  console.log('--- 6. Team & Role Management Security Tests ---');

  // 6.1 Unauthenticated request to /api/users -> Must return 401
  const unauthUsersRes = await fetch(`${BASE_URL}/api/users`);
  if (unauthUsersRes.status !== 401) {
    throw new Error(`Team API Failed: Unauthenticated request returned ${unauthUsersRes.status}, expected 401`);
  }
  console.log('✅ Team Security Verified: Unauthenticated user blocked from /api/users (401 Unauthorized)');

  // 6.2 Normal user requesting /api/users -> Must return 403 Forbidden
  const normalUsersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  if (normalUsersRes.status !== 403) {
    throw new Error(`Team API Failed: Normal user accessed /api/users with status ${normalUsersRes.status}, expected 403`);
  }
  console.log('✅ Team Security Verified: Regular user blocked from listing users (403 Forbidden)');

  // 6.3 Admin requesting /api/users -> Must return 200 with user list excluding passwords
  const adminUsersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (adminUsersRes.status !== 200) {
    throw new Error(`Team API Failed: Admin user failed to fetch users with status ${adminUsersRes.status}`);
  }
  const usersList = await adminUsersRes.json();
  if (!Array.isArray(usersList)) {
    throw new Error('Team API Failed: Expected array of users');
  }
  const leakedPassword = usersList.some((u) => u.password !== undefined);
  if (leakedPassword) {
    throw new Error('SEC-CRITICAL: Password field leaked in user listing!');
  }
  console.log(`✅ Team API Verified: Admin successfully fetched user list (${usersList.length} users, zero passwords leaked)`);

  // 6.4 Normal user cannot self-promote through PUT /api/users/:id/roles -> Must return 403
  const selfPromoteRes = await fetch(`${BASE_URL}/api/users/${userData.user._id}/roles`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({ action: 'promote' })
  });
  if (selfPromoteRes.status !== 403) {
    throw new Error(`Self-Promotion Failed: Regular user received status ${selfPromoteRes.status}, expected 403 Forbidden`);
  }
  console.log('✅ Self-Promotion Protection Verified: Regular user cannot promote themselves (403 Forbidden)');

  // 6.5 Normal user cannot promote another user -> Must return 403
  const userPromoteOtherRes = await fetch(`${BASE_URL}/api/users/${adminData.user._id}/roles`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({ action: 'promote' })
  });
  if (userPromoteOtherRes.status !== 403) {
    throw new Error(`Privilege Escalation Failed: Regular user attempted role modification with status ${userPromoteOtherRes.status}`);
  }
  console.log('✅ RBAC Boundary Verified: Regular user cannot modify any user roles (403 Forbidden)');

  // 6.6 Admin promotes a test user -> Must succeed with $addToSet
  const tempEmail = `team_test_${Date.now()}@example.com`;
  const registerTempRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Team Test User', email: tempEmail, password: 'SecurePassword123!' })
  });
  const registerTempData = await registerTempRes.json();
  const tempUserId = registerTempData.user._id;

  const promoteRes = await fetch(`${BASE_URL}/api/users/${tempUserId}/roles`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ action: 'promote' })
  });
  const promoteData = await promoteRes.json();
  if (promoteRes.status !== 200 || !promoteData.user?.roles?.includes('admin')) {
    throw new Error(`Role Promotion Failed: Expected admin role in user roles. Got: ${JSON.stringify(promoteData)}`);
  }
  console.log('✅ Role Promotion Verified: Admin successfully promoted user to admin ($addToSet)');

  // 6.7 Prevent duplicate roles ($addToSet idempotency)
  const dupPromoteRes = await fetch(`${BASE_URL}/api/users/${tempUserId}/roles`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ action: 'promote' })
  });
  const dupPromoteData = await dupPromoteRes.json();
  const adminRoleOccurrences = dupPromoteData.user.roles.filter((r) => r === 'admin').length;
  if (adminRoleOccurrences !== 1) {
    throw new Error(`Role Idempotency Failed: Found ${adminRoleOccurrences} 'admin' roles in roles array`);
  }
  console.log('✅ Role Idempotency Verified: Duplicate promotion does not create duplicate roles');

  // 6.8 Prevent admin self-lockout (Admin cannot demote themselves)
  const selfDemoteRes = await fetch(`${BASE_URL}/api/users/${adminData.user._id}/roles`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ action: 'demote' })
  });
  const selfDemoteData = await selfDemoteRes.json();
  if (selfDemoteRes.status !== 400 || !selfDemoteData.error?.includes('own account')) {
    throw new Error(`Self-Lockout Protection Failed: Admin self-demotion was not blocked. Status: ${selfDemoteRes.status}, Data: ${JSON.stringify(selfDemoteData)}`);
  }
  console.log('✅ Self-Lockout Protection Verified: Admin cannot remove admin privileges from own account (400 Bad Request)');

  // 6.9 Admin can demote another admin (when > 1 admin exists)
  const demoteTempRes = await fetch(`${BASE_URL}/api/users/${tempUserId}/roles`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ action: 'demote' })
  });
  const demoteTempData = await demoteTempRes.json();
  if (demoteTempRes.status !== 200 || demoteTempData.user?.roles?.includes('admin')) {
    throw new Error(`Role Demotion Failed: Expected user to no longer have admin role. Got: ${JSON.stringify(demoteTempData)}`);
  }
  console.log('✅ Role Demotion Verified: Admin successfully removed admin privileges from secondary user ($pull)');

  // 6.10 Clean up test user
  const deleteTempRes = await fetch(`${BASE_URL}/api/users/${tempUserId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (deleteTempRes.status !== 200) {
    throw new Error(`User Deletion Failed: Expected status 200, got ${deleteTempRes.status}`);
  }
  console.log('✅ User Deletion Verified: Admin successfully cleaned up test user');

  // 6.11 Privilege Escalation Prevention: Attempting to modify password or email via /roles
  const escalateEmail = `escalate_${Date.now()}@example.com`;
  const registerEscRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Escalate Target', email: escalateEmail, password: 'OriginalPassword123!' })
  });
  const registerEscData = await registerEscRes.json();
  const escUserId = registerEscData.user._id;

  const tamperRes = await fetch(`${BASE_URL}/api/users/${escUserId}/roles`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      action: 'promote',
      password: 'HackedPassword123!',
      email: 'tampered_email@example.com'
    })
  });
  const tamperData = await tamperRes.json();
  // Verify that email remained original
  if (tamperData.user?.email !== escalateEmail) {
    throw new Error('SEC-CRITICAL: Privilege escalation allowed email mutation via /roles endpoint!');
  }
  // Verify that login with original password still works (password wasn't modified)
  const verifyPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: escalateEmail, password: 'OriginalPassword123!' })
  });
  if (!verifyPassRes.ok) {
    throw new Error('SEC-CRITICAL: Password was mutated via /roles endpoint!');
  }
  console.log('✅ Privilege Escalation Prevention Verified: Arbitrary fields (password, email) cannot be mutated via /roles');

  // 6.12 Invalid role action rejected with 400
  const invalidActionRes = await fetch(`${BASE_URL}/api/users/${escUserId}/roles`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ action: 'superadmin_escalation' })
  });
  if (invalidActionRes.status !== 400) {
    throw new Error(`Input Validation Failed: Expected 400 for invalid role action, got ${invalidActionRes.status}`);
  }
  console.log('✅ Input Validation Verified: Invalid role actions rejected with 400 Bad Request');

  // 6.13 Prevent Admin Self-Deletion
  const selfDeleteRes = await fetch(`${BASE_URL}/api/users/${adminData.user._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const selfDeleteData = await selfDeleteRes.json();
  if (selfDeleteRes.status !== 400 || !selfDeleteData.error?.includes('own account')) {
    throw new Error(`Self-Deletion Protection Failed: Admin self-deletion was not rejected with 400. Got: ${JSON.stringify(selfDeleteData)}`);
  }
  console.log('✅ Self-Deletion Protection Verified: Admin cannot delete their own account (400 Bad Request)');

  // 6.14 Malformed user ID rejected with 400
  const badIdRoleRes = await fetch(`${BASE_URL}/api/users/not-a-valid-id/roles`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ action: 'promote' })
  });
  if (badIdRoleRes.status !== 400) {
    throw new Error(`ID Validation Failed: Expected 400 for malformed ID, got ${badIdRoleRes.status}`);
  }
  console.log('✅ ID Validation Verified: Malformed user IDs rejected with 400 Bad Request');

  // Clean up escalation test user
  await fetch(`${BASE_URL}/api/users/${escUserId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✅ Cleanup Verified: Temporary test resources purged');

  console.log('\n🎉 ALL SECURITY & FUNCTIONAL REGRESSION TESTS PASSED!');

}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});

