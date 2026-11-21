import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'pricehub',
    user: process.env.DB_USER || 'pricehub',
    password: process.env.DB_PASSWORD || 'pricehub_dev',
    ssl: process.env.DB_SSL === 'true',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // Refresh cookie `Secure` flag. On by default in production (HTTPS behind the proxy);
  // COOKIE_SECURE=false only for a plain-HTTP deployment (e.g. a LAN test box).
  cookieSecure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === 'true'
    : process.env.NODE_ENV === 'production',

  logLevel: process.env.LOG_LEVEL || 'debug',

  gcs: {
    bucketName: process.env.GCS_BUCKET_NAME || '',
    projectId: process.env.GCS_PROJECT_ID || '',
    keyFile: process.env.GCS_KEY_FILE || '',
  },

  storage: {
    // If GCS_BUCKET_NAME is empty, use local filesystem
    useLocal: !process.env.GCS_BUCKET_NAME,
    localUploadsDir: process.env.LOCAL_UPLOADS_DIR || './uploads',
  },
};
