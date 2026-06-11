import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const actorId   = (req as any).auth_context?.actor_id
  const actorType = (req as any).auth_context?.actor_type

  if (!actorId || actorType !== "customer") {
    return res.status(401).json({ error: "Authentication required" })
  }

  // Resolve customer from JWT actor_id
  let customerEmail: string
  try {
    const customerModule = req.scope.resolve("customer") as any
    const customer = await customerModule.retrieveCustomer(actorId)
    if (!customer?.email) throw new Error("no email")
    customerEmail = customer.email.toLowerCase()
  } catch {
    return res.status(401).json({ error: "Could not verify customer" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "created_at",
      "summary",
      "currency_code",
      "items.id",
      "items.title",
      "items.unit_price",
      "items.detail.quantity",
      "items.thumbnail",
      "fulfillments.tracking_links.tracking_number",
    ],
    filters: { email: customerEmail },
    pagination: { order: { created_at: "DESC" }, take: 50 },
  })

  // Compute totals from summary (same as receipt endpoint)
  const result = orders.map((o: any) => {
    const summary = o.summary ?? {}
    const total   = summary.current_order_total ?? 0
    const items   = (o.items ?? []).map((i: any) => ({
      id:         i.id,
      title:      i.title,
      quantity:   i.detail?.quantity ?? 1,
      unit_price: i.unit_price ?? 0,
      thumbnail:  i.thumbnail ?? null,
    }))
    return {
      id:           o.id,
      display_id:   o.display_id,
      status:       o.status,
      created_at:   o.created_at,
      total,
      subtotal:     items.reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0),
      tax_total:    0,
      shipping_total: 0,
      items,
      fulfillments: (o.fulfillments ?? []).map((f: any) => ({
        tracking_links: (f.tracking_links ?? []).map((t: any) => ({
          tracking_number: t.tracking_number,
        })),
      })),
    }
  })

  return res.json({ orders: result })
}
