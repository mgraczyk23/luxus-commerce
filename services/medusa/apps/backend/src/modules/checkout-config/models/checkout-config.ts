import { model } from "@medusajs/framework/utils"

const CheckoutConfig = model.define("checkout_config", {
  id:    model.id().primaryKey(),
  key:   model.text(),
  value: model.text(),
})

export default CheckoutConfig
