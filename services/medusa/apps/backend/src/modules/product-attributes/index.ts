import { Module } from "@medusajs/framework/utils"
import ProductAttributesService from "./service"

export const PRODUCT_ATTRIBUTES_MODULE = "product_attributes"

export default Module(PRODUCT_ATTRIBUTES_MODULE, {
  service: ProductAttributesService,
})
