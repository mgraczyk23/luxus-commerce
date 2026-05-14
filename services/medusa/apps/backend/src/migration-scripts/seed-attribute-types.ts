import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_ATTRIBUTES_MODULE } from "../modules/product-attributes"

export default async function seedAttributeTypes({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service = container.resolve(PRODUCT_ATTRIBUTES_MODULE)

  const existing = await service.listAttributeTypes({})
  if (existing.length > 0) {
    logger.info("Attribute types already seeded, skipping.")
    return
  }

  logger.info("Seeding attribute types...")

  const attributeData = [
    {
      name: "Brand",
      slug: "brand",
      sort_order: 1,
      values: ["Nighthawk Custom", "Cabot Guns", "Korth"],
    },
    {
      name: "Caliber",
      slug: "caliber",
      sort_order: 2,
      values: [".45 ACP", "9mm", ".38 Super", "10mm", ".40 S&W", ".357 Magnum", ".22 LR"],
    },
    {
      name: "Action",
      slug: "action",
      sort_order: 3,
      values: ["Single Action", "Double Action", "Double/Single Action"],
    },
    {
      name: "Barrel Length",
      slug: "barrel-length",
      sort_order: 4,
      values: ['3"', '3.5"', '4.25"', '5"', '5.5"', '6"'],
    },
    {
      name: "Frame Color",
      slug: "frame-color",
      sort_order: 5,
      values: ["Black", "Silver", "Two-Tone", "Bronze", "Custom"],
    },
    {
      name: "Magazine Capacity",
      slug: "magazine-capacity",
      sort_order: 6,
      values: ["7", "8", "9", "10", "14", "15"],
    },
  ]

  for (const attr of attributeData) {
    const type = await service.createAttributeTypes({
      name: attr.name,
      slug: attr.slug,
      sort_order: attr.sort_order,
    })

    for (let i = 0; i < attr.values.length; i++) {
      await service.createAttributeValues({
        value: attr.values[i],
        sort_order: i,
        attribute_type_id: type.id,
      })
    }

    logger.info(`  Created attribute type: ${attr.name} (${attr.values.length} values)`)
  }

  logger.info("Finished seeding attribute types.")
}
