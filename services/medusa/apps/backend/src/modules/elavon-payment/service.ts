import {
  AbstractPaymentProvider,
  PaymentSessionStatus,
  PaymentActions,
} from "@medusajs/framework/utils"
import type {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/types"
import crypto from "crypto"

type ElavonConfig = {
  merchant_id: string
  user_id: string
  pin: string
  env?: string
}

class ElavonPaymentService extends AbstractPaymentProvider<ElavonConfig> {
  static identifier = "elavon"

  // Public constructor is required — AbstractPaymentProvider declares it as protected
  constructor(cradle: Record<string, unknown>, config: ElavonConfig) {
    super(cradle, config)
  }

  private get baseUrl(): string {
    return this.config.env === "production"
      ? "https://api.convergepay.com/hosted-payments"
      : "https://api.demo.convergepay.com/hosted-payments"
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, data, context } = input
    const cartId: string =
      (data as any)?.cart_id ??
      (context as any)?.cart_id ??
      (context as any)?.resource_id ??
      "unknown"
    const baseReturnUrl: string =
      (data as any)?.return_url ??
      `${process.env.STOREFRONT_URL ?? "https://dev.luxus-collection.com"}/api/elavon/complete`

    // Sign the cart ID so the callback can verify it came from a legitimate token request
    const sig = crypto
      .createHmac("sha256", process.env.ELAVON_PROXY_SECRET ?? "")
      .update(cartId)
      .digest("hex")
      .slice(0, 32)
    const returnUrl = `${baseReturnUrl}?cart=${encodeURIComponent(cartId)}&sig=${sig}`

    const amountStr = (Number(amount) / 100).toFixed(2)

    // Invoice number: strip prefix, first 25 chars of ULID — matches Converge VT exactly
    const invoiceNumber = cartId.replace(/^cart_/, "").slice(0, 25)

    const billing = (data as any)?.billing_address ?? (context as any)?.billing_address
    const email = (data as any)?.email ?? (context as any)?.email ?? ""

    // Cancel URL sends customer back to checkout rather than the Converge merchant portal
    const storeFrontOrigin = baseReturnUrl.includes("://")
      ? new URL(baseReturnUrl).origin
      : (process.env.STOREFRONT_URL ?? "https://dev.luxus-collection.com")
    const cancelUrl = `${storeFrontOrigin}/checkout?cancelled=1`

    const params = new URLSearchParams({
      ssl_merchant_id: this.config.merchant_id,
      ssl_user_id: this.config.user_id,
      ssl_pin: this.config.pin,
      ssl_transaction_type: "ccsale",
      ssl_amount: amountStr,
      ssl_invoice_number: invoiceNumber,
      ssl_email: email,
      ssl_first_name:
        billing?.first_name ?? (context as any)?.customer?.first_name ?? "",
      ssl_last_name:
        billing?.last_name ?? (context as any)?.customer?.last_name ?? "",
      // Pre-fill billing address on the hosted payment form
      ssl_avs_address: billing?.address_1 ?? "",
      ssl_avs_zip:     billing?.postal_code ?? "",
      ssl_city:        billing?.city ?? "",
      ssl_state:       (billing?.province ?? "").toUpperCase(),
      ssl_country:     "US",
      ssl_phone:       billing?.phone ?? "",
      ssl_return_url: returnUrl,
      ssl_cancel_url: cancelUrl,
      ssl_show_form: "true",
    })

    let text: string
    try {
      const res = await fetch(`${this.baseUrl}/transaction_token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      })
      text = await res.text()

      if (!res.ok || text.trimStart().startsWith("<")) {
        const label =
          res.status === 401
            ? "Payment credentials rejected (401)"
            : res.status === 403
            ? "Hosted Payment Page not enabled on account (403)"
            : `Payment server error (${res.status})`
        console.error(`[Elavon] initiatePayment HTTP ${res.status}:`, text.slice(0, 300))
        throw new Error(label)
      }
    } catch (err: any) {
      if (err.message?.includes("(4")) throw err
      console.error("[Elavon] initiatePayment network error:", err)
      throw new Error("Could not reach payment server")
    }

    // Converge transaction_token returns the raw token as the response body (plain string)
    const token = text.trim()
    if (!token) throw new Error("Elavon returned no token")

    const hostedUrl = `${this.baseUrl}?ssl_txn_auth_token=${encodeURIComponent(token)}`

    return {
      id: crypto.randomUUID(),
      data: { hostedUrl, cartId, status: "pending" },
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const d = (input.data ?? {}) as Record<string, string>
    if (d.ssl_result === "0") {
      return { status: PaymentSessionStatus.AUTHORIZED, data: d }
    }
    if (d.ssl_result !== undefined) {
      return { status: PaymentSessionStatus.ERROR, data: d }
    }
    return { status: PaymentSessionStatus.PENDING, data: d }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    // Elavon HPP captures immediately on authorization
    return { data: { ...(input.data ?? {}), captured: true } }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data ?? {} }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    // TODO: implement Elavon cc_return transaction when refund UI is needed
    return { data: input.data ?? {} }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async deletePayment(_input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: {} }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const d = (input.data ?? {}) as Record<string, string>
    if (d.ssl_result === "0") return { status: PaymentSessionStatus.AUTHORIZED }
    if (d.ssl_result) return { status: PaymentSessionStatus.ERROR }
    return { status: PaymentSessionStatus.PENDING }
  }

  async getWebhookActionAndData(
    _data: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }
}

export default ElavonPaymentService
