import { Module } from "@medusajs/framework/utils"
import StateRestrictionsService from "./service"

export const STATE_RESTRICTIONS_MODULE = "stateRestrictions"

export default Module(STATE_RESTRICTIONS_MODULE, {
  service: StateRestrictionsService,
})
