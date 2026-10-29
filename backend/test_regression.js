// Strict Safety Guard 1: Must run exclusively in 'test' environment
if (process.env.NODE_ENV !== 'test') {
  console.error(`⛔ SAFETY ABORT: Automated regression test strictly requires NODE_ENV='test'. Current value: '${process.env.NODE_ENV || 'undefined'}'.`);
  process.exit(1);
}

const BASE_URL = 'http://localhost:5000';

// Strict Safety Guard 2: Refuse to execute against remote URLs
if (!BASE_URL.includes('localhost') && !BASE_URL.includes('127.0.0.1')) {
  console.error(`⛔ SAFETY ABORT: Refusing to run tests against remote URL: ${BASE_URL}`);
  process.exit(1);
}

async function runRegression() {
  console.log('🔄 Starting Full Functional Regression Tests...\n');

  // Strict Safety Guard 3: Verify that the local API is running and connected strictly to 'velor_test'
  let healthData;
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    if (!healthRes.ok) {
      console.error(`⛔ SAFETY ABORT: Backend health check failed with HTTP ${healthRes.status}.`);
      process.exit(1);
    }
    healthData = await healthRes.json();
  } catch (err) {
    console.error(`⛔ SAFETY ABORT: Cannot connect to backend server at ${BASE_URL}/api/health (${err.message}). Ensure the backend is started with NODE_ENV=test.`);
    process.exit(1);
  }

  const FORBIDDEN_DATABASES = ['velor', 'velor_dev', 'velor_prod', 'production', 'ecommerce'];
  if (healthData.env !== 'test' || healthData.database !== 'velor_test') {
    console.error(`⛔ CRITICAL SAFETY ABORT: Backend is running in env '${healthData.env}' on database '${healthData.database}'. Regression tests are STRICTLY prohibited on databases other than 'velor_test'!`);
    process.exit(1);
  }
  if (FORBIDDEN_DATABASES.includes(healthData.database)) {
    console.error(`⛔ CRITICAL SAFETY ABORT: Forbidden target database detected: '${healthData.database}'. Immediate shutdown.`);
    process.exit(1);
  }
  console.log(`🔒 Isolation Verified: Backend confirmed running in test mode on database '${healthData.database}'.\n`);

  let userId = null;
  let testProduct = null;
  let tempOrderProdId = null;
  let createdOrderId = null;
  let adminToken = null;
  let newProdId = null;
  let testError = null;
  const cleanupErrors = [];

  // Helper to ensure an admin token is available for cleanup even if intermediate steps failed
  async function ensureAdminToken() {
    if (adminToken) return adminToken;
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test123@gmail.com', password: 'test123' })
      });
      if (!res.ok) return null;
      const data = await res.json();
      adminToken = data.accessToken || data.token;
      return adminToken;
    } catch {
      return null;
    }
  }

  try {
    // 1. Register new user
    const email = `reg_test_${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Reg Test User', email, password: 'StrongPassword123!' })
    });
    if (regRes.status !== 201) throw new Error(`Register failed: ${await regRes.text()}`);
    const regData = await regRes.json();
    const token = regData.token;
    userId = regData.user._id;
    console.log('✅ Authentication: Register PASSED');

    // 2. Login
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'StrongPassword123!' })
    });
    if (loginRes.status !== 200) throw new Error(`Login failed: ${await loginRes.text()}`);
    console.log('✅ Authentication: Login PASSED');

    // 3. Profile
    const profRes = await fetch(`${BASE_URL}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (profRes.status !== 200) throw new Error(`Get profile failed: ${await profRes.text()}`);
    console.log('✅ Profile: Get Profile PASSED');

    // 4. Update Profile
    const updateProfRes = await fetch(`${BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone: '0555123456', wilaya: 'Oran', commune: 'Oran', address: 'Rue Test' })
    });
    if (updateProfRes.status !== 200) throw new Error(`Update profile failed: ${await updateProfRes.text()}`);
    console.log('✅ Profile: Update Profile PASSED');

    // 5. Products list & search
    const prodsRes = await fetch(`${BASE_URL}/api/products`);
    const products = await prodsRes.json();
    if (!Array.isArray(products) || products.length === 0) throw new Error('No products returned');
    console.log(`✅ Products: Fetch all products PASSED (${products.length} products)`);

    const searchRes = await fetch(`${BASE_URL}/api/products/search?keyword=shirt`);
    const searchProds = await searchRes.json();
    if (!Array.isArray(searchProds)) throw new Error('Search failed');
    console.log(`✅ Products: Search products PASSED (${searchProds.length} matches)`);

    // 6. Categories list
    const catsRes = await fetch(`${BASE_URL}/api/categories`);
    const categories = await catsRes.json();
    if (!Array.isArray(categories) || categories.length === 0) throw new Error('No categories returned');
    console.log(`✅ Categories: Fetch all categories PASSED (${categories.length} categories)`);

    // Select or create a dedicated temporary product for cart & order testing
    // to strictly prevent modifying pre-existing catalog stock
    const adminTok = await ensureAdminToken();
    if (adminTok && categories && categories.length > 0) {
      const createTempRes = await fetch(`${BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminTok}` },
        body: JSON.stringify({
          name: `Regression Temp Order Product ${Date.now()}`,
          description: 'Temporary item for safe order testing',
          price: 5000,
          stock: 20,
          category: categories[0]._id,
          image: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800'
        })
      });
      if (createTempRes.ok) {
        testProduct = await createTempRes.json();
        tempOrderProdId = testProduct._id;
      }
    }
    if (!testProduct) {
      testProduct = products.find((p) => Number(p.stock) >= 1);
    }
    if (!testProduct) {
      throw new Error('No in-stock product available for regression testing. At least one product with stock >= 1 is required.');
    }

    // 7. Cart Flow
    const addCartRes = await fetch(`${BASE_URL}/api/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId: testProduct._id, quantity: 2, size: 'L' })
    });
    if (addCartRes.status !== 200) throw new Error(`Add to cart failed: ${await addCartRes.text()}`);
    console.log('✅ Cart: Add item to cart PASSED');

    const getCartRes = await fetch(`${BASE_URL}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const cartData = await getCartRes.json();
    if (!cartData.items || cartData.items.length === 0) throw new Error('Cart empty');
    console.log(`✅ Cart: Get cart PASSED (${cartData.items.length} item)`);

    const updateCartRes = await fetch(`${BASE_URL}/api/cart/${testProduct._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quantity: 1, size: 'L' })
    });
    if (updateCartRes.status !== 200) throw new Error(`Update cart failed: ${await updateCartRes.text()}`);
    console.log('✅ Cart: Update cart item quantity PASSED');

    // 8. Favorites Flow
    const addFavRes = await fetch(`${BASE_URL}/api/users/favorites/${testProduct._id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (addFavRes.status !== 200) throw new Error(`Add favorite failed: ${await addFavRes.text()}`);
    console.log('✅ Favorites: Add favorite PASSED');

    const getFavRes = await fetch(`${BASE_URL}/api/users/favorites`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const favorites = await getFavRes.json();
    if (!Array.isArray(favorites) || favorites.length === 0) throw new Error('Favorites empty');
    console.log(`✅ Favorites: Get favorites PASSED (${favorites.length} favorite)`);

    const removeFavRes = await fetch(`${BASE_URL}/api/users/favorites/${testProduct._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (removeFavRes.status !== 200) throw new Error(`Remove favorite failed: ${await removeFavRes.text()}`);
    console.log('✅ Favorites: Remove favorite PASSED');

    // 9. Order Flow
    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        items: [{ productId: testProduct._id, quantity: 1, size: 'L' }],
        customerInfo: { fullName: 'Reg User', phone: '0555123456', wilaya: 'Oran', commune: 'Oran', address: 'Rue Test' },
        paymentMethod: 'cod'
      })
    });
    if (orderRes.status !== 201) throw new Error(`Create order failed: ${await orderRes.text()}`);
    const orderData = await orderRes.json();
    createdOrderId = orderData.order._id;
    console.log(`✅ Orders: Create order PASSED (ID: ${createdOrderId})`);

    const myOrdersRes = await fetch(`${BASE_URL}/api/orders/my`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const myOrders = await myOrdersRes.json();
    if (!Array.isArray(myOrders) || myOrders.length === 0) throw new Error('My orders empty');
    console.log(`✅ Orders: Get my orders PASSED (${myOrders.length} orders)`);

    // 10. Admin Flow
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test123@gmail.com', password: 'test123' })
    });
    const adminData = await adminLoginRes.json();
    adminToken = adminData.accessToken || adminData.token;

    // Admin get all orders
    const allOrdersRes = await fetch(`${BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (allOrdersRes.status !== 200) throw new Error('Admin get orders failed');
    console.log('✅ Admin: Get all orders PASSED');

    // Admin update order status
    const updateStatusRes = await fetch(`${BASE_URL}/api/orders/${createdOrderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'processing' })
    });
    if (updateStatusRes.status !== 200) throw new Error('Update order status failed');
    console.log('✅ Admin: Update order status PASSED');

    // Admin get users
    const allUsersRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (allUsersRes.status !== 200) throw new Error('Admin get users failed');
    console.log('✅ Admin: Get customers/users list PASSED');

    // Admin create product
    const createProdRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: `Regression Test Product ${Date.now()}`,
        description: 'Test description',
        price: 5000,
        stock: 10,
        category: categories[0]._id,
        image: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800'
      })
    });
    if (createProdRes.status !== 201) throw new Error(`Admin create product failed: ${await createProdRes.text()}`);
    const createdProdData = await createProdRes.json();
    newProdId = createdProdData._id;
    console.log(`✅ Admin: Create product PASSED (ID: ${newProdId})`);

    // Admin update product
    const updateProdRes = await fetch(`${BASE_URL}/api/products/${newProdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ price: 5500, stock: 12 })
    });
    if (updateProdRes.status !== 200) throw new Error('Admin update product failed');
    console.log('✅ Admin: Update product PASSED');

    // Admin delete product
    const deleteProdRes = await fetch(`${BASE_URL}/api/products/${newProdId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (deleteProdRes.status !== 200) throw new Error('Admin delete product failed');
    newProdId = null; // Successfully deleted
    console.log('✅ Admin: Delete product PASSED');

  } catch (err) {
    testError = err;
  } finally {
    // Resilient Cleanup: Purges temporary data and atomically restores inventory
    const cleanupAdminToken = await ensureAdminToken();

    if (cleanupAdminToken) {
      // 1. Cancel order to trigger server's atomic stock restitution ($inc: { stock: item.quantity })
      if (createdOrderId) {
        try {
          const cancelRes = await fetch(`${BASE_URL}/api/orders/${createdOrderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cleanupAdminToken}` },
            body: JSON.stringify({ status: 'cancelled' })
          });
          if (!cancelRes.ok && cancelRes.status !== 404) {
            cleanupErrors.push(`Failed to cancel test order ${createdOrderId}: HTTP ${cancelRes.status}`);
          }
        } catch (e) {
          cleanupErrors.push(`Network error cancelling order ${createdOrderId}: ${e.message}`);
        }

        // 2. Delete test order document
        try {
          const delOrderRes = await fetch(`${BASE_URL}/api/orders/${createdOrderId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${cleanupAdminToken}` }
          });
          if (!delOrderRes.ok && delOrderRes.status !== 404) {
            cleanupErrors.push(`Failed to delete test order ${createdOrderId}: HTTP ${delOrderRes.status}`);
          }
        } catch (e) {
          cleanupErrors.push(`Network error deleting order ${createdOrderId}: ${e.message}`);
        }
      }

      // 3. Delete temporary product if created and not yet deleted
      if (newProdId) {
        try {
          const delProdRes = await fetch(`${BASE_URL}/api/products/${newProdId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${cleanupAdminToken}` }
          });
          if (!delProdRes.ok && delProdRes.status !== 404) {
            cleanupErrors.push(`Failed to delete temporary product ${newProdId}: HTTP ${delProdRes.status}`);
          }
        } catch (e) {
          cleanupErrors.push(`Network error deleting product ${newProdId}: ${e.message}`);
        }
      }

      // 3b. Delete temporary order product if created
      if (tempOrderProdId) {
        try {
          const delTempOrderProdRes = await fetch(`${BASE_URL}/api/products/${tempOrderProdId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${cleanupAdminToken}` }
          });
          if (!delTempOrderProdRes.ok && delTempOrderProdRes.status !== 404) {
            cleanupErrors.push(`Failed to delete temporary order product ${tempOrderProdId}: HTTP ${delTempOrderProdRes.status}`);
          }
        } catch (e) {
          cleanupErrors.push(`Network error deleting temporary order product ${tempOrderProdId}: ${e.message}`);
        }
      }

      // 4. Delete temporary test user
      if (userId) {
        try {
          const delUserRes = await fetch(`${BASE_URL}/api/users/${userId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${cleanupAdminToken}` }
          });
          if (!delUserRes.ok && delUserRes.status !== 404) {
            cleanupErrors.push(`Failed to delete test user ${userId}: HTTP ${delUserRes.status}`);
          }
        } catch (e) {
          cleanupErrors.push(`Network error deleting user ${userId}: ${e.message}`);
        }
      }
    } else if (createdOrderId || userId || newProdId) {
      cleanupErrors.push('Admin token could not be acquired to purge temporary test records.');
    }

    if (cleanupErrors.length > 0) {
      console.error('\n⚠️ Cleanup encountered the following issue(s):');
      cleanupErrors.forEach((err) => console.error(`  - ${err}`));
    } else if (userId || createdOrderId || newProdId) {
      console.log('✅ Cleanup: All test records purged and inventory atomically restored');
    }

    // Critical: Never mask the original test failure with a cleanup error
    if (testError) {
      throw testError;
    }

    // If test passed functionally but cleanup failed, distinguish the outcome
    if (cleanupErrors.length > 0) {
      throw new Error(`Functional tests PASSED, but cleanup failed on ${cleanupErrors.length} operation(s).`);
    }

    console.log('\n🎉 ALL REGRESSION TESTS COMPLETED SUCCESSFULLY!');
  }
}

runRegression().catch(err => {
  console.error('\n❌ Regression test failed:', err);
  process.exit(1);
});
