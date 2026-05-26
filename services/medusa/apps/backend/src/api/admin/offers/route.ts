import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OFFERS_MODULE } from "../../../modules/offers"
import OffersService from "../../../modules/offers/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(OFFERS_MODULE) as InstanceType<typeof OffersService>

  const {
    status,
    product_id,
    limit  = "50",
    offset = "0",
  } = req.query as Record<string, string>

  const filters: Record<string, any> = {}
  if (status)     filters.status     = status
  if (product_id) filters.product_id = product_id

  const [offers, count] = await service.listAndCountOffers(filters, {
    take:  parseInt(limit,  10),
    skip:  parseInt(offset, 10),
    order: { created_at: "DESC" },
  })

  return res.json({ offers, count })
}
