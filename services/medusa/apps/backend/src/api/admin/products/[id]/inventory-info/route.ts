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

  const existing = data[0]?.inventory_info as any
  if (!existing) {
    return res.status(404).json({ message: "Inventory info not found" })
  }

  const updated = await (service as any).updateInventoryInfos({ id: existing.id }, req.body as any)

  res.json({ inventory_info: updated })
}
