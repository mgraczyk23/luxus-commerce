import { Module } from "@medusajs/framework/utils"
import CheckoutConfigService from "./service"

export const CHECKOUT_CONFIG_MODULE = "checkoutConfig"

export default Module(CHECKOUT_CONFIG_MODULE, {
  service: CheckoutConfigService,
})
