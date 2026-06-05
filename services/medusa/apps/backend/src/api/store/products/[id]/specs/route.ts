import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_ATTRIBUTES_MODULE } from "../../../../../modules/product-attributes"

// Attribute type slugs that belong in the spec table, in display order
const ATTR_SPEC_SLUGS: { slug: string; label: string }[] = [
  { slug: "brand",             label: "Brand" },
  { slug: "model",             label: "Model" },
  { slug: "caliber",           label: "Caliber" },
  { slug: "action",            label: "Action" },
  { slug: "barrel-length",     label: "Barrel Length" },
  { slug: "magazine-capacity", label: "Magazine Capacity" },
  { slug: "frame-color",       label: "Frame Color" },
]

// product_specs fields → display labels, in display order
const SPEC_FIELD_LABELS: { key: string; label: string }[] = [
  { key: "overall_length", label: "Overall Length" },
  { key: "weight",         label: "Weight (Unloaded)" },
  { key: "frame_material", label: "Frame Material" },
  { key: "grip_material",  label: "Grips" },
  { key: "sight_type",     label: "Sights" },
  { key: "finish_type",    label: "Finish" },
]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const attrService = req.scope.resolve(PRODUCT_ATTRIBUTES_MODULE)
  const { id } = req.params

  const { data } = await query.graph({
    entity: "product",
    filters: { id },
    fields: [
      "id",
      "metadata",
      "product_spec.*",
      "product_detail.optics_ready",
      "attribute_values.id",
    ],
  })

  if (!data[0]) {
    return res.status(404).json({ message: "Product not found" })
  }

  const product = data[0] as any
  const spec = product.product_spec
  const detail = product.product_detail
  const extraSpecs: Record<string, string> = (product.metadata as any)?.extra_specs ?? {}
  const linkedValueIds: string[] = (product.attribute_values ?? []).map((v: any) => v.id)

  const specs: Record<string, string> = {}

  // 1. Pull relevant filterable attributes (set once in product_attributes widget)
  if (linkedValueIds.length > 0) {
    const [allValues, allTypes] = await Promise.all([
      attrService.listAttributeValues({}),
      attrService.listAttributeTypes({}),
    ])

    const typeById = Object.fromEntries((allTypes as any[]).map((t) => [t.id, t]))
    const linkedSet = new Set(linkedValueIds)
    const slugOrder = Object.fromEntries(ATTR_SPEC_SLUGS.map((s, i) => [s.slug, i]))
    const slugToLabel = Object.fromEntries(ATTR_SPEC_SLUGS.map((s) => [s.slug, s.label]))

    const relevant = (allValues as any[])
      .filter((v) => linkedSet.has(v.id))
      .map((v) => ({ ...v, type: typeById[v.attribute_type_id] }))
      .filter((v) => v.type && slugOrder[v.type.slug] !== undefined)
      .sort((a, b) => slugOrder[a.type.slug] - slugOrder[b.type.slug])

    for (const v of relevant) {
      const label = slugToLabel[v.type.slug]
      specs[label] = specs[label] ? `${specs[label]}, ${v.value}` : v.value
    }
  }

  // 2. Structured spec fields (set once in product_specs widget)
  if (spec) {
    for (const { key, label } of SPEC_FIELD_LABELS) {
      if (spec[key]) specs[label] = spec[key]
    }
  }

  // 3. Optics Ready from product_details (set once in product_details widget)
  if (detail?.optics_ready != null) {
    specs["Optics Ready"] = detail.optics_ready ? "Yes" : "No"
  }

  // 4. Admin-defined extra rows (Height, Width, Slide Material, Safety, etc.)
  for (const [k, v] of Object.entries(extraSpecs)) {
    if (k && v) specs[k] = String(v)
  }

  // Return null when nothing is populated — storefront hides the Specs tab
  if (Object.keys(specs).length === 0) {
    return res.json({ specs: null })
  }

  res.json({ specs })
}
