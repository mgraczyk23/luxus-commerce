import { model } from "@medusajs/framework/utils"
import AttributeValue from "./attribute-value"

const AttributeType = model.define("attribute_type", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text(),
  sort_order: model.number().default(0),
  is_multi_select: model.boolean().default(true),
  values: model.hasMany(() => AttributeValue, {
    mappedBy: "attribute_type",
  }),
})

export default AttributeType
