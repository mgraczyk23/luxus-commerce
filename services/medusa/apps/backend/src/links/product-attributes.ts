import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ProductAttributesModule from "../modules/product-attributes"

export default defineLink(
  { linkable: ProductModule.linkable.product, isList: true },
  { linkable: ProductAttributesModule.linkable.attributeValue, isList: true }
)
