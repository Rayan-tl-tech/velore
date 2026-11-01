import mongoose from 'mongoose';
import dns from 'dns';

// Ensure DNS SRV resolution succeeds on Windows / local ISP DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in environments where custom DNS servers cannot be set
}

const FORBIDDEN_PROD_DATABASES = ['velor_test', 'velor_dev', 'test', 'testdb', 'ecommerce'];

/**
 * Resolves target database name strictly enforcing test, development and production isolation.
 * - In 'test' mode: strictly forces 'velor_test'. No env var can override to velor/dev/prod.
 * - In 'production' mode: strictly requires explicit DB_NAME='velor' (whitelist).
 *   Missing, empty, or any value other than 'velor' causes an immediate fail-closed termination.
 * - In 'development' mode: uses process.env.DB_NAME if explicitly configured, otherwise 'velor_dev'.
 */
export const getDatabaseName = () => {
  const env = process.env.NODE_ENV;

  if (env === 'test') {
    return 'velor_test';
  }

  if (env === 'production') {
    const prodDb = process.env.DB_NAME;
    if (!prodDb || typeof prodDb !== 'string' || prodDb.trim() !== 'velor') {
      throw new Error(
        `CRITICAL SECURITY CONFIGURATION ERROR: Production environment (NODE_ENV=production) strictly requires explicit DB_NAME='velor'. Received: '${prodDb || 'undefined'}'. Refusing to start.`
      );
    }
    return 'velor';
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

    // Critical guard: in production mode, strictly enforce targetDb === 'velor'
    if (process.env.NODE_ENV === 'production' && targetDb !== 'velor') {
      throw new Error(`CRITICAL PRE-CONNECT ABORT: Production environment strictly requires target database 'velor', got '${targetDb}'.`);
    }

    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is required');
    }

    await mongoose.connect(process.env.MONGO_URI, {
      dbName: targetDb,
      maxPoolSize: 20,
      minPoolSize: 0,
    });

    const activeDb = mongoose.connection.name;
    const currentEnv = process.env.NODE_ENV || 'development';

    // Post-connection safety verification
    if (process.env.NODE_ENV === 'test' && activeDb !== 'velor_test') {
      await mongoose.disconnect();
      throw new Error(`CRITICAL POST-CONNECT ABORT: Test environment connected to '${activeDb}' instead of 'velor_test'.`);
    }

    if (process.env.NODE_ENV === 'production' && activeDb !== 'velor') {
      await mongoose.disconnect();
      throw new Error(`CRITICAL POST-CONNECT ABORT: Production environment connected to '${activeDb}' instead of strictly 'velor'.`);
    }

    console.log(`✅ Connected to MongoDB Atlas (environment: ${currentEnv}, database: ${activeDb})`);
    return mongoose.connection;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message || error);
    throw error;
  }
};

export default connectDB;
