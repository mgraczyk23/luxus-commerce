import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Input, Label, Switch, Textarea, Button, Text, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { adminFetch } from "../lib/api"

type InventoryInfo = {
  id?: string
  item_cost: number | null
  is_consignment: boolean
  consignor_customer_id: string | null
  consignor_name: string | null
  consignor_contact: string | null
  consignor_cost: number | null
  suggested_sale_price: number | null
  consignment_notes: string | null
  imported_by_luxus: boolean
  importer_name: string | null
  importer_mark: string | null
  importer_mark_location: string | null
  is_master_backroom: boolean
  is_backroom: boolean
}

const empty: InventoryInfo = {
  item_cost: null,
  is_consignment: false,
  consignor_customer_id: "",
  consignor_name: "",
  consignor_contact: "",
  consignor_cost: null,
  suggested_sale_price: null,
  consignment_notes: "",
  imported_by_luxus: false,
  importer_name: "",
  importer_mark: "",
  importer_mark_location: "",
  is_master_backroom: false,
  is_backroom: false,
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Text size="small" weight="plus" className="text-ui-fg-muted mb-2 block uppercase tracking-wide">
    {children}
  </Text>
)

const ProductInventoryWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [info, setInfo] = useState<InventoryInfo>(empty)
  const [exists, setExists] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminFetch<{ inventory_info: InventoryInfo | null }>(
      `/admin/products/${data.id}/inventory-info`
    ).then(({ inventory_info }) => {
      if (inventory_info) {
        setInfo(inventory_info)
        setExists(true)
      }
    })
  }, [data.id])

  const set = (field: keyof InventoryInfo, value: any) =>
    setInfo((prev) => ({ ...prev, [field]: value }))

  const setNum = (field: keyof InventoryInfo, raw: string) =>
    set(field, raw === "" ? null : Number(raw))

  const handleSave = async () => {
    setSaving(true)
    try {
      const { inventory_info } = await adminFetch<{ inventory_info: InventoryInfo }>(
        `/admin/products/${data.id}/inventory-info`,
        { method: exists ? "PUT" : "POST", body: JSON.stringify(info) }
      )
      setInfo(inventory_info)
      setExists(true)
      toast.success("Inventory info saved")
    } catch {
      toast.error("Failed to save inventory info")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Inventory & Pricing</Heading>
        <Button size="small" onClick={handleSave} isLoading={saving}>
          Save
        </Button>
      </div>

      <div className="flex flex-col gap-4 px-6 py-4">
        <SectionLabel>Pricing</SectionLabel>
        <div>
          <Label htmlFor="inv-cost">Item Cost ($)</Label>
          <Input
            id="inv-cost"
            type="number"
            step="0.01"
            min="0"
            value={info.item_cost ?? ""}
            onChange={(e) => setNum("item_cost", e.target.value)}
            placeholder="0.00"
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 px-6 py-4">
        <SectionLabel>Consignment</SectionLabel>
        <div className="flex items-center justify-between rounded-lg border border-ui-border-base px-3 py-2">
          <Label htmlFor="inv-consignment">Is Consignment</Label>
          <Switch
            id="inv-consignment"
            checked={info.is_consignment}
            onCheckedChange={(v) => set("is_consignment", v)}
          />
        </div>

        {info.is_consignment && (
          <>
            <div>
              <Label htmlFor="inv-consignor-id">Consignor Customer ID</Label>
              <Input
                id="inv-consignor-id"
                value={info.consignor_customer_id ?? ""}
                onChange={(e) => set("consignor_customer_id", e.target.value)}
                placeholder="cus_…"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="inv-consignor-name">Consignor Name</Label>
              <Input
                id="inv-consignor-name"
                value={info.consignor_name ?? ""}
                onChange={(e) => set("consignor_name", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="inv-consignor-contact">Consignor Contact</Label>
              <Input
                id="inv-consignor-contact"
                value={info.consignor_contact ?? ""}
                onChange={(e) => set("consignor_contact", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="inv-consignor-cost">Consignor Cost ($)</Label>
              <Input
                id="inv-consignor-cost"
                type="number"
                step="0.01"
                min="0"
                value={info.consignor_cost ?? ""}
                onChange={(e) => setNum("consignor_cost", e.target.value)}
                placeholder="0.00"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="inv-suggested-price">Suggested Sale Price ($)</Label>
              <Input
                id="inv-suggested-price"
                type="number"
                step="0.01"
                min="0"
                value={info.suggested_sale_price ?? ""}
                onChange={(e) => setNum("suggested_sale_price", e.target.value)}
                placeholder="0.00"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="inv-consignment-notes">Consignment Notes</Label>
              <Textarea
                id="inv-consignment-notes"
                value={info.consignment_notes ?? ""}
                onChange={(e) => set("consignment_notes", e.target.value)}
                rows={2}
                className="mt-1.5"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-4 px-6 py-4">
        <SectionLabel>Import</SectionLabel>
        <div className="flex items-center justify-between rounded-lg border border-ui-border-base px-3 py-2">
          <Label htmlFor="inv-imported">Imported by Luxus</Label>
          <Switch
            id="inv-imported"
            checked={info.imported_by_luxus}
            onCheckedChange={(v) => set("imported_by_luxus", v)}
          />
        </div>
        <div>
          <Label htmlFor="inv-importer-name">Importer Name</Label>
          <Input
            id="inv-importer-name"
            value={info.importer_name ?? ""}
            onChange={(e) => set("importer_name", e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="inv-importer-mark">Importer Mark</Label>
          <Input
            id="inv-importer-mark"
            value={info.importer_mark ?? ""}
            onChange={(e) => set("importer_mark", e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="inv-importer-mark-loc">Importer Mark Location</Label>
          <Input
            id="inv-importer-mark-loc"
            value={info.importer_mark_location ?? ""}
            onChange={(e) => set("importer_mark_location", e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 px-6 py-4">
        <SectionLabel>Backroom / VIP</SectionLabel>
        <div className="flex items-center justify-between rounded-lg border border-ui-border-base px-3 py-2">
          <div>
            <Label htmlFor="inv-master-backroom">Master Backroom</Label>
            <Text size="xsmall" className="text-ui-fg-muted">
              Hidden from main store, not shown in VIP
            </Text>
          </div>
          <Switch
            id="inv-master-backroom"
            checked={info.is_master_backroom}
            onCheckedChange={(v) => set("is_master_backroom", v)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-ui-border-base px-3 py-2">
          <div>
            <Label htmlFor="inv-backroom">Backroom / VIP</Label>
            <Text size="xsmall" className="text-ui-fg-muted">
              Actively displayed in the VIP area
            </Text>
          </div>
          <Switch
            id="inv-backroom"
            checked={info.is_backroom}
            onCheckedChange={(v) => set("is_backroom", v)}
          />
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductInventoryWidget
