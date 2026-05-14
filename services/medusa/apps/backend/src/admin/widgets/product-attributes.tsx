import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Text, Button, Checkbox, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { adminFetch } from "../lib/api"

type AttributeValue = {
  id: string
  value: string
  sort_order: number
  attribute_type_id: string
}

type AttributeType = {
  id: string
  name: string
  slug: string
  sort_order: number
  values: AttributeValue[]
}

const ProductAttributesWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [original, setOriginal] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      adminFetch<{ attribute_types: AttributeType[] }>("/admin/product-attributes"),
      adminFetch<{ attribute_values: AttributeValue[] }>(`/admin/products/${data.id}/attributes`),
    ]).then(([{ attribute_types }, { attribute_values }]) => {
      setAttributeTypes(attribute_types.sort((a, b) => a.sort_order - b.sort_order))
      const ids = new Set(attribute_values.map((v) => v.id))
      setSelected(ids)
      setOriginal(ids)
      setLoading(false)
    }).catch((err) => {
      setError(err.message ?? "Failed to load attributes")
      setLoading(false)
    })
  }, [data.id])

  const toggle = (valueId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(valueId) ? next.delete(valueId) : next.add(valueId)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const toAdd = [...selected].filter((id) => !original.has(id))
      const toRemove = [...original].filter((id) => !selected.has(id))

      if (toAdd.length > 0) {
        await adminFetch(`/admin/products/${data.id}/attributes`, {
          method: "POST",
          body: JSON.stringify({ value_ids: toAdd }),
        })
      }
      for (const value_id of toRemove) {
        await adminFetch(`/admin/products/${data.id}/attributes`, {
          method: "DELETE",
          body: JSON.stringify({ value_id }),
        })
      }

      setOriginal(new Set(selected))
      toast.success("Attributes saved")
    } catch {
      toast.error("Failed to save attributes")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Product Attributes</Heading>
        <Button size="small" onClick={handleSave} isLoading={saving} disabled={loading}>
          Save
        </Button>
      </div>
      {loading ? (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-muted">Loading…</Text>
        </div>
      ) : error ? (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">{error}</Text>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 px-6 py-4 lg:grid-cols-3">
          {attributeTypes.map((type) => (
            <div key={type.id}>
              <Text size="small" weight="plus" className="mb-2 block">
                {type.name}
              </Text>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {type.values
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((value) => (
                    <div key={value.id} className="flex items-center gap-x-2">
                      <Checkbox
                        id={value.id}
                        checked={selected.has(value.id)}
                        onCheckedChange={() => toggle(value.id)}
                      />
                      <label htmlFor={value.id} className="text-sm cursor-pointer select-none">
                        {value.value}
                      </label>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductAttributesWidget
