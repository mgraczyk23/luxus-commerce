import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PRODUCT_ATTRIBUTES_MODULE } from "../../../../../modules/product-attributes"

// Sync attribute slug→value pairs into product.metadata so the storefront can
// filter by brand, model, caliber, action, barrel_length etc. without N+1 requests.
// Slugs are normalized: hyphens → underscores (barrel-length → barrel_length).
async function syncAttributeMetadata(req: MedusaRequest, productId: string) {
  try {
    const db = req.scope.resolve("__pg_connection__") as any

    // All type slugs — so we can null-out any slug whose value was removed
    const allTypesResult = await db.raw(
      `SELECT slug FROM attribute_type WHERE deleted_at IS NULL`
    )

    // Current linked values grouped into arrays by type slug
    const linkedResult = await db.raw(`
      SELECT at.slug, jsonb_agg(av.value ORDER BY av.sort_order) AS vals
      FROM product_product_product_attributes_attribute_value lnk
      JOIN attribute_value av ON av.id = lnk.attribute_value_id
      JOIN attribute_type at  ON at.id = av.attribute_type_id
      WHERE lnk.product_id = ? AND lnk.deleted_at IS NULL
      GROUP BY at.slug
    `, [productId])

    // Build patch: start all slugs as null, then fill in arrays of current values
    const patch: Record<string, string[] | null> = {}
    for (const row of allTypesResult.rows) {
      patch[row.slug.replace(/-/g, "_")] = null
    }
    for (const row of linkedResult.rows) {
      patch[row.slug.replace(/-/g, "_")] = row.vals
    }

    await db.raw(
      `UPDATE product SET metadata = COALESCE(metadata, '{}'::jsonb) || ?::jsonb WHERE id = ?`,
      [JSON.stringify(patch), productId]
    )
  } catch (e: any) {
    console.error("[syncAttributeMetadata] failed:", e?.message)
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data } = await query.graph({
    entity: "product",
    filters: { id },
    fields: ["id", "attribute_values.*"],
  })

  if (!data[0]) {
    return res.status(404).json({ message: "Product not found" })
  }

  // Filter out nulls — orphaned links (attribute_value deleted but link not cleaned up)
  // would otherwise cause "Cannot read properties of null" in the admin widget.
  const raw: any[] = (data[0] as any).attribute_values ?? []
  res.json({ attribute_values: raw.filter((v) => v?.id != null) })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const { id } = req.params
  const { value_ids } = req.body as { value_ids: string[] }

  await link.create(
    value_ids.map((value_id) => ({
      [Modules.PRODUCT]: { product_id: id },
      [PRODUCT_ATTRIBUTES_MODULE]: { attribute_value_id: value_id },
    }))
  )

  await syncAttributeMetadata(req, id)

  res.status(201).json({ product_id: id, linked: value_ids })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const { id } = req.params
  const { value_id } = req.body as { value_id: string }

  await link.dismiss({
    [Modules.PRODUCT]: { product_id: id },
    [PRODUCT_ATTRIBUTES_MODULE]: { attribute_value_id: value_id },
  })

  await syncAttributeMetadata(req, id)

  res.json({ product_id: id, dismissed: value_id })
}
