import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Text, Button, Input, Label, Select, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { adminFetch } from "../lib/api"

type AuctionListing = {
  id: string
  status: string
  starting_bid: number
  reserve_price: number | null
  bid_increment: number
  starts_at: string | null
  ends_at: string | null
  notes: string | null
}

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "active", label: "Active" },
  { value: "ended", label: "Ended" },
  { value: "cancelled", label: "Cancelled" },
]

const STATUS_COLORS: Record<string, string> = {
  draft: "text-ui-fg-muted",
  scheduled: "text-ui-tag-blue-text",
  active: "text-ui-tag-green-text",
  ended: "text-ui-fg-muted",
  cancelled: "text-ui-tag-red-text",
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <Label className="text-ui-fg-subtle">{label}</Label>
    {children}
  </div>
)

const toDatetimeLocal = (iso: string | null) =>
  iso ? iso.slice(0, 16) : ""

const fromDatetimeLocal = (val: string) =>
  val ? new Date(val).toISOString() : null

const ProductAuctionWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [listing, setListing] = useState<AuctionListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    status: "draft",
    starting_bid: "",
    reserve_price: "",
    bid_increment: "50",
    starts_at: "",
    ends_at: "",
    notes: "",
  })

  useEffect(() => {
    adminFetch<{ auction_listing: AuctionListing | null }>(`/admin/products/${data.id}/auction`)
      .then(({ auction_listing }) => {
        if (auction_listing) {
          setListing(auction_listing)
          setForm({
            status: auction_listing.status,
            starting_bid: String(auction_listing.starting_bid ?? ""),
            reserve_price: auction_listing.reserve_price != null ? String(auction_listing.reserve_price) : "",
            bid_increment: String(auction_listing.bid_increment ?? 50),
            starts_at: toDatetimeLocal(auction_listing.starts_at),
            ends_at: toDatetimeLocal(auction_listing.ends_at),
            notes: auction_listing.notes ?? "",
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [data.id])

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const buildPayload = () => ({
    status: form.status,
    starting_bid: Number(form.starting_bid),
    reserve_price: form.reserve_price !== "" ? Number(form.reserve_price) : null,
    bid_increment: Number(form.bid_increment) || 50,
    starts_at: fromDatetimeLocal(form.starts_at),
    ends_at: fromDatetimeLocal(form.ends_at),
    notes: form.notes || null,
  })

  const handleEnable = async () => {
    if (!form.starting_bid || isNaN(Number(form.starting_bid))) {
      toast.error("Starting bid is required")
      return
    }
    setSaving(true)
    try {
      const { auction_listing } = await adminFetch<{ auction_listing: AuctionListing }>(
        `/admin/products/${data.id}/auction`,
        { method: "POST", body: JSON.stringify(buildPayload()) }
      )
      setListing(auction_listing)
      toast.success("Auction listing created")
    } catch {
      toast.error("Failed to create auction listing")
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { auction_listing } = await adminFetch<{ auction_listing: AuctionListing }>(
        `/admin/products/${data.id}/auction`,
        { method: "PUT", body: JSON.stringify(buildPayload()) }
      )
      setListing(auction_listing)
      toast.success("Auction listing saved")
    } catch {
      toast.error("Failed to save auction listing")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Auction</Heading>
          {listing && (
            <Text size="xsmall" className={STATUS_COLORS[listing.status] ?? "text-ui-fg-muted"}>
              {STATUSES.find((s) => s.value === listing.status)?.label ?? listing.status}
            </Text>
          )}
        </div>
        {listing ? (
          <Button size="small" onClick={handleSave} isLoading={saving}>
            Save
          </Button>
        ) : (
          <Button size="small" variant="secondary" onClick={handleEnable} isLoading={saving} disabled={loading}>
            Enable Auction
          </Button>
        )}
      </div>

      {loading ? (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-muted">Loading…</Text>
        </div>
      ) : !listing ? (
        <div className="px-6 py-4 flex flex-col gap-4">
          <Text size="small" className="text-ui-fg-muted">
            This product is not configured as an auction. Fill in the details below and click
            "Enable Auction" to set it up. The product will remain in Draft status until you
            are ready to schedule or activate it.
          </Text>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Starting Bid (USD)">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.starting_bid}
                onChange={(e) => set("starting_bid", e.target.value)}
              />
            </Field>
            <Field label="Bid Increment (USD)">
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="50"
                value={form.bid_increment}
                onChange={(e) => set("bid_increment", e.target.value)}
              />
            </Field>
            <Field label="Reserve Price (USD, optional)">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="No reserve"
                value={form.reserve_price}
                onChange={(e) => set("reserve_price", e.target.value)}
              />
            </Field>
          </div>
        </div>
      ) : (
        <div className="px-6 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {STATUSES.map((s) => (
                    <Select.Item key={s.value} value={s.value}>
                      {s.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </Field>
            <Field label="Starting Bid (USD)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.starting_bid}
                onChange={(e) => set("starting_bid", e.target.value)}
              />
            </Field>
            <Field label="Bid Increment (USD)">
              <Input
                type="number"
                min="1"
                step="1"
                value={form.bid_increment}
                onChange={(e) => set("bid_increment", e.target.value)}
              />
            </Field>
            <Field label="Reserve Price (USD, optional)">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="No reserve"
                value={form.reserve_price}
                onChange={(e) => set("reserve_price", e.target.value)}
              />
            </Field>
            <Field label="Starts At">
              <Input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => set("starts_at", e.target.value)}
              />
            </Field>
            <Field label="Ends At">
              <Input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => set("ends_at", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Internal Notes">
            <textarea
              rows={2}
              className="w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm text-ui-fg-base placeholder-ui-fg-muted focus:outline-none focus:ring-1 focus:ring-ui-border-interactive resize-none"
              placeholder="Internal notes about this auction…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductAuctionWidget
