import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CHECKOUT_CONFIG_MODULE } from "../../../modules/checkout-config"
import CheckoutConfigService from "../../../modules/checkout-config/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(CHECKOUT_CONFIG_MODULE) as CheckoutConfigService
  const settings = await service.getSettings()
  return res.json({ settings })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(CHECKOUT_CONFIG_MODULE) as CheckoutConfigService
  const updates = req.body as Record<string, string>

  const allowed = ["shipping_rate", "shipping_label", "fl_tax_rate", "tax_state"]
  for (const [key, value] of Object.entries(updates)) {
    if (!allowed.includes(key)) continue
    await service.setSetting(key, String(value))
  }

  const settings = await service.getSettings()
  return res.json({ settings })
}
