import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STATE_RESTRICTIONS_MODULE } from "../../../modules/state-restrictions"
import StateRestrictionsService from "../../../modules/state-restrictions/service"

const VALID_TYPES   = ["banned", "no_threaded_barrel", "magazine_warning"]
const VALID_FIREARM = ["handgun", "rifle", "shotgun"]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(STATE_RESTRICTIONS_MODULE) as InstanceType<typeof StateRestrictionsService>
  const restrictions = await service.listStateRestrictions({}, { order: { state_code: "ASC" } })
  return res.json({ restrictions })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { state_code, restriction_type, notes, magazine_limit, firearm_type } = req.body as {
    state_code:       string
    restriction_type: string
    notes?:           string
    magazine_limit?:  number | null
    firearm_type?:    string | null
  }

  if (!state_code || !restriction_type) {
    return res.status(422).json({ error: "state_code and restriction_type are required" })
  }
  if (!VALID_TYPES.includes(restriction_type)) {
    return res.status(422).json({ error: `restriction_type must be one of: ${VALID_TYPES.join(", ")}` })
  }
  if (firearm_type && !VALID_FIREARM.includes(firearm_type)) {
    return res.status(422).json({ error: `firearm_type must be one of: ${VALID_FIREARM.join(", ")}` })
  }

  const service = req.scope.resolve(STATE_RESTRICTIONS_MODULE) as InstanceType<typeof StateRestrictionsService>

  // For magazine_warning: uniqueness is (state_code, restriction_type, firearm_type) so
  // Illinois can have separate handgun and rifle rules.
  // For other types: uniqueness is (state_code, restriction_type).
  const existing = await service.listStateRestrictions({
    state_code: state_code.toUpperCase(),
    restriction_type,
  } as any)
  const duplicate = existing.find((r: any) =>
    restriction_type !== "magazine_warning"
      ? true
      : (r.firearm_type ?? null) === (firearm_type ?? null)
  )
  if (duplicate) {
    return res.status(409).json({ error: "A restriction with these settings already exists for that state" })
  }

  const restriction = await service.createStateRestrictions({
    state_code:      state_code.toUpperCase(),
    restriction_type,
    notes:           notes ?? null,
    magazine_limit:  magazine_limit ?? null,
    firearm_type:    firearm_type ?? null,
  })

  return res.status(201).json({ restriction })
}
