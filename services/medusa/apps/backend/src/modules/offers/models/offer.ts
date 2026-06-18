import { model } from "@medusajs/framework/utils"

const Offer = model.define("offer", {
  id:              model.id().primaryKey(),
  product_id:      model.text(),
  product_handle:  model.text(),
  product_title:   model.text(),
  first_name:      model.text(),
  last_name:       model.text().nullable(),
  email:           model.text(),
  phone:           model.text().nullable(),
  offer_amount:    model.bigNumber(),
  counter_amount:  model.bigNumber().nullable(),
  // pending | accepted | rejected | countered | expired
  status:          model.text().default("pending"),
  message:                    model.text().nullable(),
  admin_notes:                model.text().nullable(),
  expires_at:                 model.dateTime().nullable(),
  checkout_token:             model.text().nullable(),
  checkout_token_expires_at:  model.dateTime().nullable(),
})

export default Offer
