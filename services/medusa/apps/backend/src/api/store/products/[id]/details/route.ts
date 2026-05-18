import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data } = await query.graph({
    entity: "product",
    filters: { id },
    // serial_number is intentionally excluded — never expose publicly
    fields: [
      "id",
      "product_detail.id",
      "product_detail.short_description",
      "product_detail.optics_ready",
      "product_detail.contact_for_pricing",
      "product_detail.primary_category",
      "product_detail.seo_meta_title",
      "product_detail.seo_meta_description",
    ],
  })

  if (!data[0]) {
    return res.status(404).json({ message: "Product not found" })
  }

  res.json({ product_detail: data[0].product_detail ?? null })
}
