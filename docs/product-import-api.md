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

Requests without a valid key return `401 Unauthorized`. If the server itself has no `LUXUS_IMPORT_API_KEY` configured, every request returns `500` with `{ "message": "LUXUS_IMPORT_API_KEY is not configured on the server" }` instead — a server-side setup problem, not a caller error.

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
| `handle` | string | URL slug — `/product/<handle>`. Auto-generated from title if omitted. If you do supply one, it's still run through the same slug formatting (lowercased, non-alphanumeric characters collapsed to `-`) — e.g. `"NHC_Agent 01"` becomes `nhc-agent-01`, not used verbatim. Must be unique |
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

Array of up to **4** objects. Displayed as a responsive grid below the product description. Hidden when empty. Submitting more than 4 is not an error — anything past the 4th is silently dropped, with no warning in the response.

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

Free-form key/value object for spec table rows that don't fit the structured `specs` fields or `attributes`. Rendered after all other specs in the Specifications tab.

```json
"extra_specs": {
  "Height": "5.25\"",
  "Width": "1.3\"",
  "Slide Material": "416 Stainless Steel",
  "Safety": "Ambidextrous Thumb Safety",
  "Country of Origin": "United States"
}
```

> **Don't double-enter specs.** The `attributes` block auto-populates Brand, Model, Caliber, Action, Barrel Length, Magazine Capacity, and Frame Color into the spec table. The `specs` block populates Overall Length, Weight, Frame Material, Grips, Sights, and Finish. Use `extra_specs` only for rows that don't fit those two places.

---

### `details` Object — Per-product editorial and display settings

| Field | Type | Storefront visibility | Description |
|---|---|---|---|
| `short_description` | string | Listing pages + PDP | One-paragraph summary shown below the subtitle on the detail page and on cards |
| `serial_number` | string | **Admin only** | Firearm serial number — never returned by the store API |
| `optics_ready` | boolean | Specs tab | Whether the pistol accepts optics without modification. Flows into the Specifications tab as "Optics Ready: Yes / No" |
| `contact_for_pricing` | boolean | PDP + cards | When `true`, hides the price and shows "Contact Us For Pricing" instead of Add to Cart |
| `primary_category` | string | Product cards | Floating gold badge on product cards. e.g. `"Engraved"`, `"Prototype"`, `"Limited Edition"`, `"Heritage"`. Omit for no badge |
| `engraver` | string | PDP | Displays an "Engraved By [name]" callout on the detail page. Omit on non-engraved pieces |
| `seo_meta_title` | string | `<title>` tag | Overrides the page title on the product detail page |
| `seo_meta_description` | string | `<meta description>` | Sets the meta description for the product detail page |

> **Serial number privacy:** `serial_number` is stored server-side only. The public store endpoint explicitly excludes it. Serial numbers can be traced through manufacturer records to dealer cost — never expose them publicly.

> **Metadata mirroring:** `short_description`, `engraver`, `primary_category`, and `contact_for_pricing` are written to both the `product_detail` module record and to `product.metadata`. This ensures they appear correctly on listing pages and product cards, which read from `metadata`, as well as on the detail page, which reads from the module record. Note `contact_for_pricing` is only mirrored to `metadata` when it's `true` (written as the string `"true"`); setting it to `false` or omitting it leaves the metadata field absent either way — functionally equivalent, but not a literal `"false"` value if you're inspecting raw metadata.

---

### `specs` Object — Structured specification fields

These render as named rows in the Specifications tab, after the attribute-derived rows. All fields are optional; hidden when all are null.

| Field | Type | Renders as |
|---|---|---|
| `overall_length` | string | Overall Length |
| `weight` | string | Weight (Unloaded) |
| `frame_material` | string | Frame Material |
| `grip_material` | string | Grips |
| `sight_type` | string | Sights |
| `finish_type` | string | Finish |

---

### Specifications tab — full display order

The Specifications tab assembles rows from three sources in this order:

| # | Field | Source |
|---|---|---|
| 1 | Brand | `attributes.brand` |
| 2 | Model | `attributes.model` |
| 3 | Caliber | `attributes.caliber` |
| 4 | Action | `attributes.action` |
| 5 | Barrel Length | `attributes.barrel-length` |
| 6 | Magazine Capacity | `attributes.magazine-capacity` |
| 7 | Frame Color | `attributes.frame-color` |
| 8 | Overall Length | `specs.overall_length` |
| 9 | Weight (Unloaded) | `specs.weight` |
| 10 | Frame Material | `specs.frame_material` |
| 11 | Grips | `specs.grip_material` |
| 12 | Sights | `specs.sight_type` |
| 13 | Finish | `specs.finish_type` |
| 14 | Optics Ready | `details.optics_ready` |
| + | Any extra rows | `extra_specs` key/value pairs |

Rows with no value are automatically omitted. The tab is hidden entirely if no rows have data.

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
| `is_master_backroom` | boolean | Hidden from main store AND from VIP display |
| `is_backroom` | boolean | Hidden from main store; shown in VIP area only |

> **Backroom hides from the storefront.** Setting either `is_master_backroom` or `is_backroom` to `true` writes `backroom_hidden: "true"` into `product.metadata`, which causes the product to be filtered out of all public store pages (Shop All, Collectible Firearms, Modern Firearms, brand pages, category pages, featured page, and the home page). The product page URL remains accessible if visited directly. Both flags can be toggled any time from the admin inventory widget — the storefront updates within seconds via automatic cache revalidation.

---

### `attributes` Object — Filterable product attributes

Key/value pairs where the key is an attribute type **slug** and the value is a string or array of strings. These power the listing page filters AND auto-populate the top rows of the Specifications tab.

- Every attribute type currently configured in this store — brand, model, caliber, action, barrel-length, magazine-capacity, frame-color — is **multi-select**: pass a single string or an array for any of them. The storefront fully supports multiple values everywhere (filters render as checkboxes, and the spec table/product cards join multiple values with " / ", e.g. `"9mm / .40 S&W"`) — verified directly against the live database and storefront rendering code, not just an assumption.
- An attribute type *could* be switched to single-select in the future via Medusa Admin → `/app/product-attributes` (there's an `is_multi_select` toggle per type). If that's ever done for a type, the import API will enforce it: sending an array with more than one value for a single-select type keeps only the first value and returns a warning rather than failing the import.
- Unknown slugs or values produce a warning in the response but do not fail the import
- Values are matched **case-insensitively** — `".45 acp"` matches `".45 ACP"`

**Attribute types and their slugs:**

| Slug | Select type | Filter label | Spec table label |
|---|---|---|---|
| `brand` | Multi-select | Brand | Brand |
| `model` | Multi-select | Model | Model |
| `caliber` | Multi-select | Caliber | Caliber |
| `action` | Multi-select | Action | Action |
| `barrel-length` | Multi-select | Barrel Length | Barrel Length |
| `magazine-capacity` | Multi-select | Magazine Capacity | Magazine Capacity |
| `frame-color` | Multi-select | Frame Color | Frame Color |

> **Values are managed in the admin, not hardcoded here.** Go to `/app/product-attributes` in the Medusa admin to see current values, add new ones, or add new attribute types. New brands, calibers, models, etc. must be added there before they can be referenced in an import.

---

### Product Tags — Firearm type classification

Products can carry one or both classification tags that control which section of the site they appear in. Tags are **not set via the import API** — assign them in Medusa Admin → Products → [product] → Tags after import, or via the Medusa admin API.

| Tag | Effect |
|---|---|
| `Collectibles Firearms` | Product appears on `/shop/collectible-firearms` and in the "Collectible Firearms" filter on Shop All |
| `Modern Firearms` | Product appears on `/shop/modern-firearms` and in the "Modern Firearms" filter on Shop All |
| `Featured` | Product appears in the Featured section on the home page |

> A product can carry both tags if appropriate. Products with neither tag appear only on Shop All.

---

## Post-Import Steps

After running an import, two follow-up steps are required:

### 1. Set up inventory

Imported products have no inventory records by default, which means the storefront shows them as "Unavailable." Run the bulk inventory setup script to create inventory records for any products missing them:

```bash
cd /home/ubuntu/luxus-commerce
node scripts/bulk-set-inventory.mjs
```

Use `--dry-run` first to preview. The script is safe to re-run — it skips products that already have inventory.

After running, go to Medusa Admin → Inventory and set the quantity for each product:
- **Quantity ≥ 1** → shows as "Available"
- **Quantity = 0** → shows as "Unavailable" (page stays live for SEO)

### 2. Assign product tags

Products are not automatically assigned to "Collectibles Firearms" or "Modern Firearms" sections. Go to Medusa Admin and add the appropriate tag(s) to each imported product, or use the Medusa admin API to bulk-tag by SKU pattern.

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
      "error": "duplicate key value violates unique constraint \"product_handle_unique\""
    }
  ]
}
```

- **HTTP 201** when at least one product was created
- **HTTP 400** when all products in the request failed, or when the body is a literal empty array `[]`
- **HTTP 500** (raw framework error, not the `results[]` shape above) if the server-side lookup of existing attribute types/values/categories/collections fails before any item is processed — rare, but possible on a database hiccup
- Bulk imports process each item independently — one failure does not stop the rest
- Warnings (unknown attribute values, unknown category/collection handles) are reported per item but do not fail the import
- Per-item `error` text is whatever the underlying database/framework error message says (e.g. a duplicate-handle constraint violation) — there's no fixed catalog of error strings to match against in your own code

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
      "model": "Agent",
      "caliber": ".45 ACP",
      "action": "Single Action",
      "barrel-length": "5\"",
      "frame-color": "Black",
      "magazine-capacity": "8"
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
      "short_description": "One of only 100 ever made.",
      "primary_category": "Heritage"
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

### Backroom / VIP product (hidden from public store)

```bash
curl -X POST https://api.luxus-collection.com/import/products \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{
    "title": "Wilson Combat Exclusive — VIP Only",
    "sku": "WC-VIP-001",
    "price": 4500.00,
    "status": "published",
    "inventory": {
      "is_backroom": true
    },
    "attributes": {
      "brand": "Wilson Combat",
      "caliber": ".45 ACP",
      "action": "Single Action"
    }
  }'
```

> This product will be live (`status: published`) but filtered out of all public store pages. It is accessible directly at its `/product/<handle>` URL.

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
        "model": "Agent",
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

MEDUSA_URL     = "https://api.luxus-collection.com"
IMPORT_API_KEY = "your-import-api-key"
ADMIN_EMAIL    = "your-admin@email.com"
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
      "model": "Agent",
      "caliber": ".45 ACP",
      "action": "Single Action",
      "barrel-length": "5\"",
      "frame-color": "Black",
      "magazine-capacity": "8"
    }
  }
]
```

Images are matched to products by SKU automatically. Products with no matching image files are imported without images — no error is raised.

---

## Bulk Import Script (type, tag, sales channel, inventory, images)

The `/import/products` API creates the product only. It does **not** set the product type, tags, sales channel, shipping profile, inventory, or copy images into our own S3 bucket (the storefront only allows images from our own hosts, so manufacturer-hosted image URLs show as broken). For a batch of new firearms use the script instead: `services/medusa/apps/backend/src/scripts/import-products.ts`. It takes the same JSON shape as the API and, for every product:

- creates it as **draft** with product type `Firearm` and tag `Modern Firearms`
- attaches **only** the `Web Site` sales channel, plus the default shipping profile
- marks it **contact for pricing** (no price is set)
- downloads each image and re-uploads it to S3 (blocked/broken image links are skipped and reported; the first usable image becomes the thumbnail)
- creates an inventory item (title = SKU) with stock `1` at the `Luxus Collection` location
- links attributes, auto-creating values that do not exist yet after applying the alias table at the top of the script (near-duplicates such as `HK` -> `Heckler & Koch`, `5.56mm` -> `5.56 NATO`, category `shotguns` -> `shotgun`). **Review that alias table for every new file** — otherwise near-duplicate values get created and split the storefront filters.

Run inside the backend container. It defaults to a **dry run** (no writes or uploads):

```bash
docker cp items.json luxus-medusa:/tmp/import_items.json
docker compose exec medusa sh -c "npx medusa exec ./src/scripts/import-products.ts"                       # dry run, prints new attribute values it would create
docker compose exec -e DRY_RUN=false -e LIMIT=3 medusa sh -c "npx medusa exec ./src/scripts/import-products.ts"   # small pilot
docker compose exec -d -e DRY_RUN=false medusa sh -c "npx medusa exec ./src/scripts/import-products.ts > /tmp/import.log 2>&1"   # full run in background
```

It is safe to re-run: products whose handle or SKU already exist are skipped, and if a step fails partway the half-built product is removed. Do not restart the backend container while it runs. Results are written to `/tmp/import_results.json` in the container. Optional env vars: `ONLY_SKUS=A,B`, `LIMIT`, `STOCK_QTY`, `TYPE_VALUE`, `TAG_VALUE`, `CHANNEL_NAME`, `LOCATION_NAME`, `IMPORT_JSON`.

---

## Notes and Gotchas

**Handles must be unique.** If you import the same title twice without an explicit `handle`, the second import fails with a duplicate handle error. Always set an explicit `handle` for programmatic imports.

**SKUs should be unique too, though it isn't separately validated.** There's no dedicated SKU-uniqueness check in the import code — a duplicate SKU is only caught if/when the underlying database constraint rejects it, which fails just that one item (same as a duplicate handle) but with a raw database error message rather than a friendly one.

**Prices are in dollars, stored in cents.** Pass `3499.00` for a $3,499 item.

**Attribute values must already exist.** The import does not create new attribute types or values on the fly. Add new brands, models, calibers, etc. via the admin at `/app/product-attributes` before running an import that references them. Unknown values produce a warning but do not fail the import.

**`model` is an attribute, not a core field.** Pass it in the `attributes` block as `"model": "P7 M13"`, not as a top-level field. The model attribute drives the Model filter on listing pages and the Model row in the spec table.

**Categories and collections must already exist.** Create them in Medusa Admin before importing. Unknown handles produce a warning but do not fail the import.

**Products default to `draft`.** Set `"status": "published"` to make them live immediately.

**Inventory records are not created automatically.** Imported products have no inventory and will show as "Unavailable." Run `scripts/bulk-set-inventory.mjs` after any bulk import to initialize inventory at quantity 1, then adjust quantities in the admin.

**Product tags must be assigned after import.** The import API does not set product tags. Add "Collectibles Firearms" or "Modern Firearms" tags in Medusa Admin after import so products appear in the correct storefront sections.

**Inventory and serial number fields are admin-only.** The `inventory` block and `details.serial_number` are never returned by any public or store-facing API route.

**Backroom flags hide from all public pages immediately.** Setting `is_backroom` or `is_master_backroom` to `true` in the import body causes the product to be filtered from all public listing pages. The storefront cache is revalidated automatically — no manual action needed.

**Specs and In The Box tabs hide when empty.** The spec endpoint returns `null` when no specs are set. The storefront uses this to show or hide the Specifications tab. Same for the In The Box tab.

**Don't set filterable attributes twice.** Brand, Model, Caliber, Action, Barrel Length, Magazine Capacity, and Frame Color auto-populate the spec table from the `attributes` block. Only use `extra_specs` for rows not covered by `specs` or `attributes`.

**Bulk imports process sequentially.** Items are processed one at a time to avoid duplicate-handle collisions. Expect roughly 1–2 seconds per product for large catalogs.

**Images must be hosted URLs.** The import endpoint accepts URLs only, not file uploads. Use the automated script above to upload from local files first.

**`contact_for_pricing` must be in `details`, not top-level.** Pass it as `"details": { "contact_for_pricing": true }`. It is written to both the product_detail record and product metadata so it displays correctly on listing pages and the detail page.
