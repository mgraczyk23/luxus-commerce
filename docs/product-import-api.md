# Luxus Collection — Product Import API

**Base URL:** `https://api.luxus-collection.com`  
**Endpoint:** `POST /import/products`  
**Auth:** Static API key via request header  

---

## Authentication

Every request must include the `X-Api-Key` header. The key is stored in `.env` on the server as `LUXUS_IMPORT_API_KEY`.

```
X-Api-Key: <your-api-key>
```

Requests without a valid key return `401 Unauthorized`.

---

## Request

- **Method:** `POST`
- **Content-Type:** `application/json`
- **Body:** A single product object **or** an array of product objects for bulk import

---

## Product Object Schema

All fields are optional except `title`.

### Core Fields

| Field | Type | Description |
|---|---|---|
| `title` | string **(required)** | Product name displayed in admin and storefront |
| `handle` | string | URL-safe slug. Auto-generated from title if omitted |
| `description` | string | Full HTML or plain text product description |
| `status` | `"draft"` \| `"published"` | Listing status. Defaults to `"draft"` |
| `sku` | string | Stock-keeping unit identifier for the variant |
| `price` | number | Retail price in USD dollars (e.g. `3499.00`). Omit to create with no price |

### `details` Object — Partially storefront visible (see note)

| Field | Type | Description |
|---|---|---|
| `short_description` | string | Brief summary shown on product cards — **public** |
| `serial_number` | string | Firearm serial number — **admin only, never returned by store API** |
| `optics_ready` | boolean | Whether the pistol is optics-ready — **public** |
| `contact_for_pricing` | boolean | Hides price on storefront, shows "Contact Us For Pricing" instead — **public** |
| `primary_category` | string | Floating badge on product card, e.g. "Engraved", "Prototype" — **public** |
| `seo_meta_title` | string | `<title>` tag override for the PDP — **public** |
| `seo_meta_description` | string | Meta description for the PDP — **public** |

> **Serial number privacy:** `serial_number` is stored server-side and returned only by admin API routes. The store endpoint (`GET /store/products/[id]/details`) explicitly excludes it so it can never be read by the storefront or any public client.

### `specs` Object — Storefront visible

| Field | Type | Description |
|---|---|---|
| `overall_length` | string | e.g. `"8.75\""` |
| `weight` | string | e.g. `"38 oz"` |
| `frame_material` | string | e.g. `"Stainless Steel"` |
| `grip_material` | string | e.g. `"G10"` |
| `sight_type` | string | e.g. `"Tritium Night Sights"` |
| `finish_type` | string | e.g. `"Cerakote Black"` |

### `inventory` Object — Admin only, never exposed in store API

| Field | Type | Description |
|---|---|---|
| `item_cost` | number | Purchase cost in USD dollars |
| `is_consignment` | boolean | Whether this is a consignment item |
| `consignor_customer_id` | string | Medusa customer ID of the consignor |
| `consignor_name` | string | Consignor display name |
| `consignor_contact` | string | Consignor phone or email |
| `consignor_cost` | number | Amount owed to consignor on sale (USD) |
| `suggested_sale_price` | number | Consignor's suggested price (USD) |
| `consignment_notes` | string | Internal notes about the consignment |
| `imported_by_luxus` | boolean | Whether Luxus handled the import |
| `importer_name` | string | Name of the importing entity |
| `importer_mark` | string | Importer's mark stamped on the firearm |
| `importer_mark_location` | string | Location of the importer's mark |
| `is_master_backroom` | boolean | In backroom pool but hidden from VIP display |
| `is_backroom` | boolean | Actively shown in the VIP/backroom area |

### `attributes` Object — Filterable product attributes

Key-value pairs where the key is an attribute type **slug** and the value is either a single string or an array of strings.

- Use an **array** for multi-select attribute types (e.g. Brand)
- Use a **string** for single-select attribute types (e.g. Model, Action)
- Unknown slugs or values are reported as warnings but do not fail the import

**Available attribute type slugs:**

| Slug | Type | Current Values |
|---|---|---|
| `brand` | Multi-select | `Nighthawk Custom`, `Cabot Guns`, `Korth`, `SIG Sauer`, `Colt` |
| `caliber` | Multi-select | `.45 ACP`, `9mm`, `.38 Super`, `10mm`, `.40 S&W`, `.357 Magnum`, `.22 LR` |
| `action` | Single-select | `Single Action`, `Double Action`, `Double/Single Action`, `Single Action Only` |
| `barrel-length` | Single-select | `3"`, `3.5"`, `4.25"`, `5"`, `5.5"`, `6"` |
| `frame-color` | Single-select | `Black`, `Silver`, `Two-Tone`, `Bronze`, `Custom`, `Blue` |
| `magazine-capacity` | Single-select | `7`, `8`, `9`, `10`, `14`, `15`, `17` |
| `model` | Single-select | Values managed via admin. Add new models at `/app/product-attributes` before importing |

> **Note:** Attribute values are matched case-insensitively. `".45 acp"` matches `".45 ACP"`. Values must already exist in the database — the import does not create new attribute values on the fly.

---

## Response

```json
{
  "created": 2,
  "failed": 1,
  "results": [
    {
      "title": "Nighthawk Custom Agent",
      "product_id": "prod_01JRXXXXXX",
      "success": true
    },
    {
      "title": "Cabot Guns American Joe",
      "product_id": "prod_01JRXXXXXX",
      "success": true,
      "warnings": ["Unknown value \"Carbon Fiber\" for type \"frame-color\""]
    },
    {
      "title": "Bad Product",
      "success": false,
      "error": "Title is required"
    }
  ]
}
```

- HTTP `201` when at least one product was created
- HTTP `400` when all products failed or the body is empty
- Bulk imports process each item independently — one failure does not stop the rest

---

## Examples

### Single product — minimal

```bash
curl -X POST https://api.luxus-collection.com/import/products \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{
    "title": "Nighthawk Custom Agent",
    "sku": "NHC-AGENT-01",
    "price": 3499.00,
    "status": "draft"
  }'
```

### Single product — all fields

```bash
curl -X POST https://api.luxus-collection.com/import/products \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{
    "title": "Nighthawk Custom Agent",
    "handle": "nighthawk-custom-agent",
    "description": "The Agent is a compact Government-size 1911 built to exacting tolerances.",
    "status": "published",
    "sku": "NHC-AGENT-01",
    "price": 3499.00,
    "details": {
      "short_description": "Compact Government-size 1911 from Nighthawk Custom.",
      "serial_number": "NHC-12345",
      "optics_ready": true,
      "seo_meta_title": "Nighthawk Custom Agent 1911 — Luxus Collection",
      "seo_meta_description": "Buy the Nighthawk Custom Agent 1911 in .45 ACP at Luxus Collection."
    },
    "specs": {
      "overall_length": "8.75\"",
      "weight": "38 oz",
      "frame_material": "Carbon Steel",
      "grip_material": "G10",
      "sight_type": "Tritium Night Sights",
      "finish_type": "Cerakote Black"
    },
    "inventory": {
      "item_cost": 2800.00,
      "is_consignment": false,
      "imported_by_luxus": true,
      "importer_name": "Luxus Collection LLC",
      "is_backroom": false,
      "is_master_backroom": false
    },
    "attributes": {
      "brand": "Nighthawk Custom",
      "caliber": ".45 ACP",
      "action": "Single Action",
      "barrel-length": "5\"",
      "frame-color": "Black",
      "magazine-capacity": "8",
      "model": "Agent"
    }
  }'
```

### Single product — consignment

```bash
curl -X POST https://api.luxus-collection.com/import/products \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{
    "title": "Cabot Guns American Joe",
    "sku": "CAB-AJ-001",
    "price": 7995.00,
    "status": "draft",
    "details": {
      "serial_number": "CAB-00199"
    },
    "inventory": {
      "is_consignment": true,
      "consignor_name": "John Smith",
      "consignor_contact": "john@example.com",
      "consignor_cost": 6500.00,
      "suggested_sale_price": 8200.00,
      "consignment_notes": "Excellent condition, original box included."
    },
    "attributes": {
      "brand": "Cabot Guns",
      "caliber": ".45 ACP",
      "action": "Single Action"
    }
  }'
```

### Bulk import — array of products

```bash
curl -X POST https://api.luxus-collection.com/import/products \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '[
    {
      "title": "Nighthawk Custom Falcon",
      "sku": "NHC-FALCON-01",
      "price": 3799.00,
      "attributes": {
        "brand": "Nighthawk Custom",
        "caliber": ".45 ACP",
        "action": "Single Action",
        "barrel-length": "5\""
      }
    },
    {
      "title": "Korth National Standard",
      "sku": "KOR-NS-357-01",
      "price": 2499.00,
      "attributes": {
        "brand": "Korth",
        "caliber": ".357 Magnum",
        "action": "Double Action"
      }
    }
  ]'
```

### Multi-brand set

```bash
curl -X POST https://api.luxus-collection.com/import/products \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{
    "title": "Nighthawk Custom & Korth Matched Set",
    "sku": "SET-NHC-KOR-001",
    "price": 6299.00,
    "status": "draft",
    "attributes": {
      "brand": ["Nighthawk Custom", "Korth"],
      "caliber": ".357 Magnum",
      "action": "Single Action"
    }
  }'
```

---

## Python Example

```python
import requests

API_KEY = "your-api-key"
BASE_URL = "https://api.luxus-collection.com"

def import_product(product: dict) -> dict:
    response = requests.post(
        f"{BASE_URL}/import/products",
        json=product,
        headers={
            "Content-Type": "application/json",
            "X-Api-Key": API_KEY,
        }
    )
    response.raise_for_status()
    return response.json()

def bulk_import(products: list) -> dict:
    response = requests.post(
        f"{BASE_URL}/import/products",
        json=products,
        headers={
            "Content-Type": "application/json",
            "X-Api-Key": API_KEY,
        }
    )
    response.raise_for_status()
    return response.json()

# Example usage
result = import_product({
    "title": "Nighthawk Custom Agent",
    "sku": "NHC-AGENT-01",
    "price": 3499.00,
    "attributes": {
        "brand": "Nighthawk Custom",
        "caliber": ".45 ACP",
        "action": "Single Action",
    }
})

print(f"Created: {result['created']}, Failed: {result['failed']}")
for item in result["results"]:
    if item["success"]:
        print(f"  ✓ {item['title']} → {item['product_id']}")
    else:
        print(f"  ✗ {item['title']} → {item['error']}")
```

---

## Notes and Gotchas

**Handles must be unique.** If you import a product with the same title twice without specifying a `handle`, the second import may fail with a duplicate handle error. Always set an explicit `handle` for programmatic imports, or ensure titles are unique.

**Prices are in dollars, stored in cents.** Pass `3499.00` for a $3,499 item. The API converts to cents internally.

**Attribute values must pre-exist.** The import does not create new attribute types or values. Add new models, calibers, etc. via the admin at `/app/product-attributes` before running an import that references them.

**Products are created as `draft` by default.** Set `"status": "published"` to make them immediately visible on the storefront.

**Inventory fields are admin-only.** The `inventory` block is never returned by any store-facing API route. It is safe to include consignor pricing and cost details without risk of exposure.

**Bulk imports process sequentially.** Items are processed one at a time to avoid duplicate-handle collisions. For large catalogs, expect roughly 1-2 seconds per product.
