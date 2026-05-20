import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Input, Button, Label, toast } from "@medusajs/ui"
import { useState } from "react"
import { adminFetch } from "../lib/api"

type Row = { key: string; value: string }

const ProductExtraSpecsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const initial: Row[] = Object.entries(
    ((data.metadata as any)?.extra_specs as Record<string, string>) ?? {}
  ).map(([key, value]) => ({ key, value }))

  const [rows, setRows] = useState<Row[]>(initial)
  const [saving, setSaving] = useState(false)

  const set = (i: number, field: keyof Row, value: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)))

  const add = () => setRows((prev) => [...prev, { key: "", value: "" }])

  const remove = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    setSaving(true)
    try {
      const extra_specs = Object.fromEntries(
        rows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value])
      )
      await adminFetch(`/admin/products/${data.id}`, {
        method: "POST",
        body: JSON.stringify({ metadata: { extra_specs } }),
      })
      toast.success("Extra specs saved")
    } catch {
      toast.error("Failed to save extra specs")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Additional Specifications</Heading>
          <p className="text-xs text-ui-fg-muted mt-0.5">
            Extra spec table rows — Caliber, Action, Barrel Length, Frame Color, and Capacity
            come from Product Attributes above; Overall Length, Weight, etc. come from Product
            Specs. Add any remaining rows here (e.g. Height, Slide Material, Country of Origin).
          </p>
        </div>
        <Button size="small" onClick={handleSave} isLoading={saving}>
          Save
        </Button>
      </div>

      <div className="flex flex-col gap-3 px-6 py-4">
        {rows.length === 0 && (
          <p className="text-sm text-ui-fg-muted">No additional specs added yet.</p>
        )}

        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                value={r.key}
                onChange={(e) => set(i, "key", e.target.value)}
                placeholder="Spec name (e.g. Height)"
              />
            </div>
            <div className="flex-1">
              <Input
                value={r.value}
                onChange={(e) => set(i, "value", e.target.value)}
                placeholder='Value (e.g. 5.25")'
              />
            </div>
            <button
              onClick={() => remove(i)}
              className="text-xs text-ui-fg-muted hover:text-ui-fg-base whitespace-nowrap"
            >
              Remove
            </button>
          </div>
        ))}

        <Button variant="secondary" size="small" onClick={add} className="mt-1">
          + Add Row
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductExtraSpecsWidget
