import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Input, Button, toast } from "@medusajs/ui"
import { useState } from "react"
import { adminFetch } from "../lib/api"

const ProductInTheBoxWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const initial: string[] = Array.isArray((data.metadata as any)?.in_the_box)
    ? (data.metadata as any).in_the_box
    : []

  const [items, setItems] = useState<string[]>(initial)
  const [saving, setSaving] = useState(false)

  const set = (i: number, value: string) =>
    setItems((prev) => prev.map((item, idx) => (idx === i ? value : item)))

  const add = () => setItems((prev) => [...prev, ""])

  const remove = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    setSaving(true)
    try {
      const in_the_box = items.filter((s) => s.trim())
      await adminFetch(`/admin/products/${data.id}`, {
        method: "POST",
        body: JSON.stringify({ metadata: { in_the_box } }),
      })
      toast.success("In The Box saved")
    } catch {
      toast.error("Failed to save In The Box")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">In The Box</Heading>
          <p className="text-xs text-ui-fg-muted mt-0.5">
            Bullet list shown on the "What's Included" tab. Leave empty to hide the tab.
          </p>
        </div>
        <Button size="small" onClick={handleSave} isLoading={saving}>
          Save
        </Button>
      </div>

      <div className="flex flex-col gap-3 px-6 py-4">
        {items.length === 0 && (
          <p className="text-sm text-ui-fg-muted">No items added yet — tab will be hidden.</p>
        )}

        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-ui-fg-muted text-sm select-none">•</span>
            <Input
              value={item}
              onChange={(e) => set(i, e.target.value)}
              placeholder='e.g. Two 8-round Wilson Combat magazines'
              className="flex-1"
            />
            <button
              onClick={() => remove(i)}
              className="text-xs text-ui-fg-muted hover:text-ui-fg-base whitespace-nowrap"
            >
              Remove
            </button>
          </div>
        ))}

        <Button variant="secondary" size="small" onClick={add} className="mt-1">
          + Add Item
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductInTheBoxWidget
