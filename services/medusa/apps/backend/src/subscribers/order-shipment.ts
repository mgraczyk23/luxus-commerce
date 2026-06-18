import { type SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

type ShipmentCreatedData = { id: string }

export default async function orderShipmentSubscriber({
  event: { data },
  container,
}: SubscriberArgs<ShipmentCreatedData>) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  let fulfillment: any
  let order: any
  try {
    const query = container.resolve("query")

    // Fetch fulfillment with tracking and linked order
    const { data: fulfillments } = await query.graph({
      entity: "fulfillment",
      fields: [
        "id",
        "shipped_at",
        "tracking_links.tracking_number",
        "tracking_links.url",
        "labels.tracking_number",
        "labels.tracking_url",
        "order.id",
        "order.display_id",
        "order.email",
        "order.currency_code",
        "order.total",
        "order.customer.first_name",
        "order.customer.last_name",
        "items.title",
        "items.quantity",
      ],
      filters: { id: data.id },
    })
    fulfillment = fulfillments?.[0]
    if (!fulfillment?.order?.email) return
    order = fulfillment.order
  } catch (err) {
    console.error("[order-shipment] query error:", err)
    return
  }

  const storefrontUrl = process.env.STOREFRONT_URL ?? "https://luxus-collection.com"
  const from = process.env.EMAIL_FROM ?? "no-reply@luxus-collection.com"
  const firstName = order.customer?.first_name ?? "Collector"

  // Gather tracking info — try tracking_links first, fall back to labels
  const trackingLinks: Array<{ number: string; url?: string }> =
    (fulfillment.tracking_links ?? []).filter((t: any) => t.tracking_number).map((t: any) => ({
      number: t.tracking_number,
      url: t.url,
    }))

  if (trackingLinks.length === 0) {
    for (const label of (fulfillment.labels ?? [])) {
      if (label.tracking_number) trackingLinks.push({ number: label.tracking_number, url: label.tracking_url })
    }
  }

  const trackingSection = trackingLinks.length > 0
    ? `<div style="background:#fafafa;padding:20px 24px;margin-bottom:28px;">
        <div style="font-size:8.5px;letter-spacing:0.2em;text-transform:uppercase;color:#c09530;font-weight:600;margin-bottom:10px;">Tracking Information</div>
        ${trackingLinks.map(t => `
          <div style="margin-bottom:6px;">
            <span style="font-size:12px;font-weight:300;color:#525258;">Tracking #: </span>
            ${t.url
              ? `<a href="${t.url}" style="font-size:12px;font-weight:400;color:#c09530;text-decoration:none;">${t.number}</a>`
              : `<span style="font-size:12px;font-weight:400;color:#1a1a1a;">${t.number}</span>`
            }
          </div>`).join("")}
      </div>`
    : `<div style="background:#fafafa;padding:16px 20px;margin-bottom:28px;">
        <p style="font-size:12px;font-weight:300;color:#525258;margin:0;line-height:1.7;">
          Tracking information will be emailed separately once available from the carrier.
        </p>
      </div>`

  const itemList = (fulfillment.items ?? []).map((item: any) =>
    `<li style="font-size:13px;font-weight:300;color:#525258;line-height:1.8;">${item.title}${item.quantity > 1 ? ` ×${item.quantity}` : ""}</li>`
  ).join("")

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: order.email,
      subject: `Your Order Has Shipped — Luxus Collection #${order.display_id}`,
      html: `
<div style="font-family:'Inter',Arial,sans-serif;max-width:580px;margin:0 auto;color:#1a1a1a;padding:32px 0;">
  <div style="padding-bottom:24px;margin-bottom:32px;border-bottom:1px solid #e4e4e6;">
    <span style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#c09530;font-weight:600;">Luxus Collection</span>
  </div>

  <h1 style="font-size:28px;font-weight:400;margin:0 0 8px;line-height:1.2;font-family:Georgia,serif;">Your order is on its way, ${firstName}.</h1>
  <p style="font-size:14px;font-weight:300;color:#525258;line-height:1.8;margin:0 0 8px;">
    Your firearm has been shipped to your designated FFL dealer.
  </p>
  <p style="font-size:12px;font-weight:300;color:#9a9a9a;margin:0 0 32px;">
    Order <strong style="color:#1a1a1a;">#${order.display_id}</strong>
  </p>

  ${trackingSection}

  ${itemList ? `<div style="margin-bottom:28px;">
    <div style="font-size:8.5px;letter-spacing:0.2em;text-transform:uppercase;color:#9a9a9a;font-weight:500;margin-bottom:10px;">Items Shipped</div>
    <ul style="margin:0;padding-left:18px;">${itemList}</ul>
  </div>` : ""}

  <div style="padding:16px 20px;border-left:3px solid #c09530;background:#fffdf7;margin-bottom:32px;">
    <div style="font-size:8.5px;letter-spacing:0.15em;text-transform:uppercase;color:#c09530;font-weight:600;margin-bottom:6px;">Next Steps</div>
    <p style="font-size:12px;font-weight:300;color:#525258;line-height:1.75;margin:0;">
      Once your firearm arrives at the FFL dealer, they will contact you to schedule your transfer appointment and complete the required ATF Form 4473 background check. Please bring a valid government-issued photo ID.
    </p>
  </div>

  <a href="${storefrontUrl}/account" style="display:inline-block;padding:14px 32px;background:#c09530;color:#ffffff;text-decoration:none;font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;">
    View Order
  </a>

  <div style="padding-top:32px;margin-top:40px;border-top:1px solid #e4e4e6;font-size:10px;color:#9a9a9a;font-weight:300;letter-spacing:0.04em;line-height:1.8;">
    Questions? Reply to this email or call us at (941) 253-3660.<br>
    Luxus Collection LLC · 1199 N Beneva Rd, Sarasota, FL 34232
  </div>
</div>`.trim(),
    }),
  }).catch(err => console.error("[order-shipment] Resend error:", err))
}

export const config: SubscriberConfig = {
  event: "shipment.created",
}
