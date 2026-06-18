import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

async function notifyStorefront(eventName: string) {
  const url = process.env.STOREFRONT_URL
  const secret = process.env.REVALIDATE_SECRET
  console.log(`[revalidate] event=${eventName} url=${url} secret=${secret ? "set" : "missing"}`)
  if (!url || !secret) return

  try {
    const res = await fetch(`${url}/api/revalidate?secret=${secret}`, { method: "POST" })
    const body = await res.text()
    console.log(`[revalidate] status=${res.status} body=${body}`)
  } catch (e: any) {
    console.log(`[revalidate] fetch error: ${e?.message}`)
  }
}

export default async function productChangedHandler({ event }: SubscriberArgs<any>) {
  await notifyStorefront(event.name ?? String(event))
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
