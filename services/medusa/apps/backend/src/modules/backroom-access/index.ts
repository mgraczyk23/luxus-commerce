import { Module } from "@medusajs/framework/utils"
import BackroomAccessService from "./service"

export const BACKROOM_ACCESS_MODULE = "backroom_access"

export default Module(BACKROOM_ACCESS_MODULE, {
  service: BackroomAccessService,
})
