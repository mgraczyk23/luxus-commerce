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

  const existing = (data[0] as any)?.auction_listing
  if (!existing) {
    return res.status(404).json({ message: "No auction listing found for this product" })
  }

  const updated = await service.updateAuctionListings({ id: existing.id }, req.body as any)
  res.json({ auction_listing: updated })
}
