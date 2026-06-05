# Luxus Collection — Product Update API

**Base URL:** `https://api.luxus-collection.com`  
**Auth:** Admin JWT via `Authorization: Bearer <token>`

---

## Overview

`POST /import/products` is **create-only** — it has no upsert logic. If a product already exists, submitting it again returns a duplicate-handle error. All updates to existing products must go through the Medusa admin API.

This document covers:
- Getting an admin JWT
- Resolving a product ID from a handle or SKU
- Updating core product fields (title, subtitle, description, categories, collection)
- Updating custom module data (details, specs, attributes)
- Updating metadata fields (highlights, in\_the\_box, extra\_specs)
- A complete Python update script

---

## Authentication

```bash
POST /auth/user/emailpass
Content-Type: application/json

{ "email": "admin@luxus-collection.com", "password": "your-password" }
```

Response:
```json
{ "token": "eyJ..." }
```

Use `Authorization: Bearer <token>` on all subsequent requests.

---

## Resolving a Product ID

All update endpoints require the Medusa product ID (`prod_01...`), not the handle or SKU.

**By handle:**
```
GET /admin/products?handle=<handle>
```

**By SKU** (searches title and variants):
```
GET /admin/products?q=<sku>
```

Response shape: `{ "products": [{ "id": "prod_01...", ... }] }`. Take `products[0].id`.

---

## 1. Core Product Fields

**Endpoint:** `POST /admin/products/:id`

> Medusa v2 uses `POST` for updates on existing records, not `PATCH`.

**Fields:**

| Field | Type | Notes |
|---|---|---|
| `title` | string | Product display name |
| `subtitle` | string | Short italic tagline |
| `handle` | string | URL slug — must remain unique |
| `description` | string | Long-form description (HTML or plain text) |
| `status` | `"draft"` \| `"published"` | Publish or unpublish |
| `thumbnail` | string | URL of primary image |
| `images` | `{ url: string }[]` | Gallery images — **replaces** current image list |
| `categories` | `{ id: string }[]` | Array of category ID objects — **replaces** current assignments |
| `collection_id` | string | Collection ID — pass `null` to remove |

```bash
curl -X POST https://api.luxus-collection.com/admin/products/prod_01... \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "subtitle": "Updated subtitle",
    "description": "Updated long description",
    "status": "published",
    "categories": [{ "id": "pcat_01..." }],
    "collection_id": "pcol_01..."
  }'
```

> `categories` and `images` are **full replacements** — omit them entirely if you don't want to change them. Passing an empty array removes all assignments.

> Categories require IDs, not handles. Resolve category handles to IDs via `GET /admin/product-categories?handle=<handle>`.

> `collection_id` requires the collection ID, not the handle. Resolve via `GET /admin/collections?handle=<handle>`.

---

## 2. Product Details

Stores: `short_description`, `optics_ready`, `contact_for_pricing`, `primary_category`, `engraver`, `seo_meta_title`, `seo_meta_description`.

The handler automatically syncs `short_description`, `engraver`, `primary_category`, and `contact_for_pricing` into `product.metadata` on every save — no extra call needed.

### Check if a record exists

```
GET /admin/products/:id/details
→ { "product_detail": {...} }   ← record exists, use PUT
→ { "product_detail": null }    ← no record yet, use POST
```

### Create (first time only)

```
POST /admin/products/:id/details
```

### Update (record already exists)

```
PUT /admin/products/:id/details
```

**Body** — send only the fields you want to change:

```json
{
  "short_description": "One-paragraph summary shown on product cards and the detail page.",
  "optics_ready": true,
  "contact_for_pricing": false,
  "primary_category": "Heritage",
  "engraver": "Master Engraver Name",
  "seo_meta_title": "Product Name — Luxus Collection",
  "seo_meta_description": "Buy the Product Name at Luxus Collection."
}
```

> **Do not send** `id`, `created_at`, `updated_at`, or `deleted_at`. These are managed fields — sending them causes MikroORM to silently abort the update with no error.

---

## 3. Product Specs

Stores: `overall_length`, `weight`, `frame_material`, `grip_material`, `sight_type`, `finish_type`.

These render as rows 8–13 in the Specifications tab (after the attribute-derived rows).

### Check if a record exists

```
GET /admin/products/:id/specs
→ { "product_spec": {...} }   ← use PUT
→ { "product_spec": null }    ← use POST
```

### Create (first time only)

```
POST /admin/products/:id/specs
```

### Update (record already exists)

```
PUT /admin/products/:id/specs
```

**Body:**

```json
{
  "overall_length": "8.75\"",
  "weight": "40.9 oz",
  "frame_material": "416 Stainless Steel",
  "grip_material": "G10 Piranha — Black / Grey",
  "sight_type": "Heinie Straight Eight Ledge — Night Sights",
  "finish_type": "DLC (Diamond-Like Carbon) — Black"
}
```

> Do not send managed timestamp fields (same rule as details).

---

## 4. Metadata Fields

Stores: `highlights`, `in_the_box`, `extra_specs`.

These live in `product.metadata` directly — there is no custom module. Update them via the standard product endpoint:

```
POST /admin/products/:id
```

**Body:**

```json
{
  "metadata": {
    "highlights": [
      { "title": "One-Gun-One-Gunsmith", "body": "Built start-to-finish by a single master craftsman" },
      { "title": "DLC Finish", "body": "Diamond-Like Carbon coating — harder than tool steel" }
    ],
    "in_the_box": [
      "Pistol",
      "Two 8-round magazines",
      "Fitted hard case",
      "Certificate of authenticity"
    ],
    "extra_specs": {
      "Height": "5.25\"",
      "Safety": "Ambidextrous Thumb Safety",
      "Country of Origin": "United States"
    }
  }
}
```

> **Metadata merges, not replaces.** Sending `{ "metadata": { "highlights": [...] } }` updates only `highlights` — other metadata keys are unchanged. To clear a key, pass it explicitly as `null`: `{ "metadata": { "highlights": null } }`.

---

## 5. Attributes

Stores: `brand`, `model`, `caliber`, `action`, `barrel-length`, `frame-color`, `magazine-capacity`.

Attributes use a many-to-many link to `attribute_value` records. There is **no PUT / replace-all** endpoint — changes are additive (POST links new values) or subtractive (DELETE unlinks a value). Both operations automatically sync the updated values into `product.metadata`.

### Read current linked values

```
GET /admin/products/:id/attributes
→ { "attribute_values": [{ "id": "01KRKJ...", "value": "9mm", "attribute_type_id": "..." }] }
```

### Link new values

```
POST /admin/products/:id/attributes
```

```json
{ "value_ids": ["01KRKJ0V4TN7JRNB8DBBM7YP7M", "01KRM6EK02EVG6VEFM7GDP5KSC"] }
```

### Unlink a value

```
DELETE /admin/products/:id/attributes
```

```json
{ "value_id": "01KRKJ0V4TN7JRNB8DBBM7YP7M" }
```

### Resolving attribute value IDs

You need the attribute value's ID, not the string value. Look them up once and cache:

```
GET /admin/product-attributes
→ { "attribute_types": [{ "id": "...", "slug": "caliber", "name": "Caliber" }] }

GET /admin/product-attributes/:typeId/values
→ { "attribute_values": [{ "id": "01KRKJ...", "value": "9mm" }] }
```

### Full attribute replace pattern

To fully replace a product's attributes (e.g. replacing all calibers):

1. `GET /admin/products/:id/attributes` — get current linked value IDs
2. `DELETE` each stale value that should be removed
3. `POST` the new value IDs

---

## Complete Python Update Script

```python
import requests

BASE = "https://api.luxus-collection.com"


def get_token(email: str, password: str) -> str:
    r = requests.post(f"{BASE}/auth/user/emailpass",
                      json={"email": email, "password": password})
    r.raise_for_status()
    return r.json()["token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ── Product lookup ────────────────────────────────────────────────────────────

def get_product_id_by_handle(token: str, handle: str) -> str | None:
    r = requests.get(f"{BASE}/admin/products?handle={handle}", headers=auth(token))
    r.raise_for_status()
    products = r.json().get("products", [])
    return products[0]["id"] if products else None


def get_product_id_by_sku(token: str, sku: str) -> str | None:
    r = requests.get(f"{BASE}/admin/products?q={sku}", headers=auth(token))
    r.raise_for_status()
    for p in r.json().get("products", []):
        for v in p.get("variants", []):
            if v.get("sku") == sku:
                return p["id"]
    return None


# ── Core fields ───────────────────────────────────────────────────────────────

def update_core(token: str, prod_id: str, data: dict) -> dict:
    """Update title, subtitle, handle, description, status, categories, collection_id."""
    r = requests.post(f"{BASE}/admin/products/{prod_id}",
                      json=data, headers=auth(token))
    r.raise_for_status()
    return r.json()


# ── Details ───────────────────────────────────────────────────────────────────

def get_details(token: str, prod_id: str) -> dict | None:
    r = requests.get(f"{BASE}/admin/products/{prod_id}/details", headers=auth(token))
    r.raise_for_status()
    return r.json().get("product_detail")


def save_details(token: str, prod_id: str, data: dict) -> dict:
    """Creates or updates product_detail. Automatically syncs metadata."""
    existing = get_details(token, prod_id)
    method = requests.put if existing else requests.post
    r = method(f"{BASE}/admin/products/{prod_id}/details",
               json=data, headers=auth(token))
    r.raise_for_status()
    return r.json()


# ── Specs ─────────────────────────────────────────────────────────────────────

def get_specs(token: str, prod_id: str) -> dict | None:
    r = requests.get(f"{BASE}/admin/products/{prod_id}/specs", headers=auth(token))
    r.raise_for_status()
    return r.json().get("product_spec")


def save_specs(token: str, prod_id: str, data: dict) -> dict:
    """Creates or updates product_spec."""
    existing = get_specs(token, prod_id)
    method = requests.put if existing else requests.post
    r = method(f"{BASE}/admin/products/{prod_id}/specs",
               json=data, headers=auth(token))
    r.raise_for_status()
    return r.json()


# ── Metadata (highlights, in_the_box, extra_specs) ────────────────────────────

def update_metadata(token: str, prod_id: str,
                    highlights: list | None = None,
                    in_the_box: list | None = None,
                    extra_specs: dict | None = None) -> dict:
    """Merges into product.metadata. Pass None to leave a key unchanged."""
    patch = {}
    if highlights  is not None: patch["highlights"]  = highlights
    if in_the_box  is not None: patch["in_the_box"]  = in_the_box
    if extra_specs is not None: patch["extra_specs"] = extra_specs
    if not patch:
        return {}
    r = requests.post(f"{BASE}/admin/products/{prod_id}",
                      json={"metadata": patch}, headers=auth(token))
    r.raise_for_status()
    return r.json()


# ── Attributes ────────────────────────────────────────────────────────────────

def build_attr_lookup(token: str) -> dict[str, dict[str, str]]:
    """Returns { slug: { "value lowercase": "value_id" } } for all types."""
    r = requests.get(f"{BASE}/admin/product-attributes?limit=100", headers=auth(token))
    r.raise_for_status()
    lookup: dict[str, dict[str, str]] = {}
    for t in r.json().get("attribute_types", []):
        rv = requests.get(f"{BASE}/admin/product-attributes/{t['id']}/values?limit=500",
                          headers=auth(token))
        rv.raise_for_status()
        lookup[t["slug"]] = {
            v["value"].lower(): v["id"]
            for v in rv.json().get("attribute_values", [])
        }
    return lookup


def replace_attributes(token: str, prod_id: str,
                        new_attrs: dict[str, str | list[str]],
                        lookup: dict[str, dict[str, str]]) -> None:
    """
    Fully replace a product's attribute assignments.
    new_attrs: { slug: value_or_list }  e.g. { "caliber": "9mm", "brand": ["HK", "Nighthawk"] }
    lookup: pre-built from build_attr_lookup()
    """
    # Current linked values
    r = requests.get(f"{BASE}/admin/products/{prod_id}/attributes", headers=auth(token))
    r.raise_for_status()
    current_ids = {v["id"] for v in r.json().get("attribute_values", [])}

    # Desired value IDs
    desired_ids: set[str] = set()
    for slug, raw in new_attrs.items():
        values = raw if isinstance(raw, list) else [raw]
        for val in values:
            vid = lookup.get(slug, {}).get(val.lower())
            if vid:
                desired_ids.add(vid)
            else:
                print(f"  WARNING: unknown attribute value '{val}' for slug '{slug}'")

    # Remove stale
    for vid in current_ids - desired_ids:
        requests.delete(f"{BASE}/admin/products/{prod_id}/attributes",
                        json={"value_id": vid}, headers=auth(token)).raise_for_status()

    # Add new
    to_add = list(desired_ids - current_ids)
    if to_add:
        requests.post(f"{BASE}/admin/products/{prod_id}/attributes",
                      json={"value_ids": to_add}, headers=auth(token)).raise_for_status()


# ── Example usage ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    token = get_token("admin@luxus-collection.com", "your-password")

    # Build attribute lookup once and reuse across all products
    attr_lookup = build_attr_lookup(token)

    prod_id = get_product_id_by_handle(token, "heckler-koch-p7-m13")
    if not prod_id:
        raise SystemExit("Product not found")

    # Update core fields
    update_core(token, prod_id, {
        "title": "Heckler & Koch P7 M13 Training Program Weapon",
        "status": "published",
    })

    # Update details (creates or updates automatically)
    save_details(token, prod_id, {
        "short_description": "An extremely early HK P7 M13, factory marked 'Training Program Weapon'.",
        "primary_category": "Factory Original",
        "contact_for_pricing": True,
        "optics_ready": False,
        "seo_meta_title": "HK P7 M13 Training Program Weapon — Luxus Collection",
    })

    # Update specs (creates or updates automatically)
    save_specs(token, prod_id, {
        "overall_length": "6.9\"",
        "weight": "29 oz",
        "frame_material": "Steel",
        "grip_material": "Walnut",
        "sight_type": "Fixed",
        "finish_type": "Blued",
    })

    # Update metadata fields
    update_metadata(token, prod_id,
        highlights=[
            {"title": "Factory Training Program Marked",
             "body": "Rare institutional pistol, not standard commercial production."},
            {"title": "Walnut Target Grips",
             "body": "Finely stippled walnut grips with gold medallion."},
        ],
        in_the_box=[
            "Leather presentation case",
            "Original HK plastic factory box",
            "Two P7 M13 instruction manuals",
            "Cleaning brush and disassembly tool",
        ],
        extra_specs={
            "Country of Origin": "Germany",
        }
    )

    # Replace attributes
    replace_attributes(token, prod_id, {
        "brand":             "Heckler & Koch",
        "model":             "P7 M13",
        "caliber":           ["9mm", ".38 Super"],
        "action":            "Single Action Only",
        "barrel-length":     "4.25\"",
        "frame-color":       "Black",
        "magazine-capacity": "14",
    }, attr_lookup)

    print(f"Updated {prod_id}")
```

---

## Quick Reference

| What to update | Endpoint | Method |
|---|---|---|
| title, subtitle, handle, description, status | `/admin/products/:id` | `POST` |
| categories | `/admin/products/:id` | `POST` with `categories: [{id}]` |
| collection | `/admin/products/:id` | `POST` with `collection_id` |
| thumbnail, images | `/admin/products/:id` | `POST` |
| highlights, in\_the\_box, extra\_specs | `/admin/products/:id` | `POST` with `metadata: {...}` |
| short\_description, primary\_category, contact\_for\_pricing, optics\_ready, engraver, SEO | `/admin/products/:id/details` | `PUT` (or `POST` if none exists) |
| overall\_length, weight, frame\_material, grip\_material, sight\_type, finish\_type | `/admin/products/:id/specs` | `PUT` (or `POST` if none exists) |
| brand, model, caliber, action, barrel-length, frame-color, magazine-capacity | `/admin/products/:id/attributes` | `POST` to link, `DELETE` to unlink |

---

## Notes

**Always check before PUT.** The `/details` and `/specs` routes return `null` when no record has been created yet. Calling `PUT` on a missing record returns 404. Call `GET` first and use `POST` if null, `PUT` if it exists — or use the `save_details` / `save_specs` helpers above which handle this automatically.

**Attributes need IDs, not strings.** Build the lookup table once per session with `build_attr_lookup()` and reuse it. Attribute value IDs never change once created.

**Metadata merges.** `POST /admin/products/:id` with a `metadata` key merges with existing keys rather than replacing the whole object. To clear a specific key pass it as `null`.

**`details.contact_for_pricing` syncs to metadata automatically.** The details PUT handler writes `contact_for_pricing: "true"/"false"` into `product.metadata` so the storefront mapper picks it up on listing pages without a separate call.

**Storefront cache revalidates on product change.** The Medusa webhook fires on any admin product update and calls `POST /api/revalidate?tag=products` on the storefront, clearing the cache within seconds. No manual revalidation needed after script runs.
