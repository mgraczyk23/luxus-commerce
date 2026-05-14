import { MedusaService } from "@medusajs/framework/utils"
import ProductDetail from "./models/product-detail"

class ProductDetailsService extends MedusaService({
  ProductDetail,
}) {}

export default ProductDetailsService
