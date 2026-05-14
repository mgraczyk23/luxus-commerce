import { MedusaService } from "@medusajs/framework/utils"
import AttributeType from "./models/attribute-type"
import AttributeValue from "./models/attribute-value"

class ProductAttributesService extends MedusaService({
  AttributeType,
  AttributeValue,
}) {}

export default ProductAttributesService
