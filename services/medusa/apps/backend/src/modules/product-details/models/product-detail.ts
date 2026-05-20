import { model } from "@medusajs/framework/utils"

const ProductDetail = model.define("product_detail", {
  id: model.id().primaryKey(),
  short_description: model.text().nullable(),
  serial_number: model.text().nullable(),
  optics_ready: model.boolean().default(false),
  contact_for_pricing: model.boolean().default(false),
  primary_category: model.text().nullable(),
  engraver: model.text().nullable(),
  seo_meta_title: model.text().nullable(),
  seo_meta_description: model.text().nullable(),
})

export default ProductDetail
