import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OFFERS_MODULE } from "../../../../../modules/offers"
import OffersService from "../../../../../modules/offers/service"
import crypto from "crypto"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(OFFERS_MODULE) as InstanceType<typeof OffersService>
  const { id }  = req.params
  const { auth_sig } = req.body as { auth_sig?: string }

  const secret = process.env.OFFER_TOKEN_SECRET ?? ""

  // Retrieve offer first so we can validate
  let offer: any
  try {
    offer = await service.retrieveOffer(id)
  } catch {
    return res.status(404).json({ error: "Offer not found" })
  }

  // Auth: either a valid HMAC (for email links) or a matching customer JWT
  const actorId   = (req as any).auth_context?.actor_id
  const actorType = (req as any).auth_context?.actor_type

  let authorized = false

  if (auth_sig && secret) {
    const expected = crypto.createHmac("sha256", secret).update(id).digest("hex")
    authorized = crypto.timingSafeEqual(Buffer.from(auth_sig), Buffer.from(expected))
  }

  if (!authorized && actorId && actorType === "customer") {
    // Logged-in customer: verify their email matches the offer
    try {
      const customerModule = req.scope.resolve("customer") as any
      const customer = await customerModule.retrieveCustomer(actorId)
      authorized = customer?.email?.toLowerCase() === offer.email?.toLowerCase()
    } catch {
      // skip
    }
  }

  if (!authorized) {
    return res.status(403).json({ error: "Invalid authorization" })
  }

  if (offer.status !== "countered") {
    return res.status(409).json({ error: "This offer is not in a countered state" })
  }

  if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
    return res.status(410).json({ error: "This offer has expired" })
  }

  // Generate checkout token and mark as accepted
  const checkoutToken           = crypto.randomUUID()
  const checkoutTokenExpiresAt  = new Date(Date.now() + 72 * 60 * 60 * 1000)

  const updated = await service.updateOffers({
    id,
    status:                    "accepted",
    checkout_token:            checkoutToken,
    checkout_token_expires_at: checkoutTokenExpiresAt,
  })

  return res.json({
    checkout_token: checkoutToken,
    offer: {
      id:             updated.id,
      product_title:  updated.product_title,
      product_handle: updated.product_handle,
      counter_amount: updated.counter_amount,
      offer_amount:   updated.offer_amount,
    },
  })
}
