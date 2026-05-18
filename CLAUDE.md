# Luxus Collection — Composable Commerce Backend

## Project Overview
E-commerce backend for Luxus Collection LLC (luxus-collection.com), a high-end firearms retailer. Sells production firearms from Nighthawk Custom, Cabot Guns, Korth, and similar premium manufacturers. The owner is an FFL holder managing their own inventory.

## Architecture
- **Medusa.js 2.15** commerce engine in Docker on AWS Lightsail (8GB, Ubuntu 24.04)
- **Payload CMS 3.x** (Next.js) for content management
- **PostgreSQL 16**, **Redis 7**, **Meilisearch 1.11**
- **Custom MCP Server** (Express/TypeScript) for AI agent catalog access
- **Nginx** reverse proxy with SSL at api.luxus-collection.com
- Next.js storefront will be on Vercel at luxus-collection.com (not built yet)

## Critical Medusa 2.15 Quirks (READ BEFORE MAKING CHANGES)
- Medusa 2.15 scaffolds as a **Turborepo monorepo**. Backend is at `services/medusa/apps/backend/`
- `node_modules` are **hoisted to monorepo root**, not in `apps/backend/`
- `medusa-config.ts` uses `module.exports` (not `export default`)
- `Module()` import is from `@medusajs/framework/utils` (NOT `@medusajs/framework/modules-sdk`)
- Module names must use **underscores** not hyphens (e.g., `product_attributes` not `product-attributes`)
- `loadEnv()` reads from a **.env file on disk**, not from container environment variables
- `DATABASE_URL` must include `?sslmode=disable` for local Docker PostgreSQL
- Database migrations only work when run from `.medusa/server/` directory
- Docker builds require `--legacy-peer-deps` (React 18/19 peer conflict)
- Docker builds require a **dummy .env** file during build for `medusa build` to succeed
- Admin dashboard is currently **disabled** (`admin: { disable: true }`) due to index.html path resolution issue
- `medusa` binary needs `ENV PATH="/app/node_modules/.bin:$PATH"` in Dockerfile

## Repository Structure
~/luxus-commerce/
├── docker-compose.yml
├── .env                    # Secrets (NOT in Git)
├── nginx/conf.d/api.conf   # Nginx routing + SSL
├── scripts/
│   ├── init-db.sql         # Creates luxus_payload database
│   └── backup.sh           # S3 backup script
└── services/
├── medusa/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── apps/backend/
│       ├── medusa-config.ts
│       └── src/
│           ├── modules/
│           │   ├── product-attributes/  (module name: product_attributes)
│           │   ├── product-details/     (module name: product_details)
│           │   ├── product-specs/       (module name: product_specs)
│           │   └── inventory-management/ (module name: inventory_management)
│           └── links/
│               ├── product-attributes.ts
│               ├── product-details.ts
│               ├── product-specs.ts
│               └── inventory-management.ts
├── payload/
│   ├── Dockerfile
│   └── (Payload 3.x Next.js app, port 3000)
└── mcp-server/
├── Dockerfile
└── src/index.ts    (placeholder health endpoint)

## Custom Modules Built
All four modules have data models, services, module definitions, link definitions to Product, and applied migrations.

### product_attributes (filterable, multi-select)
- AttributeType: id, name, slug, sort_order, hasMany→values
- AttributeValue: id, value, sort_order, belongsTo→attribute_type
- Linked to Product as many-to-many (isList: true)
- Attribute types to seed: Brand, Caliber, Action, Barrel Length, Frame Color, Magazine Capacity

### product_details (one-to-one with Product, partially storefront visible)
- Public fields: short_description, optics_ready (boolean), seo_meta_title, seo_meta_description, thumbnail_url (listing page only — PDP uses Medusa native images array)
- Admin only: serial_number — NEVER expose via store routes (competitor cost tracing risk)

### product_specs (one-to-one with Product, storefront visible, not filterable)
- overall_length, weight, frame_material, grip_material, sight_type, finish_type

### inventory_management (one-to-one with Product, ADMIN ONLY)
- Consignment: is_consignment, consignor_name, consignor_contact, consignor_cost (bigNumber), suggested_sale_price (bigNumber), consignment_notes
- Import tracking: imported_by_luxus, importer_name, importer_mark, importer_mark_location

## Database
- PostgreSQL with two databases: luxus_medusa (141+ tables) and luxus_payload
- User: luxus_admin
- All custom module tables and link tables confirmed present

## Docker Commands
- Build: `docker compose build medusa` (7-15 min)
- Build no-cache: `docker compose build --no-cache medusa`
- Start: `docker compose up -d medusa`
- Logs: `docker compose logs -f medusa`
- Medusa CLI: `docker compose exec medusa sh -c 'cd /app/apps/backend && env > .env && npx medusa db:generate MODULE_NAME'`
- Migrate: `docker compose exec medusa sh -c 'cd /app/apps/backend && npx medusa db:migrate'`

## Build/Deploy Workflow
1. Make code changes in services/medusa/apps/backend/src/
2. `docker compose build medusa`
3. `docker compose up -d medusa`
4. Wait 3-5 min for startup, check `docker compose logs --tail=20 medusa`
5. Verify: `curl -s http://localhost:9000/health`

## Rules
- Never modify Docker infrastructure files without asking — the owner manages infrastructure
- Always use `npm install` not `npm ci` in Dockerfiles
- Test builds locally first: `docker run --rm -v ~/luxus-commerce/services/medusa:/app -w /app/apps/backend node:20-alpine sh -c 'printf "dummy env" > .env && npx medusa build 2>&1 | tail -20'`
- After adding/changing data models: generate migration, run migration, rebuild Docker image
- inventory_management data must NEVER be exposed in store API routes
PROJECTEOF