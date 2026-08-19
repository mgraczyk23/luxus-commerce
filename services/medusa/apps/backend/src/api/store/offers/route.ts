import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OFFERS_MODULE } from "../../../modules/offers"
import OffersService from "../../../modules/offers/service"
import { sendEmail } from "../../../lib/email"
import { newOfferAdminEmail } from "../../../lib/email-templates"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(OFFERS_MODULE) as InstanceType<typeof OffersService>

  const {
    product_id,
    product_handle,
    product_title,
    first_name,
    last_name,
    email,
    phone,
    offer_amount,
    message,
  } = req.body as any

  // Basic validation
  if (!product_id || !product_handle || !product_title || !first_name || !email || !offer_amount) {
    return res.status(422).json({ error: "Missing required fields" })
  }
  if (typeof offer_amount !== "number" || offer_amount <= 0) {
    return res.status(422).json({ error: "offer_amount must be a positive number" })
  }

  // Offer expires in 7 days by default
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const offer = await service.createOffers({
    product_id,
    product_handle,
    product_title,
    first_name,
    last_name:    last_name   ?? null,
    email,
    phone:        phone       ?? null,
    offer_amount,
    message:      message     ?? null,
    status:       "pending",
    expires_at,
  })

  // Notify sales team — fire and forget, don't fail the request if email fails
  try {
    const salesEmail = process.env.SALES_EMAIL ?? "sales@luxus-collection.com"
    const adminUrl   = process.env.ADMIN_URL ?? "https://api.luxus-collection.com"
    const { subject, html } = newOfferAdminEmail({
      productTitle:  product_title,
      productHandle: product_handle,
      buyerName:     [first_name, last_name].filter(Boolean).join(" "),
      buyerEmail:    email,
      buyerPhone:    phone ?? null,
      offerAmount:   offer_amount,
      listedPrice:   null,
      message:       message ?? null,
      adminUrl,
      productId:     product_id,
    })
    await sendEmail({ to: salesEmail, subject, html, replyTo: email })
  } catch (err) {
    console.error("[offers] sales email failed:", err)
  }

  return res.status(201).json({ offer })
}
