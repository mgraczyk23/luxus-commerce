import { Module } from "@medusajs/framework/utils"
import ProductSpecsService from "./service"

export const PRODUCT_SPECS_MODULE = "product_specs"

export default Module(PRODUCT_SPECS_MODULE, {
  service: ProductSpecsService,
})
