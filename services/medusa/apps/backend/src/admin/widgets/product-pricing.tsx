import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Input, Label, Button, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { adminFetch } from "../lib/api"

type VariantRow = {
  variantId: string
  variantTitle: string
  priceId: string | null
  dollars: string
}

const ProductPricingWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [rows, setRows] = useState<VariantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminFetch<{ product: any }>(
      `/admin/products/${data.id}?fields=*variants,*variants.prices`
    )
      .then(({ product }) => {
        const next: VariantRow[] = (product.variants ?? []).map((v: any) => {
          const usd = (v.prices ?? []).find((p: any) => p.currency_code === "usd")
          return {
            variantId: v.id,
            variantTitle: v.title ?? "Default",
            priceId: usd?.id ?? null,
            dollars: usd ? String(usd.amount / 100) : "",
          }
        })
        setRows(next)
      })
      .catch(() => toast.error("Failed to load prices"))
      .finally(() => setLoading(false))
  }, [data.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const row of rows) {
        const parsed = parseFloat(row.dollars)
        if (row.dollars === "" || isNaN(parsed) || parsed < 0) continue
        const cents = Math.round(parsed * 100)
        const priceEntry: any = { currency_code: "usd", amount: cents }
        if (row.priceId) priceEntry.id = row.priceId
        await adminFetch(`/admin/products/${data.id}/variants/${row.variantId}`, {
          method: "POST",
          body: JSON.stringify({ prices: [priceEntry] }),
        })
      }
      toast.success("Price saved")
    } catch {
      toast.error("Failed to save price")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Price</Heading>
          <p className="text-xs text-ui-fg-muted mt-0.5">Enter in USD dollars — $1,850 = type 1850</p>
        </div>
        <Button size="small" onClick={handleSave} isLoading={saving}>
          Save
        </Button>
      </div>

      {loading ? (
        <div className="px-6 py-4 text-sm text-ui-fg-muted">Loading…</div>
      ) : (
        <div className="flex flex-col gap-4 px-6 py-4">
          {rows.map((row, i) => (
            <div key={row.variantId}>
              {rows.length > 1 && (
                <Label className="mb-1.5 block">{row.variantTitle}</Label>
              )}
              <div className="flex items-stretch">
                <span className="flex items-center px-3 border border-r-0 border-ui-border-base bg-ui-bg-subtle rounded-l text-sm text-ui-fg-muted select-none">
                  $
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 1850"
                  value={row.dollars}
                  onChange={(e) => {
                    const next = [...rows]
                    next[i] = { ...next[i], dollars: e.target.value }
                    setRows(next)
                  }}
                  className="rounded-l-none"
                />
              </div>
              {row.dollars !== "" && !isNaN(parseFloat(row.dollars)) && (
                <p className="text-xs text-ui-fg-muted mt-1">
                  Storefront shows:{" "}
                  <span className="font-medium text-ui-fg-base">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(parseFloat(row.dollars))}
                  </span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductPricingWidget
