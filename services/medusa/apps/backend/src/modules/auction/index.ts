import { Module } from "@medusajs/framework/utils"
import AuctionService from "./service"

export const AUCTION_MODULE = "auction"

export default Module(AUCTION_MODULE, {
  service: AuctionService,
})
