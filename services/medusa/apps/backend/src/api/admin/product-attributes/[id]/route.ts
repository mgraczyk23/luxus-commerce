import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_ATTRIBUTES_MODULE } from "../../../../modules/product-attributes"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_ATTRIBUTES_MODULE)
  const { id } = req.params

  const types = await service.listAttributeTypes({ id })
  if (!types[0]) {
    return res.status(404).json({ message: "Attribute type not found" })
  }

  const values = await service.listAttributeValues({ attribute_type_id: id })
  const type = { ...types[0], values: values.sort((a: any, b: any) => a.sort_order - b.sort_order) }

  res.json({ attribute_type: type })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_ATTRIBUTES_MODULE)
  const { id } = req.params

  const type = await service.updateAttributeTypes({ id }, req.body as any)

  res.json({ attribute_type: type })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_ATTRIBUTES_MODULE)
  const { id } = req.params

  await service.deleteAttributeTypes([id])

  res.json({ id, deleted: true })
}
