import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OFFERS_MODULE } from "../../../../modules/offers"
import OffersService from "../../../../modules/offers/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service  = req.scope.resolve(OFFERS_MODULE) as InstanceType<typeof OffersService>
  const { id }   = req.params

  const offer = await service.retrieveOffer(id)
  return res.json({ offer })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(OFFERS_MODULE) as InstanceType<typeof OffersService>
  const { id }  = req.params

  const { status, counter_amount, admin_notes } = req.body as {
    status?:         "accepted" | "rejected" | "countered" | "expired"
    counter_amount?: number
    admin_notes?:    string
  }

  const VALID_STATUSES = ["accepted", "rejected", "countered", "expired"]
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(422).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` })
  }

  if (status === "countered" && (counter_amount == null || counter_amount <= 0)) {
    return res.status(422).json({ error: "counter_amount is required when status is countered" })
  }

  const updates: Record<string, any> = {}
  if (status         != null) updates.status         = status
  if (counter_amount != null) updates.counter_amount = counter_amount
  if (admin_notes    != null) updates.admin_notes    = admin_notes

  if (Object.keys(updates).length === 0) {
    return res.status(422).json({ error: "No fields to update" })
  }

  const offer = await service.updateOffers({ id }, updates)
  return res.json({ offer })
}
