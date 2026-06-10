import { MedusaService } from "@medusajs/framework/utils"
import StateRestriction from "./models/state-restriction"

class StateRestrictionsService extends MedusaService({
  StateRestriction,
}) {}

export default StateRestrictionsService
