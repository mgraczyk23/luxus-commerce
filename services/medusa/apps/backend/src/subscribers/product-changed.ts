import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

async function notifyStorefront(eventName: string, path?: string) {
  const url = process.env.STOREFRONT_URL
  const secret = process.env.REVALIDATE_SECRET
  console.log(`[revalidate] event=${eventName} url=${url} secret=${secret ? "set" : "missing"} path=${path ?? "none"}`)
  if (!url || !secret) return

  try {
    const params = new URLSearchParams({ secret })
    if (path) params.set("path", path)
    const res = await fetch(`${url}/api/revalidate?${params}`, { method: "POST" })
    const body = await res.text()
    console.log(`[revalidate] status=${res.status} body=${body}`)
  } catch (e: any) {
    console.log(`[revalidate] fetch error: ${e?.message}`)
  }
}

// The create/update event payload only carries the product id — look up its
// handle so we can tell the storefront the exact page URL (used to push new
// listings to IndexNow immediately instead of waiting for a re-crawl).
async function getProductHandle(productId: string, container: any): Promise<string | undefined> {
  try {
    const query = container.resolve("query")
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["handle"],
      filters: { id: productId },
    })
    return products?.[0]?.handle
  } catch {
    return undefined
  }
}

export default async function productChangedHandler({ event, container }: SubscriberArgs<any>) {
  let path: string | undefined
  if (
    (event.name === "product.product.created" || event.name === "product.product.updated") &&
    event.data?.id
  ) {
    const handle = await getProductHandle(event.data.id, container)
    if (handle) path = `/product/${handle}`
  }
  await notifyStorefront(event.name ?? String(event), path)
}

export const config: SubscriberConfig = {
  // Any of these means catalog data OR stock/availability changed — tell the
  // storefront to revalidate its cached product data immediately. The handler
  // ignores the specific name and just triggers a "products" revalidation.
  event: [
    // Catalog (price, title, new/removed products, categories, collections)
    "product.product.created",
    "product.product.updated",
    "product.product.deleted",
    // Inventory — manual stock edits / availability changes in admin
    "inventory-item.created",
    "inventory-item.updated",
    "inventory-item.deleted",
    "inventory-level.created",
    "inventory-level.updated",
    "inventory-level.deleted",
    // Reservations — created when an order is placed, released on cancel
    "reservation-item.created",
    "reservation-item.updated",
    "reservation-item.deleted",
    // Orders — a sale reserves stock; cancel/complete changes availability
    "order.placed",
    "order.canceled",
    "order.completed",
  ],
}
