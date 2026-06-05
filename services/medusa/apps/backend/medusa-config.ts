import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

export default defineConfig({
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: {
      connection: {
        // Keep a minimum of 2 connections alive at all times so the first
        // request after a quiet period doesn't pay a cold reconnection penalty.
        pool: { min: 2, max: 10, idleTimeoutMillis: 300000 },
      },
    },
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              prefix: "uploads",
            },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/product-attributes",
    },
    {
      resolve: "./src/modules/product-details",
    },
    {
      resolve: "./src/modules/product-specs",
    },
    {
      resolve: "./src/modules/inventory-management",
    },
    {
      resolve: "./src/modules/auction",
    },
    {
      resolve: "./src/modules/offers",
    },
  ],
})
