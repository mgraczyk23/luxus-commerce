import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

export default defineConfig({
  admin: {
    backendUrl: process.env.ADMIN_CORS || "http://localhost:9000",
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
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
  ],
})
