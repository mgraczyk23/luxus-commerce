import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PRODUCT_DETAILS_MODULE } from "../../../../../modules/product-details"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data } = await query.graph({
    entity: "product",
    filters: { id },
    fields: ["id", "product_detail.*"],
  })

  if (!data[0]) {
    return res.status(404).json({ message: "Product not found" })
  }

  res.json({ product_detail: data[0].product_detail ?? null })
}

// Sync storefront-visible fields from product_detail into the core product metadata
// column using a direct JSON-merge SQL update — the product module service does not
// reliably merge individual metadata keys, so we use Knex directly here.
async function syncMetadata(req: MedusaRequest, productId: string, detail: any) {
  try {
    const db = req.scope.resolve("__pg_connection__") as any
    const patch = JSON.stringify({
      contact_for_pricing: detail.contact_for_pricing ? "true" : "false",
      primary_category:   detail.primary_category   ?? null,
      short_description:  detail.short_description  ?? null,
      engraver:           detail.engraver            ?? null,
    })
    await db.raw(
      `UPDATE product SET metadata = COALESCE(metadata, '{}'::jsonb) || ?::jsonb WHERE id = ?`,
      [patch, productId]
    )
  } catch (e: any) {
    console.error("[syncMetadata] failed:", e?.message)
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_DETAILS_MODULE)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  const { id } = req.params

  const detail = await service.createProductDetails(req.body as any)

  await link.create({
    [Modules.PRODUCT]: { product_id: id },
    [PRODUCT_DETAILS_MODULE]: { product_detail_id: detail.id },
  })

  await syncMetadata(req, id, detail)

  res.status(201).json({ product_detail: detail })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_DETAILS_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data } = await query.graph({
    entity: "product",
    filters: { id },
    fields: ["id", "product_detail.id"],
  })

  const existing = data[0]?.product_detail as any
  if (!existing) {
    return res.status(404).json({ message: "Product detail not found" })
  }

  // Strip managed fields — timestamps cause MikroORM to silently abort the update
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _c, updated_at: _u, deleted_at: _d, ...updateData } = req.body as any

  // Array-with-id form is required — the selector+data form silently no-ops in this version of Medusa
  const result = await service.updateProductDetails([{ id: existing.id, ...updateData }])
  const updated = Array.isArray(result) ? result[0] : result

  await syncMetadata(req, id, updated)

  res.json({ product_detail: updated })
}
