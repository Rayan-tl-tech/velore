import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

/**
 * Check if Cloudinary credentials are fully defined in the environment.
 */
export const isCloudinaryConfigured = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  return Boolean(
    CLOUDINARY_CLOUD_NAME &&
    CLOUDINARY_API_KEY &&
    CLOUDINARY_API_SECRET &&
    CLOUDINARY_CLOUD_NAME.trim() !== '' &&
    CLOUDINARY_API_KEY.trim() !== '' &&
    CLOUDINARY_API_SECRET.trim() !== ''
  );
};

// Initialize Cloudinary if credentials exist
if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: process.env.CLOUDINARY_API_KEY.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
    secure: true,
  });
}

/**
 * Upload an image file to the configured storage provider (Cloudinary or local static storage).
 *
 * @param {Express.Multer.File} file - Multer file object from request
 * @param {import('express').Request} [req] - Express request for resolving host in local mode
 * @returns {Promise<{ url: string, publicId: string, provider: 'cloudinary' | 'local' }>}
 */
export const uploadImage = async (file, req = null) => {
  if (!file || !file.path) {
    throw new Error('No valid file provided for upload.');
  }

  // 1. Cloudinary upload if configured
  if (isCloudinaryConfigured()) {
    try {
      // Isolate test uploads from production / development catalogs
      const folder = process.env.NODE_ENV === 'test' ? 'velor/test/products' : 'velor/products';

      const result = await cloudinary.uploader.upload(file.path, {
        folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      });

      // Clean up local temp file after successful cloud upload
      try {
        await fs.promises.unlink(file.path);
      } catch (unlinkErr) {
        console.warn('Failed to clean up temporary upload file:', unlinkErr.message);
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
        provider: 'cloudinary',
      };
    } catch (cloudErr) {
      console.error('Cloudinary upload failed:', cloudErr.message);
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Image upload failed: Cloud storage service unavailable.');
      }
      // Fall through to local storage only in development mode
    }
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('Cloud storage is not configured. Local fallback is disabled in production.');
  }

  // 2. Local Static Storage fallback (Development only)
  const host = req ? `${req.protocol}://${req.get('host')}` : '';
  const fileUrl = `${host}/uploads/${file.filename}`;

  return {
    url: fileUrl,
    publicId: file.filename,
    provider: 'local',
  };
};

/**
 * Safely delete an image from storage (Cloudinary or local disk).
 * Returns true if deletion is confirmed, false if deletion failed or could not be confirmed.
 *
 * @param {string} imageUrlOrPublicId
 * @returns {Promise<boolean>}
 */
export const deleteImage = async (imageUrlOrPublicId) => {
  if (!imageUrlOrPublicId || typeof imageUrlOrPublicId !== 'string') {
    return false;
  }

  const target = imageUrlOrPublicId.trim();
  if (!target) {
    return false;
  }

  // 1. Cloudinary image
  if (isCloudinaryConfigured() && target.includes('cloudinary.com')) {
    try {
      // Extract public_id from URL: e.g. .../upload/v12345/velor/products/abc.jpg -> velor/products/abc
      const match = target.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
      const publicId = match ? match[1] : target;
      const res = await cloudinary.uploader.destroy(publicId);

      // Verify explicit confirmation from Cloudinary API
      if (res && res.result === 'ok') {
        return true;
      }

      console.warn(`Cloudinary deletion not confirmed for '${publicId}': result='${res?.result || 'unknown'}'`);
      return false;
    } catch (err) {
      console.warn('Failed to delete image from Cloudinary:', err.message);
      return false;
    }
  }

  // 2. Local storage image
  if (
    target.includes('/uploads/') ||
    target.includes('\\uploads\\') ||
    (!target.includes('/') && !target.includes('\\') && fs.existsSync(path.join(uploadsDir, target)))
  ) {
    try {
      const filename = path.basename(target);
      const filePath = path.join(uploadsDir, filename);

      // Check if file exists prior to deletion attempt
      if (!fs.existsSync(filePath)) {
        console.warn(`Local image file already inexistent: '${filePath}'`);
        return false;
      }

      await fs.promises.unlink(filePath);

      // Verify that file genuinely no longer exists on disk
      if (!fs.existsSync(filePath)) {
        return true;
      }

      console.error(`Local image file still exists after deletion attempt: '${filePath}'`);
      return false;
    } catch (err) {
      console.warn('Failed to delete local upload file:', err.message);
      return false;
    }
  }

  return false;
};
