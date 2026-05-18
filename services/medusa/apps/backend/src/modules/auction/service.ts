import { MedusaService } from "@medusajs/framework/utils"
import AuctionListing from "./models/auction-listing"

class AuctionService extends MedusaService({
  AuctionListing,
}) {}

export default AuctionService
