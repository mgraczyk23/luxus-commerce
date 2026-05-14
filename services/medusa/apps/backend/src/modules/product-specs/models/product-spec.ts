import { model } from "@medusajs/framework/utils"

const ProductSpec = model.define("product_spec", {
  id: model.id().primaryKey(),
  overall_length: model.text().nullable(),
  weight: model.text().nullable(),
  frame_material: model.text().nullable(),
  grip_material: model.text().nullable(),
  sight_type: model.text().nullable(),
  finish_type: model.text().nullable(),
})

export default ProductSpec
