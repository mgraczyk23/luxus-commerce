import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data } = await query.graph({ entity: "product", filters: { id }, fields: ["id", "metadata"] })
  if (!data[0]) return res.status(404).json({ message: "Product not found" })

  const meta = (data[0].metadata ?? {}) as Record<string, unknown>
  res.json({
    has_threaded_barrel: meta.has_threaded_barrel === "true",
    magazine_capacity:   meta.magazine_capacity ? Number(meta.magazine_capacity) : null,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const { has_threaded_barrel, magazine_capacity } = req.body as {
    has_threaded_barrel?: boolean
    magazine_capacity?:   number | null
  }

  const db = req.scope.resolve("__pg_connection__") as any
  const patch = JSON.stringify({
    has_threaded_barrel: has_threaded_barrel ? "true" : "false",
    magazine_capacity:   magazine_capacity != null ? String(magazine_capacity) : null,
  })
  await db.raw(
    `UPDATE product SET metadata = COALESCE(metadata, '{}'::jsonb) || ?::jsonb WHERE id = ?`,
    [patch, id]
  )

  res.json({ success: true })
}
