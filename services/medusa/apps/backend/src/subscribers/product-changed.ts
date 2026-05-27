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
  event: ["product.product.created", "product.product.updated", "product.product.deleted"],
}
