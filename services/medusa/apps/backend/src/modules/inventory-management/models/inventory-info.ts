import { model } from "@medusajs/framework/utils"

const InventoryInfo = model.define("inventory_info", {
  id: model.id().primaryKey(),
  item_cost: model.bigNumber().nullable(),
  is_consignment: model.boolean().default(false),
  consignor_customer_id: model.text().nullable(),
  consignor_name: model.text().nullable(),
  consignor_contact: model.text().nullable(),
  consignor_cost: model.bigNumber().nullable(),
  suggested_sale_price: model.bigNumber().nullable(),
  consignment_notes: model.text().nullable(),
  imported_by_luxus: model.boolean().default(false),
  importer_name: model.text().nullable(),
  importer_mark: model.text().nullable(),
  importer_mark_location: model.text().nullable(),
  is_master_backroom: model.boolean().default(false),
  is_backroom: model.boolean().default(false),
})

export default InventoryInfo
