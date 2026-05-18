import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { AUCTION_MODULE } from "../../../../../modules/auction"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const service = req.scope.resolve(AUCTION_MODULE)

  const [relation] = await link.list(
    { [Modules.PRODUCT]: { product_id: id } },
    { select: { auction: { auction_listing_id: true } } }
  ) as any[]

  if (!relation) {
    return res.json({ auction_listing: null })
  }

  const listingId = relation?.auction?.auction_listing_id
  if (!listingId) {
    return res.json({ auction_listing: null })
  }

  const listings = await service.listAuctionListings({ id: listingId })
  res.json({ auction_listing: listings[0] ?? null })
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
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

  const [relation] = await link.list(
    { [Modules.PRODUCT]: { product_id: id } },
    { select: { auction: { auction_listing_id: true } } }
  ) as any[]

  const listingId = relation?.auction?.auction_listing_id
  if (!listingId) {
    return res.status(404).json({ message: "No auction listing found for this product" })
  }

  const updated = await service.updateAuctionListings({ id: listingId }, req.body as any)
  res.json({ auction_listing: updated })
}
