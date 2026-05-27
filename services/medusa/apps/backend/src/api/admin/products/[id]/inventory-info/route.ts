import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { INVENTORY_MANAGEMENT_MODULE } from "../../../../../modules/inventory-management"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data } = await query.graph({
    entity: "product",
    filters: { id },
    fields: ["id", "inventory_info.*"],
  })

  if (!data[0]) {
    return res.status(404).json({ message: "Product not found" })
  }

  res.json({ inventory_info: data[0].inventory_info ?? null })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(INVENTORY_MANAGEMENT_MODULE)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const { id } = req.params

  const info = await (service as any).createInventoryInfos(req.body as any)

  await link.create({
    [Modules.PRODUCT]: { product_id: id },
    [INVENTORY_MANAGEMENT_MODULE]: { inventory_info_id: info.id },
  })

  res.status(201).json({ inventory_info: info })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(INVENTORY_MANAGEMENT_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data } = await query.graph({
    entity: "product",
    filters: { id },
    fields: ["id", "inventory_info.id"],
  })

  const raw = data[0]?.inventory_info as any
  const existing = Array.isArray(raw) ? raw[0] : raw
  if (!existing) {
    return res.status(404).json({ message: "Inventory info not found" })
  }

  // Strip managed fields — timestamps cause MikroORM to silently abort the update
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _c, updated_at: _u, deleted_at: _d, ...updateData } = req.body as any

  // Array-with-id form is required — selector+data form silently no-ops in this Medusa version
  const result = await (service as any).updateInventoryInfos([{ id: existing.id, ...updateData }])
  const updated = Array.isArray(result) ? result[0] : result

  res.json({ inventory_info: updated })
}
