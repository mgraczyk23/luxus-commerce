import { model } from "@medusajs/framework/utils"

// restriction_type values:
//   "banned"            — no sale to this state at all (hard block)
//   "no_threaded_barrel"— no sale if product has_threaded_barrel (hard block)
//   "magazine_warning"  — ship firearm but mags excluded if product capacity exceeds limit (soft)
//
// magazine_limit: max rounds allowed in this state (null = blanket warning regardless of capacity)
// firearm_type:   which category this rule applies to: "handgun" | "rifle" | "shotgun" | null (all)
//   Illinois example: two rules — { IL, magazine_warning, handgun, 15 } and { IL, magazine_warning, rifle, 10 }
const StateRestriction = model.define("state_restriction", {
  id:               model.id().primaryKey(),
  state_code:       model.text(),
  restriction_type: model.text(),
  notes:            model.text().nullable(),
  magazine_limit:   model.number().nullable(),
  firearm_type:     model.text().nullable(),
})

export default StateRestriction
