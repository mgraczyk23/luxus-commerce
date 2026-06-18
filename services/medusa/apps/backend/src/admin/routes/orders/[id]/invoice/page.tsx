import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import Invoice, { InvoiceOrder, BankingInfo } from "../../../../components/Invoice"
import { adminFetch } from "../../../../lib/api"

const PAYLOAD_URL = "https://api.luxus-collection.com/cms"

function mapOrder(order: any): InvoiceOrder {
  const ba   = order.billing_address
  const sa   = order.shipping_address
  const meta = (order.metadata ?? {}) as Record<string, string>

  // Sold To — buyer's billing info
  const soldTo = ba
    ? {
        name:  [ba.first_name, ba.last_name].filter(Boolean).join(" ") || undefined,
        email: order.email || undefined,
        phone: ba.phone || undefined,
        line1: ba.address_1 || undefined,
        line2: [ba.city, [ba.province?.toUpperCase(), ba.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ") || undefined,
      }
    : order.email ? { email: order.email } : undefined

  // Ship To — FFL dealer from order metadata (preferred over shipping_address, which is
  // set to the buyer's address for tax calculation purposes)
  const fflName  = meta.ffl_dealer_name || [sa?.first_name, sa?.last_name].filter(Boolean).join(" ") || undefined
  const fflLine1 = meta.ffl_dealer_address1 || sa?.address_1 || undefined
  const fflLine2 = meta.ffl_dealer_city
    ? [meta.ffl_dealer_city, [meta.ffl_dealer_state, meta.ffl_dealer_zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")
    : [sa?.city, [sa?.province?.toUpperCase(), sa?.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ") || undefined
  const fflContact = [meta.ffl_contact_name, meta.ffl_contact_phone, meta.ffl_contact_email].filter(Boolean).join(" · ")

  const shipTo = (fflName || fflLine1 || fflLine2)
    ? {
        name:  fflName,
        line1: fflLine1,
        line2: fflLine2,
        phone: fflContact || undefined,
      }
    : undefined

  const items = (order.items ?? []).map((item: any) => ({
    qty: item.quantity ?? 1,
    title: item.title ?? item.product_title ?? "Item",
    brand: (item.metadata as any)?.brand,
    caliber: (item.metadata as any)?.caliber,
    serial: (item.metadata as any)?.serial_number,
    price: (item.unit_price ?? 0) / 100,
  }))

  const createdAt = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : undefined

  const displayId = order.display_id
    ? `LXC-${String(order.display_id).padStart(6, "0")}`
    : order.id

  return {
    id: displayId,
    date: createdAt,
    status: order.status
      ? order.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
      : undefined,
    soldTo,
    shipTo,
    items,
    subtotal: (order.subtotal ?? 0) / 100,
    tax: (order.tax_total ?? 0) / 100,
    shipping: (order.shipping_total ?? 0) / 100,
    total: (order.total ?? 0) / 100,
    shippedVia: (order.metadata as any)?.shipped_via,
    terms: (order.metadata as any)?.terms,
  }
}

async function fetchBanking(): Promise<BankingInfo | undefined> {
  try {
    const res = await fetch(`${PAYLOAD_URL}/api/globals/site-settings`)
    if (!res.ok) return undefined
    const data = await res.json()
    return data?.banking ?? undefined
  } catch {
    return undefined
  }
}

const InvoicePage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [invoiceOrder, setInvoiceOrder] = useState<InvoiceOrder | null>(null)
  const [banking, setBanking] = useState<BankingInfo | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      adminFetch<any>(`/admin/orders/${id}`)
        .then(({ order }) => mapOrder(order))
        .catch(() =>
          adminFetch<any>(`/admin/draft-orders/${id}`)
            .then(({ draft_order }) => mapOrder(draft_order))
        ),
      fetchBanking(),
    ])
      .then(([order, bankingData]) => {
        setInvoiceOrder(order)
        setBanking(bankingData)
      })
      .catch((err: any) => setError(err.message ?? "Failed to load order"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <span style={{ color: "#707076", fontSize: 14 }}>Loading invoice…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 32, color: "#c0392b" }}>
        <strong>Error:</strong> {error}
      </div>
    )
  }

  if (!invoiceOrder) return null

  return (
    <Invoice
      order={invoiceOrder}
      banking={banking}
      onClose={() => navigate(`/orders/${id}`)}
    />
  )
}

export default InvoicePage
