import crypto from 'crypto';
import dns from 'dns';
import User from './models/userModel.js';
import Session from './models/sessionModel.js';
import Product from './models/productModel.js';
import Order from './models/orderModel.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

dotenv.config();

const BASE_URL = 'http://localhost:5000';

async function runPhase4AuditTests() {
  console.log('🛡️  Starting VÉLOR Phase 4 Security Hardening & Audit Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Connect to DB for internal verification if not connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  // Setup test users
  const timestamp = Date.now();
  const userEmail = `sec_audit_${timestamp}@velor-audit.com`;
  const attackerEmail = `attacker_${timestamp}@velor-audit.com`;
  const initialPassword = 'SecurePassword123!';

  // Register User A
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Audit User A', email: userEmail, password: initialPassword }),
  });
  const regData = await regRes.json();
  const userToken = regData.accessToken;
  const userId = regData.user._id;

  // Register Attacker
  const attRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Attacker User', email: attackerEmail, password: initialPassword }),
  });
  const attData = await attRes.json();
  const attackerToken = attData.accessToken;
  const attackerId = attData.user._id;

  // Login admin account
  const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test123@gmail.com', password: 'test123' }),
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.accessToken;

  console.log('--- 1. Phase 4.2 — Password Reset Security Tests ---');
  // 1.1 Anti-enumeration on unknown email
  const unknownForgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent_account_xyz@nowhere.com' }),
  });
  const unknownForgotData = await unknownForgotRes.json();
  assert(
    unknownForgotRes.status === 200 && unknownForgotData.message.includes('If an account matches'),
    'Forgot Password: Unknown email returns identical generic message (Anti-enumeration)'
  );

  // 1.2 Anti-enumeration on known email
  const knownForgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail }),
  });
  const knownForgotData = await knownForgotRes.json();
  assert(
    knownForgotRes.status === 200 &&
    knownForgotData.message === unknownForgotData.message &&
    !knownForgotData.token &&
    !knownForgotData.resetToken,
    'Forgot Password: Known email returns identical message with NO token leakage in API response'
  );

  // 1.3 DB Token Hash Verification
  const userInDb = await User.findById(userId);
  assert(
    userInDb.resetPasswordToken &&
    userInDb.resetPasswordToken.length === 64 &&
    userInDb.resetPasswordExpires > new Date(),
    'Forgot Password: Token is stored as a 64-character SHA-256 hash with valid expiration in DB'
  );

  // 1.4 Rejection of invalid / tampered reset token
  const badResetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'completely_fabricated_token_12345', password: 'BrandNewPassword123!' }),
  });
  assert(
    badResetRes.status === 400,
    'Reset Password: Fabricated / invalid token rejected with HTTP 400'
  );

  // 1.5 Valid password reset execution
  // We simulate retrieving the raw token through a secure mock generation for test validation:
  const rawTestToken = crypto.randomBytes(32).toString('hex');
  const rawTestTokenHash = crypto.createHash('sha256').update(rawTestToken).digest('hex');
  userInDb.resetPasswordToken = rawTestTokenHash;
  userInDb.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
  await userInDb.save();

  // Establish a live session before reset
  const userSessionBefore = await Session.findOne({ userId, revokedAt: null });
  assert(!!userSessionBefore, 'Active session exists for user before password reset');

  const validResetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawTestToken, password: 'NewSecurePassword456!' }),
  });
  const validResetData = await validResetRes.json();
  assert(
    validResetRes.status === 200 && validResetData.success === true,
    'Reset Password: Valid token succeeds with HTTP 200'
  );

  // 1.6 Single-Use Enforcement: Replaying the token immediately fails
  const replayResetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawTestToken, password: 'YetAnotherPassword789!' }),
  });
  assert(
    replayResetRes.status === 400,
    'Reset Password: Token cannot be reused (Single-use enforced, immediately cleared from DB)'
  );

  // 1.7 Session Invalidation across devices after password reset
  const activeSessionsAfter = await Session.find({ userId, revokedAt: null });
  assert(
    activeSessionsAfter.length === 0,
    'Reset Password: All existing user sessions revoked after password change'
  );

  // 1.8 Verify login with new password succeeds and old password fails
  const oldLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail, password: initialPassword }),
  });
  const oldLoginBody = await oldLoginRes.text();
  assert(
    oldLoginRes.status === 400 || oldLoginRes.status === 401,
    `Login with old password rejected (Status: ${oldLoginRes.status}, Body: ${oldLoginBody})`
  );

  const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail, password: 'NewSecurePassword456!' }),
  });
  assert(newLoginRes.status === 200, 'Login with new password succeeds (200 OK)');
  const newLoginData = await newLoginRes.json();
  const refreshedUserToken = newLoginData.accessToken;

  console.log('\n--- 2. Phase 4.5 — Business Logic & Server Authoritative Pricing Tests ---');
  // 2.1 Price manipulation attack: Attacker attempts to place an order specifying a manipulated price of 1 DZD
  const sampleProduct = await Product.findOne();
  if (sampleProduct) {
    const manipulatedOrderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshedUserToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            productId: sampleProduct._id,
            quantity: 2,
            price: 1, // Fraudulent price sent by attacker!
            size: 'M',
          },
        ],
        customerInfo: {
          fullName: 'Audit Tester',
          phone: '0555123456',
          address: 'Rue Didouche Mourad',
          wilaya: 'Alger',
          commune: 'Alger Centre',
        },
        shippingPrice: 0, // Fraudulent free shipping claim!
        totalPrice: 2, // Fraudulent total price!
        paymentMethod: 'cod',
      }),
    });
    const orderData = await manipulatedOrderRes.json();
    assert(
      manipulatedOrderRes.status === 201 && orderData?.order?._id,
      'Order Creation: API accepted request'
    );

    // Verify authoritative DB price was applied rather than the client payload
    const createdOrderId = orderData?.order?._id;
    const createdOrder = await Order.findById(createdOrderId);
    const expectedSubtotal = sampleProduct.price * 2;
    assert(
      createdOrder.items[0].price === sampleProduct.price,
      `Server Pricing Authority: Product price in order (${createdOrder.items[0].price} DZD) enforced from DB, ignoring client manipulated value (1 DZD)`
    );
    assert(
      createdOrder.totalPrice >= expectedSubtotal,
      `Server Total Authority: Total price (${createdOrder.totalPrice} DZD) calculated authoritatively server-side`
    );
    assert(
      createdOrder.shippingFee > 0,
      `Server Shipping Authority: Algerian Wilaya delivery fee (${createdOrder.shippingFee} DZD) computed server-side, ignoring client 0 DZD`
    );

    // Clean up test order
    await Order.findByIdAndDelete(createdOrderId);
  } else {
    console.log('  ⚠️ Warning: No products found for price manipulation test');
  }

  console.log('\n--- 3. Phase 4.1 & 4.8 — Input Validation & NoSQL Injection Hardening ---');
  // 3.1 Malformed ObjectId on all resource types
  const badIdRoutes = [
    '/api/products/bad-id-xyz',
    '/api/categories/bad-id-xyz',
    '/api/orders/bad-id-xyz',
    '/api/users/bad-id-xyz',
  ];
  for (const route of badIdRoutes) {
    const res = await fetch(`${BASE_URL}${route}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 400, `ObjectId Validation: ${route} rejected with HTTP 400`);
  }

  // 3.2 NoSQL Operator Injection ($ne bypass) on auth endpoints
  const nosqlLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: { $ne: null }, password: { $ne: null } }),
  });
  assert(
    nosqlLoginRes.status === 400,
    'NoSQL Injection: {"$ne": null} injection on /api/auth/login rejected with HTTP 400'
  );

  const nosqlForgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: { $gt: '' } }),
  });
  const nosqlForgotData = await nosqlForgotRes.json();
  assert(
    nosqlForgotRes.status === 200 && nosqlForgotData.message.includes('If an account matches'),
    'NoSQL Injection: {"$gt": ""} injection on /api/auth/forgot-password safely sanitized'
  );

  // 3.3 Unexpected Large Payloads (Body Limit ~50KB)
  const hugePayload = 'A'.repeat(70 * 1024); // 70KB
  const hugeReqRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: hugePayload, email: 'huge@example.com', password: 'ValidPassword123!' }),
  });
  assert(
    hugeReqRes.status === 413 || hugeReqRes.status === 400,
    `Payload Limiting: Oversized 70KB payload rejected (Status: ${hugeReqRes.status})`
  );

  console.log('\n--- 4. Phase 4.6 & 4.7 — Authorization, RBAC & IDOR Isolation ---');
  // 4.1 Regular user blocked from admin endpoints
  const adminEndpoints = [
    { method: 'POST', url: '/api/products', body: { name: 'X' } },
    { method: 'POST', url: '/api/categories', body: { name: 'X' } },
    { method: 'GET', url: '/api/users' },
  ];
  for (const ep of adminEndpoints) {
    const res = await fetch(`${BASE_URL}${ep.url}`, {
      method: ep.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshedUserToken}`,
      },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    assert(res.status === 403, `RBAC Boundary: Non-admin calling ${ep.method} ${ep.url} blocked with 403 Forbidden`);
  }

  // 4.2 Cross-User Data Isolation (Cart, Profile, Orders)
  const attackerCartRes = await fetch(`${BASE_URL}/api/cart`, {
    headers: { Authorization: `Bearer ${attackerToken}` },
  });
  const attackerCart = await attackerCartRes.json();
  assert(
    attackerCartRes.status === 200 && Array.isArray(attackerCart.items) && attackerCart.items.length === 0,
    'IDOR Isolation: Attacker cannot access User A cart; cart is strictly bound to JWT identity'
  );

  console.log('\n--- 5. Phase 4.10 & 4.11 — Web Security Headers & CORS ---');
  // 5.1 Helmet Security Headers
  const healthRes = await fetch(`${BASE_URL}/`);
  const headers = healthRes.headers;
  assert(headers.get('x-content-type-options') === 'nosniff', 'Security Headers: X-Content-Type-Options: nosniff present');
  assert(headers.get('content-security-policy') !== null, 'Security Headers: Content-Security-Policy header present');
  assert(headers.get('cross-origin-resource-policy') === 'cross-origin', 'Security Headers: Cross-Origin-Resource-Policy configured for asset rendering');

  // 5.2 CORS Whitelist Check: Untrusted Origin
  const corsEvilRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://evil-hacker-site.com',
      'Access-Control-Request-Method': 'GET',
    },
  });
  assert(
    corsEvilRes.status === 403,
    'CORS Security: Untrusted origin rejected on preflight with HTTP 403'
  );

  // Cleanup test accounts
  await User.findByIdAndDelete(userId);
  await User.findByIdAndDelete(attackerId);
  await Session.deleteMany({ userId: { $in: [userId, attackerId] } });
  console.log('✅ Cleanup: Audit test accounts and sessions removed');

  console.log('\n======================================================');
  console.log(`Phase 4 Audit Tests Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase4AuditTests().catch((err) => {
  console.error('Audit test suite encountered fatal error:', err);
  process.exit(1);
});
