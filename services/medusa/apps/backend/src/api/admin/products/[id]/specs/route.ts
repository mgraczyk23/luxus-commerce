import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PRODUCT_SPECS_MODULE } from "../../../../../modules/product-specs"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data } = await query.graph({
    entity: "product",
    filters: { id },
    fields: ["id", "product_spec.*"],
  })

  if (!data[0]) {
    return res.status(404).json({ message: "Product not found" })
  }

  res.json({ product_spec: data[0].product_spec ?? null })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_SPECS_MODULE)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const { id } = req.params

  const spec = await service.createProductSpecs(req.body as any)

  await link.create({
    [Modules.PRODUCT]: { product_id: id },
    [PRODUCT_SPECS_MODULE]: { product_spec_id: spec.id },
  })

  res.status(201).json({ product_spec: spec })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_SPECS_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data } = await query.graph({
    entity: "product",
    filters: { id },
    fields: ["id", "product_spec.id"],
  })

  const existing = data[0]?.product_spec as any
  if (!existing) {
    return res.status(404).json({ message: "Product spec not found" })
  }

  const updated = await service.updateProductSpecs({ id: existing.id }, req.body as any)

  res.json({ product_spec: updated })
}
