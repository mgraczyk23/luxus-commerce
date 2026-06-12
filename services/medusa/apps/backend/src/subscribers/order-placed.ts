import { type SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

type OrderPlacedData = { id: string }

const fmt = (amount: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount / 100)

const SALES = process.env.ADMIN_EMAIL ?? "sales@luxus-collection.com"

export default async function orderPlacedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedData>) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  let order: any
  try {
    const query = container.resolve("query")
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "currency_code",
        "summary",
        "created_at",
        "metadata",
        "customer.first_name",
        "customer.last_name",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.address_1",
        "shipping_address.address_2",
        "shipping_address.city",
        "shipping_address.province",
        "shipping_address.postal_code",
        "items.title",
        "items.detail.quantity",
        "items.unit_price",
        "items.thumbnail",
        "shipping_methods.raw_amount",
      ],
      filters: { id: data.id },
    })
    order = orders?.[0]
    if (!order?.email) return
  } catch (err) {
    console.error("[order-placed] query error:", err)
    return
  }

  const storefrontUrl = process.env.STOREFRONT_URL ?? "https://luxus-collection.com"
  const adminUrl    = process.env.MEDUSA_ADMIN_URL ?? "https://api.luxus-collection.com"
  const from        = process.env.EMAIL_FROM ?? "no-reply@luxus-collection.com"
  const firstName   = order.customer?.first_name ?? order.shipping_address?.first_name ?? "Collector"
  const currency    = order.currency_code ?? "usd"

  // Use summary — query.graph computed fields return 0
  const summary = (order.summary as any) ?? {}
  const totalCents: number = summary.current_order_total ?? 0
  const items = (order.items ?? []) as Array<{ title: string; detail?: { quantity?: number }; unit_price: number; thumbnail?: string }>
  const itemSubtotal = items.reduce((s, i) => s + i.unit_price * (i.detail?.quantity ?? 1), 0)
  const shippingMethods = (order.shipping_methods ?? []) as Array<{ raw_amount?: { value?: string } }>
  const shippingTotal = shippingMethods.reduce((s, m) => {
    const v = m.raw_amount?.value
    return s + (v !== undefined ? Math.round(Number(v)) : 0)
  }, 0)
  const taxTotal = Math.max(0, totalCents - itemSubtotal - shippingTotal)

  const addr = order.shipping_address
  const addrLine = addr
    ? `${addr.address_1}${addr.address_2 ? `, ${addr.address_2}` : ""}<br>${addr.city}, ${addr.province} ${addr.postal_code}`
    : "To be confirmed"

  const meta      = (order.metadata ?? {}) as Record<string, string>
  const fflName   = meta.ffl_dealer_name ?? ""
  const fflAddr   = [meta.ffl_dealer_address1, meta.ffl_dealer_city, meta.ffl_dealer_state].filter(Boolean).join(", ")
  const fullName  = `${addr?.first_name ?? ""} ${addr?.last_name ?? ""}`.trim() || order.email

  // ── Buyer confirmation ────────────────────────────────────────────────────

  const itemRows = items.map((item) => {
    const qty = item.detail?.quantity ?? 1
    return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e4e4e6;font-size:13px;font-weight:300;color:#1a1a1a;line-height:1.4;">${item.title}</td>
      <td style="padding:12px 0;border-bottom:1px solid #e4e4e6;font-size:13px;font-weight:300;color:#525258;text-align:center;">×${qty}</td>
      <td style="padding:12px 0;border-bottom:1px solid #e4e4e6;font-size:13px;font-weight:400;color:#1a1a1a;text-align:right;">${fmt(item.unit_price * qty, currency)}</td>
    </tr>`
  }).join("")

  const buyerHtml = `
<div style="font-family:'Inter',Arial,sans-serif;max-width:580px;margin:0 auto;color:#1a1a1a;padding:32px 0;">
  <div style="padding-bottom:24px;margin-bottom:32px;border-bottom:1px solid #e4e4e6;">
    <span style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#c09530;font-weight:600;">Luxus Collection</span>
  </div>

  <h1 style="font-size:28px;font-weight:400;margin:0 0 8px;line-height:1.2;font-family:Georgia,serif;">Thank you, ${firstName}.</h1>
  <p style="font-size:14px;font-weight:300;color:#525258;line-height:1.8;margin:0 0 8px;">
    Your order has been received and is being reviewed.
  </p>
  <p style="font-size:12px;font-weight:300;color:#9a9a9a;margin:0 0 32px;">
    Order <strong style="color:#1a1a1a;">#${order.display_id}</strong>
  </p>

  <div style="margin-bottom:32px;">
    <div style="font-size:8.5px;letter-spacing:0.2em;text-transform:uppercase;color:#c09530;font-weight:600;margin-bottom:12px;">Your Items</div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="font-size:8px;letter-spacing:0.15em;text-transform:uppercase;color:#9a9a9a;font-weight:500;padding-bottom:8px;border-bottom:1px solid #e4e4e6;text-align:left;">Item</th>
          <th style="font-size:8px;letter-spacing:0.15em;text-transform:uppercase;color:#9a9a9a;font-weight:500;padding-bottom:8px;border-bottom:1px solid #e4e4e6;text-align:center;">Qty</th>
          <th style="font-size:8px;letter-spacing:0.15em;text-transform:uppercase;color:#9a9a9a;font-weight:500;padding-bottom:8px;border-bottom:1px solid #e4e4e6;text-align:right;">Price</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
  </div>

  <div style="background:#fafafa;padding:20px 24px;margin-bottom:32px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:12px;font-weight:300;color:#525258;">Subtotal</span>
      <span style="font-size:12px;font-weight:300;color:#1a1a1a;">${fmt(itemSubtotal, currency)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:12px;font-weight:300;color:#525258;">Shipping</span>
      <span style="font-size:12px;font-weight:300;color:#1a1a1a;">${shippingTotal > 0 ? fmt(shippingTotal, currency) : "Included"}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
      <span style="font-size:12px;font-weight:300;color:#525258;">Tax</span>
      <span style="font-size:12px;font-weight:300;color:#1a1a1a;">${taxTotal > 0 ? fmt(taxTotal, currency) : "—"}</span>
    </div>
    <div style="display:flex;justify-content:space-between;border-top:1px solid #e4e4e6;padding-top:12px;">
      <span style="font-size:14px;font-weight:400;color:#1a1a1a;font-family:Georgia,serif;">Total</span>
      <span style="font-size:18px;font-weight:300;color:#1a1a1a;font-family:Georgia,serif;">${fmt(totalCents, currency)}</span>
    </div>
  </div>

  <div style="padding:16px 20px;border-left:3px solid #c09530;background:#fffdf7;margin-bottom:32px;">
    <div style="font-size:8.5px;letter-spacing:0.15em;text-transform:uppercase;color:#c09530;font-weight:600;margin-bottom:6px;">FFL Transfer Required</div>
    <p style="font-size:12px;font-weight:300;color:#525258;line-height:1.75;margin:0;">
      This firearm will ship to a licensed FFL dealer near you. A member of our team will contact you within one business day to coordinate your dealer selection and transfer paperwork.
    </p>
  </div>

  <div style="margin-bottom:32px;">
    <div style="font-size:8.5px;letter-spacing:0.2em;text-transform:uppercase;color:#9a9a9a;font-weight:500;margin-bottom:8px;">Ship To</div>
    <p style="font-size:13px;font-weight:300;color:#525258;line-height:1.75;margin:0;">${addrLine}</p>
  </div>

  <a href="${storefrontUrl}/account" style="display:inline-block;padding:14px 32px;background:#c09530;color:#ffffff;text-decoration:none;font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;">
    View Order
  </a>

  <div style="padding-top:32px;margin-top:40px;border-top:1px solid #e4e4e6;font-size:10px;color:#9a9a9a;font-weight:300;letter-spacing:0.04em;line-height:1.8;">
    Questions? Reply to this email or call us at (941) 253-3660.<br>
    Luxus Collection LLC · 1199 N Beneva Rd, Sarasota, FL 34232
  </div>
</div>`.trim()

  // ── Sales notification ────────────────────────────────────────────────────

  const salesItemRows = items.map((item) => {
    const qty = item.detail?.quantity ?? 1
    return `<tr>
      <td style="padding:8px 16px;font-size:13px;color:#1a1a1a;font-family:Arial,sans-serif;border-bottom:1px solid #f0ede8">${String(item.title).replace(/</g, "&lt;")}</td>
      <td style="padding:8px 16px;font-size:13px;color:#9e9994;font-family:Arial,sans-serif;border-bottom:1px solid #f0ede8;text-align:center">${qty}×</td>
      <td style="padding:8px 16px;font-size:13px;color:#1a1a1a;font-family:Arial,sans-serif;border-bottom:1px solid #f0ede8;text-align:right">${fmt(item.unit_price * qty, currency)}</td>
    </tr>`
  }).join("")

  const ir = (label: string, value: string) =>
    `<tr>
      <td style="padding:8px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#9e9994;font-family:Arial,sans-serif;white-space:nowrap;border-bottom:1px solid #f0ede8;width:130px">${label}</td>
      <td style="padding:8px 16px;font-size:13px;color:#1a1a1a;font-family:Arial,sans-serif;border-bottom:1px solid #f0ede8">${value.replace(/</g, "&lt;")}</td>
    </tr>`

  const salesHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px 0;background:#f0ede8;font-family:Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;background:#faf9f7;border:1px solid #e8e4df">
    <div style="background:#1a1a1a;padding:20px 28px">
      <span style="font-size:9px;letter-spacing:0.26em;text-transform:uppercase;color:#c9a96e;font-family:Arial,sans-serif;font-weight:500">Luxus Collection</span>
      <span style="font-size:11px;color:#c9a96e;font-family:Arial,sans-serif;font-weight:500;margin-left:16px">NEW ORDER — #${order.display_id}</span>
    </div>
    <div style="padding:24px 28px 12px">
      <h2 style="font-size:20px;font-weight:400;color:#1a1a1a;margin:0 0 4px;font-family:Georgia,serif">New Order Received</h2>
      <p style="font-size:12px;color:#9e9994;font-family:Arial,sans-serif;margin:0">Review and process payment.</p>
    </div>
    <table style="width:100%;border-collapse:collapse">
      ${ir("Order", `#${order.display_id}`)}
      ${ir("Customer", fullName)}
      ${ir("Email", order.email)}
      ${ir("Total", fmt(totalCents, currency))}
      ${addr ? ir("Ship To", `${addr.address_1 ?? ""}${addr.address_2 ? `, ${addr.address_2}` : ""}, ${addr.city ?? ""}, ${addr.province ?? ""} ${addr.postal_code ?? ""}`) : ""}
      ${fflName ? ir("FFL Dealer", fflName + (fflAddr ? ` — ${fflAddr}` : "")) : ""}
    </table>
    ${salesItemRows ? `<div style="padding:4px 0 0"><table style="width:100%;border-collapse:collapse">${salesItemRows}</table></div>` : ""}
    <div style="padding:20px 28px">
      <a href="${adminUrl}/app/orders/${order.id}" style="display:inline-block;padding:12px 24px;background:#c9a96e;color:#fff;text-decoration:none;font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">View in Admin</a>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #e8e4df;font-size:10px;color:#c9a96e;font-family:Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase">
      Luxus Collection — luxus-collection.com
    </div>
  </div>
</body></html>`

  const send = (to: string, subject: string, html: string) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    }).catch(err => console.error("[order-placed] Resend error:", err))

  await Promise.all([
    send(order.email, `Order Confirmed — Luxus Collection #${order.display_id}`, buyerHtml),
    send(SALES, `New Order — #${order.display_id} — ${fullName}`, salesHtml),
  ])
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
