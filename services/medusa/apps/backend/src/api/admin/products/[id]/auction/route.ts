import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { AUCTION_MODULE } from "../../../../../modules/auction"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data } = await query.graph({
    entity: "product",
    filters: { id },
    fields: ["id", "auction_listing.*"],
  })

  if (!data[0]) {
    return res.status(404).json({ message: "Product not found" })
  }

  res.json({ auction_listing: (data[0] as any).auction_listing ?? null })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const service = req.scope.resolve(AUCTION_MODULE)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

  const listing = await service.createAuctionListings(req.body as any)

  await link.create({
    [Modules.PRODUCT]: { product_id: id },
    [AUCTION_MODULE]: { auction_listing_id: listing.id },
  })

  res.status(201).json({ auction_listing: listing })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const service = req.scope.resolve(AUCTION_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "product",
    filters: { id },
    fields: ["id", "auction_listing.id"],
  })

  const raw = (data[0] as any)?.auction_listing
  const existing = Array.isArray(raw) ? raw[0] : raw
  if (!existing) {
    return res.status(404).json({ message: "No auction listing found for this product" })
  }

  // Strip managed fields — timestamps cause MikroORM to silently abort the update
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _c, updated_at: _u, deleted_at: _d, ...updateData } = req.body as any

  // Array-with-id form is required — selector+data form silently no-ops in this Medusa version
  const result = await service.updateAuctionListings([{ id: existing.id, ...updateData }])
  const updated = Array.isArray(result) ? result[0] : result
  res.json({ auction_listing: updated })
}
