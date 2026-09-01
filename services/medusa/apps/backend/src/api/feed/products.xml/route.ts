import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, getTotalVariantAvailability } from "@medusajs/framework/utils"

// Products must be explicitly assigned to this sales channel (in Medusa admin)
// to appear in the feed. This is the access-control surface a non-technical
// admin uses day to day — assign/unassign a product from "Product Feed URL"
// to add/remove it here, no code or deploy required.
// Admin > Settings > Sales Channels > "Product Feed URL"
const FEED_SALES_CHANNEL_ID = "sc_01KRHMHHMKWCAG0ZKSKK9CB2D6"

const SITE_URL = process.env.STOREFRONT_URL ?? "https://luxus-collection.com"

const FIELDS = [
  "id", "handle", "title", "subtitle", "description", "thumbnail", "status",
  "images.url",
  "categories.name",
  "collection.handle",
  "tags.value",
  "type.value",
  "metadata",
  "variants.id",
  "variants.sku",
  "variants.manage_inventory",
  "variants.inventory_quantity",
  "variants.prices.amount",
  "variants.prices.currency_code",
  "attribute_values.id",
  "attribute_values.value",
  "attribute_values.attribute_type.slug",
  "product_spec.overall_length",
  "product_spec.weight",
  "product_spec.frame_material",
  "product_spec.grip_material",
  "product_spec.sight_type",
  "product_spec.finish_type",
  "product_detail.short_description",
  "product_detail.primary_category",
  "product_detail.contact_for_pricing",
  // product_detail.serial_number is intentionally excluded — never expose publicly,
  // matching the same exclusion in src/api/store/products/[id]/details/route.ts
]

// ── attribute_values helpers (same pattern as src/lib/medusa.ts / search-sync.ts) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildAttrMap(p: any): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  for (const av of p.attribute_values ?? []) {
    if (!av) continue
    const slug: string | undefined = av.attribute_type?.slug
    if (!slug || av.value == null) continue
    const val = String(av.value).trim()
    if (!val) continue
    if (!map[slug]) map[slug] = []
    if (!map[slug].includes(val)) map[slug].push(val)
  }
  return map
}

function attrDisplay(map: Record<string, string[]>, slug: string): string | null {
  const variants = [slug, slug.replace(/-/g, "_"), slug.replace(/_/g, "-")]
  for (const s of variants) {
    if (map[s]?.length) return map[s].join(" / ")
  }
  return null
}

// Backroom/private items must never leave the store, regardless of sales channel
// assignment — same guard used to keep them out of Meilisearch (search-sync.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isBackroomHidden(p: any): boolean {
  return p?.metadata?.master_backroom === "true" || p?.metadata?.backroom_hidden === "true"
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function cdata(s: string): string {
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`
}

function tag(name: string, value: string | number | null | undefined, asCdata = false): string {
  if (value === null || value === undefined || value === "") return ""
  const str = String(value)
  return `<${name}>${asCdata ? cdata(str) : escapeXml(str)}</${name}>`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildItem(p: any, availability: Record<string, { availability: number | null }>): string {
  const attrs = buildAttrMap(p)
  const brand = attrDisplay(attrs, "brand")
  const model = attrDisplay(attrs, "model")
  const caliber = attrDisplay(attrs, "caliber")
  const action = attrDisplay(attrs, "action")
  const barrelLength = attrDisplay(attrs, "barrel-length")
  const frameColor = attrDisplay(attrs, "frame-color")
  const magazineCapacity = attrDisplay(attrs, "magazine-capacity")

  const spec = p.product_spec ?? {}
  const detail = p.product_detail ?? {}

  const variant = p.variants?.[0]
  const sku: string | null = variant?.sku ?? null
  const id = sku || p.id

  // Unlike the public storefront, this feed always includes the set price even for
  // "Contact for Pricing" items — it's Basic Auth protected, not public, so there's
  // no leak risk, and the receiving site needs the real price to sync on.
  const priceAmount: number | null = variant?.prices?.[0]?.amount ?? null
  // inventory_quantity isn't a queryable field — Medusa computes it via a separate
  // availability calculation (same one the Store API uses), so it's passed in here
  // rather than read off the variant directly.
  const inventoryQty: number =
    variant?.manage_inventory === false ? 1 : (availability[variant?.id]?.availability ?? 0)
  const inStock = variant?.manage_inventory === false ? true : inventoryQty > 0

  const images: string[] = (p.images ?? []).map((i: { url: string }) => i.url).filter(Boolean)
  const thumbnail: string | null = p.thumbnail ?? null
  const allImages = thumbnail && !images.includes(thumbnail) ? [thumbnail, ...images] : images

  const description =
    p.description || detail.short_description || p.subtitle || p.title

  const categoryPath = [
    detail.primary_category,
    ...(p.categories ?? []).map((c: { name: string }) => c.name),
  ]
    .filter(Boolean)
    .join(" > ") || null

  const finish = spec.finish_type || frameColor
  const stockMaterial = [spec.frame_material, spec.grip_material].filter(Boolean).join(" / ") || null

  const isFirearm = p.type?.value?.toLowerCase() === "firearm"

  const parts = [
    "<item>",
    tag("g:id", id),
    tag("title", p.title, true),
    tag("description", description, true),
    tag("link", `${SITE_URL}/product/${p.handle}`),
    tag("g:image_link", allImages[0] ?? null),
    ...allImages.slice(1, 10).map((url) => tag("g:additional_image_link", url)),
    tag("g:availability", inStock ? "in stock" : "out of stock"),
    tag("g:quantity", inventoryQty),
    priceAmount ? tag("g:price", `${(priceAmount / 100).toFixed(2)} USD`) : "",
    tag("g:brand", brand),
    tag("g:mpn", sku),
    tag("g:product_type", categoryPath, true),
    // Firearm-specific fields — not part of Google's standard vocabulary, but
    // valid feed extensions most catalog importers can map to their own schema.
    tag("g:model", model),
    tag("g:caliber", caliber),
    tag("g:action", action),
    tag("g:barrel_length", barrelLength),
    tag("g:capacity", magazineCapacity),
    tag("g:finish", finish),
    tag("g:overall_length", spec.overall_length),
    tag("g:weight", spec.weight),
    tag("g:stock_material", stockMaterial),
    tag("g:requires_ffl", isFirearm ? "true" : "false"),
    "</item>",
  ]

  return parts.filter(Boolean).join("\n    ")
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Two-step lookup for speed: sales_channels is a cross-module link, not a native
  // property on the Product entity, so it can't be pushed down as a MikroORM filter
  // the way "status" can (confirmed: doing so throws "not existing property"). Fetching
  // every published product's full joined data (images/attributes/specs/prices) just to
  // discard all but the handful in this channel was the cause of the feed timing out, so
  // instead we first resolve just the product IDs linked to the channel (cheap, no deep
  // joins), then fetch full details only for that subset.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: channels } = (await query.graph({
    entity: "sales_channel",
    // The link module aliases this relation "products_link" on the SalesChannel side
    // (see @medusajs/link-modules/dist/definitions/product-sales-channel.js), and its
    // "id" field is the link record's own id (prodsc_...), not the product id — the
    // product id is "products_link.product_id". Confirmed against the live link table.
    fields: ["id", "products_link.product_id"],
    filters: { id: FEED_SALES_CHANNEL_ID } as any,
  })) as any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productIds: string[] = (channels?.[0]?.products_link ?? []).map((p: any) => p?.product_id).filter(Boolean)

  if (productIds.length === 0) {
    res.setHeader("Content-Type", "application/xml; charset=UTF-8")
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Luxus Collection Product Feed</title>
    <link>${SITE_URL}</link>
    <description>Outbound product feed for third-party sync. Products are included by assignment to the "Product Feed URL" sales channel in Medusa admin.</description>
  </channel>
</rss>
`)
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: products } = await query.graph({
    entity: "product",
    fields: FIELDS,
    filters: {
      id: productIds,
      status: "published",
    } as any,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visible = (products ?? []).filter((p: any) => !isBackroomHidden(p))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variantIds: string[] = visible.flatMap((p: any) => (p.variants ?? []).map((v: any) => v?.id).filter(Boolean))
  const availability = variantIds.length > 0
    ? await getTotalVariantAvailability(query, { variant_ids: variantIds })
    : {}

  const items = visible.map((p) => buildItem(p, availability)).join("\n    ")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Luxus Collection Product Feed</title>
    <link>${SITE_URL}</link>
    <description>Outbound product feed for third-party sync. Products are included by assignment to the "Product Feed URL" sales channel in Medusa admin.</description>
    ${items}
  </channel>
</rss>
`

  res.setHeader("Content-Type", "application/xml; charset=UTF-8")
  res.status(200).send(xml)
}
