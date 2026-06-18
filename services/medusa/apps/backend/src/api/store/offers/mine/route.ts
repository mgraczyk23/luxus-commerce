import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OFFERS_MODULE } from "../../../../modules/offers"
import OffersService from "../../../../modules/offers/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const actorId   = (req as any).auth_context?.actor_id
  const actorType = (req as any).auth_context?.actor_type

  if (!actorId || actorType !== "customer") {
    return res.status(401).json({ error: "Authentication required" })
  }

  let customerEmail: string
  try {
    const customerModule = req.scope.resolve("customer") as any
    const customer = await customerModule.retrieveCustomer(actorId)
    if (!customer?.email) throw new Error("no email")
    customerEmail = customer.email.toLowerCase()
  } catch {
    return res.status(401).json({ error: "Could not verify customer" })
  }

  const service = req.scope.resolve(OFFERS_MODULE) as InstanceType<typeof OffersService>
  const offers  = await service.listOffers({ email: customerEmail } as any, {
    order: { created_at: "DESC" },
    take: 50,
  })

  return res.json({
    offers: offers.map((o: any) => ({
      id:                   o.id,
      product_title:        o.product_title,
      product_handle:       o.product_handle,
      offer_amount:         o.offer_amount,
      counter_amount:       o.counter_amount,
      status:               o.status,
      expires_at:           o.expires_at,
      checkout_token:       o.status === "accepted" ? o.checkout_token : undefined,
      checkout_token_expires_at: o.status === "accepted" ? o.checkout_token_expires_at : undefined,
      created_at:           o.created_at,
    })),
  })
}
