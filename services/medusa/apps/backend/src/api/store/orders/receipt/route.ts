import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/orders/receipt?id=order_xxx
 *
 * Public receipt endpoint — no auth required.
 * The full Medusa order ID (a ULID) acts as an implicit access token:
 * it is unguessable from the outside, only known from a successful checkout.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.query.id as string
  if (!orderId || !orderId.startsWith("order_")) {
    return res.status(400).json({ error: "Valid order ID required" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "created_at",
      "email",
      "metadata",
      "summary",
      "currency_code",
      "billing_address.first_name",
      "billing_address.last_name",
      "billing_address.address_1",
      "billing_address.city",
      "billing_address.province",
      "billing_address.postal_code",
      "billing_address.phone",
      "items.id",
      "items.title",
      "items.subtitle",
      "items.detail.quantity",
      "items.unit_price",
      "items.thumbnail",
      "shipping_methods.id",
      "shipping_methods.name",
      "shipping_methods.raw_amount",
      "payment_collections.payment_sessions.data",
    ],
    filters: { id: orderId },
  })

  const order = orders?.[0]
  if (!order) return res.status(404).json({ error: "Order not found" })

  // summary.current_order_total is stored as cents (BigNumber JSONB)
  const summary = (order.summary as any) ?? {}
  const total: number = summary.current_order_total ?? 0

  // Calculate subtotal from line items (unit_price is already in cents)
  const items = (order.items ?? []) as Array<{
    id: string; title: string; subtitle?: string
    unit_price: number; thumbnail?: string
    detail?: { quantity?: number }
  }>
  const itemSubtotal = items.reduce((s, i) => s + i.unit_price * (i.detail?.quantity ?? 1), 0)

  // Shipping: raw_amount.value is a decimal string representing cents
  const shippingMethods = (order.shipping_methods ?? []) as Array<{ id: string; name: string; raw_amount?: { value?: string } }>
  const shippingTotal = shippingMethods.reduce((s, m) => {
    const v = m.raw_amount?.value
    return s + (v !== undefined ? Math.round(Number(v)) : 0)
  }, 0)

  // Tax is whatever is left after subtracting items and shipping
  const taxTotal = Math.max(0, total - itemSubtotal - shippingTotal)

  // Pull Elavon payment data from the first payment session
  const sessionData = (order.payment_collections?.[0]?.payment_sessions?.[0]?.data ?? {}) as Record<string, string>

  return res.json({
    id: order.id,
    display_id: order.display_id,
    invoice_number: `LXC-${String(order.display_id).padStart(6, "0")}`,
    created_at: order.created_at,
    email: order.email,
    currency_code: order.currency_code ?? "usd",
    subtotal: itemSubtotal,
    shipping_total: shippingTotal,
    tax_total: taxTotal,
    total,
    billing_address: order.billing_address ?? null,
    items: items.map((i) => {
      const qty = i.detail?.quantity ?? 1
      return {
        id: i.id,
        title: i.title,
        subtitle: i.subtitle,
        quantity: qty,
        unit_price: i.unit_price,
        subtotal: i.unit_price * qty,
        thumbnail: i.thumbnail,
      }
    }),
    metadata: order.metadata ?? {},
    payment: {
      approval_code: sessionData.ssl_approval_code ?? "",
      txn_id: sessionData.ssl_txn_id ?? "",
      amount: sessionData.ssl_amount ?? "",
    },
  })
}
