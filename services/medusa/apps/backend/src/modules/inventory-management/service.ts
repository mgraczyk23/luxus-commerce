import { MedusaService } from "@medusajs/framework/utils"
import InventoryInfo from "./models/inventory-info"

class InventoryManagementService extends MedusaService({
  InventoryInfo,
}) {}

export default InventoryManagementService
