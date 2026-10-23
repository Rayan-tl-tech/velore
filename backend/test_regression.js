const BASE_URL = 'http://localhost:5000';

async function runRegression() {
  console.log('🔄 Starting Full Functional Regression Tests...\n');

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
  const userId = regData.user._id;
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

  const testProduct = products[0];

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
  const createdOrderId = orderData.order._id;
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
  const adminToken = adminData.token;

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
  const newProdId = createdProdData._id;
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
  console.log('✅ Admin: Delete product PASSED');

  // Clean up test order and test user
  await fetch(`${BASE_URL}/api/orders/${createdOrderId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  await fetch(`${BASE_URL}/api/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✅ Cleanup: Test records purged');

  console.log('\n🎉 ALL REGRESSION TESTS COMPLETED SUCCESSFULLY!');
}

runRegression().catch(err => {
  console.error('\n❌ Regression test failed:', err);
  process.exit(1);
});
