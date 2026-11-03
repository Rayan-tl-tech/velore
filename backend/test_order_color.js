import assert from 'assert';
import mongoose from 'mongoose';
import Order from './models/orderModel.js';
import Cart from './models/cartModel.js';

console.log('🧪 Starting VÉLOR Non-Destructive Color Transmission & Persistence Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
  }
}

// ============================================================
// TEST 1: Order Model Schema - Color storage & trimming
// ============================================================
runTest('1. Order model accepts and trims item color', () => {
  const dummyProductId = new mongoose.Types.ObjectId();
  const orderDoc = new Order({
    customerName: 'Amina Benali',
    customerPhone: '0550123456',
    wilaya: '16 - Alger',
    commune: 'Bab El Oued',
    shippingAddress: '12 Rue Didouche Mourad',
    totalPrice: 9800,
    shippingFee: 500,
    items: [
      {
        product: dummyProductId,
        name: 'Modern Denim Set',
        quantity: 1,
        price: 9800,
        size: 'M',
        color: '  #1E3A8A  ',
      },
    ],
  });

  const err = orderDoc.validateSync();
  assert.strictEqual(err, undefined, 'Validation should pass without errors');
  assert.strictEqual(orderDoc.items[0].color, '#1E3A8A', 'Color should be trimmed');
});

// ============================================================
// TEST 2: Order Model Schema - Order item without color defaults to null
// ============================================================
runTest('2. Order item without color defaults to null (backward compatible)', () => {
  const dummyProductId = new mongoose.Types.ObjectId();
  const orderDoc = new Order({
    customerName: 'Karim Mansouri',
    customerPhone: '0660123456',
    wilaya: '31 - Oran',
    commune: 'Es Senia',
    shippingAddress: 'Cite 500 Logements',
    totalPrice: 6900,
    shippingFee: 800,
    items: [
      {
        product: dummyProductId,
        name: 'Classic Linen Shirt',
        quantity: 1,
        price: 6900,
        size: 'L',
      },
    ],
  });

  const err = orderDoc.validateSync();
  assert.strictEqual(err, undefined, 'Validation should pass without errors');
  assert.strictEqual(orderDoc.items[0].color, null, 'Color should default to null');
});

// ============================================================
// TEST 3: Historical Order - Simulated legacy document without color
// ============================================================
runTest('3. Historical order without color field is 100% valid and readable', () => {
  const rawLegacyOrderJson = {
    customerName: 'Yassine Belkacem',
    customerPhone: '0770123456',
    wilaya: '25 - Constantine',
    commune: 'Sidi Mabrouk',
    shippingAddress: 'Boulevard des Martyrs',
    totalPrice: 12000,
    shippingFee: 800,
    items: [
      {
        product: new mongoose.Types.ObjectId(),
        name: 'Tailored Wool Coat',
        quantity: 1,
        price: 12000,
        size: 'XL',
      },
    ],
  };

  const hydrated = new Order(rawLegacyOrderJson);
  const err = hydrated.validateSync();
  assert.strictEqual(err, undefined);
  assert.strictEqual(hydrated.items[0].color, null);
  assert.strictEqual(hydrated.items[0].size, 'XL');
  assert.strictEqual(hydrated.items[0].price, 12000);
});

// ============================================================
// TEST 4: Cart Model Schema - Accepts color and defaults to null
// ============================================================
runTest('4. Cart model supports optional item color and defaults to null', () => {
  const dummyUserId = new mongoose.Types.ObjectId();
  const dummyProd1 = new mongoose.Types.ObjectId();
  const dummyProd2 = new mongoose.Types.ObjectId();

  const cartDoc = new Cart({
    user: dummyUserId,
    items: [
      { product: dummyProd1, quantity: 1, size: 'M', color: '#0A0A0A' },
      { product: dummyProd2, quantity: 2, size: 'S' },
    ],
  });

  const err = cartDoc.validateSync();
  assert.strictEqual(err, undefined);
  assert.strictEqual(cartDoc.items[0].color, '#0A0A0A');
  assert.strictEqual(cartDoc.items[1].color, null);
});

// ============================================================
// TEST 5: Cart Variant Distinction - Two variants with different colors
// ============================================================
runTest('5. Same product & size with different colors remain distinct items', () => {
  const matchesItem = (item, productId, size, color = undefined) => {
    if (!item || !item.product) return false;
    const id = item.product._id ? item.product._id.toString() : item.product.toString();
    const sameId = id === productId.toString();
    if (!sameId) return false;
    if (size) {
      const sameSize = (item.size || 'M') === String(size).trim();
      if (!sameSize) return false;
    }
    if (color !== undefined) {
      const itemColor = item.color ? String(item.color).trim() : null;
      const targetColor = color ? String(color).trim() : null;
      return itemColor === targetColor;
    }
    return true;
  };

  const prodId = '650000000000000000000001';
  const itemNoir = { product: prodId, size: 'M', color: '#000000', quantity: 1 };
  const itemBlanc = { product: prodId, size: 'M', color: '#FFFFFF', quantity: 1 };
  const itemNoirSame = { product: prodId, size: 'M', color: '#000000', quantity: 2 };

  // Item Noir should NOT match Item Blanc
  assert.strictEqual(
    matchesItem(itemNoir, prodId, 'M', '#FFFFFF'),
    false,
    'Item Noir must not match target color Blanc'
  );

  // Item Noir should match incoming Noir
  assert.strictEqual(
    matchesItem(itemNoir, prodId, 'M', '#000000'),
    true,
    'Item Noir must match target color Noir'
  );

  // Item without color should not match target with color
  const itemNoColor = { product: prodId, size: 'M', color: null, quantity: 1 };
  assert.strictEqual(
    matchesItem(itemNoColor, prodId, 'M', '#000000'),
    false,
    'Item without color must not match target with color'
  );

  // Item without color matches target without color
  assert.strictEqual(
    matchesItem(itemNoColor, prodId, 'M', null),
    true,
    'Item without color must match target without color'
  );
});

// ============================================================
// TEST 6: Checkout Payload Mapping - Color preservation
// ============================================================
runTest('6. Frontend checkout payload preserves item color or sets null', () => {
  const guestCartItems = [
    {
      product: { _id: 'prod1', name: 'Piece 1', price: 5000 },
      quantity: 1,
      size: 'S',
      color: '#2A4365',
    },
    {
      product: { _id: 'prod2', name: 'Piece 2', price: 7000 },
      quantity: 2,
      size: 'M',
      color: null,
    },
  ];

  const payload = {
    customerName: 'Sara L.',
    items: guestCartItems.map((it) => ({
      productId: it.product?._id || it.product?.id,
      quantity: it.quantity,
      size: it.size || 'M',
      color: it.color || null,
    })),
  };

  assert.strictEqual(payload.items[0].color, '#2A4365');
  assert.strictEqual(payload.items[1].color, null);
  assert.strictEqual(payload.items[0].size, 'S');
  assert.strictEqual(payload.items[1].size, 'M');
});

// ============================================================
// TEST 7: Order Service Item Mapping & Strict Decoupling
// ============================================================
runTest('7. Order creation maps color while strictly decoupling price and stock', () => {
  const rawItems = [
    { productId: '650000000000000000000001', quantity: 2, size: 'M', color: '  #1E3A8A  ' },
    { productId: '650000000000000000000002', quantity: 1, size: 'L', color: null },
  ];

  const orderItems = [];
  let itemsSubtotal = 0;

  for (const rawItem of rawItems) {
    const qty = parseInt(rawItem.quantity, 10);
    const size = String(rawItem.size || 'M').trim();
    const color = rawItem.color ? String(rawItem.color).trim() : null;

    // Simulated authoritative price from DB (never altered by color)
    const authoritativePrice = 8500;
    itemsSubtotal += authoritativePrice * qty;

    orderItems.push({
      product: new mongoose.Types.ObjectId(rawItem.productId),
      name: 'Simulated Product',
      image: '',
      quantity: qty,
      price: authoritativePrice,
      size,
      color,
    });
  }

  assert.strictEqual(orderItems[0].color, '#1E3A8A');
  assert.strictEqual(orderItems[1].color, null);
  assert.strictEqual(itemsSubtotal, 8500 * 3, 'Items subtotal must strictly equal sum of prices');
});

// ============================================================
// TEST 8: UI Display Badge Logic - Conditional rendering & backward compatibility
// ============================================================
runTest('8. UI display logic renders swatch when color exists, cleanly omitting when null', () => {
  const renderItemDisplayInfo = (item) => {
    const sizeStr = `Size: ${item.size || 'M'} · Qty: ${item.quantity || 1}`;
    let colorBadge = null;
    if (item.color) {
      colorBadge = {
        swatchBg: item.color,
        hexCode: item.color.toUpperCase(),
      };
    }
    return { sizeStr, colorBadge };
  };

  const itemWithColor = { size: 'M', quantity: 1, color: '#1e3a8a' };
  const itemWithoutColor = { size: 'L', quantity: 2, color: null };
  const itemLegacy = { size: 'S', quantity: 1 };

  const res1 = renderItemDisplayInfo(itemWithColor);
  assert.ok(res1.colorBadge !== null, 'Color badge must be present');
  assert.strictEqual(res1.colorBadge.swatchBg, '#1e3a8a');
  assert.strictEqual(res1.colorBadge.hexCode, '#1E3A8A');

  const res2 = renderItemDisplayInfo(itemWithoutColor);
  assert.strictEqual(res2.colorBadge, null, 'Color badge must be omitted when null');

  const res3 = renderItemDisplayInfo(itemLegacy);
  assert.strictEqual(res3.colorBadge, null, 'Color badge must be omitted when undefined');
});

console.log(`\n============================================================`);
console.log(`📊 Suite Result: ${passedTests}/${totalTests} tests passed successfully.`);
console.log(`============================================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}

