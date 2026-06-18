import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STATE_RESTRICTIONS_MODULE } from "../../../modules/state-restrictions"
import StateRestrictionsService from "../../../modules/state-restrictions/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(STATE_RESTRICTIONS_MODULE) as InstanceType<typeof StateRestrictionsService>
  const restrictions = await service.listStateRestrictions({}, { order: { state_code: "ASC" } })
  return res.json({ restrictions })
}
