import mongoose from 'mongoose';
import dns from 'dns';

// Ensure DNS SRV resolution succeeds on Windows / local ISP DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in environments where custom DNS servers cannot be set
}

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME || 'velor',
    });
    console.log('✅ Connected to MongoDB Atlas (database: velor)');
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message || error);
    process.exit(1);
  }
};

export default connectDB;

