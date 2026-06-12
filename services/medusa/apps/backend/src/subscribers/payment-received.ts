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
  const from = process.env.EMAIL_FROM ?? "no-reply@luxus-collection.com"
  const firstName = order.customer?.first_name ?? "Collector"
  const currency = payment.currency_code ?? order.currency_code ?? "usd"
  const orderTotal: number = (order.summary as any)?.current_order_total ?? payment.amount
  const capturedAt = payment.captured_at
    ? new Date(payment.captured_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: order.email,
      subject: `Payment Received — Luxus Collection #${order.display_id}`,
      html: `
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
</div>`.trim(),
    }),
  }).catch(err => console.error("[payment-received] Resend error:", err))
}

export const config: SubscriberConfig = {
  event: "payment.captured",
}
