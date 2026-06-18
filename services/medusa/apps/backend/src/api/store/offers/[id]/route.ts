import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OFFERS_MODULE } from "../../../../modules/offers"
import OffersService from "../../../../modules/offers/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(OFFERS_MODULE) as InstanceType<typeof OffersService>
  const { id }  = req.params

  let offer: any
  try {
    offer = await service.retrieveOffer(id)
  } catch {
    return res.status(404).json({ error: "Offer not found" })
  }

  return res.json({
    offer: {
      id:             offer.id,
      product_title:  offer.product_title,
      product_handle: offer.product_handle,
      offer_amount:   offer.offer_amount,
      counter_amount: offer.counter_amount,
      status:         offer.status,
      expires_at:     offer.expires_at,
    },
  })
}
