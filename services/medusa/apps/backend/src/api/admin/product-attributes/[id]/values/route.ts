import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_ATTRIBUTES_MODULE } from "../../../../../modules/product-attributes"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_ATTRIBUTES_MODULE)
  const { id } = req.params
  const { value, sort_order } = req.body as any

  const attrValue = await service.createAttributeValues({
    value,
    sort_order: sort_order ?? 0,
    attribute_type_id: id,
  })

  res.status(201).json({ attribute_value: attrValue })
}
