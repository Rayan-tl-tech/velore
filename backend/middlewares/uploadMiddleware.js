import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = allowedExtensions.includes(ext) ? ext : '.jpg';
    const cleanField = String(file.fieldname).replace(/[^a-zA-Z0-9_-]/g, '');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${cleanField || 'image'}-${uniqueSuffix}${safeExt}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype?.toLowerCase();

  // SEC-07: Require valid extension AND strict matching MIME type (no empty/missing bypass)
  if (!mime || !allowedMimeTypes.includes(mime)) {
    return cb(new Error("Invalid file type. Only JPEG, PNG, and WebP images are allowed."), false);
  }

  if (!allowedExtensions.includes(ext)) {
    return cb(new Error("Invalid file extension. Only .jpg, .jpeg, .png, .webp allowed."), false);
  }

  // Cross-verify extension corresponds to MIME type
  const isJpgMatch = (ext === '.jpg' || ext === '.jpeg') && mime === 'image/jpeg';
  const isPngMatch = ext === '.png' && mime === 'image/png';
  const isWebpMatch = ext === '.webp' && mime === 'image/webp';

  if (!isJpgMatch && !isPngMatch && !isWebpMatch) {
    return cb(new Error("File extension does not match its MIME type."), false);
  }

  cb(null, true);
};

// Inspect binary header signatures (magic bytes) to ensure file is genuinely an image
const verifyImageMagicBytes = async (filePath) => {
  let fd;
  try {
    fd = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await fd.read(buffer, 0, 12, 0);
    if (bytesRead < 4) return false;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return true;
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0D &&
      buffer[5] === 0x0A &&
      buffer[6] === 0x1A &&
      buffer[7] === 0x0A
    ) {
      return true;
    }
    // WEBP: RIFF....WEBP
    if (
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    if (fd) await fd.close();
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const uploadMiddleware = (fieldName = "file", maxCount = 1) => {
  return (req, res, next) => {
    const uploader =
      maxCount > 1 ? upload.array(fieldName, maxCount) : upload.single(fieldName);

    uploader(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "File too large. Max 5MB." });
          }
          if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({ message: `Unexpected field: ${fieldName}` });
          }
          return res.status(400).json({ message: err.message });
        }
        return res.status(400).json({ message: err.message });
      }

      // Verify binary magic bytes for all uploaded files
      const filesToCheck = req.files
        ? Array.isArray(req.files) ? req.files : Object.values(req.files).flat()
        : req.file ? [req.file] : [];

      for (const file of filesToCheck) {
        if (file && file.path) {
          const isValid = await verifyImageMagicBytes(file.path);
          if (!isValid) {
            try {
              await fs.promises.unlink(file.path);
            } catch {}
            return res.status(400).json({
              message: "Invalid file content. The uploaded file does not match a valid image signature."
            });
          }
        }
      }

      next();
    });
  };
};

export default uploadMiddleware;
