/**
 * VÉLOR — Intelligent Product Image Optimizer
 * 
 * Rules:
 * 1. If file size <= 5MB -> DO NOT compress or resize. Return original file unchanged.
 * 2. If file size > 5MB -> Automatically optimize in-browser:
 *    - Resize excessively large dimensions (e.g. 4000x3000 -> 2400-2000px).
 *    - Maintain high visual quality (85-90% WebP / JPEG).
 *    - Target size < 5MB (aiming for ~2-4MB for maximum fidelity).
 *    - If an extreme file still exceeds 5MB after reasonable attempts, refuse cleanly.
 */

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB in bytes (5,242,880 bytes)

/**
 * Format bytes into human-readable size string (e.g. "500 KB", "2.4 MB")
 */
export const formatFileSize = (bytes) => {
  if (bytes == null || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Check if a file exceeds the 5MB upload threshold
 */
export const shouldOptimizeImage = (file) => {
  if (!file || typeof file.size !== 'number') return false;
  return file.size > MAX_UPLOAD_SIZE;
};

/**
 * Load image file into an Image or ImageBitmap source
 */
const loadImageSource = (file) => {
  return new Promise((resolve, reject) => {
    // Attempt modern createImageBitmap first (respects EXIF orientation)
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file, { imageOrientation: 'from-image' })
        .then((bitmap) => {
          resolve({
            source: bitmap,
            width: bitmap.width,
            height: bitmap.height,
            close: () => bitmap.close?.(),
          });
        })
        .catch(() => {
          // Fallback to HTMLImageElement
          loadViaHtmlImage(file).then(resolve).catch(reject);
        });
    } else {
      loadViaHtmlImage(file).then(resolve).catch(reject);
    }
  });
};

const loadViaHtmlImage = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        close: () => URL.revokeObjectURL(objectUrl),
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read selected image. Please ensure the file is a valid, uncorrupted image.'));
    };

    img.src = objectUrl;
  });
};

/**
 * Render image onto a high-quality canvas and export to Blob
 */
const renderCanvasBlob = (source, targetWidth, targetHeight, mimeType, quality) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      return reject(new Error('Canvas 2D context is not available.'));
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // If source has transparency and converting to JPEG, fill white background
    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

    canvas.toBlob(
      (blob) => {
        // Free canvas memory
        canvas.width = 0;
        canvas.height = 0;

        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to encode image on canvas.'));
        }
      },
      mimeType,
      quality
    );
  });
};

/**
 * Calculate scaled dimensions fitting within a max bounding box while preserving aspect ratio
 */
const calculateDimensions = (origWidth, origHeight, maxDimension) => {
  if (origWidth <= maxDimension && origHeight <= maxDimension) {
    return { width: origWidth, height: origHeight };
  }

  const ratio = Math.min(maxDimension / origWidth, maxDimension / origHeight);
  return {
    width: Math.max(1, Math.round(origWidth * ratio)),
    height: Math.max(1, Math.round(origHeight * ratio)),
  };
};

/**
 * Main optimizer function:
 * - If file <= 5MB -> returns original file untouched.
 * - If file > 5MB -> performs multi-pass high-fidelity optimization.
 * 
 * @param {File} file - Original browser File object
 * @param {object} [options]
 * @returns {Promise<{ file: File, optimized: boolean, originalSize: number, finalSize: number, dimensions?: { width: number, height: number } }>}
 */
export const optimizeImageIfNeeded = async (file, options = {}) => {
  if (!file) {
    throw new Error('No file provided for optimization.');
  }

  const originalSize = file.size;

  // 1. STRICT RULE: DO NOT compress if already <= 5MB
  if (originalSize <= MAX_UPLOAD_SIZE) {
    return {
      file,
      optimized: false,
      originalSize,
      finalSize: originalSize,
    };
  }

  // 2. Optimization required (> 5MB)
  let loadedImage = null;
  try {
    loadedImage = await loadImageSource(file);
    const { source, width: origWidth, height: origHeight } = loadedImage;

    // Check preferred format: WebP first, fallback to JPEG if needed
    let preferredMime = 'image/webp';
    let fileExtension = '.webp';

    // Progressive optimization passes prioritizing maximum visual quality
    const passes = [
      // Pass 1: Max 2400px, 90% quality (Ideal for retina / zoom details, ~2-4MB output)
      { maxDim: 2400, quality: 0.90 },
      // Pass 2: Max 2200px, 86% quality (High detail, slightly smaller)
      { maxDim: 2200, quality: 0.86 },
      // Pass 3: Max 2000px, 82% quality (Balanced e-commerce standard)
      { maxDim: 2000, quality: 0.82 },
      // Pass 4: Max 1800px, 78% quality (Final safety pass for extreme 15MB+ photos)
      { maxDim: 1800, quality: 0.78 },
    ];

    let finalBlob = null;
    let finalDimensions = null;
    let successfulPass = null;

    for (const pass of passes) {
      const { width: targetWidth, height: targetHeight } = calculateDimensions(
        origWidth,
        origHeight,
        pass.maxDim
      );

      let blob = await renderCanvasBlob(
        source,
        targetWidth,
        targetHeight,
        preferredMime,
        pass.quality
      );

      // Verify that browser actually exported WebP (some very old browsers fall back to PNG)
      if (preferredMime === 'image/webp' && blob.type !== 'image/webp') {
        preferredMime = 'image/jpeg';
        fileExtension = '.jpg';
        blob = await renderCanvasBlob(
          source,
          targetWidth,
          targetHeight,
          preferredMime,
          pass.quality
        );
      }

      if (blob.size <= MAX_UPLOAD_SIZE) {
        finalBlob = blob;
        finalDimensions = { width: targetWidth, height: targetHeight };
        successfulPass = pass;
        break; // Successfully brought below 5MB while maintaining highest possible quality!
      }
    }

    // 3. If image is still > 5MB after all reasonable passes (e.g. massive 30MB+ uncompressible file)
    if (!finalBlob || finalBlob.size > MAX_UPLOAD_SIZE) {
      throw new Error(
        `Image is too large (${formatFileSize(originalSize)}) and could not be optimized below 5MB while maintaining acceptable visual quality. Please select a lighter image.`
      );
    }

    // Create a new File object with matching extension and MIME type
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const newFileName = `${cleanBaseName}${fileExtension}`;

    const optimizedFile = new File([finalBlob], newFileName, {
      type: preferredMime,
      lastModified: Date.now(),
    });

    return {
      file: optimizedFile,
      optimized: true,
      originalSize,
      finalSize: optimizedFile.size,
      dimensions: finalDimensions,
      quality: successfulPass?.quality,
    };
  } finally {
    loadedImage?.close?.();
  }
};
