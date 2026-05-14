import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Input, Label, Switch, Textarea, Button, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { adminFetch } from "../lib/api"

type ProductDetail = {
  id?: string
  short_description: string | null
  serial_number: string | null
  optics_ready: boolean
  seo_meta_title: string | null
  seo_meta_description: string | null
  featured_image_url: string | null
}

const empty: ProductDetail = {
  short_description: "",
  serial_number: "",
  optics_ready: false,
  seo_meta_title: "",
  seo_meta_description: "",
  featured_image_url: "",
}

const ProductDetailsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [detail, setDetail] = useState<ProductDetail>(empty)
  const [exists, setExists] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminFetch<{ product_detail: ProductDetail | null }>(
      `/admin/products/${data.id}/details`
    ).then(({ product_detail }) => {
      if (product_detail) {
        setDetail(product_detail)
        setExists(true)
      }
    })
  }, [data.id])

  const set = (field: keyof ProductDetail, value: any) =>
    setDetail((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const { product_detail } = await adminFetch<{ product_detail: ProductDetail }>(
        `/admin/products/${data.id}/details`,
        { method: exists ? "PUT" : "POST", body: JSON.stringify(detail) }
      )
      setDetail(product_detail)
      setExists(true)
      toast.success("Product details saved")
    } catch {
      toast.error("Failed to save product details")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Product Details</Heading>
        <Button size="small" onClick={handleSave} isLoading={saving}>
          Save
        </Button>
      </div>
      <div className="flex flex-col gap-4 px-6 py-4">
        <div>
          <Label htmlFor="pd-short_desc">Short Description</Label>
          <Textarea
            id="pd-short_desc"
            value={detail.short_description ?? ""}
            onChange={(e) => set("short_description", e.target.value)}
            rows={3}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="pd-serial">Serial Number</Label>
          <Input
            id="pd-serial"
            value={detail.serial_number ?? ""}
            onChange={(e) => set("serial_number", e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-ui-border-base px-3 py-2">
          <Label htmlFor="pd-optics">Optics Ready</Label>
          <Switch
            id="pd-optics"
            checked={detail.optics_ready}
            onCheckedChange={(v) => set("optics_ready", v)}
          />
        </div>
        <div>
          <Label htmlFor="pd-img">Featured Image URL</Label>
          <Input
            id="pd-img"
            value={detail.featured_image_url ?? ""}
            onChange={(e) => set("featured_image_url", e.target.value)}
            className="mt-1.5"
            placeholder="https://…"
          />
        </div>
        <div>
          <Label htmlFor="pd-seo-title">SEO Meta Title</Label>
          <Input
            id="pd-seo-title"
            value={detail.seo_meta_title ?? ""}
            onChange={(e) => set("seo_meta_title", e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="pd-seo-desc">SEO Meta Description</Label>
          <Textarea
            id="pd-seo-desc"
            value={detail.seo_meta_description ?? ""}
            onChange={(e) => set("seo_meta_description", e.target.value)}
            rows={2}
            className="mt-1.5"
          />
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductDetailsWidget
