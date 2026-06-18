import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Input, Label, Button, Text, toast } from "@medusajs/ui"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { adminFetch } from "../../lib/api"

type ProductResult = {
  variantId: string
  productId: string
  title: string
  sku?: string
  thumbnail?: string
}

type LineItem = {
  variantId: string
  title: string
  price: string
  serialNumber: string
  qty: number
}

const CreateSalePage = () => {
  const navigate = useNavigate()

  // Buyer (Sold To / Billing)
  const [buyerName, setBuyerName]   = useState("")
  const [buyerEmail, setBuyerEmail] = useState("")
  const [buyerPhone, setBuyerPhone] = useState("")
  const [buyerAddr1, setBuyerAddr1] = useState("")
  const [buyerCity, setBuyerCity]   = useState("")
  const [buyerState, setBuyerState] = useState("")
  const [buyerZip, setBuyerZip]     = useState("")

  // FFL Transfer Dealer (Ship To) — stored in order.metadata, NOT shipping_address
  const [fflName, setFflName]               = useState("")
  const [fflAddr1, setFflAddr1]             = useState("")
  const [fflCity, setFflCity]               = useState("")
  const [fflState, setFflState]             = useState("")
  const [fflZip, setFflZip]                 = useState("")
  const [fflContactName, setFflContactName] = useState("")
  const [fflContactPhone, setFflContactPhone] = useState("")
  const [fflContactEmail, setFflContactEmail] = useState("")

  // Product search & line items
  const [searchQuery, setSearchQuery]     = useState("")
  const [searchResults, setSearchResults] = useState<ProductResult[]>([])
  const [searching, setSearching]         = useState(false)
  const [items, setItems]                 = useState<LineItem[]>([])

  // Sale details
  const [shippedVia, setShippedVia]       = useState("UPS")
  const [terms, setTerms]                 = useState("Due on Receipt")
  const [paymentMethod, setPaymentMethod] = useState("Wire Transfer")
  const [notes, setNotes]                 = useState("")

  const [submitting, setSubmitting] = useState(false)

  const searchProducts = async () => {
    const q = searchQuery.trim()
    if (!q) return
    setSearching(true)
    try {
      const { products } = await adminFetch<{ products: any[] }>(
        `/admin/products?q=${encodeURIComponent(q)}&limit=8`
      )
      const results: ProductResult[] = (products ?? []).flatMap((p: any) =>
        (p.variants ?? [{ id: p.id, sku: p.sku }]).map((v: any) => ({
          variantId: v.id,
          productId: p.id,
          title: p.title,
          sku: v.sku,
          thumbnail: p.thumbnail,
        }))
      )
      setSearchResults(results)
    } catch {
      toast.error("Product search failed")
    } finally {
      setSearching(false)
    }
  }

  const addItem = (result: ProductResult) => {
    setItems((prev) => [
      ...prev,
      { variantId: result.variantId, title: result.title, price: "", serialNumber: "", qty: 1 },
    ])
    setSearchResults([])
    setSearchQuery("")
  }

  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i))

  const updateItem = <K extends keyof LineItem>(i: number, field: K, value: LineItem[K]) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)))

  const handleSubmit = async () => {
    if (!buyerEmail.trim()) { toast.error("Buyer email is required"); return }
    if (!buyerName.trim())  { toast.error("Buyer name is required"); return }
    if (items.length === 0) { toast.error("Add at least one item"); return }
    if (items.some((it) => !it.price || isNaN(parseFloat(it.price)))) {
      toast.error("Enter a price for each item")
      return
    }

    setSubmitting(true)
    try {
      const { regions } = await adminFetch<{ regions: any[] }>("/admin/regions?limit=1")
      const regionId = regions?.[0]?.id
      if (!regionId) throw new Error("No region configured — add a region in Medusa admin first")

      const nameParts = buyerName.trim().split(/\s+/)
      const firstName = nameParts[0] ?? ""
      const lastName  = nameParts.slice(1).join(" ") || firstName

      // billing_address = buyer's home address
      const billingAddress = {
        first_name:   firstName,
        last_name:    lastName,
        address_1:    buyerAddr1.trim() || undefined,
        city:         buyerCity.trim()  || undefined,
        province:     buyerState.trim().toLowerCase() || undefined,
        postal_code:  buyerZip.trim()   || undefined,
        phone:        buyerPhone.trim() || undefined,
        country_code: "us",
      }

      // shipping_address = buyer's address (used by Medusa tax engine, same as billing)
      const shippingAddress = buyerState.trim() ? {
        first_name:   firstName,
        last_name:    lastName,
        address_1:    buyerAddr1.trim()  || undefined,
        city:         buyerCity.trim()   || undefined,
        province:     buyerState.trim().toLowerCase(),
        postal_code:  buyerZip.trim()    || undefined,
        country_code: "us",
      } : undefined

      // All FFL dealer info goes into metadata (matches what invoice mapOrder() reads)
      const metadata: Record<string, string> = {}

      // Buyer address in metadata (invoice uses these as primary source)
      if (buyerAddr1.trim())  metadata.buyer_address1 = buyerAddr1.trim()
      if (buyerCity.trim())   metadata.buyer_city     = buyerCity.trim()
      if (buyerState.trim())  metadata.buyer_state    = buyerState.trim().toUpperCase()
      if (buyerZip.trim())    metadata.buyer_zip      = buyerZip.trim()

      // FFL dealer (invoice mapOrder reads these for Ship To block)
      if (fflName.trim())         metadata.ffl_dealer_name     = fflName.trim()
      if (fflAddr1.trim())        metadata.ffl_dealer_address1 = fflAddr1.trim()
      if (fflCity.trim())         metadata.ffl_dealer_city     = fflCity.trim()
      if (fflState.trim())        metadata.ffl_dealer_state    = fflState.trim().toUpperCase()
      if (fflZip.trim())          metadata.ffl_dealer_zip      = fflZip.trim()
      if (fflContactName.trim())  metadata.ffl_contact_name    = fflContactName.trim()
      if (fflContactPhone.trim()) metadata.ffl_contact_phone   = fflContactPhone.trim()
      if (fflContactEmail.trim()) metadata.ffl_contact_email   = fflContactEmail.trim()
      metadata.ffl_is_manual = "true"

      // Sale details
      if (shippedVia.trim())    metadata.shipped_via    = shippedVia.trim()
      if (terms.trim())         metadata.terms          = terms.trim()
      if (paymentMethod.trim()) metadata.payment_method = paymentMethod.trim()
      if (notes.trim())         metadata.notes          = notes.trim()

      const body = {
        email:            buyerEmail.trim(),
        region_id:        regionId,
        billing_address:  billingAddress,
        shipping_address: shippingAddress,
        items: items.map((it) => ({
          variant_id: it.variantId,
          quantity:   it.qty,
          unit_price: Math.round(parseFloat(it.price) * 100),
          metadata:   it.serialNumber ? { serial_number: it.serialNumber } : undefined,
        })),
        metadata,
      }

      // Step 1: create draft order
      const draftResult = await adminFetch<any>("/admin/draft-orders", {
        method: "POST",
        body: JSON.stringify(body),
      })

      const draftId = draftResult.draft_order?.id
      if (!draftId) throw new Error("Draft order created but no ID returned")

      // Step 2: convert to a real order so it appears under Orders (not Draft Orders)
      const orderResult = await adminFetch<any>(
        `/admin/draft-orders/${draftId}/convert-to-order`,
        { method: "POST" }
      )

      const orderId = orderResult.order?.id ?? draftId

      toast.success("Sale created")
      if (orderId) navigate(`/orders/${orderId}/invoice`)
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create sale")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-8 px-6">
      <div>
        <Heading level="h1">Create Sale</Heading>
        <Text className="text-ui-fg-muted mt-1">Record a manual or phone sale — opens invoice immediately after saving</Text>
      </div>

      {/* ── Buyer ── */}
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Buyer Information</Heading>
          <Text size="small" className="text-ui-fg-muted mt-0.5">Sold To / Billing Address</Text>
        </div>
        <div className="grid grid-cols-2 gap-4 px-6 py-4">
          <div className="col-span-2">
            <Label htmlFor="buyer-name">Full Name <span className="text-ui-tag-red-text">*</span></Label>
            <Input id="buyer-name" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="John Smith" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="buyer-email">Email <span className="text-ui-tag-red-text">*</span></Label>
            <Input id="buyer-email" type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="buyer@example.com" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="buyer-phone">Phone</Label>
            <Input id="buyer-phone" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="(555) 000-0000" className="mt-1.5" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="buyer-addr">Address</Label>
            <Input id="buyer-addr" value={buyerAddr1} onChange={(e) => setBuyerAddr1(e.target.value)} placeholder="123 Main St" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="buyer-city">City</Label>
            <Input id="buyer-city" value={buyerCity} onChange={(e) => setBuyerCity(e.target.value)} placeholder="Tampa" className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="buyer-state">State</Label>
              <Input id="buyer-state" value={buyerState} onChange={(e) => setBuyerState(e.target.value.toUpperCase())} placeholder="FL" maxLength={2} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="buyer-zip">ZIP</Label>
              <Input id="buyer-zip" value={buyerZip} onChange={(e) => setBuyerZip(e.target.value)} placeholder="33602" className="mt-1.5" />
            </div>
          </div>
        </div>
      </Container>

      {/* ── FFL Dealer ── */}
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">FFL Transfer Dealer</Heading>
          <Text size="small" className="text-ui-fg-muted mt-0.5">Ship To — must be a licensed FFL dealer</Text>
        </div>
        <div className="grid grid-cols-2 gap-4 px-6 py-4">
          <div className="col-span-2">
            <Label htmlFor="ffl-name">Dealer Name</Label>
            <Input id="ffl-name" value={fflName} onChange={(e) => setFflName(e.target.value)} placeholder="Smith's Gun Shop" className="mt-1.5" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="ffl-addr">Address</Label>
            <Input id="ffl-addr" value={fflAddr1} onChange={(e) => setFflAddr1(e.target.value)} placeholder="456 Dealer Blvd" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="ffl-city">City</Label>
            <Input id="ffl-city" value={fflCity} onChange={(e) => setFflCity(e.target.value)} placeholder="Sarasota" className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ffl-state">State</Label>
              <Input id="ffl-state" value={fflState} onChange={(e) => setFflState(e.target.value.toUpperCase())} placeholder="FL" maxLength={2} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="ffl-zip">ZIP</Label>
              <Input id="ffl-zip" value={fflZip} onChange={(e) => setFflZip(e.target.value)} placeholder="34232" className="mt-1.5" />
            </div>
          </div>
          {/* Optional contact at the FFL */}
          <div className="col-span-2 pt-2 border-t border-ui-border-base">
            <Text size="small" className="text-ui-fg-muted mb-3">Dealer Contact (optional — speeds up transfer)</Text>
          </div>
          <div>
            <Label htmlFor="ffl-contact-name">Contact Name</Label>
            <Input id="ffl-contact-name" value={fflContactName} onChange={(e) => setFflContactName(e.target.value)} placeholder="Jane Doe" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="ffl-contact-phone">Contact Phone</Label>
            <Input id="ffl-contact-phone" value={fflContactPhone} onChange={(e) => setFflContactPhone(e.target.value)} placeholder="(555) 000-0000" className="mt-1.5" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="ffl-contact-email">Contact Email</Label>
            <Input id="ffl-contact-email" type="email" value={fflContactEmail} onChange={(e) => setFflContactEmail(e.target.value)} placeholder="dealer@example.com" className="mt-1.5" />
          </div>
        </div>
      </Container>

      {/* ── Items ── */}
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Items</Heading>
        </div>
        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Search */}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") searchProducts() }}
              placeholder="Search products by name or SKU…"
              className="flex-1"
            />
            <Button variant="secondary" size="small" onClick={searchProducts} isLoading={searching}>
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="border border-ui-border-base rounded-md overflow-hidden shadow-sm">
              {searchResults.map((r) => (
                <button
                  key={r.variantId}
                  onClick={() => addItem(r)}
                  className="w-full text-left px-4 py-2.5 hover:bg-ui-bg-subtle flex items-center gap-3 border-b border-ui-border-base last:border-0 transition-colors"
                >
                  {r.thumbnail && (
                    <img src={r.thumbnail} alt="" className="w-9 h-9 object-cover rounded flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    {r.sku && <div className="text-xs text-ui-fg-muted">SKU: {r.sku}</div>}
                  </div>
                  <span className="text-xs text-ui-fg-muted flex-shrink-0">+ Add</span>
                </button>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="flex flex-col gap-3">
              {items.map((item, i) => (
                <div key={i} className="border border-ui-border-base rounded-md p-4">
                  <div className="flex justify-between items-start mb-3">
                    <Text className="font-medium">{item.title}</Text>
                    <button
                      onClick={() => removeItem(i)}
                      className="text-xs text-ui-fg-muted hover:text-ui-fg-base transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor={`price-${i}`}>Price (USD) <span className="text-ui-tag-red-text">*</span></Label>
                      <Input
                        id={`price-${i}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={(e) => updateItem(i, "price", e.target.value)}
                        placeholder="3499.00"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`serial-${i}`}>Serial Number</Label>
                      <Input
                        id={`serial-${i}`}
                        value={item.serialNumber}
                        onChange={(e) => updateItem(i, "serialNumber", e.target.value)}
                        placeholder="NHC12345"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`qty-${i}`}>Qty</Label>
                      <Input
                        id={`qty-${i}`}
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateItem(i, "qty", Math.max(1, parseInt(e.target.value) || 1))}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {items.length === 0 && searchResults.length === 0 && (
            <Text size="small" className="text-ui-fg-muted">
              Search for a product above to add it to this sale.
            </Text>
          )}
        </div>
      </Container>

      {/* ── Sale Details ── */}
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Sale Details</Heading>
        </div>
        <div className="grid grid-cols-2 gap-4 px-6 py-4">
          <div>
            <Label htmlFor="shipped-via">Shipped Via</Label>
            <Input id="shipped-via" value={shippedVia} onChange={(e) => setShippedVia(e.target.value)} placeholder="UPS" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="payment-method">Payment Method</Label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm text-ui-fg-base focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
            >
              <option value="Wire Transfer">Wire Transfer</option>
              <option value="Check">Check</option>
              <option value="Credit/Debit">Credit/Debit</option>
              <option value="Cash">Cash</option>
            </select>
            {paymentMethod === "Credit/Debit" && (
              <p className="mt-1.5 text-xs text-ui-fg-muted">
                Remember to process the card via your terminal before shipping.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="terms">Terms</Label>
            <Input id="terms" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Due on Receipt" className="mt-1.5" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or special instructions…"
              rows={3}
              className="mt-1.5 w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none focus:ring-2 focus:ring-ui-border-interactive resize-none"
            />
          </div>
        </div>
      </Container>

      <div className="flex justify-end gap-3 pb-8">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} isLoading={submitting} disabled={items.length === 0 || submitting}>
          Create Sale
        </Button>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Create Sale",
})

export default CreateSalePage
