import dotenv from 'dotenv';
dotenv.config();
import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch {}
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Category from './models/categoryModel.js';
import Product from './models/productModel.js';
import User from './models/userModel.js';
import { getDatabaseName } from './config/db.js';

const FORBIDDEN_DATABASES = ['velor', 'velor_prod', 'production', 'velor_dev'];

const velorProducts = [
  // New Arrivals / Women
  {
    name: "Essential Structured Shirt",
    price: 6900,
    categoryName: "Women",
    description: "Tailored silhouette in breathable cotton with structured collar and mother-of-pearl buttons.",
    image: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&h=1000&fit=crop",
    stock: 30,
  },
  // New Arrivals / Men
  {
    name: "Relaxed Cotton Overshirt",
    price: 7400,
    categoryName: "Men",
    description: "Mid-weight brushed cotton canvas with tonal stitching and utility chest pockets.",
    image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&h=1000&fit=crop",
    stock: 25,
  },
  // New Arrivals / Women
  {
    name: "Tailored Wool-Blend Coat",
    price: 14800,
    categoryName: "Women",
    description: "Double-breasted outerwear woven from virgin wool blend with notched lapels and horn buttons.",
    image: "https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?w=800&h=1000&fit=crop",
    stock: 18,
  },
  // New Arrivals / Men
  {
    name: "Modern Denim Set",
    price: 9800,
    categoryName: "Men",
    description: "Selvedge-inspired indigo wash set with clean architectural cut and understated hardware.",
    image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&h=1000&fit=crop",
    stock: 20,
  },
  // Men's Collection
  {
    name: "Brushed Canvas Overshirt",
    price: 7400,
    categoryName: "Men",
    description: "Textured tactile overshirt with clean collar line and natural corozo buttons.",
    image: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=800&h=1000&fit=crop",
    stock: 25,
  },
  {
    name: "Architectural Trench",
    price: 13500,
    categoryName: "Men",
    description: "Clean silhouette trench cut from water-resistant compact cotton with storm flap and horn buttons.",
    image: "https://images.unsplash.com/photo-1480429370139-e0132c086e2a?w=800&h=1000&fit=crop",
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
    name: "Tailored Navy Wool Suit",
    price: 18900,
    categoryName: "Men",
    description: "Precision-cut two-piece suit crafted from superfine virgin wool with subtle canvassing.",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=1000&fit=crop",
    stock: 15,
  },
  // Women's Collection
  {
    name: "Mediterranean Wrap Dress",
    price: 8900,
    categoryName: "Women",
    description: "Fluid draped midi dress with adjustable tie belt cut from breezy linen-viscose blend.",
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&h=1000&fit=crop",
    stock: 25,
  },
  {
    name: "Atelier Ruffle Evening Coat",
    price: 16500,
    categoryName: "Women",
    description: "Dramatic sculptural evening coat with subtle ruffle collar in structured crepe weave.",
    image: "https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=800&h=1000&fit=crop",
    stock: 12,
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
    name: "Pleated Summer Poplin Dress",
    price: 7900,
    categoryName: "Women",
    description: "Crisp organic cotton poplin dress featuring delicate sunburst pleats and a relaxed drape.",
    image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&h=1000&fit=crop",
    stock: 20,
  },
  // Kids' Collection
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
  {
    name: "Cotton Dot Smock Blouse",
    price: 3500,
    categoryName: "Kids",
    description: "Airy woven cotton blouse with subtle micro-dot texture and elasticated cuffs.",
    image: "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800&h=1000&fit=crop",
    stock: 30,
  },
  {
    name: "Denim & Plaid Play Set",
    price: 5400,
    categoryName: "Kids",
    description: "Two-piece utility play set with lightweight denim trousers and soft brushed cotton shirt.",
    image: "https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?w=800&h=1000&fit=crop",
    stock: 20,
  },
];

async function seed() {
  let isConnected = false;

  try {
    // 1. Pre-connection safety checks
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'SAFETY ABORT: Seeding is strictly restricted to test environment (NODE_ENV must be "test").'
      );
    }

    const targetDb = getDatabaseName();
    if (targetDb !== 'velor_test') {
      throw new Error(
        `SAFETY ABORT: Target database must strictly be 'velor_test', got '${targetDb}'.`
      );
    }

    if (!process.env.MONGO_URI) {
      throw new Error('SAFETY ABORT: MONGO_URI environment variable is required.');
    }

    console.log(`Connecting to MongoDB Atlas (target database: ${targetDb})...`);
    await mongoose.connect(process.env.MONGO_URI, { dbName: targetDb });
    isConnected = true;

    // 2. Post-connection real database name verification
    const activeDb = mongoose.connection.name;
    if (activeDb !== 'velor_test' || FORBIDDEN_DATABASES.includes(activeDb)) {
      throw new Error(
        `CRITICAL SAFETY ABORT: Active database is '${activeDb}', strictly forbidden. Required: 'velor_test'. Aborting.`
      );
    }

    console.log(`✅ Verified active MongoDB database: "${activeDb}".`);

    // 3. Seed or Verify Users (conforming to User schema: roles array)
    // 3.1 Test Admin account (used by regression, phase 3 auth, and phase 4 audit test suites)
    const existingTestAdmin = await User.findOne({ email: 'test123@gmail.com' });
    if (!existingTestAdmin) {
      const hashedPassword = await bcrypt.hash('test123', 10);
      await User.create({
        name: 'VÉLOR Test Admin',
        email: 'test123@gmail.com',
        password: hashedPassword,
        roles: ['admin', 'user'],
        phone: '0550123456',
        wilaya: 'Alger',
        commune: 'Hydra',
        address: 'Boulevard de la Liberté',
      });
      console.log('✅ Test Admin account created: test123@gmail.com');
    } else {
      console.log('ℹ️ Test Admin account already exists (left intact): test123@gmail.com');
    }

    // 3.2 Primary Admin account
    const existingAdmin = await User.findOne({ email: 'admin@velor.com' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('Admin1234!', 10);
      await User.create({
        name: 'VÉLOR Admin',
        email: 'admin@velor.com',
        password: hashedPassword,
        roles: ['admin', 'user'],
        phone: '0550123456',
        wilaya: 'Alger',
        commune: 'Hydra',
        address: 'Boulevard de la Liberté',
      });
      console.log('✅ Admin account created: admin@velor.com');
    } else {
      console.log('ℹ️ Admin account already exists (left intact): admin@velor.com');
    }

    // 3.3 Customer account (used in auth tests)
    const existingUser = await User.findOne({ email: 'client@velor.com' });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('Client1234!', 10);
      await User.create({
        name: 'Amina Mansouri',
        email: 'client@velor.com',
        password: hashedPassword,
        roles: ['user'],
        phone: '0661234567',
        wilaya: 'Oran',
        commune: 'Oran',
        address: 'Rue Ben M’hidi',
      });
      console.log('✅ Customer account created: client@velor.com');
    } else {
      console.log('ℹ️ Customer account already exists (left intact): client@velor.com');
    }

    // 3.4 Secondary Admin account
    const existingRayan = await User.findOne({ email: 'rayanoo1234567890@gmail.com' });
    if (!existingRayan) {
      const hashedPassword = await bcrypt.hash('Rayan1234!', 10);
      await User.create({
        name: 'Rayan Tlili',
        email: 'rayanoo1234567890@gmail.com',
        password: hashedPassword,
        roles: ['admin', 'user'],
        phone: '0550123456',
        wilaya: 'Alger',
        commune: 'Alger Centre',
        address: 'Didouche Mourad',
      });
      console.log('✅ Admin account created: rayanoo1234567890@gmail.com');
    } else {
      console.log('ℹ️ Admin account already exists (left intact): rayanoo1234567890@gmail.com');
    }

    // 4. Ensure Categories (without modifying existing categories)
    const categoriesMap = {};
    for (const catName of ['Men', 'Women', 'Kids']) {
      let cat = await Category.findOne({ name: catName });
      if (!cat) {
        cat = await Category.create({ name: catName });
        console.log(`✅ Created Category: ${catName}`);
      } else {
        console.log(`ℹ️ Category already exists (left intact): ${catName}`);
      }
      categoriesMap[catName] = cat._id;
    }

    // 5. Seed Products (without modifying existing products)
    let createdCount = 0;
    let untouchedCount = 0;
    for (const item of velorProducts) {
      const categoryId = categoriesMap[item.categoryName];
      const prod = await Product.findOne({ name: item.name });
      if (!prod) {
        const createdProd = await Product.create({
          name: item.name,
          price: item.price,
          description: item.description,
          stock: item.stock,
          image: item.image,
          category: categoryId,
        });
        createdCount++;
        console.log(`✅ Created product [${createdProd._id}]: ${item.name} (${item.categoryName})`);
      } else {
        untouchedCount++;
        console.log(`ℹ️ Product already exists (left intact): ${item.name}`);
      }
    }

    const totalProds = await Product.countDocuments();
    const totalCats = await Category.countDocuments();
    const totalUsers = await User.countDocuments();

    console.log(`\n🎉 VÉLOR Database "${activeDb}" seeding complete!`);
    console.log(`   - Products: ${totalProds} (newly created: ${createdCount}, intact: ${untouchedCount})`);
    console.log(`   - Categories: ${totalCats}`);
    console.log(`   - Users: ${totalUsers}`);
  } catch (err) {
    console.error('❌ Seeding error:', err.message || err);
    process.exitCode = 1;
  } finally {
    if (isConnected || mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB cleanly.');
      } catch (discErr) {
        console.error('❌ Error during MongoDB disconnect:', discErr.message || discErr);
      }
    }
  }
}

seed();
