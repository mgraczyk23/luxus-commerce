import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Text, Button, Checkbox, Input, toast } from "@medusajs/ui"
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
  is_multi_select: boolean
  values: AttributeValue[]
}

const ProductAttributesWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [original, setOriginal] = useState<Set<string>>(new Set())
  const [searches, setSearches] = useState<Record<string, string>>({})
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

  const toggle = (valueId: string, type: AttributeType) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (type.is_multi_select) {
        next.has(valueId) ? next.delete(valueId) : next.add(valueId)
      } else {
        // Single-select: clear all other values from this type first
        type.values.forEach((v) => next.delete(v.id))
        // Add the new value only if it wasn't already selected
        if (!prev.has(valueId)) next.add(valueId)
      }
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

  const setSearch = (typeId: string, value: string) => {
    setSearches((prev) => ({ ...prev, [typeId]: value }))
  }

  const hasChanges =
    [...selected].some((id) => !original.has(id)) ||
    [...original].some((id) => !selected.has(id))

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Product Attributes</Heading>
        <Button size="small" onClick={handleSave} isLoading={saving} disabled={loading || !hasChanges}>
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
          {attributeTypes.map((type) => {
            const search = searches[type.id] ?? ""
            const sortedValues = type.values.sort((a, b) => a.sort_order - b.sort_order)
            const filtered = search
              ? sortedValues.filter((v) => v.value.toLowerCase().includes(search.toLowerCase()))
              : sortedValues
            const selectedInType = type.values.filter((v) => selected.has(v.id))

            return (
              <div key={type.id}>
                <div className="flex items-center justify-between mb-2">
                  <Text size="small" weight="plus">{type.name}</Text>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${
                    type.is_multi_select
                      ? "border-ui-tag-blue-border bg-ui-tag-blue-bg text-ui-tag-blue-text"
                      : "border-ui-tag-purple-border bg-ui-tag-purple-bg text-ui-tag-purple-text"
                  }`}>
                    {type.is_multi_select ? "Multi" : "Single"}
                  </span>
                </div>

                {selectedInType.length > 0 && (
                  <Text size="xsmall" className="text-ui-fg-muted mb-1.5 block">
                    {selectedInType.map((v) => v.value).join(", ")}
                  </Text>
                )}

                {type.values.length > 6 && (
                  <Input
                    size="small"
                    placeholder={`Search ${type.name.toLowerCase()}…`}
                    value={search}
                    onChange={(e) => setSearch(type.id, e.target.value)}
                    className="mb-2"
                  />
                )}

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {filtered.length === 0 && (
                    <Text size="xsmall" className="text-ui-fg-muted italic">No matches</Text>
                  )}
                  {filtered.map((value) => (
                    <div key={value.id} className="flex items-center gap-x-2">
                      {type.is_multi_select ? (
                        <Checkbox
                          id={value.id}
                          checked={selected.has(value.id)}
                          onCheckedChange={() => toggle(value.id, type)}
                        />
                      ) : (
                        <input
                          type="radio"
                          id={value.id}
                          name={`attr-type-${type.id}`}
                          checked={selected.has(value.id)}
                          onChange={() => toggle(value.id, type)}
                          className="h-4 w-4 accent-ui-fg-interactive cursor-pointer"
                        />
                      )}
                      <label htmlFor={value.id} className="text-sm cursor-pointer select-none">
                        {value.value}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductAttributesWidget
