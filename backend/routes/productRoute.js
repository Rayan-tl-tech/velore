import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  searchProducts,
} from "../services/productService.js";
import uploadMiddleware from "../middlewares/uploadMiddleware.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import { validateObjectIdParam } from "../middlewares/validateObjectId.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  uploadMiddleware("image"),
  async (req, res, next) => {
    try {
      const product = await createProduct(req.body, req.file);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }
);

router.get("/", async (_req, res, next) => {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (error) {
    next(error);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const products = await searchProducts(req.query.keyword || "");
    res.json(products);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", validateObjectIdParam('id'), async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id);
    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  validateObjectIdParam('id'),
  uploadMiddleware("image"),
  async (req, res, next) => {
    try {
      const product = await updateProduct(req.params.id, req.body, req.file);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  validateObjectIdParam('id'),
  async (req, res, next) => {
    try {
      const product = await deleteProduct(req.params.id);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
