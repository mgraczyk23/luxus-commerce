import { model } from "@medusajs/framework/utils"

const BackroomPassword = model.define("backroom_password", {
  id:            model.id().primaryKey(),
  room_slug:     model.text(),      // unique — enforced in migration
  password_hash: model.text(),
})

export default BackroomPassword
