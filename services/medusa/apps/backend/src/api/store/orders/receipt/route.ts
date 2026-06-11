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
      "item_subtotal",
      "shipping_subtotal",
      "tax_total",
      "total",
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
      "items.quantity",
      "items.unit_price",
      "items.subtotal",
      "items.thumbnail",
      "payment_collections.payment_sessions.data",
    ],
    filters: { id: orderId },
  })

  const order = orders?.[0]
  if (!order) return res.status(404).json({ error: "Order not found" })

  // Pull Elavon payment data from the first payment session
  const sessionData = (order.payment_collections?.[0]?.payment_sessions?.[0]?.data ?? {}) as Record<string, string>

  return res.json({
    id: order.id,
    display_id: order.display_id,
    invoice_number: `LXC-${String(order.display_id).padStart(6, "0")}`,
    created_at: order.created_at,
    email: order.email,
    currency_code: order.currency_code ?? "usd",
    subtotal: order.item_subtotal ?? 0,
    shipping_total: order.shipping_subtotal ?? 0,
    tax_total: order.tax_total ?? 0,
    total: order.total ?? 0,
    billing_address: order.billing_address ?? null,
    items: (order.items ?? []).map((i: any) => ({
      id: i.id,
      title: i.title,
      subtitle: i.subtitle,
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
      thumbnail: i.thumbnail,
    })),
    metadata: order.metadata ?? {},
    payment: {
      approval_code: sessionData.ssl_approval_code ?? "",
      txn_id: sessionData.ssl_txn_id ?? "",
      amount: sessionData.ssl_amount ?? "",
    },
  })
}
