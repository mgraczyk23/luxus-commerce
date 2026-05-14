import { Module } from "@medusajs/framework/utils"
import ProductDetailsService from "./service"

export const PRODUCT_DETAILS_MODULE = "product_details"

export default Module(PRODUCT_DETAILS_MODULE, {
  service: ProductDetailsService,
})
