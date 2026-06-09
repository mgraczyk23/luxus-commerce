import { MedusaService } from "@medusajs/framework/utils"
import CheckoutConfig from "./models/checkout-config"

// Default values — used if a key has never been saved
const DEFAULTS: Record<string, string> = {
  shipping_rate:       "0.00",   // flat rate in USD — set via admin widget
  shipping_label:      "Next Day Air",
  fl_tax_rate:         "7.00",   // Florida state (6%) + Sarasota county (1%)
  tax_state:           "FL",     // state code that triggers tax collection
}

class CheckoutConfigService extends MedusaService({ CheckoutConfig }) {
  async getSettings(): Promise<Record<string, string>> {
    const rows = await this.listCheckoutConfigs({}, { take: 100 })
    const map: Record<string, string> = { ...DEFAULTS }
    for (const row of rows) map[row.key] = row.value
    return map
  }

  async setSetting(key: string, value: string): Promise<void> {
    const existing = await this.listCheckoutConfigs({ key } as any, { take: 1 })
    if (existing.length > 0) {
      await this.updateCheckoutConfigs({ id: existing[0].id }, { value })
    } else {
      await this.createCheckoutConfigs({ key, value })
    }
  }
}

export default CheckoutConfigService
