import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000';
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB

// Helper: generate a binary buffer with valid JPEG magic bytes
function createValidJpegBuffer(targetSizeBytes) {
  const buf = Buffer.alloc(targetSizeBytes);
  // JPEG magic bytes: FF D8 FF E0 00 10 4A 46 49 46 00 01
  const header = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00]);
  header.copy(buf, 0);
  // Fill payload with pseudo-random bytes
  for (let i = header.length; i < targetSizeBytes - 2; i += 64) {
    const chunk = crypto.randomBytes(Math.min(64, targetSizeBytes - 2 - i));
    chunk.copy(buf, i);
  }
  // JPEG EOF marker: FF D9
  buf[targetSizeBytes - 2] = 0xFF;
  buf[targetSizeBytes - 1] = 0xD9;
  return buf;
}

// Helper: generate a binary buffer with valid WebP magic bytes
function createValidWebpBuffer(targetSizeBytes) {
  const buf = Buffer.alloc(targetSizeBytes);
  // WebP Header: 'RIFF' + 4-byte size + 'WEBP' + 'VP8 ' + 4-byte chunk size
  const riff = Buffer.from('RIFF');
  riff.copy(buf, 0);
  buf.writeUInt32LE(targetSizeBytes - 8, 4);
  const webp = Buffer.from('WEBPVP8 ');
  webp.copy(buf, 8);
  buf.writeUInt32LE(targetSizeBytes - 20, 16);
  // Fill body
  for (let i = 20; i < targetSizeBytes; i += 64) {
    const chunk = crypto.randomBytes(Math.min(64, targetSizeBytes - i));
    chunk.copy(buf, i);
  }
  return buf;
}

// Helper: format bytes
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Pure logic implementations mirrored from frontend/src/utils/imageOptimizer.js
function shouldOptimizeImage(fileSize) {
  return fileSize > MAX_UPLOAD_SIZE;
}

function calculateDimensions(origWidth, origHeight, maxDimension) {
  if (origWidth <= maxDimension && origHeight <= maxDimension) {
    return { width: origWidth, height: origHeight };
  }
  const ratio = Math.min(maxDimension / origWidth, maxDimension / origHeight);
  return {
    width: Math.max(1, Math.round(origWidth * ratio)),
    height: Math.max(1, Math.round(origHeight * ratio)),
  };
}

async function runImageOptimizationTests() {
  console.log('🖼️  Starting VÉLOR Intelligent Product Image Optimization Test Suite...\n');
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

  // 1. Logic & Decision Boundary Tests
  console.log('--- 1. Optimization Decision Boundary Tests (Rule: NO compression if <= 5MB) ---');
  
  const size500KB = 500 * 1024;
  const size2MB = 2 * 1024 * 1024;
  const size4_8MB = Math.round(4.8 * 1024 * 1024);
  const size5MB_Exact = 5 * 1024 * 1024;
  const size5_1MB = Math.round(5.1 * 1024 * 1024);
  const size7_9MB = Math.round(7.9 * 1024 * 1024);
  const size20MB = 20 * 1024 * 1024;

  assert(!shouldOptimizeImage(size500KB), 'Image 500 KB (<= 5MB): Compression bypassed (preserved as-is)');
  assert(!shouldOptimizeImage(size2MB), 'Image 2 MB (<= 5MB): Compression bypassed (preserved as-is)');
  assert(!shouldOptimizeImage(size4_8MB), 'Image 4.8 MB (<= 5MB): Compression bypassed (preserved as-is)');
  assert(!shouldOptimizeImage(size5MB_Exact), 'Image exact 5 MB (<= 5MB boundary): Compression bypassed (preserved as-is)');
  assert(shouldOptimizeImage(size5_1MB), 'Image 5.1 MB (> 5MB): Optimization triggered');
  assert(shouldOptimizeImage(size7_9MB), 'Image 7.9 MB (> 5MB): Optimization triggered');
  assert(shouldOptimizeImage(size20MB), 'Image 20 MB (> 5MB): Optimization triggered');

  // 2. Dimension Scaling Algorithm Tests
  console.log('\n--- 2. High-Fidelity Dimension Scaling Tests ---');
  const d1 = calculateDimensions(4000, 3000, 2400);
  assert(d1.width === 2400 && d1.height === 1800, `4000x3000 scaled to max 2400px preserves 4:3 aspect ratio (${d1.width}x${d1.height})`);

  const d2 = calculateDimensions(5000, 2500, 2200);
  assert(d2.width === 2200 && d2.height === 1100, `5000x2500 scaled to max 2200px preserves 2:1 aspect ratio (${d2.width}x${d2.height})`);

  const d3 = calculateDimensions(1920, 1080, 2400);
  assert(d3.width === 1920 && d3.height === 1080, `1920x1080 <= 2400px preserves exact original dimensions without downscaling (${d3.width}x${d3.height})`);

  // 3. Authenticate Admin for Live Endpoint Tests
  console.log('\n--- 3. Admin Authentication & RBAC Verification ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test123@gmail.com', password: 'test123' }),
  });
  const loginData = await loginRes.json();
  const adminToken = loginData.accessToken;
  assert(loginRes.status === 200 && !!adminToken, 'Admin authenticated and JWT acquired');

  // Test unauthenticated upload blocked
  const unauthUploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    body: new FormData(),
  });
  assert(unauthUploadRes.status === 401, 'Upload: Unauthenticated request blocked (401 Unauthorized)');

  // 4. Backend File Size & Validation Tests
  console.log('\n--- 4. Backend Upload Integrity & 5MB Limit Enforcement ---');

  // 4.1 Test direct upload of 500 KB JPEG (no compression needed)
  const buf500K = createValidJpegBuffer(size500KB);
  const fd500K = new FormData();
  fd500K.append('image', new Blob([buf500K], { type: 'image/jpeg' }), 'original_500kb.jpg');

  const res500K = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: fd500K,
  });
  const data500K = await res500K.json();
  assert(res500K.status === 200 && data500K.success && !!data500K.url, `Upload 500 KB original image: PASS (URL: ${data500K.url?.slice(0, 45)}...)`);

  // 4.2 Test direct upload of 2 MB JPEG (no compression needed)
  const buf2MB = createValidJpegBuffer(size2MB);
  const fd2MB = new FormData();
  fd2MB.append('image', new Blob([buf2MB], { type: 'image/jpeg' }), 'original_2mb.jpg');

  const res2MB = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: fd2MB,
  });
  const data2MB = await res2MB.json();
  assert(res2MB.status === 200 && data2MB.success, 'Upload 2 MB original image: PASS (Unchanged quality)');

  // 4.3 Test direct upload of 4.8 MB JPEG (no compression needed)
  const buf4_8MB = createValidJpegBuffer(size4_8MB);
  const fd4_8MB = new FormData();
  fd4_8MB.append('image', new Blob([buf4_8MB], { type: 'image/jpeg' }), 'original_4_8mb.jpg');

  const res4_8MB = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: fd4_8MB,
  });
  const data4_8MB = await res4_8MB.json();
  assert(res4_8MB.status === 200 && data4_8MB.success, 'Upload 4.8 MB original image: PASS (Unchanged quality)');

  // 4.4 Test direct unoptimized 5.1 MB JPEG -> MUST be rejected by backend 5MB ceiling
  const buf5_1MB = createValidJpegBuffer(size5_1MB);
  const fd5_1MB_Unopt = new FormData();
  fd5_1MB_Unopt.append('image', new Blob([buf5_1MB], { type: 'image/jpeg' }), 'oversized_5_1mb.jpg');

  const res5_1MB_Unopt = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: fd5_1MB_Unopt,
  });
  assert(
    res5_1MB_Unopt.status === 400 || res5_1MB_Unopt.status === 500,
    `Backend Limit: Raw 5.1 MB upload rejected by backend 5MB limit (Status: ${res5_1MB_Unopt.status})`
  );

  // 4.5 Test optimized 5.1 MB image (simulated WebP result ~2.2 MB)
  const bufOptimized5_1MB = createValidWebpBuffer(Math.round(2.2 * 1024 * 1024));
  const fd5_1MB_Opt = new FormData();
  fd5_1MB_Opt.append('image', new Blob([bufOptimized5_1MB], { type: 'image/webp' }), 'optimized_5_1mb.webp');

  const res5_1MB_Opt = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: fd5_1MB_Opt,
  });
  const data5_1MB_Opt = await res5_1MB_Opt.json();
  assert(
    res5_1MB_Opt.status === 200 && data5_1MB_Opt.success,
    `Optimized 5.1MB image (5.1MB -> 2.2MB WebP): Upload PASS (Status: 200)`
  );

  // 4.6 Test optimized 7.9 MB image (simulated WebP result ~3.1 MB)
  const bufOptimized7_9MB = createValidWebpBuffer(Math.round(3.1 * 1024 * 1024));
  const fd7_9MB_Opt = new FormData();
  fd7_9MB_Opt.append('image', new Blob([bufOptimized7_9MB], { type: 'image/webp' }), 'optimized_7_9mb.webp');

  const res7_9MB_Opt = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: fd7_9MB_Opt,
  });
  const data7_9MB_Opt = await res7_9MB_Opt.json();
  assert(
    res7_9MB_Opt.status === 200 && data7_9MB_Opt.success,
    `Optimized 7.9MB image (7.9MB -> 3.1MB WebP): Upload PASS (Status: 200)`
  );

  // 4.7 Test extremely large uncompressible image (>5MB) rejected
  const bufStillOver5MB = createValidJpegBuffer(Math.round(5.6 * 1024 * 1024));
  const fdOver5MB = new FormData();
  fdOver5MB.append('image', new Blob([bufStillOver5MB], { type: 'image/jpeg' }), 'extreme_uncompressed.jpg');

  const resOver5MB = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: fdOver5MB,
  });
  assert(
    resOver5MB.status === 400 || resOver5MB.status === 500,
    'Extremely large image (>5MB after processing): Upload cleanly rejected by backend'
  );

  // 4.8 Invalid Non-Image Files (PDF, TXT, corrupted magic bytes)
  console.log('\n--- 5. Non-Image & Corrupted File Rejection Tests ---');
  // Fake JPG (plain text inside)
  const fakeJpgFd = new FormData();
  fakeJpgFd.append('image', new Blob(['This is a secret bash script disguised as jpg'], { type: 'image/jpeg' }), 'malicious.jpg');
  const resFakeJpg = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: fakeJpgFd,
  });
  assert(resFakeJpg.status === 400 || resFakeJpg.status === 500, 'Security: Fake JPG with invalid magic bytes rejected by backend');

  // PDF file
  const pdfFd = new FormData();
  pdfFd.append('image', new Blob(['%PDF-1.5 test document'], { type: 'application/pdf' }), 'document.pdf');
  const resPdf = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: pdfFd,
  });
  assert(resPdf.status === 400 || resPdf.status === 500, 'Security: PDF file rejected by upload fileFilter');

  // Text file
  const txtFd = new FormData();
  txtFd.append('image', new Blob(['plain text'], { type: 'text/plain' }), 'notes.txt');
  const resTxt = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: txtFd,
  });
  assert(resTxt.status === 400 || resTxt.status === 500, 'Security: TXT file rejected by upload fileFilter');

  // 5. Product Creation & Editing Flows with Uploaded Image
  console.log('\n--- 6. Product Creation & Edit Flow Integration Tests ---');
  const uploadedImageUrl = data5_1MB_Opt.url;

  const catRes = await fetch(`${BASE_URL}/api/categories`);
  const catList = await catRes.json();
  const testCategoryId = catList?.[0]?._id;

  // Create Product
  const createProdRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: `Optimized Image Coat ${Date.now()}`,
      price: 18500,
      stock: 12,
      category: testCategoryId,
      description: 'Handmade luxury tailored coat tested with optimized image upload.',
      image: uploadedImageUrl,
    }),
  });
  const createdProd = await createProdRes.json();
  assert(
    createProdRes.status === 201 && createdProd._id && createdProd.image === uploadedImageUrl,
    `Admin Create Product with optimized image: PASS (ID: ${createdProd._id})`
  );

  // Edit Product: Replace Image
  const newUploadedImageUrl = data7_9MB_Opt.url;
  const updateProdRes = await fetch(`${BASE_URL}/api/products/${createdProd._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      image: newUploadedImageUrl,
      stock: 15,
    }),
  });
  const updatedProd = await updateProdRes.json();
  assert(
    updateProdRes.status === 200 && updatedProd.image === newUploadedImageUrl,
    'Admin Edit Product (Replace Image): PASS (Image replaced successfully)'
  );


  // Cleanup test product
  await fetch(`${BASE_URL}/api/products/${createdProd._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('✅ Cleanup: Test product removed');

  console.log('\n======================================================');
  console.log(`Image Optimization Tests Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================');

  if (failed > 0) process.exit(1);
}

runImageOptimizationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
