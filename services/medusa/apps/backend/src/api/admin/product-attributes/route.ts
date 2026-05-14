import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_ATTRIBUTES_MODULE } from "../../../modules/product-attributes"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_ATTRIBUTES_MODULE)

  const types = await service.listAttributeTypes({})
  const values = await service.listAttributeValues({})

  const valuesByType = values.reduce((acc: Record<string, any[]>, v: any) => {
    if (!acc[v.attribute_type_id]) acc[v.attribute_type_id] = []
    acc[v.attribute_type_id].push(v)
    return acc
  }, {})

  const attribute_types = types
    .map((type: any) => ({
      ...type,
      values: (valuesByType[type.id] ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    }))
    .sort((a: any, b: any) => a.sort_order - b.sort_order)

  res.json({ attribute_types })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_ATTRIBUTES_MODULE)
  const { name, slug, sort_order, is_multi_select } = req.body as any

  const type = await service.createAttributeTypes({
    name,
    slug,
    sort_order: sort_order ?? 0,
    is_multi_select: is_multi_select !== false,
  })

  res.status(201).json({ attribute_type: type })
}
