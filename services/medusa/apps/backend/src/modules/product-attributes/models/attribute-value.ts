import { model } from "@medusajs/framework/utils"
import AttributeType from "./attribute-type"

const AttributeValue = model.define("attribute_value", {
  id: model.id().primaryKey(),
  value: model.text(),
  sort_order: model.number().default(0),
  attribute_type: model.belongsTo(() => AttributeType, {
    mappedBy: "values",
  }),
})

export default AttributeValue
