# Luxus Collection — Technical Changelog
**Date:** 2026-05-14  
**Branch:** master  
**Commit:** e27dcfa  
**Engineer:** Claude Sonnet 4.6 (AI-assisted development)

---

## Table of Contents
1. [Admin Dashboard Login Fix](#1-admin-dashboard-login-fix)
2. [Inventory Management Module — Field Additions](#2-inventory-management-module--field-additions)
3. [Attribute Type Seeding](#3-attribute-type-seeding)
4. [API Routes — All Four Custom Modules](#4-api-routes--all-four-custom-modules)
5. [Bug Fix — query.graph with Custom Module Entities](#5-bug-fix--querygraph-with-custom-module-entities)
6. [Bug Fix — isList Link Field Name](#6-bug-fix--islist-link-field-name)
7. [Bug Fix — MedusaService Pluralization](#7-bug-fix--medusaservice-pluralization)
8. [Bug Fix — Many-to-Many Link Definition](#8-bug-fix--many-to-many-link-definition)
9. [Admin UI Widgets](#9-admin-ui-widgets)
10. [Admin UI Pages (Custom Routes)](#10-admin-ui-pages-custom-routes)
11. [Product Import API](#11-product-import-api)
12. [Infrastructure Changes](#12-infrastructure-changes)

---

## 1. Admin Dashboard Login Fix

### Problem
The Medusa admin dashboard was reachable at `https://api.luxus-collection.com/app` but login failed with a "Failed to fetch" error on the client side.

### Root Cause
Medusa's admin bundle bakes `__BACKEND_URL__` at **build time** from `medusa-config.ts`. The config was reading:

```typescript
// medusa-config.ts (before)
admin: {
  backendUrl: process.env.ADMIN_CORS,
}
```

`ADMIN_CORS` was set to `http://localhost` in the Dockerfile's dummy build environment. This meant every compiled admin bundle had `http://localhost` hard-coded as the backend URL, so all API calls from the browser pointed to localhost instead of the real server.

### Fix

**`services/medusa/apps/backend/medusa-config.ts`**
```typescript
// Before
admin: {
  backendUrl: process.env.ADMIN_CORS,
}

// After
admin: {
  backendUrl: process.env.MEDUSA_BACKEND_URL,
}
```

**`services/medusa/Dockerfile`** — added `MEDUSA_BACKEND_URL` to the dummy build env:
```dockerfile
RUN printf "DATABASE_URL=postgres://dummy:dummy@localhost:5432/dummy\n\
REDIS_URL=redis://localhost:6379\n\
JWT_SECRET=buildsecret\n\
COOKIE_SECRET=buildsecret\n\
STORE_CORS=http://localhost\n\
ADMIN_CORS=http://localhost\n\
AUTH_CORS=http://localhost\n\
MEDUSA_BACKEND_URL=https://api.luxus-collection.com\n" > .env
```

### Key Insight
`loadEnv()` in Medusa reads from a `.env` file on disk, not from the container's process environment. During Docker build, a dummy `.env` is written before `medusa build` runs so TypeScript compilation succeeds. Any env var that gets baked into the bundle must be present in that dummy file with the correct production value.

---

## 2. Inventory Management Module — Field Additions

### Fields Added
Four new fields were added to `InventoryInfo`:

| Field | Type | Purpose |
|---|---|---|
| `item_cost` | `bigNumber` (nullable) | Purchase cost for non-consignment items |
| `is_master_backroom` | `boolean` (default false) | In backroom pool but hidden from VIP display |
| `is_backroom` | `boolean` (default false) | Actively displayed in VIP area |
| `consignor_customer_id` | `text` (nullable) | Links consignor to a Medusa customer account |

### Model (`src/modules/inventory-management/models/inventory-info.ts`)
```typescript
const InventoryInfo = model.define("inventory_info", {
  id: model.id().primaryKey(),
  item_cost: model.bigNumber().nullable(),
  is_consignment: model.boolean().default(false),
  consignor_customer_id: model.text().nullable(),
  consignor_name: model.text().nullable(),
  consignor_contact: model.text().nullable(),
  consignor_cost: model.bigNumber().nullable(),
  suggested_sale_price: model.bigNumber().nullable(),
  consignment_notes: model.text().nullable(),
  imported_by_luxus: model.boolean().default(false),
  importer_name: model.text().nullable(),
  importer_mark: model.text().nullable(),
  importer_mark_location: model.text().nullable(),
  is_master_backroom: model.boolean().default(false),
  is_backroom: model.boolean().default(false),
})
```

Note: `bigNumber` fields automatically generate a companion `raw_*` jsonb column in the database (e.g., `raw_item_cost`).

### Migration Workflow
Because the module already had an existing migration snapshot, the generator produces ALTER TABLE statements instead of CREATE TABLE. The workflow:

```bash
# 1. Copy updated model into running container
docker compose exec medusa sh -c 'cd /app/apps/backend && npx medusa db:generate inventory_management'

# 2. Copy migration file and snapshot back to host
docker compose cp medusa:/app/apps/backend/src/modules/inventory-management/migrations/ \
  ./services/medusa/apps/backend/src/modules/inventory-management/

# 3. Run migration
docker compose exec medusa sh -c 'cd /app/apps/backend && npx medusa db:migrate'
```

### Migration Files

**`Migration20260514144609.ts`** — adds item_cost, backroom flags:
```typescript
async up(): Promise<void> {
  this.addSql(`alter table if exists "inventory_info"
    add column if not exists "item_cost" numeric null,
    add column if not exists "is_master_backroom" boolean not null default false,
    add column if not exists "is_backroom" boolean not null default false,
    add column if not exists "raw_item_cost" jsonb null;`);
}
```

**`Migration20260514151212.ts`** — adds consignor_customer_id (written manually as ALTER TABLE because the generator produced a wrong CREATE TABLE when the snapshot was missing):
```typescript
async up(): Promise<void> {
  this.addSql(`alter table if exists "inventory_info"
    add column if not exists "consignor_customer_id" text null;`);
}
```

### Critical Note — Snapshot File
The `.snapshot-inventory-management.json` file must be committed to the source tree. Without it, `db:generate` has no baseline and produces a full `CREATE TABLE` instead of the correct `ALTER TABLE`. The snapshot was copied from the running container and committed at:
```
src/modules/inventory-management/migrations/.snapshot-inventory-management.json
```

---

## 3. Attribute Type Seeding

### File: `src/migration-scripts/seed-attribute-types.ts`
A Medusa migration script that seeds the six filterable attribute types on first run.

```typescript
import { ExecArgs } from "@medusajs/framework/types"
import { PRODUCT_ATTRIBUTES_MODULE } from "../modules/product-attributes"

export default async function seedAttributeTypes({ container }: ExecArgs) {
  const service = container.resolve(PRODUCT_ATTRIBUTES_MODULE)

  const existing = await service.listAttributeTypes({})
  if (existing.length > 0) return  // idempotent — skip if already seeded

  const types = [
    { name: "Brand", slug: "brand", sort_order: 1,
      values: ["Nighthawk Custom", "Cabot Guns", "Korth"] },
    { name: "Caliber", slug: "caliber", sort_order: 2,
      values: [".45 ACP", "9mm", ".38 Super", "10mm", ".40 S&W", ".357 Magnum", ".22 LR"] },
    // ... etc
  ]

  for (const [i, type] of types.entries()) {
    const created = await service.createAttributeTypes({
      name: type.name, slug: type.slug, sort_order: type.sort_order,
    })
    await Promise.all(type.values.map((value, j) =>
      service.createAttributeValues({ value, sort_order: j, attribute_type_id: created.id })
    ))
  }
}
```

### Script Tracking Issue
Medusa tracks run migration scripts in the `script_migrations` table using the filename. It stores `.js` extension but looks for `.ts` files on disk — these are treated as different entries. If a previous script run is missing from the table, the script runs again.

**Fix:** Manually insert the tracking record to prevent re-runs:
```sql
INSERT INTO script_migrations (script) VALUES ('initial-data-seed.ts')
ON CONFLICT DO NOTHING;
```

---

## 4. API Routes — All Four Custom Modules

### Architecture Decision
All custom module routes use the module service directly (not `query.graph`) for fetching custom entity data. Cross-module links are traversed via `query.graph` on core entities (e.g., `entity: "product"`) since only core Medusa entities are registered in the remote query system.

### Admin Routes Structure
```
src/api/admin/
├── product-attributes/
│   ├── route.ts                    GET (list all), POST (create type)
│   ├── [id]/
│   │   ├── route.ts                GET (single type), PUT, DELETE
│   │   └── values/
│   │       ├── route.ts            POST (create value)
│   │       └── [value_id]/
│   │           └── route.ts        DELETE
└── products/
    └── [id]/
        ├── attributes/route.ts     GET, POST, DELETE
        ├── details/route.ts        GET, POST, PUT
        ├── specs/route.ts          GET, POST, PUT
        └── inventory-info/route.ts GET, POST, PUT
```

### Store Routes Structure
```
src/api/store/
├── product-attributes/route.ts        GET (all types with values)
└── products/[id]/
    ├── attributes/route.ts            GET
    ├── details/route.ts               GET
    └── specs/route.ts                 GET
```

**inventory-info has NO store route** — this is intentional per project requirements. Item cost and inventory metadata must never be exposed publicly.

### Route Pattern — Custom Module GET
```typescript
// Pattern used for all custom module list endpoints
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_ATTRIBUTES_MODULE)

  const types = await service.listAttributeTypes({})
  const values = await service.listAttributeValues({})

  const valuesByType = values.reduce((acc: Record<string, any[]>, v: any) => {
    if (!acc[v.attribute_type_id]) acc[v.attribute_type_id] = []
    acc[v.attribute_type_id].push(v)
    return acc
  }, {})

  const attribute_types = types
    .map((type: any) => ({
      ...type,
      values: (valuesByType[type.id] ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    }))
    .sort((a: any, b: any) => a.sort_order - b.sort_order)

  res.json({ attribute_types })
}
```

### Route Pattern — Product Link GET (using query.graph)
```typescript
// Used for details, specs, inventory-info — traversing a link from a core entity
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data } = await query.graph({
    entity: "product",     // must be a core Medusa entity
    filters: { id },
    fields: ["id", "product_detail.*"],  // singular for one-to-one links
  })

  res.json({ product_detail: data[0]?.product_detail ?? null })
}
```

### Route Pattern — Product Link POST (create + link)
```typescript
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_DETAILS_MODULE)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const { id } = req.params

  const detail = await service.createProductDetails(req.body as any)

  await link.create({
    [Modules.PRODUCT]: { product_id: id },
    [PRODUCT_DETAILS_MODULE]: { product_detail_id: detail.id },
  })

  res.status(201).json({ product_detail: detail })
}
```

### Route Pattern — Product Attributes (many-to-many)
```typescript
// POST — link multiple attribute values
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const { id } = req.params
  const { value_ids } = req.body as { value_ids: string[] }

  await link.create(
    value_ids.map((value_id) => ({
      [Modules.PRODUCT]: { product_id: id },
      [PRODUCT_ATTRIBUTES_MODULE]: { attribute_value_id: value_id },
    }))
  )
  res.status(201).json({ product_id: id, linked: value_ids })
}

// DELETE — unlink one attribute value
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const { id } = req.params
  const { value_id } = req.body as { value_id: string }

  await link.dismiss({
    [Modules.PRODUCT]: { product_id: id },
    [PRODUCT_ATTRIBUTES_MODULE]: { attribute_value_id: value_id },
  })
  res.json({ product_id: id, dismissed: value_id })
}
```

---

## 5. Bug Fix — query.graph with Custom Module Entities

### Problem
Several routes were using `query.graph` with custom module entity names:
```typescript
// BROKEN — custom entities are not in the remote query registry
const { data } = await query.graph({
  entity: "attribute_type",   // does not work
  fields: ["id", "name", "slug", "sort_order", "values.*"],
})
```
This caused a 500 error. Medusa's remote query system (`RemoteJoiner`) only knows about core Medusa entities (product, customer, order, etc.) and links FROM them.

### Affected Files
- `src/api/admin/product-attributes/route.ts`
- `src/api/admin/product-attributes/[id]/route.ts`
- `src/api/store/product-attributes/route.ts`

### Fix
Replace `query.graph` with direct module service calls and manually group related data:
```typescript
// FIXED — use module service directly
const service = req.scope.resolve(PRODUCT_ATTRIBUTES_MODULE)

const types = await service.listAttributeTypes({})
const values = await service.listAttributeValues({})

// Manually group values by type (what query.graph would have done automatically)
const valuesByType = values.reduce((acc: Record<string, any[]>, v: any) => {
  if (!acc[v.attribute_type_id]) acc[v.attribute_type_id] = []
  acc[v.attribute_type_id].push(v)
  return acc
}, {})
```

### Rule
> Only use `query.graph` with `entity:` values that are core Medusa entities (product, customer, order, cart, region, etc.) or well-known link traversal paths FROM those entities. Custom module entities must be queried directly through the module's resolved service.

---

## 6. Bug Fix — isList Link Field Name

### Problem
The product attributes link was defined with `isList: true`. When querying the linked attribute values via `query.graph` on a product, the field name in the `fields` array was wrong:

```typescript
// BROKEN
const { data } = await query.graph({
  entity: "product",
  filters: { id },
  fields: ["id", "attribute_value.*"],  // singular — wrong for isList links
})
```

This caused a Mikro-ORM error:
```
Entity 'Product' does not have property 'attribute_value'
```

The error originated in `SqlEntityManager.preparePopulate`, meaning the remote joiner was trying to pass `attribute_value` as a native MikroORM populate field on the Product entity, rather than treating it as a cross-module link fetch. This happens because the joiner didn't recognize the field name as a registered link.

### Fix
For `isList: true` links, the field name in `query.graph` must be **plural**:

```typescript
// FIXED
fields: ["id", "attribute_values.*"],  // plural — correct for isList links
```

### Rule
| Link type | `defineLink` config | Field name in query.graph |
|---|---|---|
| One-to-one | `defineLink(A, B)` | singular: `product_detail.*` |
| One-to-many | `defineLink(A, { linkable: B, isList: true })` | plural: `attribute_values.*` |
| Many-to-many | `defineLink({ linkable: A, isList: true }, { linkable: B, isList: true })` | plural: `attribute_values.*` |

### Affected Files
- `src/api/admin/products/[id]/attributes/route.ts`
- `src/api/store/products/[id]/attributes/route.ts`

---

## 7. Bug Fix — MedusaService Pluralization

### Problem
The `inventory-info` POST and PUT routes were calling:
```typescript
await service.createInventoryInfoes(req.body as any)
await service.updateInventoryInfoes({ id: existing.id }, req.body as any)
```

These methods don't exist at runtime. The error was:
```
service.createInventoryInfoes is not a function
```

### Root Cause
`MedusaService` generates CRUD method names by appending `s` to the PascalCase model name. The TypeScript type generation had incorrectly produced `createInventoryInfoes` (adding `-es`), but the actual runtime method is `createInventoryInfos`.

Verified by inspecting the service prototype at runtime:
```javascript
docker compose exec medusa node -e "
const { MedusaService } = require('@medusajs/framework/utils')
console.log(
  Object.getOwnPropertyNames(
    MedusaService({ InventoryInfo: class InventoryInfo {} }).prototype
  ).filter(m => m.includes('nventory'))
)
"
// Output:
// ['retrieveInventoryInfo', 'listInventoryInfos', 'listAndCountInventoryInfos',
//  'deleteInventoryInfos', 'softDeleteInventoryInfos', 'restoreInventoryInfos',
//  'createInventoryInfos', 'updateInventoryInfos']
```

### Fix
```typescript
// BEFORE (broken)
const info = await service.createInventoryInfoes(req.body as any)
const updated = await service.updateInventoryInfoes({ id: existing.id }, req.body as any)

// AFTER (fixed) — cast to any to bypass incorrect TypeScript types
const info = await (service as any).createInventoryInfos(req.body as any)
const updated = await (service as any).updateInventoryInfos({ id: existing.id }, req.body as any)
```

### File
`src/api/admin/products/[id]/inventory-info/route.ts`

### General Rule for MedusaService Method Names
```
create{ModelName}s   — Note: always "s", never "es"
update{ModelName}s
delete{ModelName}s
list{ModelName}s
listAndCount{ModelName}s
retrieve{ModelName}   — singular, no suffix
```

---

## 8. Bug Fix — Many-to-Many Link Definition

### Problem
After fixing the field name bug, bulk imports started failing with:
```
Cannot create multiple links between 'product' and 'product_attributes'
```

Specifically: if product A was linked to `.45 ACP`, then attempting to link product B to `.45 ACP` failed. This meant each attribute value could only belong to one product — which is fundamentally wrong for a shared attribute system (many products share the same caliber).

### Root Cause
The link was defined with `isList: true` on only the **right side**:

```typescript
// BEFORE — one-to-many (each attribute_value → at most one product)
export default defineLink(
  ProductModule.linkable.product,
  {
    linkable: ProductAttributesModule.linkable.attributeValue,
    isList: true,   // only right side has isList
  }
)
```

Despite the database join table having a composite primary key `(product_id, attribute_value_id)` that could support many-to-many, Medusa's link module enforces the cardinality in application code based on the link definition. With only one side having `isList: true`, the link module treats it as one-to-many and rejects attempts to link the same `attribute_value_id` to multiple products.

### Database State Verified
```sql
\d product_product_product_attributes_attribute_value
-- Primary key: (product_id, attribute_value_id)  ← already supports many-to-many
-- No unique constraint on attribute_value_id alone
```

The DB structure was already correct. Only the application-level link definition needed updating.

### Fix
```typescript
// AFTER — true many-to-many (products ↔ attribute_values, unrestricted both ways)
export default defineLink(
  { linkable: ProductModule.linkable.product, isList: true },
  { linkable: ProductAttributesModule.linkable.attributeValue, isList: true }
)
```

With both sides having `isList: true`:
- A product can have many attribute values ✓
- An attribute value can belong to many products ✓

No database migration was needed because the join table already had the correct composite PK structure.

### File
`src/links/product-attributes.ts`

---

## 9. Admin UI Widgets

All widgets are React components using `@medusajs/ui` component library and a shared `adminFetch` utility.

### Shared API Utility (`src/admin/lib/api.ts`)
```typescript
export async function adminFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("medusa_auth_token")
    : null

  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error((err as any).message ?? `Request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}
```

The JWT token key `medusa_auth_token` was identified by inspecting the compiled admin bundle.

### Widget Registration
Each widget exports a `config` object and a default component:
```typescript
export const config = defineWidgetConfig({
  zone: "product.details.side.after",  // determines where it appears
})
export default MyWidget
```

### Widget Zones Used
| Widget | Zone |
|---|---|
| Product Details | `product.details.side.before` |
| Product Specs | `product.details.side.after` |
| Inventory & Pricing | `product.details.side.after` |
| Product Attributes | `product.details.after` |

### Widget Files
- `src/admin/widgets/product-details.tsx`
- `src/admin/widgets/product-specs.tsx`
- `src/admin/widgets/product-inventory.tsx`
- `src/admin/widgets/product-attributes.tsx`

### Notable Implementation Details

**Product Attributes widget** — tracks original vs. current selection to compute diffs on save:
```typescript
const handleSave = async () => {
  const toAdd = [...selected].filter((id) => !original.has(id))
  const toRemove = [...original].filter((id) => !selected.has(id))

  if (toAdd.length > 0) {
    await adminFetch(`/admin/products/${data.id}/attributes`, {
      method: "POST",
      body: JSON.stringify({ value_ids: toAdd }),
    })
  }
  for (const value_id of toRemove) {
    await adminFetch(`/admin/products/${data.id}/attributes`, {
      method: "DELETE",
      body: JSON.stringify({ value_id }),
    })
  }
}
```

**Error state** — added after initial "infinite loading" bug; all widgets now surface fetch errors:
```typescript
.catch((err) => {
  setError(err.message ?? "Failed to load attributes")
  setLoading(false)
})
```

**Scrollable value columns** — prevents infinite height growth as attribute values accumulate:
```tsx
<div className="space-y-2 max-h-48 overflow-y-auto pr-1">
  {type.values.map(...)}
</div>
```

---

## 10. Admin UI Pages (Custom Routes)

### Attribute Management Page
**File:** `src/admin/routes/product-attributes/page.tsx`  
**URL:** `/app/product-attributes`

Full CRUD for attribute types and values without needing API access:
- Lists all attribute types as cards
- Per-card: scrollable value list, add-value input (Enter key or button), hover-to-delete (✕)
- Top form for creating new attribute types with auto-slug generation
- All mutations hit the existing admin API routes

```typescript
export const config = defineRouteConfig({
  label: "Product Attributes",
})
export default ProductAttributesPage
```

### Custom Create Product Page
**File:** `src/admin/routes/products/create/page.tsx`  
**URL:** `/app/products/create`

Replaces the native Medusa create-product wizard for this project's use case. The native wizard is a slide-over drawer that cannot have widgets injected into it.

**Layout:** Two-column on large screens
- Left: Basic Info, Product Details, Product Specs, Product Attributes
- Right sidebar: Inventory & Pricing

**Save flow:**
```typescript
const handleCreate = async () => {
  // 1. Create Medusa product
  const { product } = await adminFetch("/admin/products", {
    method: "POST",
    body: JSON.stringify({
      title, handle, status, description,
      options: [{ title: "Title", values: ["Default"] }],
      variants: [{
        title: "Default", sku,
        options: { Title: "Default" },
        prices: price ? [{ currency_code: "usd", amount: Math.round(Number(price) * 100) }] : [],
      }],
    }),
  })

  // 2. Create custom records in parallel
  await Promise.all([
    adminFetch(`/admin/products/${product.id}/details`, { method: "POST", body: ... }),
    adminFetch(`/admin/products/${product.id}/specs`, { method: "POST", body: ... }),
    adminFetch(`/admin/products/${product.id}/inventory-info`, { method: "POST", body: ... }),
  ])

  // 3. Link attribute values
  if (selectedValues.size > 0) {
    await adminFetch(`/admin/products/${product.id}/attributes`, {
      method: "POST",
      body: JSON.stringify({ value_ids: [...selectedValues] }),
    })
  }

  navigate(`/products/${product.id}`)
}
```

**Medusa 2 quirk — product options required:**
When creating a product with variants via the admin REST API, you must include a `options` array at the product level, and each variant must specify its option values as a map:
```json
{
  "options": [{ "title": "Title", "values": ["Default"] }],
  "variants": [{
    "title": "Default",
    "options": { "Title": "Default" }
  }]
}
```
Omitting options causes: `"Product options are not provided for: [ProductName]."`

---

## 11. Product Import API

### Overview
A dedicated authenticated endpoint for programmatic/bot product creation, separate from the Medusa admin JWT flow.

**Endpoint:** `POST /import/products`  
**Auth:** `X-Api-Key: {LUXUS_IMPORT_API_KEY}` header  
**File:** `src/api/import/products/route.ts`

### Middleware (`src/api/middlewares.ts`)
```typescript
function importApiKeyMiddleware(req, res, next) {
  const apiKey = req.headers["x-api-key"] as string
  const expected = process.env.LUXUS_IMPORT_API_KEY

  if (!expected) {
    res.status(500).json({ message: "LUXUS_IMPORT_API_KEY is not configured on the server" })
    return
  }
  if (!apiKey || apiKey !== expected) {
    res.status(401).json({ message: "Invalid or missing X-Api-Key header" })
    return
  }
  next()
}

export default defineMiddlewares({
  routes: [{ matcher: "/import/*", middlewares: [importApiKeyMiddleware] }],
})
```

### Payload Schema
```typescript
type ImportItem = {
  title: string              // required
  handle?: string            // auto-slugified from title if omitted
  description?: string
  status?: "draft" | "published"
  sku?: string
  price?: number             // USD dollars (converted to cents internally)

  details?: {
    short_description?: string
    serial_number?: string
    optics_ready?: boolean
    featured_image_url?: string
    seo_meta_title?: string
    seo_meta_description?: string
  }

  specs?: {
    overall_length?: string
    weight?: string
    frame_material?: string
    grip_material?: string
    sight_type?: string
    finish_type?: string
  }

  inventory?: {
    item_cost?: number
    is_consignment?: boolean
    consignor_customer_id?: string
    consignor_name?: string
    consignor_contact?: string
    consignor_cost?: number
    suggested_sale_price?: number
    consignment_notes?: string
    imported_by_luxus?: boolean
    importer_name?: string
    importer_mark?: string
    importer_mark_location?: string
    is_master_backroom?: boolean
    is_backroom?: boolean
  }

  // Key: attribute type slug, Value: value text or array of texts (case-insensitive)
  attributes?: Record<string, string | string[]>
}
```

### Internal Flow

The import uses the **product module service** directly (not the REST API) since we're in a server-side route:

```typescript
// Step 1: Create product with options (no variants yet)
const [product] = await productService.createProducts([{
  title: item.title,
  handle: slugify(item.handle || item.title),
  status: item.status ?? "draft",
  options: [{ title: "Title", values: ["Default"] }],
}])

// Step 2: Create variant separately — module service requires option IDs
// (which only exist after the product is created)
const [variant] = await productService.createProductVariants([{
  product_id: product.id,
  title: "Default",
  sku: item.sku,
  options: { Title: "Default" },  // map format for module service
}])

// Step 3: Create price set and link to variant
if (item.price != null) {
  const [priceSet] = await pricingService.createPriceSets([{
    prices: [{ currency_code: "usd", amount: Math.round(item.price * 100) }],
  }])
  await link.create({
    [Modules.PRODUCT]: { variant_id: variant.id },
    [Modules.PRICING]: { price_set_id: priceSet.id },
  })
}

// Step 4: Custom records in parallel
await Promise.all([
  detailsService.createProductDetails({...}).then(d => link.create({...})),
  specsService.createProductSpecs({...}).then(s => link.create({...})),
  inventoryService.createInventoryInfos({...}).then(i => link.create({...})),
])

// Step 5: Attribute resolution and linking
// Attribute types are loaded once per request, not per product
// Values are matched case-insensitively by text
const valueIds = resolveAttributeValues(item.attributes, attrLookup)
await link.create(valueIds.map(id => ({
  [Modules.PRODUCT]: { product_id: product.id },
  [PRODUCT_ATTRIBUTES_MODULE]: { attribute_value_id: id },
})))
```

### Module Service vs REST API Differences

| Concern | REST API (`/admin/products`) | Module Service |
|---|---|---|
| Auth | JWT required | None (called server-side) |
| Variant options format | `{ "Title": "Default" }` map in variants array | Create product first, then `createProductVariants` separately |
| Pricing | Included in variants.prices | Separate `createPriceSets` + link |
| Error format | Medusa HTTP error responses | Thrown exceptions |

### Response Format
```json
{
  "created": 2,
  "failed": 1,
  "results": [
    { "title": "Nighthawk Custom Agent", "product_id": "prod_xxx", "success": true },
    { "title": "Korth NXR", "product_id": "prod_yyy", "success": true,
      "warnings": ["Unknown attribute type slug: \"invalid_slug\""] },
    { "title": "Bad Product", "success": false, "error": "Product with handle: bad-product, already exists." }
  ]
}
```

Items are processed **sequentially** (not in parallel) to avoid unique handle conflicts in rapid bulk imports.

---

## 12. Infrastructure Changes

### `docker-compose.yml`
Added `LUXUS_IMPORT_API_KEY` to the medusa service environment block:
```yaml
environment:
  # ... existing vars ...
  AUTH_CORS: ${AUTH_CORS}
  LUXUS_IMPORT_API_KEY: ${LUXUS_IMPORT_API_KEY}  # ← added
```

### `.env` (not committed — gitignored)
Added:
```
LUXUS_IMPORT_API_KEY=<32-byte hex random value generated with openssl rand -hex 32>
```

### Key Management Note
The import API key grants unauthenticated product creation access. It should be treated as a secret. If compromised, generate a new value with `openssl rand -hex 32`, update `.env`, and restart the medusa container (no rebuild required — the key is read from the environment at startup, not baked into the bundle).

---

## Appendix: Medusa 2.15 Quirks Reference

Accumulated from this session for future development reference:

| Quirk | Detail |
|---|---|
| `query.graph` entity scope | Only core Medusa entities work. Custom module entities must be queried via module service. |
| `isList: true` field names | One side only → singular field name in `query.graph`. Both sides → plural. |
| MedusaService method names | Always `{Model}s` (add 's'). Never `-es`. Verify at runtime if TypeScript types disagree. |
| `bigNumber` fields | Automatically creates companion `raw_*` jsonb column in DB. |
| Migration snapshots | Must be committed to source. Missing snapshot → generator produces CREATE TABLE instead of ALTER TABLE. |
| Product creation with variants | REST API: include options + variants in one payload. Module service: create product first, then `createProductVariants` separately using the returned option IDs. |
| Variant options format (module service) | Use `{ "OptionTitle": "value" }` map, not `[{ option_id, value }]` array. |
| Admin bundle URL | `backendUrl` in medusa-config.ts is baked at build time. Must be set correctly in the dummy `.env` used during Docker build. |
| Auth token key | Admin JWT stored in `localStorage["medusa_auth_token"]`. |
| Many-to-many links | Both sides need `isList: true`. One-sided `isList` creates a one-to-many with application-level constraint on the non-isList side. |
| Script migration tracking | Tracks `.ts` vs `.js` as different scripts. Manually insert into `script_migrations` if needed. |

---

*Document generated: 2026-05-14*  
*Repository: github.com/mgraczyk23/luxus-commerce*  
*Commit: e27dcfa*
