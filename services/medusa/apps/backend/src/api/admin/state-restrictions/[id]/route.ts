import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STATE_RESTRICTIONS_MODULE } from "../../../../modules/state-restrictions"
import StateRestrictionsService from "../../../../modules/state-restrictions/service"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(STATE_RESTRICTIONS_MODULE) as InstanceType<typeof StateRestrictionsService>
  const { id } = req.params

  try {
    await service.deleteStateRestrictions(id)
  } catch {
    return res.status(404).json({ error: "Restriction not found" })
  }

  return res.json({ deleted: true, id })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(STATE_RESTRICTIONS_MODULE) as InstanceType<typeof StateRestrictionsService>
  const { id } = req.params
  const { notes } = req.body as { notes?: string }

  const restriction = await service.updateStateRestrictions({ id }, { notes: notes ?? null })
  return res.json({ restriction })
}
