import { Module } from "@medusajs/framework/utils"
import InventoryManagementService from "./service"

export const INVENTORY_MANAGEMENT_MODULE = "inventory_management"

export default Module(INVENTORY_MANAGEMENT_MODULE, {
  service: InventoryManagementService,
})
