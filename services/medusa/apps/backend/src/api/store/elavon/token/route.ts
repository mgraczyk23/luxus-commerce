import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const BASE =
  process.env.ELAVON_ENV === "production"
    ? "https://api.convergepay.com/hosted-payments"
    : "https://api.demo.convergepay.com/hosted-payments"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { amount, invoiceRef, firstName, lastName, email, returnUrl } = req.body as {
    amount: number
    invoiceRef: string
    firstName: string
    lastName: string
    email: string
    returnUrl: string
  }

  if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" })
  if (!returnUrl) return res.status(400).json({ error: "returnUrl required" })

  const merchantId = process.env.ELAVON_MERCHANT_ID
  const userId = process.env.ELAVON_USER_ID
  const pin = process.env.ELAVON_PIN

  if (!merchantId || !userId || !pin) {
    return res.status(500).json({ error: "Elavon credentials not configured" })
  }

  const params = new URLSearchParams({
    ssl_merchant_id: merchantId,
    ssl_user_id: userId,
    ssl_pin: pin,
    ssl_transaction_type: "ccsale",
    ssl_amount: amount.toFixed(2),
    ssl_invoice_number: invoiceRef,
    ssl_first_name: firstName,
    ssl_last_name: lastName,
    ssl_email: email,
    ssl_return_url: returnUrl,
    ssl_show_form: "true",
  })

  let elavonRes: Response
  let text: string
  try {
    elavonRes = await fetch(`${BASE}/transaction_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    })
    text = await elavonRes.text()
  } catch (err) {
    console.error("[elavon/token] network error:", err)
    return res.status(502).json({ error: "Could not reach payment servers" })
  }

  if (!elavonRes.ok || text.trimStart().startsWith("<")) {
    const code = elavonRes.status
    console.error(`[elavon/token] HTTP ${code}:`, text.slice(0, 300))
    const label = code === 401
      ? "Payment credentials rejected (401)"
      : code === 403
      ? "Payment not authorized — contact support (403)"
      : `Payment server error (${code})`
    return res.status(502).json({ error: label })
  }

  if (text.includes("ssl_result_message")) {
    const parsed = Object.fromEntries(new URLSearchParams(text))
    const msg = parsed.ssl_result_message ?? "Token request failed"
    console.error("[elavon/token] error response:", msg)
    return res.status(502).json({ error: msg })
  }

  let token = text.trim()
  if (token.includes("=")) {
    token = new URLSearchParams(token).get("ssl_txn_auth_token") ?? token
  }

  if (!token) return res.status(502).json({ error: "No token returned" })

  return res.status(200).json({ token, hostedUrl: `${BASE}/${token}` })
}
