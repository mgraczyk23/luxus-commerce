import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import ElavonPaymentService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [ElavonPaymentService],
})
