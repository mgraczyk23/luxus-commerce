# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Luxus Commerce is a headless luxury e-commerce platform composed of three services orchestrated via Docker Compose:

- **Medusa** (`services/medusa/`) — Headless commerce backend (v2.15.1) with custom modules, admin UI, and store/admin APIs. Runs on port 9000.
- **Payload CMS** (`services/payload/`) — Content management system (v3.84.1) built on Next.js 16. Runs on port 3000.
- **MCP Server** (`services/mcp-server/`) — Express TypeScript server connecting to the Medusa database. Runs on port 3002.

Supporting infrastructure (all via Docker Compose): PostgreSQL 16, Redis 7, Meilisearch v1.11, Nginx reverse proxy.

## Running the stack

```bash
# Start all services (production mode)
docker compose up -d

# View logs for a specific service
docker compose logs -f medusa
docker compose logs -f payload
```

## Medusa backend (`services/medusa/`)

This is a Turbo monorepo using npm. The main app lives at `apps/backend/`.

```bash
cd services/medusa

# Local development (runs migrations automatically)
npm run backend:dev          # or: turbo dev --filter=@dtc/backend

# Build for production
npm run build                # or: turbo build

# Seed initial data (run after first migration)
npm run backend:seed

# Tests
cd apps/backend
npm run test:unit
npm run test:integration:http
npm run test:integration:modules
```

Medusa must have `services/medusa/apps/backend/.env` populated (use `.env.template` as reference). Key vars: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`.

## Payload CMS (`services/payload/`)

Uses pnpm.

```bash
cd services/payload

pnpm dev           # development server
pnpm devsafe       # clears .next cache before starting
pnpm build         # production build
pnpm lint

# Type generation (run after changing collections)
pnpm generate:types

# Tests
pnpm test:int      # vitest integration tests (tests/int/**/*.int.spec.ts)
pnpm test:e2e      # playwright e2e tests
```

Payload uses `DATABASE_URL` (pointing to `luxus_payload` database) and `PAYLOAD_SECRET`. See `.env.example`.

## MCP Server (`services/mcp-server/`)

```bash
cd services/mcp-server
npm install
npx tsc           # compile TypeScript to dist/
```

## Architecture: Medusa custom modules

Medusa v2 uses a module system. Each custom module in `apps/backend/src/modules/` follows this pattern:

1. **Model** (`models/`) — defined with `model.define()` from `@medusajs/framework/utils`
2. **Service** (`service.ts`) — extends `MedusaService` with the models
3. **Index** (`index.ts`) — exports the module definition

Custom modules are registered in `apps/backend/medusa-config.ts` and linked to Medusa's built-in modules via `apps/backend/src/links/` using `defineLink()`.

Current custom modules:
- `product-attributes` — `AttributeType` / `AttributeValue` linked to `ProductModule.product` (list relation)
- `product-details` — `ProductDetail` (SEO, serial number, optics-ready flag) linked to product
- `product-specs` — `ProductSpec` linked to product
- `inventory-management` — `InventoryInfo` linked to inventory

## Databases

Two PostgreSQL databases share one Postgres instance:
- `luxus_medusa` — Medusa commerce data
- `luxus_payload` — Payload CMS data (created by `scripts/init-db.sql` on first start)

## Backups

`scripts/backup.sh` dumps both databases and Docker volumes, then uploads to S3 (`s3://luxus-collection-backups/daily/`). Local copies older than 7 days are pruned automatically.
