import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Input, Textarea, Button, Label, toast } from "@medusajs/ui"
import { useState } from "react"
import { adminFetch } from "../lib/api"

type Highlight = { title: string; body: string }

const MAX = 4

const ProductHighlightsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const initial: Highlight[] = Array.isArray((data.metadata as any)?.highlights)
    ? (data.metadata as any).highlights
    : []

  const [highlights, setHighlights] = useState<Highlight[]>(initial)
  const [saving, setSaving] = useState(false)

  const set = (i: number, field: keyof Highlight, value: string) =>
    setHighlights((prev) => prev.map((h, idx) => (idx === i ? { ...h, [field]: value } : h)))

  const add = () => {
    if (highlights.length < MAX)
      setHighlights((prev) => [...prev, { title: "", body: "" }])
  }

  const remove = (i: number) =>
    setHighlights((prev) => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminFetch(`/admin/products/${data.id}`, {
        method: "POST",
        body: JSON.stringify({ metadata: { highlights } }),
      })
      toast.success("Highlights saved")
    } catch {
      toast.error("Failed to save highlights")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Product Highlights</Heading>
          <p className="text-xs text-ui-fg-muted mt-0.5">
            Up to 4 highlight boxes shown below the product description
          </p>
        </div>
        <Button size="small" onClick={handleSave} isLoading={saving}>
          Save
        </Button>
      </div>

      <div className="flex flex-col gap-4 px-6 py-4">
        {highlights.length === 0 && (
          <p className="text-sm text-ui-fg-muted">No highlights added yet.</p>
        )}

        {highlights.map((h, i) => (
          <div
            key={i}
            className="rounded-lg border border-ui-border-base p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ui-fg-base">
                Highlight {i + 1} of {MAX}
              </span>
              <button
                onClick={() => remove(i)}
                className="text-xs text-ui-fg-muted hover:text-ui-fg-base"
              >
                Remove
              </button>
            </div>

            <div>
              <Label htmlFor={`hl-title-${i}`}>Title</Label>
              <Input
                id={`hl-title-${i}`}
                value={h.title}
                onChange={(e) => set(i, "title", e.target.value)}
                placeholder="e.g. Hand-Fitted Components"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor={`hl-body-${i}`}>Body</Label>
              <Textarea
                id={`hl-body-${i}`}
                value={h.body}
                onChange={(e) => set(i, "body", e.target.value)}
                placeholder="e.g. Each part individually fitted and lapped"
                rows={2}
                className="mt-1.5"
              />
            </div>
          </div>
        ))}

        {highlights.length < MAX && (
          <Button variant="secondary" size="small" onClick={add}>
            + Add Highlight
          </Button>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductHighlightsWidget
