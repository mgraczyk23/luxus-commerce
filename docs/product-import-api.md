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

## Full Product Object Schema

All fields are optional except `title`.

---

### Core Fields

| Field | Type | Description |
|---|---|---|
| `title` | string **(required)** | Product display name |
| `subtitle` | string | Short italic tagline shown under the title on the detail page. e.g. `"Compact Government 1911 · Berryville, Arkansas"` |
| `handle` | string | URL slug — `/product/<handle>`. Auto-generated from title if omitted. Must be unique |
| `description` | string | Long-form product description shown in the "About This Piece" section. HTML or plain text |
| `status` | `"draft"` \| `"published"` | Defaults to `"draft"`. Set `"published"` to make the product live immediately |
| `sku` | string | Stock-keeping unit identifier shown on the detail page |
| `price` | number | Retail price in USD dollars (e.g. `3499.00`). The API converts to cents internally. Omit to create with no price |
| `thumbnail` | string | URL of the primary image shown on product cards and at the top of the gallery |
| `images` | string[] | Ordered array of URLs for the detail page gallery. See [Images](#images) below |
| `categories` | string[] | Category handles to assign, e.g. `["1911", "compact-edc"]`. Create categories in Medusa Admin → Settings → Categories |
| `collection` | string | Single collection handle to assign, e.g. `"1911-series"`. Create collections in Medusa Admin → Products → Collections |

---

### `highlights` — Overview tab feature boxes

Array of up to **4** objects. Displayed as a responsive grid below the product description. Hidden when empty.

| Field | Type | Description |
|---|---|---|
| `title` | string | Short bold heading for the box |
| `body` | string | One or two sentence description |

```json
"highlights": [
  { "title": "One-Gun-One-Gunsmith", "body": "Built start-to-finish by a single master craftsman" },
  { "title": "Hand-Fitted Components", "body": "Each part individually fitted and lapped for zero slop" },
  { "title": "DLC Finish", "body": "Diamond-Like Carbon coating — harder than tool steel" },
  { "title": "Heinie Night Sights", "body": "Tritium-filled Straight Eight ledge sights, factory installed" }
]
```

---

### `in_the_box` — What's Included tab

Array of strings rendered as a bullet list. The tab is hidden on the storefront when this is empty or omitted.

```json
"in_the_box": [
  "Nighthawk Custom Agent pistol",
  "Two 8-round Wilson Combat magazines",
  "Fitted lockable hard case",
  "Certificate of authenticity (signed by building gunsmith)",
  "Instruction manual",
  "Lock"
]
```

---

### `extra_specs` — Additional specification rows

Free-form key/value object for spec table rows that don't fit the structured `specs` fields. Rendered after the structured specs in the Specifications tab.

```json
"extra_specs": {
  "Height": "5.25\"",
  "Width": "1.3\"",
  "Capacity": "8+1",
  "Slide Material": "416 Stainless Steel",
  "Safety": "Ambidextrous Thumb Safety",
  "Country of Origin": "United States"
}
```

> **Don't double-enter specs.** Caliber, Action, Barrel Length, Capacity, and Frame Color are pulled automatically from the `attributes` block into the spec table. Overall Length, Weight, Frame Material, Grips, Sights, and Finish come from the `specs` block. Use `extra_specs` only for rows that don't fit those two places.

---

### `details` Object — Per-product editorial and display settings

Partially storefront visible — see visibility column.

| Field | Type | Visibility | Description |
|---|---|---|---|
| `short_description` | string | Public | One-paragraph summary shown below the subtitle on the detail page |
| `serial_number` | string | **Admin only** | Firearm serial number — never returned by the store API |
| `optics_ready` | boolean | Public | Whether the pistol accepts optics without modification. Also flows into the Specifications tab as "Optics Ready: Yes/No" |
| `contact_for_pricing` | boolean | Public | When `true`, hides the price and replaces the Add to Cart button with a "Contact Us For Pricing" modal |
| `primary_category` | string | Public | Floating gold badge on product cards. e.g. `"Engraved"`, `"Prototype"`, `"Limited Edition"`, `"Heritage"`. Leave omitted for no badge |
| `engraver` | string | Public | When set, displays an "Engraved By [name]" callout on the detail page. Leave omitted on non-engraved pieces |
| `seo_meta_title` | string | Public | Overrides the `<title>` tag on the product detail page |
| `seo_meta_description` | string | Public | Sets the meta description for the product detail page |

> **Serial number privacy:** `serial_number` is stored server-side and returned only by admin API routes. The public store endpoint explicitly excludes it. Serial numbers can be traced through manufacturer records to dealer cost — never expose them publicly.

---

### `specs` Object — Structured specification fields

These render as named rows in the Specifications tab. Hidden when all fields are null.

| Field | Type | Renders as | Example |
|---|---|---|---|
| `overall_length` | string | Overall Length | `"8.75\""` |
| `weight` | string | Weight (Unloaded) | `"40.9 oz"` |
| `frame_material` | string | Frame Material | `"416 Stainless Steel"` |
| `grip_material` | string | Grips | `"G10 Piranha — Black / Grey"` |
| `sight_type` | string | Sights | `"Heinie Straight Eight Ledge — Night Sights"` |
| `finish_type` | string | Finish | `"DLC (Diamond-Like Carbon) — Black"` |

---

### `inventory` Object — Admin only, never exposed in store API

All fields in this block are strictly internal. They are never returned by any public or store-facing endpoint.

| Field | Type | Description |
|---|---|---|
| `item_cost` | number | Purchase cost in USD dollars |
| `is_consignment` | boolean | Whether this is a consignment item |
| `consignor_customer_id` | string | Medusa customer ID of the consignor |
| `consignor_name` | string | Consignor display name |
| `consignor_contact` | string | Consignor phone or email |
| `consignor_cost` | number | Amount owed to consignor on sale (USD) |
| `suggested_sale_price` | number | Consignor's suggested retail price (USD) |
| `consignment_notes` | string | Internal notes about the consignment |
| `imported_by_luxus` | boolean | Whether Luxus Collection handled the import/transfer |
| `importer_name` | string | Name of the importing entity |
| `importer_mark` | string | Importer's mark stamped on the firearm |
| `importer_mark_location` | string | Location of the importer's mark on the firearm |
| `is_master_backroom` | boolean | In the backroom pool but hidden from VIP display |
| `is_backroom` | boolean | Actively shown in the VIP/backroom area |

---

### `attributes` Object — Filterable product attributes

Key/value pairs where the key is an attribute type **slug** and the value is a string or array of strings. These power the listing page filters and also auto-populate the Specifications tab (Caliber, Action, Barrel Length, Capacity, Frame Color).

- **Multi-select types** (brand, caliber): pass a single string or an array
- **Single-select types** (action, barrel-length, frame-color, magazine-capacity, model): pass a single string
- Unknown slugs or values produce a warning in the response but do not fail the import
- Values are matched **case-insensitively** — `".45 acp"` matches `".45 ACP"`

**Attribute types and their slugs:**

| Slug | Select type | Notes |
|---|---|---|
| `brand` | Multi-select | Manufacturer name. Drives the Brand filter and card eyebrow |
| `caliber` | Multi-select | Drives the Caliber filter and the "Caliber" row in the spec table |
| `action` | Single-select | Drives the Action filter and the "Action" row in the spec table |
| `barrel-length` | Single-select | Drives the Barrel Length filter and the "Barrel Length" row in the spec table |
| `frame-color` | Single-select | Drives the Frame Color filter and the "Frame Color" row in the spec table |
| `magazine-capacity` | Single-select | Drives the Capacity filter and the "Capacity" row in the spec table |
| `model` | Single-select | Drives the Model filter |

> **Values are managed in the admin, not hardcoded here.** Go to `/app/product-attributes` in the Medusa admin to see current values, add new ones, or add new attribute types. New brands, calibers, models, etc. must be added there before they can be referenced in an import.

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

- **HTTP 201** when at least one product was created
- **HTTP 400** when all products failed or the body is empty
- Bulk imports process each item independently — one failure does not stop the rest
- Warnings (unknown attribute values, unknown category/collection handles) are reported per item but do not fail the import

---

## Examples

### Minimal — title and price only

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

### Complete single product — all fields

```bash
curl -X POST https://api.luxus-collection.com/import/products \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{
    "title": "Nighthawk Custom Agent",
    "subtitle": "Compact Government 1911 · Berryville, Arkansas",
    "handle": "nighthawk-custom-agent",
    "description": "The Agent is a compact Government-size 1911 built to exacting tolerances by a single Nighthawk gunsmith from first cut to final proof.",
    "status": "draft",
    "sku": "NHC-AGENT-01",
    "price": 3499.00,
    "categories": ["1911"],
    "collection": "1911-series",
    "thumbnail": "https://luxus-collection-media.s3.us-east-1.amazonaws.com/uploads/NHC-AGENT-01-thumb.jpg",
    "images": [
      "https://luxus-collection-media.s3.us-east-1.amazonaws.com/uploads/NHC-AGENT-01-1.jpg",
      "https://luxus-collection-media.s3.us-east-1.amazonaws.com/uploads/NHC-AGENT-01-2.jpg",
      "https://luxus-collection-media.s3.us-east-1.amazonaws.com/uploads/NHC-AGENT-01-3.jpg"
    ],
    "highlights": [
      { "title": "One-Gun-One-Gunsmith", "body": "Built start-to-finish by a single master craftsman" },
      { "title": "Hand-Fitted Components", "body": "Each part individually fitted and lapped for zero slop" },
      { "title": "DLC Finish", "body": "Diamond-Like Carbon coating — harder than tool steel" },
      { "title": "Heinie Night Sights", "body": "Tritium-filled Straight Eight ledge sights, factory installed" }
    ],
    "in_the_box": [
      "Nighthawk Custom Agent pistol",
      "Two 8-round Wilson Combat magazines",
      "Fitted lockable hard case",
      "Certificate of authenticity (signed by building gunsmith)",
      "Instruction manual",
      "Lock"
    ],
    "details": {
      "short_description": "Compact Government-size 1911 hand-built by a single Nighthawk Custom gunsmith.",
      "serial_number": "NHC-12345",
      "optics_ready": false,
      "contact_for_pricing": false,
      "primary_category": "Limited Edition",
      "engraver": null,
      "seo_meta_title": "Nighthawk Custom Agent 1911 — Luxus Collection",
      "seo_meta_description": "Buy the Nighthawk Custom Agent 1911 in .45 ACP at Luxus Collection."
    },
    "specs": {
      "overall_length": "8.75\"",
      "weight": "40.9 oz",
      "frame_material": "416 Stainless Steel",
      "grip_material": "G10 Piranha — Black / Grey",
      "sight_type": "Heinie Straight Eight Ledge — Night Sights",
      "finish_type": "DLC (Diamond-Like Carbon) — Black"
    },
    "extra_specs": {
      "Height": "5.25\"",
      "Width": "1.3\"",
      "Slide Material": "416 Stainless Steel",
      "Safety": "Ambidextrous Thumb Safety",
      "Country of Origin": "United States"
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

### Consignment item

```bash
curl -X POST https://api.luxus-collection.com/import/products \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{
    "title": "Cabot Guns American Joe",
    "sku": "CAB-AJ-001",
    "price": 7995.00,
    "status": "draft",
    "categories": ["1911"],
    "details": {
      "serial_number": "CAB-00199",
      "short_description": "One of only 100 ever made."
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

### Contact for pricing (no price shown on site)

```bash
curl -X POST https://api.luxus-collection.com/import/products \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{
    "title": "Cabot Guns Big Bang Pistol Set",
    "sku": "CAB-BBS-001",
    "status": "published",
    "details": {
      "contact_for_pricing": true,
      "short_description": "A matched pair machined from a single meteorite. One of one."
    },
    "attributes": {
      "brand": "Cabot Guns",
      "caliber": ".45 ACP",
      "action": "Single Action"
    }
  }'
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
      "categories": ["1911"],
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
      "categories": ["revolver"],
      "attributes": {
        "brand": "Korth",
        "caliber": ".357 Magnum",
        "action": "Double Action"
      }
    }
  ]'
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
        headers={"Content-Type": "application/json", "X-Api-Key": API_KEY},
    )
    response.raise_for_status()
    return response.json()

def bulk_import(products: list) -> dict:
    response = requests.post(
        f"{BASE_URL}/import/products",
        json=products,
        headers={"Content-Type": "application/json", "X-Api-Key": API_KEY},
    )
    response.raise_for_status()
    return response.json()

result = import_product({
    "title": "Nighthawk Custom Agent",
    "sku": "NHC-AGENT-01",
    "price": 3499.00,
    "attributes": {
        "brand": "Nighthawk Custom",
        "caliber": ".45 ACP",
        "action": "Single Action",
    },
})

print(f"Created: {result['created']}, Failed: {result['failed']}")
for item in result["results"]:
    if item["success"]:
        print(f"  ✓ {item['title']} → {item['product_id']}")
    else:
        print(f"  ✗ {item['title']} → {item['error']}")
```

---

## Automated Import with Images

For bulk imports where you have image files on disk, upload them first (Medusa stores them in S3 and returns the URL), then call the import API with those URLs.

### Folder structure

```
import/
  products.json
  images/
    NHC-AGENT-01-thumb.jpg     ← thumbnail  (SKU + "-thumb")
    NHC-AGENT-01-1.jpg         ← gallery 1  (SKU + "-1")
    NHC-AGENT-01-2.jpg         ← gallery 2  (SKU + "-2")
    CAB-AJ-001-thumb.jpg
    CAB-AJ-001-1.jpg
```

### Script

```python
import requests
import json
from pathlib import Path

MEDUSA_URL    = "https://api.luxus-collection.com"
IMPORT_API_KEY = "your-import-api-key"
ADMIN_EMAIL   = "your-admin@email.com"
ADMIN_PASSWORD = "your-password"

def get_auth_token():
    r = requests.post(f"{MEDUSA_URL}/auth/user/emailpass",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    r.raise_for_status()
    return r.json()["token"]

def upload_image(token: str, file_path: Path) -> str:
    with open(file_path, "rb") as f:
        r = requests.post(
            f"{MEDUSA_URL}/admin/uploads",
            headers={"Authorization": f"Bearer {token}"},
            files={"files": (file_path.name, f, "image/jpeg")},
        )
    r.raise_for_status()
    return r.json()["files"][0]["url"]

def import_products(products: list) -> dict:
    r = requests.post(
        f"{MEDUSA_URL}/import/products",
        headers={"Content-Type": "application/json", "X-Api-Key": IMPORT_API_KEY},
        json=products,
    )
    r.raise_for_status()
    return r.json()

token     = get_auth_token()
image_dir = Path("images")
products  = json.loads(Path("products.json").read_text())

for product in products:
    sku = product.get("sku", "")

    thumb_path = image_dir / f"{sku}-thumb.jpg"
    if thumb_path.exists():
        product["thumbnail"] = upload_image(token, thumb_path)

    gallery = []
    for i in range(1, 20):
        img_path = image_dir / f"{sku}-{i}.jpg"
        if not img_path.exists():
            break
        gallery.append(upload_image(token, img_path))
    if gallery:
        product["images"] = gallery

result = import_products(products)
print(f"Created: {result['created']}, Failed: {result['failed']}")
for item in result["results"]:
    status = "✓" if item["success"] else "✗"
    detail = item.get("product_id") or item.get("error", "")
    print(f"  {status} {item['title']} — {detail}")
```

### `products.json` reference format

```json
[
  {
    "title": "Nighthawk Custom Agent",
    "subtitle": "Compact Government 1911 · Berryville, Arkansas",
    "sku": "NHC-AGENT-01",
    "price": 3499.00,
    "status": "draft",
    "categories": ["1911"],
    "collection": "1911-series",
    "highlights": [
      { "title": "One-Gun-One-Gunsmith", "body": "Built start-to-finish by a single master craftsman" },
      { "title": "DLC Finish", "body": "Diamond-Like Carbon coating — harder than tool steel" }
    ],
    "in_the_box": [
      "Nighthawk Custom Agent pistol",
      "Two 8-round Wilson Combat magazines",
      "Fitted lockable hard case"
    ],
    "details": {
      "short_description": "Compact Government-size 1911 from Nighthawk Custom.",
      "serial_number": "NHC-12345",
      "optics_ready": false,
      "primary_category": "Limited Edition"
    },
    "specs": {
      "overall_length": "8.75\"",
      "weight": "40.9 oz",
      "frame_material": "416 Stainless Steel",
      "grip_material": "G10",
      "sight_type": "Heinie Straight Eight Night Sights",
      "finish_type": "DLC — Black"
    },
    "extra_specs": {
      "Safety": "Ambidextrous Thumb Safety",
      "Country of Origin": "United States"
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
  }
]
```

Images are matched to products by SKU automatically. Products with no matching image files are imported without images — no error is raised.

---

## Notes and Gotchas

**Handles must be unique.** If you import the same title twice without an explicit `handle`, the second import fails with a duplicate handle error. Always set an explicit `handle` for programmatic imports.

**Prices are in dollars, stored in cents.** Pass `3499.00` for a $3,499 item.

**Attribute values must already exist.** The import does not create new attribute types or values on the fly. Add new brands, models, calibers, etc. via the admin at `/app/product-attributes` before running an import that references them.

**Categories and collections must already exist.** Create them in Medusa Admin before importing. Unknown handles produce a warning in the response but do not fail the import.

**Products default to `draft`.** Set `"status": "published"` to make them live immediately.

**Inventory and serial number fields are admin-only.** The `inventory` block and `details.serial_number` are never returned by any public or store-facing API route.

**Specs and In The Box tabs hide when empty.** The store specs endpoint returns `null` when no specs are set. The storefront uses this to show or hide the Specifications tab. Same for the In The Box tab.

**Don't set filterable specs twice.** Caliber, Action, Barrel Length, Capacity, and Frame Color auto-populate the spec table from the `attributes` block. Only use `extra_specs` for rows not covered by `specs` or `attributes`.

**Bulk imports process sequentially.** Items are processed one at a time to avoid duplicate-handle collisions. Expect roughly 1–2 seconds per product for large catalogs.

**Images must be hosted URLs.** The import endpoint accepts URLs only, not file uploads. Use the automated script above to upload from local files first.
