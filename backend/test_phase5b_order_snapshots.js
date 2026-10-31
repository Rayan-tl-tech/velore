import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from './models/productModel.js';
import Order from './models/orderModel.js';
import Category from './models/categoryModel.js';
import User from './models/userModel.js';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

// Strict Safety Guard 1: Must run exclusively in 'test' environment
if (process.env.NODE_ENV !== 'test') {
  console.error(`⛔ FATAL: Cannot run Phase 5B snapshot tests outside of test environment! Strictly requires NODE_ENV='test'. Current: '${process.env.NODE_ENV || 'undefined'}'.`);
  process.exit(1);
}

const BASE_URL = 'http://localhost:5000';
if (!BASE_URL.includes('localhost') && !BASE_URL.includes('127.0.0.1')) {
  console.error(`⛔ FATAL: Refusing to run tests against remote URL: ${BASE_URL}`);
  process.exit(1);
}

const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop';

async function runSnapshotsTestSuite() {
  console.log('🛡️  Starting VÉLOR STEP 5B (Étape 3 : Order Snapshots) Test Suite...\n');

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
    console.error(`⛔ CRITICAL SAFETY ABORT: Backend is running in env '${healthData.env}' on database '${healthData.database}'. Snapshots tests are STRICTLY prohibited on databases other than 'velor_test'!`);
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

  const createdProductIds = [];
  const createdOrderIds = [];
  let adminToken = null;

  try {
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

    if (!adminLoginRes.ok) {
      adminLoginRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Snapshot Tester',
          email: 'test123@gmail.com',
          password: 'test123',
          role: 'admin',
        }),
      });
    }

    const loginData = await adminLoginRes.json();
    adminToken = loginData.accessToken || loginData.token;
    if (!adminToken) {
      throw new Error(`Failed to obtain test auth token: ${JSON.stringify(loginData)}`);
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };

    // Ensure category exists
    let cat = await Category.findOne({ name: 'Snapshots' });
    if (!cat) {
      cat = await Category.create({ name: 'Snapshots', description: 'Snapshot test category' });
    }

    // =========================================================================
    // TEST 1 — Snapshot lors de la création de la commande
    // =========================================================================
    console.log('--- TEST 1 : Snapshot lors de la création ---');
    const timestamp = Date.now();
    const product1 = await Product.create({
      name: `Snapshot Jacket ${timestamp}`,
      description: 'High quality leather jacket for snapshot testing',
      price: 18500,
      stock: 12,
      category: cat._id,
      image: 'https://velor.com/images/snapshot_jacket.jpg',
    });
    createdProductIds.push(product1._id);

    // Create order via API
    const createOrderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerName: 'Amina Snapshot',
        customerPhone: '0550112233',
        wilaya: 'Alger',
        commune: 'Hydra',
        shippingAddress: '14 Rue des Oliviers',
        items: [
          {
            product: product1._id.toString(),
            quantity: 3,
            size: 'L',
          },
        ],
      }),
    });

    const createOrderData = await createOrderRes.json();
    assert(createOrderRes.status === 201, `Order created with HTTP 201 (got ${createOrderRes.status})`);
    const createdOrderObj = createOrderData.order || createOrderData;
    assert(createdOrderObj?._id != null, 'Order response contains _id');

    const orderId1 = createdOrderObj._id;
    createdOrderIds.push(orderId1);

    // Verify raw DB document directly without populate
    const rawOrder1 = await Order.findById(orderId1).lean();
    assert(rawOrder1 != null, 'Order found in velor_test directly');
    assert(rawOrder1.items?.length === 1, 'Order has exactly 1 item');

    const rawItem1 = rawOrder1.items[0];
    assert(rawItem1.name === `Snapshot Jacket ${timestamp}`, `Raw DB item.name matches snapshot: "${rawItem1.name}"`);
    assert(rawItem1.image === 'https://velor.com/images/snapshot_jacket.jpg', `Raw DB item.image matches snapshot: "${rawItem1.image}"`);
    assert(rawItem1.price === 18500, `Raw DB item.price matches snapshot: ${rawItem1.price}`);
    assert(rawItem1.quantity === 3, `Raw DB item.quantity matches: ${rawItem1.quantity}`);
    assert(rawItem1.size === 'L', `Raw DB item.size matches: "${rawItem1.size}"`);
    assert(rawItem1.product.toString() === product1._id.toString(), `Raw DB item.product matches Product ObjectId: ${rawItem1.product}`);

    // =========================================================================
    // TEST 2 — Modification du produit après commande (immutabilité du snapshot)
    // =========================================================================
    console.log('\n--- TEST 2 : Modification du produit après commande ---');
    await Product.findByIdAndUpdate(product1._id, {
      name: 'Completely Renamed Jacket 2027',
      image: 'https://velor.com/images/new_super_jacket.png',
      price: 32000,
    });

    // Re-fetch order via API (which uses populate('items.product'))
    const getOrderRes2 = await fetch(`${BASE_URL}/api/orders/${orderId1}`, { headers });
    const orderData2 = await getOrderRes2.json();
    assert(getOrderRes2.status === 200, `Re-fetch order returned HTTP 200`);

    const orderItem2 = orderData2.items[0];
    assert(orderItem2.name === `Snapshot Jacket ${timestamp}`, `Order item.name remained intact despite product rename (actual: "${orderItem2.name}")`);
    assert(orderItem2.image === 'https://velor.com/images/snapshot_jacket.jpg', `Order item.image remained intact despite product image change (actual: "${orderItem2.image}")`);
    assert(orderItem2.price === 18500, `Order item.price remained intact despite product price change (actual: ${orderItem2.price})`);

    // =========================================================================
    // TEST 3 — Suppression du produit du catalogue (autonomie de la commande)
    // =========================================================================
    console.log('\n--- TEST 3 : Suppression du produit du catalogue ---');
    // Delete product from catalog directly in velor_test
    await Product.findByIdAndDelete(product1._id);
    const prodCheck = await Product.findById(product1._id);
    assert(prodCheck === null, 'Product was successfully deleted from catalog');

    // Re-fetch order via API with populate('items.product')
    const getOrderRes3 = await fetch(`${BASE_URL}/api/orders/${orderId1}`, { headers });
    const orderData3 = await getOrderRes3.json();
    assert(getOrderRes3.status === 200, 'Order re-fetch succeeded with HTTP 200 after product deletion');
    assert(orderData3._id === orderId1, 'Order document exists and is fully accessible');

    const orderItem3 = orderData3.items[0];
    assert(orderItem3.product === null, 'item.product is null after populate (expected because product is deleted)');
    assert(orderItem3.name === `Snapshot Jacket ${timestamp}`, `item.name is still present and preserved: "${orderItem3.name}"`);
    assert(orderItem3.image === 'https://velor.com/images/snapshot_jacket.jpg', `item.image is still present and preserved: "${orderItem3.image}"`);
    assert(orderItem3.price === 18500, `item.price is still present: ${orderItem3.price}`);
    assert(orderItem3.quantity === 3, `item.quantity is still present: ${orderItem3.quantity}`);
    assert(orderItem3.size === 'L', `item.size is still present: "${orderItem3.size}"`);

    // Frontend fallback verification
    const renderedName3 = orderItem3.name || orderItem3.product?.name || 'Piece';
    const renderedImg3 = orderItem3.image || orderItem3.product?.image || DEFAULT_PRODUCT_IMAGE;
    assert(renderedName3 === `Snapshot Jacket ${timestamp}`, `Frontend fallback resolves to snapshot name: "${renderedName3}"`);
    assert(renderedImg3 === 'https://velor.com/images/snapshot_jacket.jpg', `Frontend fallback resolves to snapshot image: "${renderedImg3}"`);

    // =========================================================================
    // TEST 4 — Autorité serveur du prix (ignorer manipulation client)
    // =========================================================================
    console.log('\n--- TEST 4 : Autorité serveur du prix ---');
    const product2 = await Product.create({
      name: `Authoritative Silk Shirt ${timestamp}`,
      description: 'Luxury shirt for price authority test',
      price: 9500,
      stock: 10,
      category: cat._id,
      image: 'https://velor.com/images/silk_shirt.jpg',
    });
    createdProductIds.push(product2._id);

    // Client attempts to send fake price: 100 instead of 9500
    const createOrderTamperedRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerName: 'Malicious Pricing User',
        customerPhone: '0550998877',
        wilaya: 'Oran',
        commune: 'Oran',
        shippingAddress: '5 Boulevard Front de Mer',
        items: [
          {
            product: product2._id.toString(),
            quantity: 2,
            price: 100, // Tampered client price!
            size: 'M',
          },
        ],
      }),
    });

    const tamperedOrderData = await createOrderTamperedRes.json();
    assert(createOrderTamperedRes.status === 201, `Tampered order handled with HTTP 201`);
    const tamperedOrderObj = tamperedOrderData.order || tamperedOrderData;
    createdOrderIds.push(tamperedOrderObj._id);

    const rawOrderTampered = await Order.findById(tamperedOrderObj._id).lean();
    assert(rawOrderTampered.items[0].price === 9500, `Client manipulated price (100) was ignored, DB snapshot price is strictly server price: ${rawOrderTampered.items[0].price}`);
    assert(rawOrderTampered.items[0].name === `Authoritative Silk Shirt ${timestamp}`, `Snapshot name is correctly set: "${rawOrderTampered.items[0].name}"`);
    assert(rawOrderTampered.items[0].image === 'https://velor.com/images/silk_shirt.jpg', `Snapshot image is correctly set: "${rawOrderTampered.items[0].image}"`);

    // =========================================================================
    // TEST 5 — Rétrocompatibilité avec les anciennes commandes sans snapshot
    // =========================================================================
    console.log('\n--- TEST 5 : Rétrocompatibilité anciennes commandes ---');
    const product3 = await Product.create({
      name: `Legacy Wool Coat ${timestamp}`,
      description: 'Classic wool coat',
      price: 24000,
      stock: 5,
      category: cat._id,
      image: 'https://velor.com/images/wool_coat.jpg',
    });
    createdProductIds.push(product3._id);

    // Insert a legacy order directly into MongoDB without name or image properties in items
    const legacyOrderDoc = await Order.collection.insertOne({
      user: null,
      isGuest: true,
      customerName: 'Legacy Customer',
      customerPhone: '0550000000',
      customerEmail: 'legacy@velor.com',
      wilaya: 'Constantine',
      commune: 'Constantine',
      shippingAddress: '10 Rue Ancienne',
      deliveryMethod: 'home',
      shippingFee: 500,
      guestAccessToken: 'legacy_token_123',
      items: [
        {
          product: product3._id,
          quantity: 1,
          price: 24000,
          size: 'M',
        },
      ],
      totalPrice: 24500,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const legacyOrderId = legacyOrderDoc.insertedId.toString();
    createdOrderIds.push(legacyOrderId);

    // Read via API
    const getLegacyRes = await fetch(`${BASE_URL}/api/orders/${legacyOrderId}`, { headers });
    assert(getLegacyRes.status === 200, `Legacy order without snapshot read via API with HTTP 200 (no crash)`);
    const legacyOrderData = await getLegacyRes.json();
    const legacyItem = legacyOrderData.items[0];

    assert(legacyItem.name == null, 'Legacy item has no snapshot name (null/undefined)');
    assert(!legacyItem.image, 'Legacy item has no snapshot image (empty default or null/undefined)');
    assert(legacyItem.product?.name === `Legacy Wool Coat ${timestamp}`, `Legacy item has product.name via populate: "${legacyItem.product?.name}"`);

    // Frontend fallback for legacy order with existing product
    const legacyRenderedName = legacyItem.name || legacyItem.product?.name || 'Piece';
    const legacyRenderedImg = legacyItem.image || legacyItem.product?.image || DEFAULT_PRODUCT_IMAGE;
    assert(legacyRenderedName === `Legacy Wool Coat ${timestamp}`, `Frontend fallback on legacy order resolves to product.name: "${legacyRenderedName}"`);
    assert(legacyRenderedImg === 'https://velor.com/images/wool_coat.jpg', `Frontend fallback on legacy order resolves to product.image: "${legacyRenderedImg}"`);

    // Case 5b: Legacy order where product is ALSO deleted
    await Product.findByIdAndDelete(product3._id);
    const getLegacyDeletedProdRes = await fetch(`${BASE_URL}/api/orders/${legacyOrderId}`, { headers });
    assert(getLegacyDeletedProdRes.status === 200, `Legacy order with deleted product still readable with HTTP 200`);
    const legacyDeletedData = await getLegacyDeletedProdRes.json();
    const legacyDeletedItem = legacyDeletedData.items[0];

    const fallbackDeadName = legacyDeletedItem.name || legacyDeletedItem.product?.name || 'Piece';
    const fallbackDeadImg = legacyDeletedItem.image || legacyDeletedItem.product?.image || DEFAULT_PRODUCT_IMAGE;
    assert(fallbackDeadName === 'Piece', `Graceful fallback when legacy product was deleted: "${fallbackDeadName}"`);
    assert(fallbackDeadImg === DEFAULT_PRODUCT_IMAGE, `Graceful image fallback when legacy product was deleted`);

    console.log('\n========================================');
    console.log(`Order Snapshots Tests Summary: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ Unexpected error in snapshot test suite:`, err);
    process.exit(1);
  } finally {
    // Guaranteed cleanup on velor_test
    console.log('--- Cleanup Phase on velor_test ---');
    try {
      if (createdOrderIds.length > 0) {
        await Order.deleteMany({ _id: { $in: createdOrderIds } });
        console.log(`  Purged ${createdOrderIds.length} test order(s).`);
      }
      if (createdProductIds.length > 0) {
        await Product.deleteMany({ _id: { $in: createdProductIds } });
        console.log(`  Purged ${createdProductIds.length} test product(s).`);
      }
    } catch (cleanupErr) {
      console.error('Cleanup warning:', cleanupErr.message);
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

runSnapshotsTestSuite();
