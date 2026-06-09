import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CHECKOUT_CONFIG_MODULE } from "../../../../modules/checkout-config"
import CheckoutConfigService from "../../../../modules/checkout-config/service"

// GET /store/checkout/rates?state=FL
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(CHECKOUT_CONFIG_MODULE) as CheckoutConfigService
  const settings = await service.getSettings()

  const shippingState = (req.query.state as string ?? "").toUpperCase().trim()
  const taxState      = settings.tax_state.toUpperCase()
  const taxApplies    = shippingState === taxState

  return res.json({
    shippingCost:  parseFloat(settings.shipping_rate),
    shippingLabel: settings.shipping_label,
    taxRate:       taxApplies ? parseFloat(settings.fl_tax_rate) / 100 : 0,
    taxRateDisplay: taxApplies ? `${settings.fl_tax_rate}%` : null,
    taxState,
    taxApplies,
  })
}
