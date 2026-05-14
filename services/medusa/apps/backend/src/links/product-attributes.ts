import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ProductAttributesModule from "../modules/product-attributes"

export default defineLink(
  ProductModule.linkable.product,
  {
    linkable: ProductAttributesModule.linkable.attributeValue,
    isList: true,
  }
)
