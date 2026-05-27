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

  const raw = data[0]?.product_spec as any
  const existing = Array.isArray(raw) ? raw[0] : raw
  if (!existing) {
    return res.status(404).json({ message: "Product spec not found" })
  }

  // Strip managed fields — timestamps cause MikroORM to silently abort the update
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _c, updated_at: _u, deleted_at: _d, ...updateData } = req.body as any

  // Array-with-id form is required — selector+data form silently no-ops in this Medusa version
  const result = await service.updateProductSpecs([{ id: existing.id, ...updateData }])
  const updated = Array.isArray(result) ? result[0] : result

  res.json({ product_spec: updated })
}
