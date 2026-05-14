import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

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
