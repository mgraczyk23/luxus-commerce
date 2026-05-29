import { type SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

type ResetData = { entity_id: string; actor_type: string; token: string }

export default async function authPasswordResetSubscriber({
  event: { data },
}: SubscriberArgs<ResetData>) {
  const { entity_id: email, actor_type, token } = data
  if (actor_type !== "customer") return

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const storefrontUrl = process.env.STOREFRONT_URL ?? "https://luxus-collection.com"
  const resetUrl      = `${storefrontUrl}/auth/reset?token=${encodeURIComponent(token)}`
  const from          = process.env.EMAIL_FROM ?? "no-reply@luxus-collection.com"

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to:      email,
      subject: "Reset Your Password — Luxus Collection",
      html: `
<div style="font-family:'Inter',Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;padding:32px 0;">
  <div style="padding-bottom:24px;margin-bottom:32px;border-bottom:1px solid #e4e4e6;">
    <span style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#c09530;font-weight:600;">Luxus Collection</span>
  </div>
  <h1 style="font-size:28px;font-weight:400;margin:0 0 16px;line-height:1.2;font-family:Georgia,serif;">Reset Your Password</h1>
  <p style="font-size:14px;font-weight:300;color:#525258;line-height:1.8;margin:0 0 32px;">
    We received a request to reset the password for your Luxus Collection account. Click the button below — this link expires in <strong style="color:#1a1a1a;font-weight:500;">15 minutes</strong>.
  </p>
  <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:#c09530;color:#ffffff;text-decoration:none;font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;">
    Set New Password
  </a>
  <p style="font-size:12px;font-weight:300;color:#707076;line-height:1.7;margin:32px 0 8px;">
    If you didn't request a password reset, you can safely ignore this email — your password will not change.
  </p>
  <p style="font-size:11px;font-weight:300;color:#9a9a9a;line-height:1.6;">
    Or paste this link in your browser:<br>
    <span style="color:#c09530;">${resetUrl}</span>
  </p>
  <div style="padding-top:32px;margin-top:40px;border-top:1px solid #e4e4e6;font-size:10px;color:#9a9a9a;font-weight:300;letter-spacing:0.04em;">
    Luxus Collection LLC · 1199 N Beneva Rd, Sarasota, FL 34232
  </div>
</div>`.trim(),
    }),
  }).catch(err => console.error("[auth-password-reset] Resend error:", err))
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
