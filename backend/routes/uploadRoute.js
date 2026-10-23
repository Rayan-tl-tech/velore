import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import roleMiddleware from '../middlewares/roleMiddleware.js';
import uploadMiddleware from '../middlewares/uploadMiddleware.js';
import { uploadImage } from '../services/storageService.js';

const router = express.Router();

/**
 * POST /api/upload
 * Authenticated Admin-only endpoint for uploading product photos.
 * Validates file type (JPEG, PNG, WebP), binary magic bytes, and file size (max 5MB).
 * Uploads to Cloudinary (or local storage fallback) and returns the public HTTPS URL.
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware('admin'),
  uploadMiddleware('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Please select an image file to upload.',
        });
      }

      const result = await uploadImage(req.file, req);

      res.status(200).json({
        success: true,
        url: result.url,
        publicId: result.publicId,
        provider: result.provider,
        message: 'Image uploaded successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
