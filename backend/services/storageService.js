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
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'velor/products',
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
      console.error('Cloudinary upload failed, falling back to local storage:', cloudErr.message);
      // Fall through to local storage if Cloudinary fails
    }
  }

  // 2. Local Static Storage fallback
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
 * Will not throw fatal errors if image is already gone.
 *
 * @param {string} imageUrlOrPublicId
 */
export const deleteImage = async (imageUrlOrPublicId) => {
  if (!imageUrlOrPublicId || typeof imageUrlOrPublicId !== 'string') return;

  const target = imageUrlOrPublicId.trim();

  // Cloudinary image
  if (isCloudinaryConfigured() && target.includes('cloudinary.com')) {
    try {
      // Extract public_id from URL: e.g. .../upload/v12345/velor/products/abc.jpg -> velor/products/abc
      const match = target.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
      const publicId = match ? match[1] : target;
      await cloudinary.uploader.destroy(publicId);
      return;
    } catch (err) {
      console.warn('Failed to delete image from Cloudinary:', err.message);
    }
  }

  // Local storage image
  if (target.includes('/uploads/')) {
    try {
      const filename = path.basename(target);
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      console.warn('Failed to delete local upload file:', err.message);
    }
  }
};
