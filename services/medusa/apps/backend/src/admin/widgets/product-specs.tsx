import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Input, Label, Button, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { adminFetch } from "../lib/api"

type ProductSpec = {
  id?: string
  overall_length: string | null
  weight: string | null
  frame_material: string | null
  grip_material: string | null
  sight_type: string | null
  finish_type: string | null
}

const empty: ProductSpec = {
  overall_length: "",
  weight: "",
  frame_material: "",
  grip_material: "",
  sight_type: "",
  finish_type: "",
}

const ProductSpecsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [spec, setSpec] = useState<ProductSpec>(empty)
  const [exists, setExists] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminFetch<{ product_spec: ProductSpec | null }>(
      `/admin/products/${data.id}/specs`
    ).then(({ product_spec }) => {
      if (product_spec) {
        setSpec(product_spec)
        setExists(true)
      }
    })
  }, [data.id])

  const set = (field: keyof ProductSpec, value: string) =>
    setSpec((prev) => ({ ...prev, [field]: value === "" ? null : value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const { product_spec } = await adminFetch<{ product_spec: ProductSpec }>(
        `/admin/products/${data.id}/specs`,
        { method: exists ? "PUT" : "POST", body: JSON.stringify(spec) }
      )
      setSpec(product_spec)
      setExists(true)
      toast.success("Product specs saved")
    } catch {
      toast.error("Failed to save product specs")
    } finally {
      setSaving(false)
    }
  }

  const fields: { key: keyof ProductSpec; label: string; placeholder?: string }[] = [
    { key: "overall_length", label: "Overall Length", placeholder: 'e.g. 8.75"' },
    { key: "weight", label: "Weight", placeholder: "e.g. 38 oz" },
    { key: "frame_material", label: "Frame Material", placeholder: "e.g. Steel" },
    { key: "grip_material", label: "Grip Material", placeholder: "e.g. G10" },
    { key: "sight_type", label: "Sight Type", placeholder: "e.g. Heinie Straight Eight" },
    { key: "finish_type", label: "Finish Type", placeholder: "e.g. Perma Kote" },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Product Specs</Heading>
          <p className="text-xs text-ui-fg-muted mt-0.5">
            Caliber, Action, Barrel Length, Capacity, and Frame Color auto-populate from
            Product Attributes — no need to enter them here.
          </p>
        </div>
        <Button size="small" onClick={handleSave} isLoading={saving}>
          Save
        </Button>
      </div>
      <div className="flex flex-col gap-4 px-6 py-4">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <Label htmlFor={`ps-${key}`}>{label}</Label>
            <Input
              id={`ps-${key}`}
              value={(spec[key] as string) ?? ""}
              onChange={(e) => set(key, e.target.value)}
              placeholder={placeholder}
              className="mt-1.5"
            />
          </div>
        ))}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductSpecsWidget
