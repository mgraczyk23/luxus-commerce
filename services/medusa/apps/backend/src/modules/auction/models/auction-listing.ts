import { model } from "@medusajs/framework/utils"

// status values: "draft" | "scheduled" | "active" | "ended" | "cancelled"
const AuctionListing = model.define("auction_listing", {
  id: model.id().primaryKey(),
  status: model.text().default("draft"),
  starting_bid: model.bigNumber(),
  reserve_price: model.bigNumber().nullable(),
  bid_increment: model.bigNumber().default(50),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
  notes: model.text().nullable(),
})

export default AuctionListing
