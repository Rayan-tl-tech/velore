import mongoose from 'mongoose';
import dns from 'dns';

// Ensure DNS SRV resolution succeeds on Windows / local ISP DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in environments where custom DNS servers cannot be set
}

/**
 * Resolves target database name strictly enforcing test isolation.
 * - In 'test' mode: strictly forces 'velor_test'. No env var can override to velor/dev/prod.
 * - In 'production' mode: preserves current behavior (process.env.DB_NAME || 'velor')
 *   to avoid accidental breaking of Render production before configuration confirmation.
 * - In 'development' mode: uses process.env.DB_NAME if explicitly configured, otherwise 'velor_dev'.
 */
export const getDatabaseName = () => {
  const env = process.env.NODE_ENV;

  if (env === 'test') {
    return 'velor_test';
  }

  if (env === 'production') {
    return process.env.DB_NAME || 'velor';
  }

  return process.env.DB_NAME || 'velor_dev';
};

const connectDB = async () => {
  try {
    const targetDb = getDatabaseName();

    // Critical guard: in test mode, ensure targetDb is strictly 'velor_test'
    if (process.env.NODE_ENV === 'test' && targetDb !== 'velor_test') {
      throw new Error(`Inconsistent test configuration: expected database 'velor_test', got '${targetDb}'`);
    }

    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is required');
    }

    await mongoose.connect(process.env.MONGO_URI, {
      dbName: targetDb,
    });

    const activeDb = mongoose.connection.name;
    const currentEnv = process.env.NODE_ENV || 'development';
    console.log(`✅ Connected to MongoDB Atlas (environment: ${currentEnv}, database: ${activeDb})`);
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message || error);
    process.exit(1);
  }
};

export default connectDB;

