import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import InventoryManagementModule from "../modules/inventory-management"

export default defineLink(
  ProductModule.linkable.product,
  InventoryManagementModule.linkable.inventoryInfo
)
