import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Text, Switch, Button, Input, toast } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { adminFetch } from "../lib/api"

const ProductShippingRestrictionsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const meta = (data.metadata ?? {}) as Record<string, string>

  const [hasThreadedBarrel, setHasThreadedBarrel] = useState(meta.has_threaded_barrel === "true")
  const [magazineCapacity,  setMagazineCapacity]  = useState(meta.magazine_capacity ?? "")
  const [saving,            setSaving]            = useState(false)

  useEffect(() => {
    const m = (data.metadata ?? {}) as Record<string, string>
    setHasThreadedBarrel(m.has_threaded_barrel === "true")
    setMagazineCapacity(m.magazine_capacity ?? "")
  }, [data.metadata])

  const handleSave = async () => {
    const cap = magazineCapacity.trim()
    if (cap && (isNaN(Number(cap)) || Number(cap) < 1 || Number(cap) > 200)) {
      toast.error("Magazine capacity must be a number between 1 and 200")
      return
    }
    setSaving(true)
    try {
      await adminFetch(`/admin/products/${data.id}`, {
        method: "POST",
        body: JSON.stringify({
          metadata: {
            ...(data.metadata ?? {}),
            has_threaded_barrel: hasThreadedBarrel ? "true" : "false",
            magazine_capacity:   cap || null,
          },
        }),
      })
      toast.success("Shipping flags saved")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="p-5">
      <Heading level="h2" className="mb-1">Shipping Restrictions</Heading>
      <Text size="xsmall" className="text-ui-fg-subtle mb-5 block">
        These flags control how state shipping restriction rules apply to this product.
      </Text>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <Text size="small" weight="plus">Threaded Barrel</Text>
            <Text size="xsmall" className="text-ui-fg-subtle">
              This firearm has a threaded barrel. Sale will be blocked to states with threaded barrel restrictions.
            </Text>
          </div>
          <Switch checked={hasThreadedBarrel} onCheckedChange={setHasThreadedBarrel} />
        </div>

        <div style={{ borderTop: "1px solid var(--medusa-border-base)" }} />

        <div>
          <Text size="small" weight="plus" className="mb-1 block">Magazine Capacity (rounds)</Text>
          <Text size="xsmall" className="text-ui-fg-subtle mb-3 block">
            Highest-capacity magazine this firearm ships with. Leave blank if no magazines are included. Used to automatically enforce state-specific limits — e.g. CO: 15 rounds, IL handguns: 15 rounds, IL rifles: 10 rounds.
          </Text>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Input
              type="number"
              min={1}
              max={200}
              placeholder="e.g. 17"
              value={magazineCapacity}
              onChange={e => setMagazineCapacity(e.target.value)}
              style={{ width: "120px" }}
            />
            <Text size="xsmall" className="text-ui-fg-subtle">rounds</Text>
          </div>
          {!!magazineCapacity && Number(magazineCapacity) > 10 && (
            <Text size="xsmall" style={{ color: "#7a6010", marginTop: "6px" }}>
              ⚠ Exceeds 10 rounds — magazine restriction rules will apply for applicable states.
            </Text>
          )}
        </div>
      </div>

      <Button size="small" onClick={handleSave} isLoading={saving} disabled={saving}>
        Save Flags
      </Button>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductShippingRestrictionsWidget
