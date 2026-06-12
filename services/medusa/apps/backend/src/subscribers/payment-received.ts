import { type SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

type PaymentCapturedData = { id: string }

const fmt = (amount: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount / 100)

export default async function paymentReceivedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<PaymentCapturedData>) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  let payment: any
  let order: any
  try {
    const query = container.resolve("query")

    // Fetch payment → payment_collection → order
    const { data: payments } = await query.graph({
      entity: "payment",
      fields: [
        "id",
        "amount",
        "currency_code",
        "captured_at",
        "payment_collection.payment_sessions.session_id",
        "payment_collection.orders.id",
        "payment_collection.orders.display_id",
        "payment_collection.orders.email",
        "payment_collection.orders.summary",
        "payment_collection.orders.customer.first_name",
        "payment_collection.orders.customer.last_name",
      ],
      filters: { id: data.id },
    })
    payment = payments?.[0]
    if (!payment) return

    // Reach order through payment_collection
    order = payment.payment_collection?.orders?.[0]
    if (!order?.email) return
  } catch (err) {
    console.error("[payment-received] query error:", err)
    return
  }

  const storefrontUrl = process.env.STOREFRONT_URL ?? "https://luxus-collection.com"
  const adminUrl    = process.env.MEDUSA_ADMIN_URL ?? "https://api.luxus-collection.com"
  const from        = process.env.EMAIL_FROM ?? "no-reply@luxus-collection.com"
  const SALES       = process.env.ADMIN_EMAIL ?? "sales@luxus-collection.com"
  const firstName   = order.customer?.first_name ?? "Collector"
  const fullName    = `${order.customer?.first_name ?? ""} ${order.customer?.last_name ?? ""}`.trim() || order.email
  const currency = payment.currency_code ?? order.currency_code ?? "usd"
  const orderTotal: number = (order.summary as any)?.current_order_total ?? payment.amount
  const capturedAt = payment.captured_at
    ? new Date(payment.captured_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  const displayId = order.display_id ? `#${order.display_id}` : order.id.slice(-8).toUpperCase()

  const salesHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px 0;background:#f0ede8;font-family:Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;background:#faf9f7;border:1px solid #e8e4df">
    <div style="background:#1a1a1a;padding:20px 28px">
      <span style="font-size:9px;letter-spacing:0.26em;text-transform:uppercase;color:#c9a96e;font-family:Arial,sans-serif;font-weight:500">Luxus Collection</span>
      <span style="font-size:11px;color:#c9a96e;font-family:Arial,sans-serif;font-weight:500;margin-left:16px">PAYMENT CAPTURED — ${displayId}</span>
    </div>
    <div style="padding:24px 28px 12px">
      <h2 style="font-size:20px;font-weight:400;color:#1a1a1a;margin:0 0 4px;font-family:Georgia,serif">Payment Received</h2>
      <p style="font-size:12px;color:#9e9994;font-family:Arial,sans-serif;margin:0">Customer notified. Prepare order for shipment.</p>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#9e9994;font-family:Arial,sans-serif;white-space:nowrap;border-bottom:1px solid #f0ede8;width:130px">Order</td><td style="padding:8px 16px;font-size:13px;color:#1a1a1a;font-family:Arial,sans-serif;border-bottom:1px solid #f0ede8">${displayId}</td></tr>
      <tr><td style="padding:8px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#9e9994;font-family:Arial,sans-serif;white-space:nowrap;border-bottom:1px solid #f0ede8;width:130px">Customer</td><td style="padding:8px 16px;font-size:13px;color:#1a1a1a;font-family:Arial,sans-serif;border-bottom:1px solid #f0ede8">${fullName.replace(/</g,"&lt;")}</td></tr>
      <tr><td style="padding:8px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#9e9994;font-family:Arial,sans-serif;white-space:nowrap;border-bottom:1px solid #f0ede8;width:130px">Email</td><td style="padding:8px 16px;font-size:13px;color:#1a1a1a;font-family:Arial,sans-serif;border-bottom:1px solid #f0ede8">${order.email.replace(/</g,"&lt;")}</td></tr>
      <tr><td style="padding:8px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#9e9994;font-family:Arial,sans-serif;white-space:nowrap;border-bottom:1px solid #f0ede8;width:130px">Amount</td><td style="padding:8px 16px;font-size:13px;color:#1a1a1a;font-family:Arial,sans-serif;border-bottom:1px solid #f0ede8">${fmt(orderTotal, currency)}</td></tr>
    </table>
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
    }).catch(err => console.error("[payment-received] Resend error:", err))

  await Promise.all([
    send(SALES, `Payment Captured — ${displayId} — ${fullName}`, salesHtml),
    send(order.email, `Payment Received — Luxus Collection #${order.display_id}`,
    `
<div style="font-family:'Inter',Arial,sans-serif;max-width:580px;margin:0 auto;color:#1a1a1a;padding:32px 0;">
  <div style="padding-bottom:24px;margin-bottom:32px;border-bottom:1px solid #e4e4e6;">
    <span style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#c09530;font-weight:600;">Luxus Collection</span>
  </div>

  <h1 style="font-size:28px;font-weight:400;margin:0 0 8px;line-height:1.2;font-family:Georgia,serif;">Payment confirmed, ${firstName}.</h1>
  <p style="font-size:14px;font-weight:300;color:#525258;line-height:1.8;margin:0 0 8px;">
    We have received your payment and your order is being prepared for shipment.
  </p>
  <p style="font-size:12px;font-weight:300;color:#9a9a9a;margin:0 0 32px;">
    Order <strong style="color:#1a1a1a;">#${order.display_id}</strong>
  </p>

  <!-- Payment summary -->
  <div style="background:#fafafa;padding:24px;margin-bottom:32px;">
    <div style="font-size:8.5px;letter-spacing:0.2em;text-transform:uppercase;color:#c09530;font-weight:600;margin-bottom:16px;">Payment Summary</div>
    <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
      <span style="font-size:12px;font-weight:300;color:#525258;">Amount Received</span>
      <span style="font-size:14px;font-weight:400;color:#1a1a1a;">${fmt(payment.amount, currency)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
      <span style="font-size:12px;font-weight:300;color:#525258;">Date</span>
      <span style="font-size:12px;font-weight:300;color:#1a1a1a;">${capturedAt}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid #e4e4e6;">
      <span style="font-size:12px;font-weight:300;color:#525258;">Order Total</span>
      <span style="font-size:12px;font-weight:300;color:#1a1a1a;">${fmt(orderTotal, currency)}</span>
    </div>
  </div>

  <!-- What's next -->
  <div style="padding:16px 20px;border-left:3px solid #c09530;background:#fffdf7;margin-bottom:32px;">
    <div style="font-size:8.5px;letter-spacing:0.15em;text-transform:uppercase;color:#c09530;font-weight:600;margin-bottom:6px;">What Happens Next</div>
    <p style="font-size:12px;font-weight:300;color:#525258;line-height:1.75;margin:0;">
      Your firearm will be carefully prepared and shipped within 1–2 business days. You will receive a separate shipping confirmation with tracking information once your order is on its way.
    </p>
  </div>

  <a href="${storefrontUrl}/account" style="display:inline-block;padding:14px 32px;background:#c09530;color:#ffffff;text-decoration:none;font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;">
    View Order
  </a>

  <div style="padding-top:32px;margin-top:40px;border-top:1px solid #e4e4e6;font-size:10px;color:#9a9a9a;font-weight:300;letter-spacing:0.04em;line-height:1.8;">
    Questions? Reply to this email or call us at (941) 253-3660.<br>
    Luxus Collection LLC · 1199 N Beneva Rd, Sarasota, FL 34232
  </div>
</div>`.trim()),
  ])
}

export const config: SubscriberConfig = {
  event: "payment.captured",
}
