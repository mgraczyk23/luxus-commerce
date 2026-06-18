import { type SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

const MEILI_URL = process.env.MEILISEARCH_HOST ?? "http://meilisearch:7700"
const MEILI_KEY = process.env.MEILISEARCH_API_KEY ?? ""
const INDEX    = "products"

const FIELDS = [
  "id", "handle", "title", "subtitle", "thumbnail",
  "*variants", "*variants.prices",
  "+metadata",
  "*attribute_values", "*attribute_values.attribute_type",
  "*categories",
].join(",")

function buildAttrMap(p: any): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  for (const av of (p.attribute_values ?? [])) {
    const slug: string | undefined = av.attribute_type?.slug
    if (!slug || av.value == null) continue
    const val = String(av.value).trim()
    if (!val) continue
    if (!map[slug]) map[slug] = []
    if (!map[slug].includes(val)) map[slug].push(val)
  }
  return map
}

function mapProduct(p: any) {
  const attrs  = buildAttrMap(p)
  const brand  = (attrs["brand"]         ?? []).join(" / ") || null
  const model  = (attrs["model"]         ?? []).join(" / ") || null
  const caliber= (attrs["caliber"]       ?? []).join(" / ") || null
  const action = (attrs["action"]        ?? []).join(" / ") || null
  const barrel = (attrs["barrel-length"] ?? []).join(" / ") || null

  const price = p.variants?.[0]?.prices?.[0]?.amount
    ? Math.round(p.variants[0].prices[0].amount / 100)
    : null

  const inStock = p.variants?.[0]?.manage_inventory === false
    ? true
    : (p.variants?.[0]?.inventory_quantity ?? 1) > 0

  return {
    id:                  p.id,
    handle:              p.handle,
    title:               p.title,
    subtitle:            p.subtitle ?? null,
    sku:                 p.variants?.[0]?.sku ?? null,
    brand, model, caliber, action,
    barrel_length:       barrel,
    price,
    contact_for_pricing: p.metadata?.contact_for_pricing === "true",
    in_stock:            inStock,
    thumbnail:           p.thumbnail ?? null,
    primary_category:    p.metadata?.primary_category ?? null,
    collection_handle:   p.collection?.handle ?? null,
    short_description:   p.metadata?.short_description ?? null,
  }
}

// Backroom/private items must never appear in public search. Mirror the
// storefront's is_backroom_hidden check (master_backroom + legacy backroom_hidden).
function isBackroomHidden(p: any): boolean {
  return p?.metadata?.master_backroom === "true" || p?.metadata?.backroom_hidden === "true"
}

async function upsertProduct(id: string, container: any) {
  if (!MEILI_KEY) return
  try {
    const query = container.resolve("query")
    const { data: products } = await query.graph({
      entity: "product",
      fields: FIELDS.split(","),
      filters: { id },
    })
    const p = products?.[0]
    if (!p) return

    // If it's a backroom/private item, make sure it's NOT in the public index
    // (delete it in case it was indexed while public), then stop.
    if (isBackroomHidden(p)) {
      await deleteProduct(id)
      return
    }

    await fetch(`${MEILI_URL}/indexes/${INDEX}/documents`, {
      method: "POST",
      headers: { Authorization: `Bearer ${MEILI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify([mapProduct(p)]),
    })
  } catch (err) {
    console.error("[search-sync] upsert error:", err)
  }
}

async function deleteProduct(id: string) {
  if (!MEILI_KEY) return
  try {
    await fetch(`${MEILI_URL}/indexes/${INDEX}/documents/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${MEILI_KEY}` },
    })
  } catch (err) {
    console.error("[search-sync] delete error:", err)
  }
}

export default async function searchSyncSubscriber({
  event: { name, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (name === "product.product.deleted") {
    await deleteProduct(data.id)
  } else {
    await upsertProduct(data.id, container)
  }
}

export const config: SubscriberConfig = {
  event: [
    "product.product.created",
    "product.product.updated",
    "product.product.deleted",
  ],
}
