import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PRODUCT_ATTRIBUTES_MODULE } from "../../../../../modules/product-attributes"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data } = await query.graph({
    entity: "product",
    filters: { id },
    fields: ["id", "attribute_values.*"],
  })

  if (!data[0]) {
    return res.status(404).json({ message: "Product not found" })
  }

  res.json({ attribute_values: data[0].attribute_values ?? [] })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const { id } = req.params
  const { value_ids } = req.body as { value_ids: string[] }

  await link.create(
    value_ids.map((value_id) => ({
      [Modules.PRODUCT]: { product_id: id },
      [PRODUCT_ATTRIBUTES_MODULE]: { attribute_value_id: value_id },
    }))
  )

  res.status(201).json({ product_id: id, linked: value_ids })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const { id } = req.params
  const { value_id } = req.body as { value_id: string }

  await link.dismiss({
    [Modules.PRODUCT]: { product_id: id },
    [PRODUCT_ATTRIBUTES_MODULE]: { attribute_value_id: value_id },
  })

  res.json({ product_id: id, dismissed: value_id })
}
