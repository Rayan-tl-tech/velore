import dotenv from 'dotenv';
dotenv.config();
import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch {}
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Category from './models/categoryModel.js';
import Product from './models/productModel.js';
import User from './models/userModel.js';

const velorProducts = [
  {
    name: "Essential Structured Shirt",
    price: 6900,
    categoryName: "Women",
    description: "Tailored silhouette in breathable cotton with structured collar and mother-of-pearl buttons.",
    image: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&h=1000&fit=crop",
    stock: 30,
  },
  {
    name: "Relaxed Cotton Overshirt",
    price: 7400,
    categoryName: "Men",
    description: "Mid-weight brushed cotton canvas with tonal stitching and utility chest pockets.",
    image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&h=1000&fit=crop",
    stock: 25,
  },
  {
    name: "Tailored Wool-Blend Coat",
    price: 14800,
    categoryName: "Women",
    description: "Double-breasted outerwear woven from virgin wool blend with notched lapels and horn buttons.",
    image: "https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?w=800&h=1000&fit=crop",
    stock: 18,
  },
  {
    name: "Modern Denim Set",
    price: 9800,
    categoryName: "Men",
    description: "Selvedge-inspired indigo wash set with clean architectural cut and understated hardware.",
    image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&h=1000&fit=crop",
    stock: 20,
  },
  {
    name: "Classic Weekend Jacket",
    price: 11200,
    categoryName: "Men",
    description: "Water-resistant commuter jacket with minimal collar and custom brushed-metal zip.",
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&h=1000&fit=crop",
    stock: 22,
  },
  {
    name: "Fine Rib Everyday Top",
    price: 4500,
    categoryName: "Women",
    description: "Ultra-soft micro-rib modal knit designed for clean layering and daily comfort.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=1000&fit=crop",
    stock: 40,
  },
  {
    name: "Soft Motion Sweatshirt",
    price: 3900,
    categoryName: "Kids",
    description: "Organic loopback fleece pullover engineered for unrestricted playtime and soft handfeel.",
    image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&h=1000&fit=crop",
    stock: 35,
  },
  {
    name: "Mini Everyday Coat",
    price: 6200,
    categoryName: "Kids",
    description: "Insulated weather-resistant toddler coat with hidden snaps and warm quilted lining.",
    image: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&h=1000&fit=crop",
    stock: 25,
  },
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'ecommerce' });
    console.log('Connected to MongoDB.');

    // 1. Seed or Verify Users
    const existingAdmin = await User.findOne({ email: 'admin@velor.com' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('Admin1234!', 10);
      await User.create({
        name: 'VÉLOR Admin',
        email: 'admin@velor.com',
        password: hashedPassword,
        role: 'admin',
        phone: '0550123456',
        wilaya: 'Alger',
        commune: 'Hydra',
        address: 'Boulevard de la Liberté',
      });
      console.log('Admin account created: admin@velor.com / Admin1234!');
    } else {
      console.log('Admin account already exists.');
    }

    const existingUser = await User.findOne({ email: 'client@velor.com' });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('Client1234!', 10);
      await User.create({
        name: 'Amina Mansouri',
        email: 'client@velor.com',
        password: hashedPassword,
        role: 'user',
        phone: '0661234567',
        wilaya: 'Oran',
        commune: 'Oran',
        address: 'Rue Ben M’hidi',
      });
      console.log('Customer account created: client@velor.com / Client1234!');
    }

    // 2. Ensure Categories
    const categoriesMap = {};
    for (const catName of ['Men', 'Women', 'Kids']) {
      let cat = await Category.findOne({ name: catName });
      if (!cat) {
        cat = await Category.create({ name: catName });
        console.log(`Created Category: ${catName}`);
      }
      categoriesMap[catName] = cat._id;
    }

    // 3. Seed Products if empty or update
    for (const item of velorProducts) {
      const categoryId = categoriesMap[item.categoryName];
      const existingProd = await Product.findOne({ name: item.name, category: categoryId });
      if (!existingProd) {
        await Product.create({
          name: item.name,
          price: item.price,
          description: item.description,
          stock: item.stock,
          image: item.image,
          category: categoryId,
        });
        console.log(`Created product: ${item.name} (${item.categoryName})`);
      } else {
        // Ensure price is accurate
        existingProd.price = item.price;
        existingProd.image = item.image;
        if (existingProd.stock <= 0) existingProd.stock = item.stock;
        await existingProd.save();
      }
    }

    console.log('VÉLOR Database seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
