import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_ATTRIBUTES_MODULE } from "../../../../../../modules/product-attributes"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_ATTRIBUTES_MODULE)
  const { value_id } = req.params

  await service.deleteAttributeValues([value_id])

  res.json({ id: value_id, deleted: true })
}
