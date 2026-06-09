import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Input, Label, Button, toast, Badge } from "@medusajs/ui"
import { TruckFast, CurrencyDollar } from "@medusajs/icons"
import { useEffect, useState } from "react"
import { adminFetch } from "../../lib/api"

type Settings = {
  shipping_rate: string
  shipping_label: string
  fl_tax_rate: string
  tax_state: string
}

const CheckoutSettingsPage = () => {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [form, setForm] = useState<Settings>({ shipping_rate: "", shipping_label: "", fl_tax_rate: "", tax_state: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminFetch<{ settings: Settings }>("/admin/checkout-config")
      .then(({ settings }) => { setSettings(settings); setForm(settings) })
      .catch(() => toast.error("Failed to load checkout settings"))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const { settings: updated } = await adminFetch<{ settings: Settings }>("/admin/checkout-config", {
        method: "POST",
        body: JSON.stringify(form),
      })
      setSettings(updated)
      setForm(updated)
      toast.success("Checkout settings saved")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const field = (key: keyof Settings) => (
    <Input
      value={form[key]}
      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      disabled={!settings}
    />
  )

  return (
    <div className="flex flex-col gap-y-4 p-4 max-w-2xl">
      <div className="flex items-center gap-x-2">
        <Heading level="h1">Checkout Settings</Heading>
      </div>
      <p className="text-ui-fg-subtle text-sm">
        Configure shipping rates and tax collection for the storefront checkout. Changes take effect immediately — no deployment needed.
      </p>

      {/* Shipping */}
      <Container>
        <div className="flex items-center gap-x-2 mb-4">
          <TruckFast className="text-ui-fg-muted" />
          <Heading level="h2">Shipping</Heading>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-y-1">
            <Label>Shipping Rate (USD)</Label>
            <p className="text-ui-fg-subtle text-xs mb-1">Flat rate charged on every order</p>
            {field("shipping_rate")}
          </div>
          <div className="flex flex-col gap-y-1">
            <Label>Shipping Label</Label>
            <p className="text-ui-fg-subtle text-xs mb-1">Shown to customer at checkout</p>
            {field("shipping_label")}
          </div>
        </div>
        <div className="mt-3 p-3 bg-ui-bg-subtle rounded-md">
          <p className="text-ui-fg-subtle text-xs">
            <strong>Note:</strong> All firearms ship Next Day Air via FedEx, signature required and insured.
            Ammo ships ground only (not currently sold). Set rate to 0.00 to offer free shipping.
          </p>
        </div>
      </Container>

      {/* Tax */}
      <Container>
        <div className="flex items-center gap-x-2 mb-4">
          <CurrencyDollar className="text-ui-fg-muted" />
          <Heading level="h2">Sales Tax</Heading>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-y-1">
            <Label>Tax State</Label>
            <p className="text-ui-fg-subtle text-xs mb-1">2-letter state code where tax is collected</p>
            {field("tax_state")}
          </div>
          <div className="flex flex-col gap-y-1">
            <Label>Tax Rate (%)</Label>
            <p className="text-ui-fg-subtle text-xs mb-1">Enter as a percentage — e.g. 7 for 7%</p>
            {field("fl_tax_rate")}
          </div>
        </div>
        <div className="mt-3 p-3 bg-ui-bg-subtle rounded-md">
          <p className="text-ui-fg-subtle text-xs">
            <strong>Florida:</strong> 6% state rate + 1% Sarasota County surtax = <strong>7% total</strong>.
            Tax is only applied when the FFL dealer&apos;s state matches the Tax State above.
            Consult your accountant if nexus expands to other states.
          </p>
        </div>
      </Container>

      {/* Preview */}
      {settings && (
        <Container>
          <Heading level="h2" className="mb-3">Live Preview</Heading>
          <div className="space-y-1 text-sm font-mono">
            <div className="flex justify-between"><span className="text-ui-fg-subtle">Subtotal (example $4,250)</span><span>$4,250.00</span></div>
            <div className="flex justify-between"><span className="text-ui-fg-subtle">{form.shipping_label}</span><span>${parseFloat(form.shipping_rate || "0").toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-ui-fg-subtle">Tax ({form.tax_state} {form.fl_tax_rate}%)</span><span>${(4250 * parseFloat(form.fl_tax_rate || "0") / 100).toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-ui-border-base pt-1 font-semibold">
              <span>Total</span>
              <span>${(4250 + parseFloat(form.shipping_rate || "0") + (4250 * parseFloat(form.fl_tax_rate || "0") / 100)).toFixed(2)}</span>
            </div>
          </div>
          <p className="text-ui-fg-subtle text-xs mt-2">Tax only applies when FFL dealer is in {form.tax_state}.</p>
        </Container>
      )}

      <div className="flex justify-end">
        <Button onClick={save} isLoading={saving} disabled={!settings}>Save Changes</Button>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Checkout Settings",
  icon: TruckFast,
})

export default CheckoutSettingsPage
