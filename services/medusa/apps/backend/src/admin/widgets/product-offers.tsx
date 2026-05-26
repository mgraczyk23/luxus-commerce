import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Text, Button, Input, Textarea, Label, Badge, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { adminFetch } from "../lib/api"

/* ── Types ──────────────────────────────────────────────────────────────── */

type OfferStatus = "pending" | "accepted" | "rejected" | "countered" | "expired"

type Offer = {
  id:             string
  product_id:     string
  product_title:  string
  first_name:     string
  last_name:      string | null
  email:          string
  phone:          string | null
  offer_amount:   number
  counter_amount: number | null
  status:         OfferStatus
  message:        string | null
  admin_notes:    string | null
  expires_at:     string | null
  created_at:     string
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso))

function statusBadge(status: OfferStatus) {
  const map: Record<OfferStatus, { color: React.ComponentProps<typeof Badge>["color"]; label: string }> = {
    pending:   { color: "orange", label: "Pending"   },
    accepted:  { color: "green",  label: "Accepted"  },
    rejected:  { color: "red",    label: "Rejected"  },
    countered: { color: "blue",   label: "Countered" },
    expired:   { color: "grey",   label: "Expired"   },
  }
  const { color, label } = map[status] ?? { color: "grey", label: status }
  return <Badge color={color}>{label}</Badge>
}

const FILTER_TABS: { label: string; value: OfferStatus | "all" }[] = [
  { label: "All",       value: "all"       },
  { label: "Pending",   value: "pending"   },
  { label: "Countered", value: "countered" },
  { label: "Accepted",  value: "accepted"  },
  { label: "Rejected",  value: "rejected"  },
  { label: "Expired",   value: "expired"   },
]

/* ── OfferRow ────────────────────────────────────────────────────────────── */

function OfferRow({
  offer,
  listedPrice,
  onUpdated,
}: {
  offer:       Offer
  listedPrice: number | null
  onUpdated:   (updated: Offer) => void
}) {
  const [counterOpen, setCounterOpen]   = useState(false)
  const [counterAmt,  setCounterAmt]    = useState(offer.counter_amount ? String(offer.counter_amount) : "")
  const [notes,       setNotes]         = useState(offer.admin_notes ?? "")
  const [saving,      setSaving]        = useState(false)

  const buyerName = [offer.first_name, offer.last_name].filter(Boolean).join(" ")
  const pct = listedPrice && offer.offer_amount
    ? Math.round((offer.offer_amount / listedPrice) * 100)
    : null

  const action = async (
    status: OfferStatus,
    extra: { counter_amount?: number; admin_notes?: string } = {}
  ) => {
    setSaving(true)
    try {
      const body: Record<string, any> = { status, admin_notes: notes || undefined, ...extra }
      const { offer: updated } = await adminFetch<{ offer: Offer }>(
        `/admin/offers/${offer.id}`,
        { method: "PATCH", body: JSON.stringify(body) }
      )
      onUpdated(updated)
      setCounterOpen(false)
      toast.success(
        status === "accepted"  ? "Offer accepted"      :
        status === "rejected"  ? "Offer rejected"      :
        status === "countered" ? "Counter offer sent"  : "Offer updated"
      )
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update offer")
    } finally {
      setSaving(false)
    }
  }

  const handleCounter = () => {
    const amt = parseFloat(counterAmt)
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid counter amount")
      return
    }
    action("countered", { counter_amount: amt })
  }

  const isPending   = offer.status === "pending"
  const isCountered = offer.status === "countered"
  const isActive    = isPending || isCountered

  return (
    <div className="border border-ui-border-base rounded-lg p-4 flex flex-col gap-3">

      {/* Top row: buyer + status + date */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Text weight="plus" className="truncate">{buyerName}</Text>
            {statusBadge(offer.status)}
          </div>
          <Text size="small" className="text-ui-fg-muted">{offer.email}</Text>
          {offer.phone && <Text size="small" className="text-ui-fg-subtle">{offer.phone}</Text>}
        </div>
        <Text size="small" className="text-ui-fg-muted whitespace-nowrap flex-shrink-0">
          {fmtDate(offer.created_at)}
        </Text>
      </div>

      {/* Amount row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <Text size="xsmall" className="text-ui-fg-muted uppercase tracking-wider mb-0.5">Offer</Text>
          <Text weight="plus" className="text-xl">{fmt(offer.offer_amount)}</Text>
          {pct !== null && (
            <Text size="xsmall" className={
              pct >= 90 ? "text-ui-tag-green-text" :
              pct >= 75 ? "text-ui-fg-muted" : "text-ui-tag-orange-text"
            }>
              {pct}% of list
            </Text>
          )}
        </div>
        {offer.counter_amount != null && (
          <div>
            <Text size="xsmall" className="text-ui-fg-muted uppercase tracking-wider mb-0.5">Counter</Text>
            <Text weight="plus" className="text-xl">{fmt(offer.counter_amount)}</Text>
          </div>
        )}
        {offer.expires_at && isActive && (
          <div className="ml-auto text-right">
            <Text size="xsmall" className="text-ui-fg-muted uppercase tracking-wider mb-0.5">Expires</Text>
            <Text size="small">{fmtDate(offer.expires_at)}</Text>
          </div>
        )}
      </div>

      {/* Buyer message */}
      {offer.message && (
        <div className="bg-ui-bg-subtle rounded p-3">
          <Text size="xsmall" className="text-ui-fg-muted uppercase tracking-wider mb-1">Buyer Message</Text>
          <Text size="small" className="whitespace-pre-wrap">{offer.message}</Text>
        </div>
      )}

      {/* Admin notes (always editable if active) */}
      {isActive && (
        <div>
          <Label className="text-xs text-ui-fg-muted uppercase tracking-wider mb-1 block">
            Internal Notes
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes visible only to admins…"
            rows={2}
          />
        </div>
      )}
      {!isActive && offer.admin_notes && (
        <div className="bg-ui-bg-subtle rounded p-3">
          <Text size="xsmall" className="text-ui-fg-muted uppercase tracking-wider mb-1">Internal Notes</Text>
          <Text size="small">{offer.admin_notes}</Text>
        </div>
      )}

      {/* Action buttons */}
      {isActive && (
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-ui-border-base">
          <Button
            size="small"
            variant="primary"
            onClick={() => action("accepted")}
            isLoading={saving && !counterOpen}
            disabled={saving}
          >
            Accept
          </Button>
          <Button
            size="small"
            variant="secondary"
            onClick={() => setCounterOpen((o) => !o)}
            disabled={saving}
          >
            {counterOpen ? "Cancel Counter" : "Counter"}
          </Button>
          <Button
            size="small"
            variant="danger"
            onClick={() => action("rejected")}
            isLoading={saving && !counterOpen}
            disabled={saving}
          >
            Reject
          </Button>
        </div>
      )}

      {/* Counter form */}
      {counterOpen && (
        <div className="flex items-end gap-2 flex-wrap bg-ui-bg-subtle rounded p-3">
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs text-ui-fg-muted uppercase tracking-wider mb-1 block">
              Counter Amount (USD)
            </Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={counterAmt}
              onChange={(e) => setCounterAmt(e.target.value)}
              placeholder="e.g. 4500"
            />
          </div>
          <Button
            size="small"
            variant="primary"
            onClick={handleCounter}
            isLoading={saving}
            disabled={saving || !counterAmt}
          >
            Send Counter
          </Button>
        </div>
      )}
    </div>
  )
}

/* ── Main Widget ─────────────────────────────────────────────────────────── */

const ProductOffersWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [offers,     setOffers]     = useState<Offer[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [activeTab,  setActiveTab]  = useState<OfferStatus | "all">("all")

  // Grab list price from the first variant, if available
  const listedPrice: number | null = (() => {
    const v = (data as any).variants?.[0]
    const p = v?.prices?.[0]
    return p ? p.amount / 100 : null
  })()

  const load = () => {
    setLoading(true)
    setError(null)
    adminFetch<{ offers: Offer[]; count: number }>(
      `/admin/offers?product_id=${data.id}&limit=100`
    ).then(({ offers }) => {
      setOffers(offers)
      setLoading(false)
    }).catch((err) => {
      setError(err.message ?? "Failed to load offers")
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [data.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdated = (updated: Offer) => {
    setOffers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
  }

  const filtered = activeTab === "all"
    ? offers
    : offers.filter((o) => o.status === activeTab)

  const countByStatus = (s: OfferStatus | "all") =>
    s === "all" ? offers.length : offers.filter((o) => o.status === s).length

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Heading level="h2">Offers</Heading>
          {offers.length > 0 && (
            <Badge color={offers.some((o) => o.status === "pending") ? "orange" : "grey"}>
              {offers.filter((o) => o.status === "pending").length} pending
            </Badge>
          )}
        </div>
        <Button size="small" variant="secondary" onClick={load} isLoading={loading}>
          Refresh
        </Button>
      </div>

      {/* Tab bar */}
      {offers.length > 0 && (
        <div className="flex items-center gap-1 px-6 py-2 overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const count = countByStatus(tab.value)
            if (count === 0 && tab.value !== "all") return null
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.value
                    ? "bg-ui-bg-interactive text-ui-fg-on-color"
                    : "text-ui-fg-muted hover:bg-ui-bg-hover"
                }`}
              >
                {tab.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-4">
        {loading ? (
          <Text className="text-ui-fg-muted">Loading offers…</Text>
        ) : error ? (
          <Text className="text-ui-fg-error">{error}</Text>
        ) : offers.length === 0 ? (
          <Text className="text-ui-fg-muted">No offers submitted for this product yet.</Text>
        ) : filtered.length === 0 ? (
          <Text className="text-ui-fg-muted">No {activeTab} offers.</Text>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((offer) => (
              <OfferRow
                key={offer.id}
                offer={offer}
                listedPrice={listedPrice}
                onUpdated={handleUpdated}
              />
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductOffersWidget
