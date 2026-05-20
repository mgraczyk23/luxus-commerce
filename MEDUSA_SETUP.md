# Medusa Backend Setup — Luxus Collection

Everything below lives in Medusa. (Payload CMS handles editorial content — see `MEDUSA_BACKEND.md` for that side.)

---

## 1. Product Categories (Medusa built-in `product_categories`)

These power the **Category filter** on the listing page and the breadcrumb taxonomy. Products can belong to multiple. Create in Medusa Admin → **Settings → Categories**.

| Category | Handle |
|---|---|
| 1911 | `1911` |
| Revolver | `revolver` |
| Modern Pistol | `modern-pistol` |
| Heritage Pistol | `heritage-pistol` |
| Compact / EDC | `compact-edc` |

---

## 2. Product Collections (Medusa built-in `collections`)

Curated marketing groupings shown on the homepage **Shop By Collection** tab. Create in Medusa Admin → **Products → Collections**. Each collection gets a thumbnail via `metadata.image_url`.

| Collection | Handle |
|---|---|
| 1911 Series | `1911-series` |
| Heritage Revolvers | `heritage-revolvers` |
| Modern Classics | `modern-classics` |
| Presentation Grade | `presentation-grade` |

---

## 3. Product fields — Core (built-in Medusa schema)

For every product:

| Field | Type | Where it shows on the site |
|---|---|---|
| `title` | string | Everywhere — main product name |
| `subtitle` | string | Detail page — italic gold tagline directly under the title (e.g. `"Compact Government 1911 · Berryville, Arkansas"`) |
| `handle` | string (slug) | URL: `/product/<handle>` |
| `description` | rich text | Detail page → "About This Piece" overview |
| `thumbnail` | URL | Card image on every grid |
| `images[]` | URL[] | Detail page gallery (5 images recommended) |
| `variants[0].sku` | string | Detail page SKU line |
| `variants[0].prices[0].amount` | int (cents) | Price everywhere — divide by 100 for USD |
| `variants[0].inventory_quantity` | int | Drives availability — `> 0` = Available, `0` or `false` = Unavailable. Listing page also sorts in-stock items first. |
| `categories[]` | Category[] | Listing filter, breadcrumbs |
| `collections` | Collection | Homepage Shop By Collection |
| `status` | enum | Set `"published"` for live products |
| `created_at` | ISO date | New Arrivals strip sorts by this (`-created_at`) |

---

## 4. Product fields — Custom metadata (Medusa `product.metadata` JSON)

These are all product-level — set them in Medusa Admin under each product's **Metadata** section. Stored as a JSON blob.

### 4a. Filter-facing attributes (always set these)

The listing page sidebar filters everything off these five fields. Required on every product.

| Key | Example | Notes |
|---|---|---|
| `metadata.brand` | `"Nighthawk Custom"` | Brand filter + card eyebrow + detail page brand line |
| `metadata.model` | `"Agent"` | Model filter (auto-narrows by brand) + cart line items |
| `metadata.caliber` | `".45 ACP"` | Caliber filter + caliber/action chip on cards |
| `metadata.action` | `"Single Action"` | Action filter — values: `"Single Action"`, `"DA / SA"`, `"Striker-Fired"` |
| `metadata.barrel_length` | `"5\""` | Barrel Length filter — store with the quote mark for the inch sign |

### 4b. Pricing behavior

| Key | Type | Behavior |
|---|---|---|
| `metadata.contact_for_pricing` | `"true"` \| `"false"` | When `"true"`, the price reads "Contact Us For Pricing", and **Add to Cart** is replaced with a **"Contact Us For Pricing"** button that opens a modal contact form. (Stored as a string because Medusa metadata coerces booleans.) |

### 4c. Editorial copy

| Key | Type | Where it shows |
|---|---|---|
| `metadata.short_description` | string | Detail page — one paragraph between the subtitle and the spec chips |
| `metadata.primary_category` | string \| null | Single highlight tag shown as a floating gold badge in the top-left corner of a card. Suggested values: `"Engraved"`, `"Prototype"`, `"Limited Edition"`, `"Heritage"`. Leave `null` for no badge. **This is NOT the same as Medusa categories.** |
| `metadata.engraver` | string \| null | Optional. When set, the detail page renders an "Engraved By [name]" callout between the spec chips and the price. Omit on non-engraved pieces or unknown engravers. |

### 4d. Detail page structured data

Each of these is consumed by a specific tab/section on the detail page.

#### `metadata.specifications` — Specifications tab (key/value table)
```json
{
  "Caliber": ".45 ACP",
  "Action": "Single Action",
  "Barrel Length": "5\"",
  "Overall Length": "8.7\"",
  "Height": "5.25\"",
  "Width": "1.3\"",
  "Weight (Unloaded)": "40.9 oz",
  "Capacity": "8+1",
  "Frame Material": "416 Stainless Steel",
  "Slide Material": "416 Stainless Steel",
  "Finish": "DLC (Diamond-Like Carbon) — Black",
  "Grips": "G10 Piranha — Black / Grey",
  "Sights": "Heinie Straight Eight Ledge — Night Sights",
  "Optics Ready": "No",
  "Safety": "Ambidextrous Thumb Safety",
  "Country of Origin": "United States"
}
```
Keys are rendered verbatim. Add or omit rows as the product warrants.

#### `metadata.in_the_box` — In The Box tab (bullet list)
```json
[
  "Nighthawk Custom Agent pistol",
  "Two 8-round Wilson Combat magazines",
  "Fitted lockable hard case",
  "Certificate of authenticity (signed by building gunsmith)",
  "Instruction manual",
  "Bore brush and cleaning rod",
  "Lock"
]
```

#### `metadata.highlights` — Overview tab feature boxes
```json
[
  { "title": "One-Gun-One-Gunsmith", "body": "Built start-to-finish by a single master craftsman" },
  { "title": "Hand-Fitted Components", "body": "Each part individually fitted and lapped for zero slop" },
  { "title": "DLC Finish", "body": "Diamond-Like Carbon coating — harder than tool steel" },
  { "title": "Heinie Night Sights", "body": "Tritium-filled Straight Eight ledge sights, factory installed" }
]
```
Hidden gracefully when empty. Grid auto-flows 2–4 columns by viewport.

---

## 5. Inventory / "one-of-a-kind" handling

You sell single units by serial number. Set up each product with **one variant**, **inventory_quantity: 1**, and **manage_inventory: true**. When the variant sells:

- The site reads `variants[0].inventory_quantity > 0` for the **Available** / **Unavailable** label
- Listing page automatically pushes sold pieces to the end of the grid and applies the **Unavailable** overlay
- The detail page swaps the Add to Cart button to a disabled "Unavailable" state (currently the gallery badge changes)

No quantity selector appears on either page since every product is qty: 1.

---

## 6. Customers & Orders (Medusa built-in)

For the **Account dashboard** page. Standard Medusa customer/order shape, plus:

| Field | Used on |
|---|---|
| `customer.first_name`, `last_name`, `email`, `phone` | Account Details tab |
| `customer.created_at` | "Member Since" header |
| `customer.metadata.ffl_dealer` | Preferred FFL dealer (optional) |
| `orders[].display_id` | "LXC-109842"-style order number |
| `orders[].created_at` | Order date column |
| `orders[].fulfillment_status` | Maps to UI labels: `shipped` → "In Transit", `delivered` → "Delivered", etc. |
| `orders[].items[]` | Line items |
| `orders[].total` | Divide by 100 for USD |
| `orders[].fulfillments[0].tracking_numbers[0]` | Tracking number shown next to each order |
| `orders[].metadata.ffl_dealer` | Per-order FFL dealer text |

---

## 7. Recommended Medusa Admin reference mapper (Next.js)

Place this in `lib/medusa.ts` and use it in every server component that reads a product:

```ts
export function mapMedusaProduct(p) {
  return {
    id:                p.id,
    handle:            p.handle,
    title:             p.title,
    subtitle:          p.subtitle,
    brand:             p.metadata?.brand,
    sku:               p.variants?.[0]?.sku,
    price:             p.variants?.[0]?.prices?.[0]?.amount
                         ? p.variants[0].prices[0].amount / 100 : null,
    contact_for_pricing: p.metadata?.contact_for_pricing === "true",
    in_stock:          (p.variants?.[0]?.inventory_quantity ?? 0) > 0,
    images:            p.images?.map(i => i.url) ?? [],
    thumbnail:         p.thumbnail,
    categories:        p.categories?.map(c => c.name) ?? [],
    primary_category:  p.metadata?.primary_category ?? null,
    engraver:          p.metadata?.engraver ?? null,

    // Editorial copy
    short_description: p.metadata?.short_description,
    overview:          p.description,
    highlights:        p.metadata?.highlights ?? [],

    // Structured data
    specifications:    p.metadata?.specifications ?? {},
    in_the_box:        p.metadata?.in_the_box ?? [],

    // Filter-facing attributes
    attributes: {
      brand:         p.metadata?.brand,
      model:         p.metadata?.model,
      caliber:       p.metadata?.caliber,
      action:        p.metadata?.action,
      barrel_length: p.metadata?.barrel_length,
    },
    details: {
      primary_category: p.metadata?.primary_category ?? null,
    },
  };
}
```

---

## 8. Backend Setup Checklist

### One-time setup
- [ ] Create 5 product_categories: `1911`, `Revolver`, `Modern Pistol`, `Heritage Pistol`, `Compact / EDC`
- [ ] Create 4 collections: `1911 Series`, `Heritage Revolvers`, `Modern Classics`, `Presentation Grade`
- [ ] Add `mapMedusaProduct()` to your storefront codebase
- [ ] Set up FFL-compliance plugins / hooks as needed for checkout (out of scope for this doc)

### Per-product (every new piece you add)
- [ ] Core fields: title, subtitle, handle, description, thumbnail, images, status, categories, collection
- [ ] Variant: SKU, price, inventory_quantity (1), manage_inventory: true
- [ ] Required metadata: `brand`, `model`, `caliber`, `action`, `barrel_length`
- [ ] Optional metadata as appropriate: `short_description`, `primary_category` (badge tag), `engraver`, `contact_for_pricing`, `specifications`, `in_the_box`, `highlights`

### When a product sells
- [ ] Mark `inventory_quantity = 0` (or let the Medusa order flow do it automatically). The site reflects the change on next render.
