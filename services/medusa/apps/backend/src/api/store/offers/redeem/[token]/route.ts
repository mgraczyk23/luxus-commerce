import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OFFERS_MODULE } from "../../../../../modules/offers"
import OffersService from "../../../../../modules/offers/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(OFFERS_MODULE) as InstanceType<typeof OffersService>
  const { token } = req.params

  const [offer] = await service.listOffers({ checkout_token: token } as any)

  if (!offer) {
    return res.status(404).json({ error: "Invalid or expired checkout link" })
  }

  if (offer.status !== "accepted") {
    return res.status(410).json({ error: "This offer is no longer available for checkout" })
  }

  if (offer.checkout_token_expires_at && new Date(offer.checkout_token_expires_at) < new Date()) {
    return res.status(410).json({ error: "This checkout link has expired. Please contact us to arrange an extension." })
  }

  return res.json({
    offer: {
      id:             offer.id,
      product_title:  offer.product_title,
      product_handle: offer.product_handle,
      product_id:     offer.product_id,
      first_name:     offer.first_name,
      last_name:      offer.last_name,
      email:          offer.email,
      phone:          offer.phone,
      offer_amount:   offer.offer_amount,
      counter_amount: offer.counter_amount,
      expires_at:     offer.checkout_token_expires_at,
    },
  })
}
