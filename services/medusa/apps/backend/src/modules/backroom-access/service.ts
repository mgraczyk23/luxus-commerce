import { MedusaService } from "@medusajs/framework/utils"
import BackroomPassword from "./models/backroom-password"

class BackroomAccessService extends MedusaService({ BackroomPassword }) {}

export default BackroomAccessService
