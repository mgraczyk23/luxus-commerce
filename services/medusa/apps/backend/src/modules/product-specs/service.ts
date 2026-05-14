import { MedusaService } from "@medusajs/framework/utils"
import ProductSpec from "./models/product-spec"

class ProductSpecsService extends MedusaService({
  ProductSpec,
}) {}

export default ProductSpecsService
