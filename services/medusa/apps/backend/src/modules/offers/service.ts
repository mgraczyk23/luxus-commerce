import { MedusaService } from "@medusajs/framework/utils"
import Offer from "./models/offer"

class OffersService extends MedusaService({
  Offer,
}) {}

export default OffersService
