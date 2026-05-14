import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container, Heading, Text, Input, Label, Textarea,
  Switch, Button, Select, Checkbox, Badge, toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { adminFetch } from "../../../lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────

type AttributeValue = { id: string; value: string; sort_order: number; attribute_type_id: string }
type AttributeType  = { id: string; name: string; sort_order: number; values: AttributeValue[] }

// ── Helpers ────────────────────────────────────────────────────────────────────

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

const Field = ({
  label, htmlFor, children,
}: { label: string; htmlFor: string; children: React.ReactNode }) => (
  <div>
    <Label htmlFor={htmlFor}>{label}</Label>
    <div className="mt-1.5">{children}</div>
  </div>
)

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="flex items-center justify-between px-6 py-4">
    <div>
      <Heading level="h2">{title}</Heading>
      {subtitle && <Text size="small" className="text-ui-fg-muted mt-0.5">{subtitle}</Text>}
    </div>
  </div>
)

const ToggleRow = ({
  id, label, subtitle, checked, onChange,
}: { id: string; label: string; subtitle?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between rounded-lg border border-ui-border-base px-3 py-2">
    <div>
      <Label htmlFor={id}>{label}</Label>
      {subtitle && <Text size="xsmall" className="text-ui-fg-muted">{subtitle}</Text>}
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onChange} />
  </div>
)

// ── Page ───────────────────────────────────────────────────────────────────────

const ProductCreatePage = () => {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  // Basic
  const [title, setTitle]       = useState("")
  const [handle, setHandle]     = useState("")
  const [handleEdited, setHandleEdited] = useState(false)
  const [status, setStatus]     = useState<"draft" | "published">("draft")
  const [description, setDescription] = useState("")
  const [sku, setSku]           = useState("")
  const [price, setPrice]       = useState("")

  // Details
  const [shortDesc, setShortDesc]           = useState("")
  const [serialNumber, setSerialNumber]     = useState("")
  const [opticsReady, setOpticsReady]       = useState(false)
  const [featuredImage, setFeaturedImage]   = useState("")
  const [seoTitle, setSeoTitle]             = useState("")
  const [seoDesc, setSeoDesc]               = useState("")

  // Specs
  const [overallLength, setOverallLength]   = useState("")
  const [weight, setWeight]                 = useState("")
  const [frameMaterial, setFrameMaterial]   = useState("")
  const [gripMaterial, setGripMaterial]     = useState("")
  const [sightType, setSightType]           = useState("")
  const [finishType, setFinishType]         = useState("")

  // Inventory
  const [itemCost, setItemCost]                       = useState("")
  const [isConsignment, setIsConsignment]             = useState(false)
  const [consignorCustomerId, setConsignorCustomerId] = useState("")
  const [consignorName, setConsignorName]             = useState("")
  const [consignorContact, setConsignorContact]       = useState("")
  const [consignorCost, setConsignorCost]             = useState("")
  const [suggestedPrice, setSuggestedPrice]           = useState("")
  const [consignmentNotes, setConsignmentNotes]       = useState("")
  const [importedByLuxus, setImportedByLuxus]         = useState(false)
  const [importerName, setImporterName]               = useState("")
  const [importerMark, setImporterMark]               = useState("")
  const [importerMarkLocation, setImporterMarkLocation] = useState("")
  const [isMasterBackroom, setIsMasterBackroom]       = useState(false)
  const [isBackroom, setIsBackroom]                   = useState(false)

  // Attributes
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([])
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set())

  useEffect(() => {
    adminFetch<{ attribute_types: AttributeType[] }>("/admin/product-attributes")
      .then(({ attribute_types }) => setAttributeTypes(attribute_types))
      .catch(() => {})
  }, [])

  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!handleEdited) setHandle(slugify(val))
  }

  const toggleValue = (id: string) =>
    setSelectedValues((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const numOrNull = (s: string) => (s === "" ? null : Number(s))

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Product title is required")
      return
    }

    setSaving(true)
    try {
      // 1. Create the Medusa product
      const productPayload: any = {
        title: title.trim(),
        handle: handle.trim() || slugify(title),
        status,
        description: description.trim() || undefined,
        options: [{ title: "Title", values: ["Default"] }],
        variants: [{
          title: "Default",
          sku: sku.trim() || undefined,
          options: { Title: "Default" },
          prices: price !== ""
            ? [{ currency_code: "usd", amount: Math.round(Number(price) * 100) }]
            : [],
        }],
      }

      const { product } = await adminFetch<{ product: { id: string } }>(
        "/admin/products",
        { method: "POST", body: JSON.stringify(productPayload) }
      )
      const productId = product.id

      // 2. Create custom records in parallel
      const customCalls: Promise<any>[] = [
        adminFetch(`/admin/products/${productId}/details`, {
          method: "POST",
          body: JSON.stringify({
            short_description: shortDesc || null,
            serial_number: serialNumber || null,
            optics_ready: opticsReady,
            featured_image_url: featuredImage || null,
            seo_meta_title: seoTitle || null,
            seo_meta_description: seoDesc || null,
          }),
        }),
        adminFetch(`/admin/products/${productId}/specs`, {
          method: "POST",
          body: JSON.stringify({
            overall_length: overallLength || null,
            weight: weight || null,
            frame_material: frameMaterial || null,
            grip_material: gripMaterial || null,
            sight_type: sightType || null,
            finish_type: finishType || null,
          }),
        }),
        adminFetch(`/admin/products/${productId}/inventory-info`, {
          method: "POST",
          body: JSON.stringify({
            item_cost: numOrNull(itemCost),
            is_consignment: isConsignment,
            consignor_customer_id: consignorCustomerId || null,
            consignor_name: consignorName || null,
            consignor_contact: consignorContact || null,
            consignor_cost: numOrNull(consignorCost),
            suggested_sale_price: numOrNull(suggestedPrice),
            consignment_notes: consignmentNotes || null,
            imported_by_luxus: importedByLuxus,
            importer_name: importerName || null,
            importer_mark: importerMark || null,
            importer_mark_location: importerMarkLocation || null,
            is_master_backroom: isMasterBackroom,
            is_backroom: isBackroom,
          }),
        }),
      ]

      await Promise.all(customCalls)

      // 3. Link attribute values if any selected
      if (selectedValues.size > 0) {
        await adminFetch(`/admin/products/${productId}/attributes`, {
          method: "POST",
          body: JSON.stringify({ value_ids: [...selectedValues] }),
        })
      }

      toast.success("Product created")
      navigate(`/products/${productId}`)
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create product")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">Create Product</Heading>
          <Text className="text-ui-fg-muted mt-1">Fill in the details below, then save.</Text>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate("/products")}>Cancel</Button>
          <Button onClick={handleCreate} isLoading={saving}>Create Product</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Basic Info */}
          <Container className="divide-y p-0">
            <SectionHeader title="Basic Info" />
            <div className="flex flex-col gap-4 px-6 py-4">
              <Field label="Title *" htmlFor="c-title">
                <Input
                  id="c-title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Nighthawk Custom Agent"
                />
              </Field>
              <Field label="Handle" htmlFor="c-handle">
                <Input
                  id="c-handle"
                  value={handle}
                  onChange={(e) => { setHandle(e.target.value); setHandleEdited(true) }}
                  placeholder="auto-generated from title"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="SKU" htmlFor="c-sku">
                  <Input
                    id="c-sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. NHC-AGENT-01"
                  />
                </Field>
                <Field label="Price (USD)" htmlFor="c-price">
                  <Input
                    id="c-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </Field>
              </div>
              <Field label="Status" htmlFor="c-status">
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <Select.Trigger id="c-status">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="draft">Draft</Select.Item>
                    <Select.Item value="published">Published</Select.Item>
                  </Select.Content>
                </Select>
              </Field>
              <Field label="Description" htmlFor="c-desc">
                <Textarea
                  id="c-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Product description…"
                />
              </Field>
            </div>
          </Container>

          {/* Product Details */}
          <Container className="divide-y p-0">
            <SectionHeader title="Product Details" subtitle="Storefront-visible extras" />
            <div className="flex flex-col gap-4 px-6 py-4">
              <Field label="Short Description" htmlFor="c-short-desc">
                <Textarea
                  id="c-short-desc"
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  rows={2}
                />
              </Field>
              <Field label="Serial Number" htmlFor="c-serial">
                <Input id="c-serial" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
              </Field>
              <ToggleRow
                id="c-optics"
                label="Optics Ready"
                checked={opticsReady}
                onChange={setOpticsReady}
              />
              <Field label="Featured Image URL" htmlFor="c-img">
                <Input
                  id="c-img"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="https://…"
                />
              </Field>
              <Field label="SEO Meta Title" htmlFor="c-seo-title">
                <Input id="c-seo-title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
              </Field>
              <Field label="SEO Meta Description" htmlFor="c-seo-desc">
                <Textarea
                  id="c-seo-desc"
                  value={seoDesc}
                  onChange={(e) => setSeoDesc(e.target.value)}
                  rows={2}
                />
              </Field>
            </div>
          </Container>

          {/* Specs */}
          <Container className="divide-y p-0">
            <SectionHeader title="Product Specs" subtitle="Technical specifications" />
            <div className="grid grid-cols-2 gap-4 px-6 py-4">
              {([
                ["c-length",  "Overall Length",  overallLength,  setOverallLength,  'e.g. 8.75"'],
                ["c-weight",  "Weight",          weight,         setWeight,         "e.g. 38 oz"],
                ["c-frame",   "Frame Material",  frameMaterial,  setFrameMaterial,  "e.g. Steel"],
                ["c-grip",    "Grip Material",   gripMaterial,   setGripMaterial,   "e.g. G10"],
                ["c-sight",   "Sight Type",      sightType,      setSightType,      "e.g. Heinie Straight Eight"],
                ["c-finish",  "Finish Type",     finishType,     setFinishType,     "e.g. Perma Kote"],
              ] as [string, string, string, (v: string) => void, string][]).map(([id, label, val, setter, ph]) => (
                <Field key={id} label={label} htmlFor={id}>
                  <Input id={id} value={val} onChange={(e) => setter(e.target.value)} placeholder={ph} />
                </Field>
              ))}
            </div>
          </Container>

          {/* Attributes */}
          <Container className="divide-y p-0">
            <SectionHeader title="Product Attributes" subtitle="Filterable attributes" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 px-6 py-4 lg:grid-cols-3">
              {attributeTypes.map((type) => (
                <div key={type.id}>
                  <Text size="small" weight="plus" className="mb-2 block">{type.name}</Text>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {type.values.sort((a, b) => a.sort_order - b.sort_order).map((v) => (
                      <div key={v.id} className="flex items-center gap-x-2">
                        <Checkbox
                          id={`cv-${v.id}`}
                          checked={selectedValues.has(v.id)}
                          onCheckedChange={() => toggleValue(v.id)}
                        />
                        <label htmlFor={`cv-${v.id}`} className="text-sm cursor-pointer select-none">
                          {v.value}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </div>

        {/* ── Right sidebar ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Inventory & Pricing */}
          <Container className="divide-y p-0">
            <SectionHeader title="Inventory & Pricing" subtitle="Admin only" />

            <div className="flex flex-col gap-4 px-4 py-4">
              <Text size="xsmall" weight="plus" className="text-ui-fg-muted uppercase tracking-wide">Pricing</Text>
              <Field label="Item Cost ($)" htmlFor="c-item-cost">
                <Input
                  id="c-item-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemCost}
                  onChange={(e) => setItemCost(e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            </div>

            <div className="flex flex-col gap-4 px-4 py-4">
              <Text size="xsmall" weight="plus" className="text-ui-fg-muted uppercase tracking-wide">Consignment</Text>
              <ToggleRow id="c-consignment" label="Is Consignment" checked={isConsignment} onChange={setIsConsignment} />
              {isConsignment && (
                <>
                  <Field label="Consignor Customer ID" htmlFor="c-cons-cust-id">
                    <Input id="c-cons-cust-id" value={consignorCustomerId} onChange={(e) => setConsignorCustomerId(e.target.value)} placeholder="cus_…" />
                  </Field>
                  <Field label="Consignor Name" htmlFor="c-cons-name">
                    <Input id="c-cons-name" value={consignorName} onChange={(e) => setConsignorName(e.target.value)} />
                  </Field>
                  <Field label="Consignor Contact" htmlFor="c-cons-contact">
                    <Input id="c-cons-contact" value={consignorContact} onChange={(e) => setConsignorContact(e.target.value)} />
                  </Field>
                  <Field label="Consignor Cost ($)" htmlFor="c-cons-cost">
                    <Input id="c-cons-cost" type="number" step="0.01" min="0" value={consignorCost} onChange={(e) => setConsignorCost(e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Suggested Sale Price ($)" htmlFor="c-suggested">
                    <Input id="c-suggested" type="number" step="0.01" min="0" value={suggestedPrice} onChange={(e) => setSuggestedPrice(e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Consignment Notes" htmlFor="c-cons-notes">
                    <Textarea id="c-cons-notes" value={consignmentNotes} onChange={(e) => setConsignmentNotes(e.target.value)} rows={2} />
                  </Field>
                </>
              )}
            </div>

            <div className="flex flex-col gap-4 px-4 py-4">
              <Text size="xsmall" weight="plus" className="text-ui-fg-muted uppercase tracking-wide">Import</Text>
              <ToggleRow id="c-imported" label="Imported by Luxus" checked={importedByLuxus} onChange={setImportedByLuxus} />
              <Field label="Importer Name" htmlFor="c-imp-name">
                <Input id="c-imp-name" value={importerName} onChange={(e) => setImporterName(e.target.value)} />
              </Field>
              <Field label="Importer Mark" htmlFor="c-imp-mark">
                <Input id="c-imp-mark" value={importerMark} onChange={(e) => setImporterMark(e.target.value)} />
              </Field>
              <Field label="Importer Mark Location" htmlFor="c-imp-mark-loc">
                <Input id="c-imp-mark-loc" value={importerMarkLocation} onChange={(e) => setImporterMarkLocation(e.target.value)} />
              </Field>
            </div>

            <div className="flex flex-col gap-4 px-4 py-4">
              <Text size="xsmall" weight="plus" className="text-ui-fg-muted uppercase tracking-wide">Backroom / VPI</Text>
              <ToggleRow
                id="c-master-backroom"
                label="Master Backroom"
                subtitle="Hidden from main store, not shown in VPI"
                checked={isMasterBackroom}
                onChange={setIsMasterBackroom}
              />
              <ToggleRow
                id="c-backroom"
                label="Backroom / VPI"
                subtitle="Actively displayed in the VPI area"
                checked={isBackroom}
                onChange={setIsBackroom}
              />
            </div>
          </Container>

          {/* Summary badge */}
          {selectedValues.size > 0 && (
            <div className="flex items-center gap-2 px-1">
              <Badge color="blue" size="2xsmall">{selectedValues.size}</Badge>
              <Text size="xsmall" className="text-ui-fg-muted">attribute values selected</Text>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="flex justify-end gap-3 pt-2 border-t border-ui-border-base">
        <Button variant="secondary" onClick={() => navigate("/products")}>Cancel</Button>
        <Button onClick={handleCreate} isLoading={saving}>Create Product</Button>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Create Product",
})

export default ProductCreatePage
