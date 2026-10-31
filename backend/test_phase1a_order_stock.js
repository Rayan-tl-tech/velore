import crypto from 'crypto';
import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/productModel.js';
import Order from './models/orderModel.js';
import Category from './models/categoryModel.js';
import User from './models/userModel.js';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

// Strict Safety Guard 1: Must run exclusively in 'test' environment
if (process.env.NODE_ENV !== 'test') {
  console.error(`⛔ FATAL: Cannot run Phase 1A order/stock tests outside of test environment! Strictly requires NODE_ENV='test'. Current: '${process.env.NODE_ENV || 'undefined'}'.`);
  process.exit(1);
}

const BASE_URL = 'http://localhost:5000';
if (!BASE_URL.includes('localhost') && !BASE_URL.includes('127.0.0.1')) {
  console.error(`⛔ FATAL: Refusing to run tests against remote URL: ${BASE_URL}`);
  process.exit(1);
}

async function runPhase1ATests() {
  console.log('🛡️  Starting VÉLOR Phase 1A Order & Stock Management Test Suite...\n');

  // Strict Safety Guard 2: Verify backend API is actively running on 'velor_test'
  let healthData;
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    if (!healthRes.ok) {
      console.error(`⛔ SAFETY ABORT: Backend health check failed with HTTP ${healthRes.status}.`);
      process.exit(1);
    }
    healthData = await healthRes.json();
  } catch (err) {
    console.error(`⛔ SAFETY ABORT: Cannot connect to backend server at ${BASE_URL}/api/health (${err.message}). Ensure backend is started with NODE_ENV=test.`);
    process.exit(1);
  }

  const FORBIDDEN_DATABASES = ['velor', 'velor_dev', 'velor_prod', 'production', 'ecommerce'];
  if (healthData.env !== 'test' || healthData.database !== 'velor_test') {
    console.error(`⛔ CRITICAL SAFETY ABORT: Backend is running in env '${healthData.env}' on database '${healthData.database}'. Phase 1A tests are STRICTLY prohibited on databases other than 'velor_test'!`);
    process.exit(1);
  }
  if (FORBIDDEN_DATABASES.includes(healthData.database)) {
    console.error(`⛔ CRITICAL SAFETY ABORT: Forbidden target database detected: '${healthData.database}'. Immediate shutdown.`);
    process.exit(1);
  }
  console.log(`🔒 Isolation Verified: Backend confirmed running in test mode on database '${healthData.database}'.\n`);

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

  // Track created resources for guaranteed cleanup in finally
  const createdProductIds = [];
  const createdOrderIds = [];
  let adminToken = null;

  try {
    // Connect to DB directly for state verification (strictly velor_test)
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI, {
        dbName: 'velor_test',
      });
    }

    const directDb = mongoose.connection.name;
    if (directDb !== 'velor_test' || FORBIDDEN_DATABASES.includes(directDb)) {
      console.error(`⛔ CRITICAL SAFETY ABORT: Direct Mongoose connection targeted '${directDb}', expected 'velor_test'!`);
      process.exit(1);
    }

    // 1. Acquire Admin Token
    let adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test123@gmail.com', password: 'test123' }),
    });

    if (adminLoginRes.ok) {
      const loginData = await adminLoginRes.json();
      adminToken = loginData.accessToken || loginData.token;
    } else {
      // Ensure admin exists on velor_test
      let adminUser = await User.findOne({ email: 'test123@gmail.com' });
      if (!adminUser) {
        adminUser = await User.create({
          name: 'Test Admin',
          email: 'test123@gmail.com',
          password: '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAf2UNCK', // 'test123'
          roles: ['admin', 'user'],
        });
      } else if (!adminUser.roles.includes('admin')) {
        adminUser.roles.push('admin');
        await adminUser.save();
      }
      adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test123@gmail.com', password: 'test123' }),
      });
      const loginData = await adminLoginRes.json();
      adminToken = loginData.accessToken || loginData.token;
    }

    if (!adminToken) {
      throw new Error('Failed to acquire admin token for Phase 1A order/stock tests.');
    }

    // Ensure category exists for test products
    let testCategory = await Category.findOne();
    if (!testCategory) {
      testCategory = await Category.create({ name: `TestCat_${Date.now()}` });
    }

    console.log('--- TEST 1: Réactivation avec stock suffisant ---');
    // Setup Product 1 with initial stock = 10
    const prod1 = await Product.create({
      name: `P1_StockTest_${Date.now()}`,
      description: 'Test product for sufficient stock reactivation',
      price: 5000,
      stock: 10,
      category: testCategory._id,
      image: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800',
    });
    createdProductIds.push(prod1._id);

    // Create Order 1 with quantity 4
    const order1Res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        customerName: 'Test Client',
        customerPhone: '0550123456',
        wilaya: 'Alger',
        commune: 'Alger-Centre',
        shippingAddress: '10 Rue Didouche Mourad',
        deliveryMethod: 'home',
        items: [{ productId: prod1._id.toString(), quantity: 4, size: 'M' }],
      }),
    });
    const order1Data = await order1Res.json();
    const order1Id = order1Data.order?._id || order1Data._id;
    createdOrderIds.push(order1Id);

    // Verify stock decremented to 6
    let prod1Db = await Product.findById(prod1._id);
    assert(prod1Db.stock === 6, `Order creation decremented stock from 10 to 6 (actual: ${prod1Db.stock})`);

    // Cancel Order 1
    const cancel1Res = await fetch(`${BASE_URL}/api/orders/${order1Id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    assert(cancel1Res.ok, `Cancel Order 1 returned HTTP ${cancel1Res.status}`);

    // Verify stock restored to 10
    prod1Db = await Product.findById(prod1._id);
    assert(prod1Db.stock === 10, `Order cancellation restored stock to 10 (actual: ${prod1Db.stock})`);

    // Reactivate Order 1 to 'processing' (Stock = 10, required = 4 -> sufficient)
    const reactivate1Res = await fetch(`${BASE_URL}/api/orders/${order1Id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'processing' }),
    });
    const reactivate1Data = await reactivate1Res.json();
    assert(reactivate1Res.status === 200, `Reactivation with sufficient stock returned HTTP 200 (status: ${reactivate1Res.status})`);
    assert(reactivate1Data.status === 'processing', `Order 1 status transitioned to 'processing'`);

    // Verify stock decremented to 6
    prod1Db = await Product.findById(prod1._id);
    assert(prod1Db.stock === 6, `Reactivation successfully decremented stock to 6 (actual: ${prod1Db.stock})`);

    console.log('\n--- TEST 2: Réactivation avec stock insuffisant ---');
    // Cancel Order 1 again -> stock restored to 10
    await fetch(`${BASE_URL}/api/orders/${order1Id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    prod1Db = await Product.findById(prod1._id);
    assert(prod1Db.stock === 10, `Order 1 cancelled again: stock restored to 10`);

    // Now artificially reduce stock of Product 1 to 2 (Order 1 needs 4 units)
    await Product.findByIdAndUpdate(prod1._id, { stock: 2 });
    prod1Db = await Product.findById(prod1._id);
    assert(prod1Db.stock === 2, `Product 1 stock artificially reduced to 2 (Order requires 4)`);

    // Attempt to reactivate Order 1 -> Must fail with 400
    const failReactivateRes = await fetch(`${BASE_URL}/api/orders/${order1Id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'processing' }),
    });
    const failReactivateData = await failReactivateRes.json();
    assert(failReactivateRes.status === 400, `Reactivation with insufficient stock rejected with HTTP 400 (actual: ${failReactivateRes.status})`);
    assert(
      failReactivateData.error && failReactivateData.error.includes('insufficient stock'),
      `Error message correctly identifies insufficient stock ("${failReactivateData.error}")`
    );

    // Verify stock remains exactly 2 (never negative!)
    prod1Db = await Product.findById(prod1._id);
    assert(prod1Db.stock === 2, `Product 1 stock remained unchanged at 2 (never negative, actual: ${prod1Db.stock})`);

    // Verify Order 1 status remained 'cancelled'
    const order1Db = await Order.findById(order1Id);
    assert(order1Db.status === 'cancelled', `Order 1 status remained strictly 'cancelled' (actual: ${order1Db.status})`);

    console.log('\n--- TEST 3: Annulation déjà effectuée (Idempotence séquentielle) ---');
    // Order 1 is already 'cancelled', stock is 2
    const secondCancelRes = await fetch(`${BASE_URL}/api/orders/${order1Id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    assert(secondCancelRes.status === 200, `Second cancellation request returned HTTP 200`);

    // Verify stock was NOT restored a second time
    prod1Db = await Product.findById(prod1._id);
    assert(prod1Db.stock === 2, `Stock NOT restored a second time: remains exactly 2 (actual: ${prod1Db.stock})`);

    console.log('\n--- TEST 4: Deux annulations concurrentes (Promise.all) ---');
    // Setup Product 2 with initial stock = 10
    const prod2 = await Product.create({
      name: `P2_ConcurrentCancel_${Date.now()}`,
      description: 'Test product for concurrent cancel idempotence',
      price: 3000,
      stock: 10,
      category: testCategory._id,
      image: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800',
    });
    createdProductIds.push(prod2._id);

    // Place Order 2 with quantity 3 -> Stock becomes 7
    const order2Res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        customerName: 'Concurrent Tester',
        customerPhone: '0660123456',
        wilaya: 'Oran',
        commune: 'Oran',
        shippingAddress: '5 Boulevard de la Soummam',
        items: [{ productId: prod2._id.toString(), quantity: 3, size: 'L' }],
      }),
    });
    const order2Data = await order2Res.json();
    const order2Id = order2Data.order?._id || order2Data._id;
    createdOrderIds.push(order2Id);

    let prod2Db = await Product.findById(prod2._id);
    assert(prod2Db.stock === 7, `Order 2 created: Product 2 stock is 7 (actual: ${prod2Db.stock})`);

    // Fire TWO concurrent cancellation requests simultaneously
    const [cancelReqA, cancelReqB] = await Promise.all([
      fetch(`${BASE_URL}/api/orders/${order2Id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'cancelled' }),
      }),
      fetch(`${BASE_URL}/api/orders/${order2Id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'cancelled' }),
      }),
    ]);

    assert(cancelReqA.status === 200 && cancelReqB.status === 200, `Both concurrent cancel requests completed with HTTP 200`);

    // Verify stock is restored EXACTLY ONCE (+3 -> 10) and NOT TWICE (+6 -> 13)
    prod2Db = await Product.findById(prod2._id);
    assert(
      prod2Db.stock === 10,
      `Concurrent cancel idempotence verified: Stock restored exactly once to 10, not 13 (actual: ${prod2Db.stock})`
    );

    const order2Db = await Order.findById(order2Id);
    assert(order2Db.status === 'cancelled', `Order 2 status is 'cancelled'`);

    console.log('\n--- TEST 5: Réactivation multi-produits avec échec partiel ---');
    // Setup Product X (stock: 10) and Product Y (stock: 5)
    const prodX = await Product.create({
      name: `PX_Multi_${Date.now()}`,
      price: 2000,
      stock: 10,
      category: testCategory._id,
      image: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800',
    });
    const prodY = await Product.create({
      name: `PY_Multi_${Date.now()}`,
      price: 4000,
      stock: 5,
      category: testCategory._id,
      image: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800',
    });
    createdProductIds.push(prodX._id, prodY._id);

    // Create Order 3 with Product X (qty: 3) and Product Y (qty: 2)
    const order3Res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        customerName: 'Multi Item Client',
        customerPhone: '0770123456',
        wilaya: 'Constantine',
        commune: 'Constantine',
        shippingAddress: 'Zone Industrielle',
        items: [
          { productId: prodX._id.toString(), quantity: 3, size: 'M' },
          { productId: prodY._id.toString(), quantity: 2, size: 'M' },
        ],
      }),
    });
    const order3Data = await order3Res.json();
    const order3Id = order3Data.order?._id || order3Data._id;
    createdOrderIds.push(order3Id);

    // Cancel Order 3 -> Stock restored to PX: 10, PY: 5
    await fetch(`${BASE_URL}/api/orders/${order3Id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'cancelled' }),
    });

    let prodXDb = await Product.findById(prodX._id);
    let prodYDb = await Product.findById(prodY._id);
    assert(prodXDb.stock === 10 && prodYDb.stock === 5, `Order 3 cancelled: PX stock = 10, PY stock = 5`);

    // Now artificially deplete Product Y stock to 0 (Product X has 10 >= 3, but Product Y has 0 < 2)
    await Product.findByIdAndUpdate(prodY._id, { stock: 0 });

    // Attempt to reactivate Order 3 to 'processing'
    const multiReactivateFailRes = await fetch(`${BASE_URL}/api/orders/${order3Id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'processing' }),
    });
    const multiReactivateFailData = await multiReactivateFailRes.json();
    assert(multiReactivateFailRes.status === 400, `Multi-product reactivation failed with HTTP 400 (actual: ${multiReactivateFailRes.status})`);
    assert(
      multiReactivateFailData.error && multiReactivateFailData.error.includes(prodY.name),
      `Error mentions failing product name ("${multiReactivateFailData.error}")`
    );

    // Crucial check: Product X was decremented first during iteration, but MUST have been compensated back to 10!
    prodXDb = await Product.findById(prodX._id);
    assert(
      prodXDb.stock === 10,
      `Multi-product compensation rollback verified: Product X stock restored to 10 (not leaked at 7, actual: ${prodXDb.stock})`
    );

    // Verify Product Y stock remains 0
    prodYDb = await Product.findById(prodY._id);
    assert(prodYDb.stock === 0, `Product Y stock remains 0 (actual: ${prodYDb.stock})`);

    // Verify Order 3 remains 'cancelled'
    const order3Db = await Order.findById(order3Id);
    assert(order3Db.status === 'cancelled', `Order 3 status remained strictly 'cancelled' (actual: ${order3Db.status})`);

  } catch (err) {
    console.error('❌ Exception during Phase 1A tests:', err);
    failed++;
  } finally {
    console.log('\n--- Cleanup Phase on velor_test ---');
    for (const ordId of createdOrderIds) {
      await Order.findByIdAndDelete(ordId).catch(() => {});
    }
    for (const pId of createdProductIds) {
      await Product.findByIdAndDelete(pId).catch(() => {});
    }
    console.log(`  Purged ${createdOrderIds.length} test order(s) and ${createdProductIds.length} test product(s).`);

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }

    console.log(`\n========================================`);
    console.log(`Phase 1A Tests Summary: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runPhase1ATests();
