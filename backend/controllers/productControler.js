import { 
  createProduct, 
  getAllProducts, 
  getProductById, 
  updateProduct, 
  deleteProduct,
  searchProducts 
} from "../services/productService.js";

export const createProductController = async (req, res) => {
  try {
    const product = await createProduct(req.body, req.file);
    res.status(201).json({ message: 'Product created successfully', success: true, product });
  } catch (error) {
    res.status(400).json({ message: 'Failed to create product', success: false, error: error.message });
  }
};

export const getAllProductsController = async (_req, res) => {
  try {
    const products = await getAllProducts();
    res.status(200).json({ message: 'Products retrieved successfully', success: true, products });
  } catch (error) {
    res.status(400).json({ message: 'Failed to retrieve products', success: false, error: error.message });
  }
};

export const getProductByIdController = async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found', success: false });
    res.status(200).json({ message: 'Product retrieved successfully', success: true, product });
  } catch (error) {
    res.status(400).json({ message: 'Failed to retrieve product', success: false, error: error.message });
  }
};

export const updateProductController = async (req, res) => {
  try {
    const updatedProduct = await updateProduct(req.params.id, req.body, req.file);
    if (!updatedProduct) return res.status(404).json({ message: 'Product not found', success: false });
    res.status(200).json({ message: 'Product updated successfully', success: true, updatedProduct });
  } catch (error) {
    res.status(400).json({ message: 'Failed to update product', success: false, error: error.message });
  }
};

export const deleteProductController = async (req, res) => {
  try {
    const deletedProduct = await deleteProduct(req.params.id);
    if (!deletedProduct) return res.status(404).json({ message: 'Product not found', success: false });
    res.status(200).json({ message: 'Product deleted successfully', success: true });
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete product', success: false, error: error.message });
  }
};

export const searchProductsController = async (req, res) => {
  try {
    const { keyword } = req.query;
    const products = await searchProducts(keyword);
    res.status(200).json({ message: 'Products retrieved successfully', success: true, products });
  } catch (error) {
    res.status(400).json({ message: 'Failed to retrieve products', success: false, error: error.message });
  }
};
