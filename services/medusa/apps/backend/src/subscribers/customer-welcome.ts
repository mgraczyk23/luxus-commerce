import { type SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

type CustomerCreatedData = { id: string }

export default async function customerWelcomeSubscriber({
  event: { data },
  container,
}: SubscriberArgs<CustomerCreatedData>) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  // Fetch the customer record to get email and name
  let email = "", firstName = "Collector"
  try {
    const query = container.resolve("query")
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "first_name"],
      filters: { id: data.id },
    })
    const customer = customers?.[0]
    if (!customer?.email) return
    email     = customer.email
    firstName = customer.first_name ?? "Collector"
  } catch {
    return
  }

  const storefrontUrl = process.env.STOREFRONT_URL ?? "https://luxus-collection.com"
  const from          = process.env.EMAIL_FROM ?? "no-reply@luxus-collection.com"

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to:      email,
      subject: "Welcome to Luxus Collection",
      html: `
<div style="font-family:'Inter',Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;padding:32px 0;">
  <div style="padding-bottom:24px;margin-bottom:32px;border-bottom:1px solid #e4e4e6;">
    <span style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#c09530;font-weight:600;">Luxus Collection</span>
  </div>
  <h1 style="font-size:28px;font-weight:400;margin:0 0 16px;line-height:1.2;font-family:Georgia,serif;">Welcome, ${firstName}.</h1>
  <p style="font-size:14px;font-weight:300;color:#525258;line-height:1.8;margin:0 0 24px;">
    Your Luxus Collection account is ready. You now have access to your order history, wishlist, and consignment portal — all in one place.
  </p>
  <div style="padding:20px 24px;background:#fafafa;border-left:3px solid #c09530;margin-bottom:32px;">
    <p style="font-size:13px;font-weight:300;color:#525258;line-height:1.75;margin:0;">
      As a member, you'll receive early notifications on new acquisitions and exclusive collector resources. We respond to every inquiry personally.
    </p>
  </div>
  <a href="${storefrontUrl}/shop" style="display:inline-block;padding:14px 32px;background:#c09530;color:#ffffff;text-decoration:none;font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;">
    Browse the Collection
  </a>
  <div style="padding-top:32px;margin-top:40px;border-top:1px solid #e4e4e6;font-size:10px;color:#9a9a9a;font-weight:300;letter-spacing:0.04em;">
    Luxus Collection LLC · 1199 N Beneva Rd, Sarasota, FL 34232
  </div>
</div>`.trim(),
    }),
  }).catch(err => console.error("[customer-welcome] Resend error:", err))
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
