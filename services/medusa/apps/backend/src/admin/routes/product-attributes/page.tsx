import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, Input, Badge, toast } from "@medusajs/ui"
import { useEffect, useState, useRef } from "react"
import { adminFetch } from "../../lib/api"

type AttributeValue = {
  id: string
  value: string
  sort_order: number
}

type AttributeType = {
  id: string
  name: string
  slug: string
  sort_order: number
  values: AttributeValue[]
}

const AttributeTypeCard = ({
  type,
  onValueAdded,
  onValueDeleted,
}: {
  type: AttributeType
  onValueAdded: (typeId: string, value: AttributeValue) => void
  onValueDeleted: (typeId: string, valueId: string) => void
}) => {
  const [newValue, setNewValue] = useState("")
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = async () => {
    const trimmed = newValue.trim()
    if (!trimmed) return
    setAdding(true)
    try {
      const { attribute_value } = await adminFetch<{ attribute_value: AttributeValue }>(
        `/admin/product-attributes/${type.id}/values`,
        {
          method: "POST",
          body: JSON.stringify({ value: trimmed, sort_order: type.values.length }),
        }
      )
      onValueAdded(type.id, attribute_value)
      setNewValue("")
      inputRef.current?.focus()
    } catch {
      toast.error("Failed to add value")
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (valueId: string) => {
    try {
      await adminFetch(`/admin/product-attributes/${type.id}/values/${valueId}`, {
        method: "DELETE",
      })
      onValueDeleted(type.id, valueId)
    } catch {
      toast.error("Failed to delete value")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd()
  }

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ui-border-base">
        <div>
          <Text size="small" weight="plus">{type.name}</Text>
          <Text size="xsmall" className="text-ui-fg-muted">{type.slug}</Text>
        </div>
        <Badge size="2xsmall" color="grey">{type.values.length} values</Badge>
      </div>

      <div className="px-4 py-3 space-y-1.5 max-h-52 overflow-y-auto">
        {type.values.length === 0 && (
          <Text size="xsmall" className="text-ui-fg-muted italic">No values yet</Text>
        )}
        {type.values
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((v) => (
            <div key={v.id} className="flex items-center justify-between group">
              <Text size="small">{v.value}</Text>
              <button
                onClick={() => handleDelete(v.id)}
                className="text-ui-fg-muted hover:text-ui-fg-error opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1"
                title="Delete value"
              >
                ✕
              </button>
            </div>
          ))}
      </div>

      <div className="flex gap-2 px-4 py-3 border-t border-ui-border-base">
        <Input
          ref={inputRef}
          size="small"
          placeholder="New value…"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button size="small" variant="secondary" onClick={handleAdd} isLoading={adding} disabled={!newValue.trim()}>
          Add
        </Button>
      </div>
    </Container>
  )
}

const ProductAttributesPage = () => {
  const [types, setTypes] = useState<AttributeType[]>([])
  const [loading, setLoading] = useState(true)
  const [newTypeName, setNewTypeName] = useState("")
  const [newTypeSlug, setNewTypeSlug] = useState("")
  const [creatingType, setCreatingType] = useState(false)

  useEffect(() => {
    adminFetch<{ attribute_types: AttributeType[] }>("/admin/product-attributes")
      .then(({ attribute_types }) => setTypes(attribute_types))
      .catch(() => toast.error("Failed to load attribute types"))
      .finally(() => setLoading(false))
  }, [])

  const handleValueAdded = (typeId: string, value: AttributeValue) => {
    setTypes((prev) =>
      prev.map((t) => (t.id === typeId ? { ...t, values: [...t.values, value] } : t))
    )
  }

  const handleValueDeleted = (typeId: string, valueId: string) => {
    setTypes((prev) =>
      prev.map((t) =>
        t.id === typeId ? { ...t, values: t.values.filter((v) => v.id !== valueId) } : t
      )
    )
  }

  const handleNameChange = (name: string) => {
    setNewTypeName(name)
    if (!newTypeSlug || newTypeSlug === slugify(newTypeName)) {
      setNewTypeSlug(slugify(name))
    }
  }

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  const handleCreateType = async () => {
    const name = newTypeName.trim()
    const slug = newTypeSlug.trim() || slugify(name)
    if (!name) return
    setCreatingType(true)
    try {
      const { attribute_type } = await adminFetch<{ attribute_type: AttributeType }>(
        "/admin/product-attributes",
        {
          method: "POST",
          body: JSON.stringify({ name, slug, sort_order: types.length }),
        }
      )
      setTypes((prev) => [...prev, { ...attribute_type, values: [] }])
      setNewTypeName("")
      setNewTypeSlug("")
      toast.success(`"${name}" attribute type created`)
    } catch {
      toast.error("Failed to create attribute type")
    } finally {
      setCreatingType(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl">
      <div>
        <Heading level="h1">Product Attributes</Heading>
        <Text className="text-ui-fg-muted mt-1">
          Manage filterable attribute types and their values. Changes apply globally to all products.
        </Text>
      </div>

      <Container className="p-0">
        <div className="px-6 py-4 border-b border-ui-border-base">
          <Heading level="h2">Add Attribute Type</Heading>
        </div>
        <div className="flex gap-3 px-6 py-4 items-end">
          <div className="flex-1">
            <Text size="xsmall" weight="plus" className="mb-1.5 block text-ui-fg-subtle">Name</Text>
            <Input
              placeholder="e.g. Frame Size"
              value={newTypeName}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateType()}
            />
          </div>
          <div className="flex-1">
            <Text size="xsmall" weight="plus" className="mb-1.5 block text-ui-fg-subtle">Slug</Text>
            <Input
              placeholder="e.g. frame-size"
              value={newTypeSlug}
              onChange={(e) => setNewTypeSlug(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateType()}
            />
          </div>
          <Button onClick={handleCreateType} isLoading={creatingType} disabled={!newTypeName.trim()}>
            Create
          </Button>
        </div>
      </Container>

      {loading ? (
        <Text className="text-ui-fg-muted">Loading…</Text>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((type) => (
            <AttributeTypeCard
              key={type.id}
              type={type}
              onValueAdded={handleValueAdded}
              onValueDeleted={handleValueDeleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Product Attributes",
})

export default ProductAttributesPage
