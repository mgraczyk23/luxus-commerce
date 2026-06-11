import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * POST /store/elavon/finalize
 *
 * Called by the storefront after Elavon's HPP posts back a result.
 * Updates the cart's payment session with the Elavon result, then
 * completes the cart → creates a Medusa order.
 *
 * Protected by x-elavon-proxy-secret (same middleware as /store/elavon/token).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { cartId, ssl_result, ssl_txn_id, ssl_approval_code, ssl_amount, ssl_result_message } =
    req.body as {
      cartId: string
      ssl_result: string
      ssl_txn_id?: string
      ssl_approval_code?: string
      ssl_amount?: string
      ssl_result_message?: string
    }

  if (!cartId) return res.status(400).json({ error: "cartId required" })

  // Fetch the cart with its payment collection and sessions via remote query
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "currency_code",
      "total",
      "payment_collection.id",
      "payment_collection.payment_sessions.id",
      "payment_collection.payment_sessions.data",
      "payment_collection.payment_sessions.provider_id",
      "email",
      "metadata",
    ],
    filters: { id: cartId },
  })

  const cart = carts?.[0]
  if (!cart) return res.status(404).json({ error: "Cart not found" })

  const session = cart.payment_collection?.payment_sessions?.[0]
  if (!session) return res.status(400).json({ error: "No payment session found for cart" })

  // Merge Elavon result into the existing session data
  const paymentModule = req.scope.resolve(Modules.PAYMENT) as any
  await paymentModule.updatePaymentSession({
    id: session.id,
    currency_code: (cart.currency_code ?? "usd").toLowerCase(),
    amount: cart.total ?? 0,
    data: {
      ...(session.data ?? {}),
      ssl_result,
      ssl_txn_id: ssl_txn_id ?? "",
      ssl_approval_code: ssl_approval_code ?? "",
      ssl_amount: ssl_amount ?? "",
      ssl_result_message: ssl_result_message ?? "",
    },
  })

  // Run the complete-cart workflow — this calls authorizePayment() on our provider
  const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE) as any
  const { errors, result } = await workflowEngine.run("complete-cart", {
    input: { id: cartId },
    throwOnError: false,
  })

  if (errors?.[0]) {
    const err = errors[0].error
    console.error("[elavon/finalize] complete-cart workflow error:", err?.message)
    return res.status(400).json({ error: err?.message ?? "Could not complete order" })
  }

  const orderId = result.id

  // Elavon ccsale is an immediate capture — tell Medusa the payment is captured.
  // This updates the order payment status from "authorized" to "captured" in the admin.
  try {
    const { data: orderData } = await query.graph({
      entity: "order",
      fields: ["payment_collections.payments.id"],
      filters: { id: orderId },
    })
    const paymentId = (orderData?.[0] as any)?.payment_collections?.[0]?.payments?.[0]?.id
    if (paymentId) {
      await paymentModule.capturePayment({ payment_id: paymentId })
      console.log(`[elavon/finalize] Captured payment ${paymentId} for order ${orderId}`)
    }
  } catch (capErr: any) {
    // Non-fatal: money is captured at Elavon's side regardless
    console.error("[elavon/finalize] capturePayment error (non-fatal):", capErr?.message)
  }

  return res.json({ orderId, displayId: result.display_id })
}
