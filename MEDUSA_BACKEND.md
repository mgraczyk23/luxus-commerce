# Luxus Collection — Backend Data Reference

This document describes every field the storefront reads, where it should live (Medusa vs. Payload CMS), and what role it plays in the UI. Use it as the contract between the Next.js frontend and your backend team.

There are two backends:
- **Medusa** — commerce: products, variants, prices, categories, collections, customers, orders, carts. Owns anything transactional.
- **Payload CMS** — editorial: homepage curation, brand directory, articles, authors, FAQ entries, policy pages, author bios, supporting imagery. Owns anything non-transactional.

Fields under `metadata` on Medusa products are arbitrary JSON; you set them in the Medusa Admin UI or via the Admin API.

---

## 1. Medusa — Products

A single product in Medusa drives the **Product Listing**, **Product Detail**, **Cart**, **Account/Order History**, **Account/Wishlist**, and every product card across the site (homepage Featured, New Arrivals, Related Products).

### Core fields (built into Medusa)

| Field | Type | Used on | Description |
|---|---|---|---|
| `title` | string | Everywhere | Product display name. e.g. `"Nighthawk Custom Agent"` |
| `subtitle` | string | Detail page (new) | Short editorial tagline shown directly under the title in italic gold. e.g. `"Compact Government 1911 · Berryville, Arkansas"` |
| `description` | string (rich text) | Detail page → Overview tab | The long-form prose ("About This Piece"). Multi-paragraph. |
| `handle` | string (slug) | All routing | URL slug — `/product/<handle>`. |
| `thumbnail` | URL | All cards | Primary product image. |
| `images[]` | URL[] | Detail gallery | Ordered list of additional gallery images. |
| `variants[0].sku` | string | Detail page | SKU shown next to the brand line. |
| `variants[0].prices[0].amount` | number (cents) | Everywhere | Price in cents — divide by 100 for USD. |
| `categories[]` | Category[] | Filtering, breadcrumbs | Medusa **product_categories** — broad taxonomy (1911, Revolver, Modern Pistol, etc.). A product can belong to multiple. |
| `collections` *(or `collection`)* | Collection | "Shop By Collection" | Marketing collections (1911 Series, Heritage Revolvers, Modern Classics, Presentation Grade). One per product. |
| `status` | enum | Listing | Set `"published"` for live products. |
| `created_at` | ISO date | New Arrivals | Used to sort `-created_at` for the New Arrivals strip. |

### Metadata fields (Medusa product.metadata JSON)

These are product-specific structured data we set on each product. They do **not** belong on variants — they describe the product as a whole.

| Metadata key | Type | Used on | Description |
|---|---|---|---|
| `metadata.brand` | string | Cards, filters, detail | Manufacturer name. e.g. `"Nighthawk Custom"`. (Brand also exists as a Payload entry — see §3 — but the per-product `brand` string is what filters and cards read.) |
| `metadata.model` | string | Filters, detail | Specific model name within a brand. e.g. `"Agent"`, `"Python"`, `"American Joe"`. Used by the Model filter on the Listing page (which narrows by brand). |
| `metadata.caliber` | string | Cards, filters, detail | e.g. `".45 ACP"`, `"9mm"`, `".357 Magnum"`. |
| `metadata.action` | string | Cards, filters, detail | e.g. `"Single Action"`, `"DA / SA"`, `"Striker-Fired"`. |
| `metadata.barrel_length` | string | Cards, filters, detail | Quoted inches, e.g. `'5"'`, `'4.25"'`. Quoted so the inch mark is preserved. |
| `metadata.short_description` | string | Detail page | One-paragraph product summary shown below the subtitle, above the CTA buttons. |
| `metadata.contact_for_pricing` | `"true" \| "false"` | Cards + detail | When `"true"`, the price line shows "Contact Us For Pricing" and the Add to Cart button is replaced with the Contact Us modal trigger. (Stored as a string because Medusa metadata coerces booleans to strings.) |
| `metadata.primary_category` | string \| null | Cards | The **badge** category shown floating in the top-left corner of a product card. e.g. `"Engraved"`, `"Prototype"`, `"Limited Edition"`, `"Heritage"`. This is *not* the same as the Medusa `categories` taxonomy — it's a single highlight tag. Leave null for no badge. |
| `metadata.engraver` | string \| null | Detail page | Optional engraver attribution. When set, the detail page renders an "Engraved By [name]" callout between the quick-spec chips and the price. Leave unset (or null) on non-engraved pieces or when the engraver is unknown — the callout is hidden gracefully. |
| `metadata.specifications` | object | Detail → Specifications tab | Key-value pairs rendered in the spec table. Example: `{ "Caliber": ".45 ACP", "Barrel Length": "5\"", "Weight (Unloaded)": "40.9 oz", "Frame Material": "416 Stainless Steel", ... }` |
| `metadata.in_the_box` | string[] | Detail → In The Box tab | Bulleted list of items included with the product. |
| `metadata.highlights` | `{title, body}[]` | Detail → Overview tab | Array of 0–N highlight boxes shown beneath the Overview prose. The UI gracefully shows nothing when empty, 1–N items as a responsive grid. Example: `[{ "title": "DLC Finish", "body": "Diamond-Like Carbon coating — harder than tool steel" }, ...]` |

### Mapping pattern (Next.js server component)

```ts
// lib/medusa.ts
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
    in_stock:          p.variants?.[0]?.inventory_quantity > 0,
    images:            p.images?.map(i => i.url) ?? [],
    thumbnail:         p.thumbnail,
    categories:        p.categories?.map(c => c.name) ?? [],
    primary_category:  p.metadata?.primary_category ?? null,

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

## 2. Medusa — Collections & Categories

The "Shop By" section on the homepage and the listing page filters need both.

| Medusa entity | Used for | What to populate |
|---|---|---|
| **product_categories** (built-in) | Listing-page **Category** filter, badge categorization, breadcrumbs | Create top-level entries: `1911`, `Revolver`, `Modern Pistol`, `Heritage Pistol`, `Compact / EDC`. Assign each product to one or more. |
| **collections** (built-in) | Homepage "Shop By Collection" tab | Create curated marketing collections: `1911 Series`, `Heritage Revolvers`, `Modern Classics`, `Presentation Grade`. Each is a separate Medusa entity with its own `title`, `handle`, and `metadata.image_url` if you want a card thumbnail. |

For the homepage "Shop By Collections / Categories" tabs, the lists are **curated, not auto** — store the displayed ones in a Payload "Homepage" global (see §3). Otherwise every collection/category in Medusa would appear, which is rarely what you want for a marketing module.

---

## 3. Payload CMS — Homepage global

A single editable global document that controls what's featured on the homepage.

```ts
// payload/globals/Homepage.ts
{
  slug: 'homepage',
  fields: {
    // Hero
    featuredHeroProductId: 'string',    // Medusa product handle/ID
    featuredHeroLabel:     'string',    // Default: "Featured Piece"

    // Featured Collection (4 cards)
    featuredProductIds:    'string[]',  // 4 Medusa product handles/IDs

    // Shop By Brand (curated, 5-6 logos)
    featuredBrandSlugs:    'string[]',  // refs to Brand collection (§4)

    // Shop By Collection (curated)
    featuredCollectionHandles: 'string[]',  // Medusa collection handles

    // Shop By Category (curated, distinct from filter category list)
    featuredCategoryHandles:   'string[]',  // Medusa product_category handles

    // From The Blog (3 cards)
    featuredArticleIds:    'string[]',  // refs to Article collection (§5)
  }
}
```

The New Arrivals strip does *not* live in this global — it's auto-driven by `medusa.products.list({ order: "-created_at", limit: 6 })`.

---

## 4. Payload CMS — Brands collection

The "Shop By Brand" homepage row and the brand filter dropdowns expect a real list of brand entities. Each one has a logo image.

```ts
// payload/collections/Brands.ts
{
  slug: 'brands',
  fields: {
    name:        'string',          // "Nighthawk Custom"
    slug:        'string',          // "nighthawk-custom"
    logo:        media,             // PNG/SVG, transparent
    short_blurb: 'string',          // optional, for brand landing pages
    description: 'richtext',        // optional, for brand landing pages
    featured:    'boolean',         // appears on homepage row if true (or just use featuredBrandSlugs in §3)
  }
}
```

The string in `product.metadata.brand` should match the `name` field here so that filter selection ties back to a brand entity.

---

## 5. Payload CMS — Articles collection

Drives the "From The Blog" strip on the homepage, the full Articles listing page, and the Single Article page.

```ts
// payload/collections/Articles.ts
{
  slug: 'articles',
  fields: {
    title:        'string',
    slug:         'string',           // URL: /article/<slug>
    category:     ref('article-categories'),  // see §6
    excerpt:      'string',           // 1-2 sentences, shown on cards
    body:         'richtext',         // long-form article body
    hero_image:   media,
    author:       ref('authors'),     // see §7
    publish_date: 'date',
    read_time:    'string',           // e.g. "8 min read"
    featured:     'boolean',          // featured on top of Articles listing
    related:      'relationship[]'    // optional manual related articles
  }
}
```

---

## 6. Payload CMS — Article Categories

Used by the Articles listing page filter tabs ("All", "Craft & Engineering", "Collector's Guide", "Brand Spotlight", etc.).

```ts
// payload/collections/ArticleCategories.ts
{
  slug: 'article-categories',
  fields: {
    name: 'string',   // "Craft & Engineering"
    slug: 'string',   // "craft-engineering"
  }
}
```

---

## 7. Payload CMS — Authors

```ts
// payload/collections/Authors.ts
{
  slug: 'authors',
  fields: {
    name:       'string',
    title:      'string',     // "Editor in Chief"
    avatar:     media,
    bio:        'richtext',
    twitter:    'string',     // optional
    instagram:  'string',     // optional
  }
}
```

---

## 8. Payload CMS — FAQ collection

Drives the FAQ page (with search + category accordions).

```ts
// payload/collections/FAQs.ts
{
  slug: 'faqs',
  fields: {
    category: 'select',    // Ordering, FFL Transfer, Payment, Shipping, Returns, Products
    question: 'string',
    answer:   'richtext',
    sort_order: 'number',
    anchor:   'string',     // optional in-page anchor (e.g. "ffl-cost")
  }
}
```

---

## 9. Payload CMS — Policy pages global

Each policy is a globally-editable rich text document. We split them out so each has its own editing surface in Payload Admin.

```ts
// payload/globals/PolicyShipping.ts, PolicyReturns.ts, PolicyPrivacy.ts, PolicyTerms.ts
{
  fields: {
    title:        'string',
    last_updated: 'date',
    intro:        'richtext',
    sections: {
      type: 'array',
      fields: {
        heading: 'string',
        body:    'richtext',
      }
    }
  }
}
```

---

## 10. Payload CMS — Site Settings / Contact global

For the footer, contact page, and FFL info block.

```ts
// payload/globals/SiteSettings.ts
{
  fields: {
    company_name:     'string',     // "Luxus Collection LLC"
    company_address:  'string',
    phone:            'string',     // "(833) 486-6659"
    email:            'string',     // "info@luxus-collection.com"
    consign_email:    'string',     // "consign@luxus-collection.com"
    ffl_license:      'string',     // FFL license number
    business_hours:   'string',     // "Mon–Fri, 9am–5pm CST"
    social: {
      facebook:  'string',
      instagram: 'string',
      linkedin:  'string',
      x:         'string',
      youtube:   'string',
      pinterest: 'string',
    },
    footer_blurb:     'richtext',   // short paragraph in footer left column
    newsletter_blurb: 'string',     // copy under "The Collector's Newsletter"
  }
}
```

---

## 11. Medusa — Customers & Orders

Drives the Account page (Order History, Account Details). Standard Medusa Store API fields apply:

| Field | Used on |
|---|---|
| `customer.first_name`, `customer.last_name`, `customer.email`, `customer.phone` | Account Details tab |
| `customer.created_at` | "Member Since" |
| `customer.metadata.ffl_dealer` | Preferred FFL dealer for fast checkout |
| `orders[].id`, `orders[].display_id` | "LXC-109842" style order numbers |
| `orders[].created_at` | Order date |
| `orders[].fulfillment_status` | Maps to "In Transit", "Delivered", etc. |
| `orders[].items[]` | Order line items |
| `orders[].total / 100` | Order total |
| `orders[].fulfillments[0].tracking_numbers[0]` | Tracking number link |
| `orders[].metadata.ffl_dealer` | FFL dealer text shown per order |

---

## 12. Consignment + Inquiry submissions

The Consignment form, Contact form, and the new product "Contact Us For Pricing" modal all submit to the same backend. Build a small Payload collection (or Medusa custom endpoint) to store them:

```ts
// payload/collections/Inquiries.ts
{
  slug: 'inquiries',
  fields: {
    type:           'select',   // contact, consignment, pricing-inquiry, support
    product_id:     'string',   // for pricing-inquiry — the Medusa product ID
    first_name:     'string',
    last_name:      'string',
    email:          'string',
    phone:          'string',
    message:        'textarea',
    submitted_at:   'date',
    status:         'select',   // new, in-progress, closed
    metadata:       'json',     // form-specific extra fields (consignment details, etc.)
  }
}
```

Email notifications to the team can be wired via Payload hooks or a Resend/Postmark webhook.

---

## Summary checklist — what your backend team needs to set up

### In Medusa Admin
- [ ] Create product_categories: `1911`, `Revolver`, `Modern Pistol`, `Heritage Pistol`, `Compact / EDC`
- [ ] Create collections: `1911 Series`, `Heritage Revolvers`, `Modern Classics`, `Presentation Grade`
- [ ] For every product, populate the metadata fields listed in §1 (brand, model, caliber, action, barrel_length, contact_for_pricing, primary_category, short_description, specifications, in_the_box, highlights)
- [ ] Set `subtitle` and `description` on each product
- [ ] Upload product images and set `thumbnail`

### In Payload CMS
- [ ] `Homepage` global — featured product IDs, featured brand/collection/category slugs, featured article IDs
- [ ] `Brands` collection — name, slug, logo for each brand
- [ ] `Articles` collection — articles with hero images, body, author, date
- [ ] `ArticleCategories` collection — taxonomy for article filtering
- [ ] `Authors` collection — author bios + avatars
- [ ] `FAQs` collection — Q/A pairs by category
- [ ] `PolicyShipping`, `PolicyReturns`, `PolicyPrivacy`, `PolicyTerms` globals — policy page content
- [ ] `SiteSettings` global — contact info, social links, FFL license, footer blurb
- [ ] `Inquiries` collection — receive submissions from Contact, Consignment, and Contact for Pricing forms
