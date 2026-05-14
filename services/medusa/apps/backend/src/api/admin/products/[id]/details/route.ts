import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PRODUCT_DETAILS_MODULE } from "../../../../../modules/product-details"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data } = await query.graph({
    entity: "product",
    filters: { id },
    fields: ["id", "product_detail.*"],
  })

  if (!data[0]) {
    return res.status(404).json({ message: "Product not found" })
  }

  res.json({ product_detail: data[0].product_detail ?? null })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_DETAILS_MODULE)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const { id } = req.params

  const detail = await service.createProductDetails(req.body as any)

  await link.create({
    [Modules.PRODUCT]: { product_id: id },
    [PRODUCT_DETAILS_MODULE]: { product_detail_id: detail.id },
  })

  res.status(201).json({ product_detail: detail })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_DETAILS_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data } = await query.graph({
    entity: "product",
    filters: { id },
    fields: ["id", "product_detail.id"],
  })

  const existing = data[0]?.product_detail as any
  if (!existing) {
    return res.status(404).json({ message: "Product detail not found" })
  }

  const updated = await service.updateProductDetails({ id: existing.id }, req.body as any)

  res.json({ product_detail: updated })
}
