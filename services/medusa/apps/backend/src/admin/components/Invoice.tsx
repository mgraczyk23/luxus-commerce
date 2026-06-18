import React from "react"

export type InvoiceParty = {
  name?: string
  line1?: string
  line2?: string
  phone?: string
  email?: string
}

export type InvoiceItem = {
  qty?: number
  title: string
  brand?: string
  caliber?: string
  serial?: string
  price?: number
}

export type InvoiceOrder = {
  id: string
  date?: string
  status?: string
  soldTo?: InvoiceParty
  shipTo?: InvoiceParty
  items: InvoiceItem[]
  subtotal?: number
  tax?: number
  shipping?: number
  total?: number
  shippedVia?: string
  terms?: string
}

type Company = {
  name: string
  line1: string
  line2: string
  phone: string
  logoUrl?: string
}

export type BankingInfo = {
  bankName?:      string
  accountName?:   string
  routingNumber?: string
  accountNumber?: string
  swiftCode?:     string
  location?:      string
  memo?:          string
}

const DEFAULT_COMPANY: Company = {
  name: "Luxus Collection, LLC",
  line1: "1199 N Beneva Rd",
  line2: "Sarasota, FL 34232",
  phone: "(941) 253-3660",
  logoUrl: "/assets/logo.webp",
}

const DEFAULT_BANKING: BankingInfo = {
  bankName:      "Truist Bank",
  accountName:   "Luxus Capital, LLC",
  routingNumber: "263191387",
  accountNumber: "1100009085694",
  location:      "Sarasota, FL",
}

const fmt = (n?: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n || 0)

type InvoiceProps = {
  order: InvoiceOrder
  company?: Company
  banking?: BankingInfo
  onClose?: () => void
}

export default function Invoice({ order, company = DEFAULT_COMPANY, banking = DEFAULT_BANKING, onClose }: InvoiceProps) {
  if (!order) return null

  const subtotal =
    order.subtotal ??
    order.items.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0)
  const total = order.total ?? subtotal + (order.tax || 0) + (order.shipping || 0)

  return (
    <div className="lxs-invoice-root">
      <style>{INVOICE_CSS}</style>

      <div className="inv-toolbar">
        {onClose ? (
          <button className="inv-back-btn" onClick={onClose}>← Back</button>
        ) : (
          <span />
        )}
        <div className="inv-actions">
          <button className="inv-btn inv-btn-primary" onClick={() => window.print()}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 1H11V4H3V1Z" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M2 4H12C12.55 4 13 4.45 13 5V9H10V12H4V9H1V5C1 4.45 1.45 4 2 4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              <path d="M4 7.5H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Download / Print
          </button>
        </div>
      </div>

      <article className="inv-sheet">
        <div className="inv-stripe" />

        <header className="inv-masthead">
          <div className="inv-brand">
            {company.logoUrl && (
              <img src={company.logoUrl} alt={company.name} className="inv-logo" />
            )}
            <div className="inv-co">{company.name}</div>
            <div className="inv-meta">
              {company.line1}<br/>
              {company.line2}<br/>
              <a href={`tel:${company.phone.replace(/\D/g, "")}`}>{company.phone}</a>
            </div>
          </div>
          <div className="inv-title-block">
            <div className="inv-title-word">Invoice</div>
            <div className="inv-title-sub">Buyer Copy</div>
          </div>
        </header>

        <section className="inv-meta-strip">
          <div>
            <div className="inv-label">Invoice #</div>
            <div className="inv-value">{order.id}</div>
          </div>
          <div>
            <div className="inv-label">Date</div>
            <div className="inv-value">{order.date}</div>
          </div>
          <div>
            <div className="inv-label">Status</div>
            <div className="inv-value inv-gold">{order.status}</div>
          </div>
        </section>

        <section className="inv-parties">
          <PartyBlock label="Sold To" data={order.soldTo} />
          <PartyBlock label="Ship To (FFL)" data={order.shipTo} />
        </section>

        <section className="inv-comments">
          <strong>Comments or Special Instructions:</strong><br/>
          Sale will become final only upon full payment and physical delivery to FFL,
          at the Ship To address. {company.name} does not warrant product compliance with
          local or state laws. Retailers must ensure all products sold are compliant with
          local, state, and federal regulations.
        </section>

        <section className="inv-orderbar">
          <OrderBarCell head="Order #"      value={order.id} />
          <OrderBarCell head="Buyer"        value={order.soldTo?.name} />
          <OrderBarCell head="Shipped Via"  value={order.shippedVia || "UPS"} />
          <OrderBarCell head="F.O.B. Point" value="FFL provided by client prior to shipping" small />
          <OrderBarCell head="Terms"        value={order.terms || "Due on Receipt"} />
        </section>

        <table className="inv-table">
          <thead>
            <tr>
              <th className="center" style={{ width: "10%" }}>Qty</th>
              <th>Description</th>
              <th className="right" style={{ width: "16%" }}>Unit Price</th>
              <th className="right" style={{ width: "16%" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i}>
                <td className="center" data-label="Qty">{item.qty || 1}</td>
                <td>
                  <div className="inv-item-title">{item.title}</div>
                  <div className="inv-item-meta">
                    <strong>{item.brand}</strong>{item.caliber ? ` · ${item.caliber}` : ""}<br/>
                    Serial: {item.serial || "—"}
                  </div>
                </td>
                <td className="right price" data-label="Unit Price">{fmt(item.price)}</td>
                <td className="right total" data-label="Line Total">{fmt((item.price || 0) * (item.qty || 1))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="inv-totals">
          <div className="inv-totals-box">
            <TotalsRow lbl="Subtotal" val={fmt(subtotal)} />
            <TotalsRow lbl="Sales Tax" val={order.tax ? fmt(order.tax) : "—"} />
            <TotalsRow lbl="Shipping & Handling" val={order.shipping ? fmt(order.shipping) : "Included"} />
            <div className="inv-totals-row total">
              <span className="lbl">Total Due</span>
              <span className="val">{fmt(total)}</span>
            </div>
          </div>
        </section>

        <section className="inv-disclaimer">
          <strong>All items are sold as-is, with all faults.</strong> No warranties or
          representations, expressed or implied, are provided. Payment due upon receipt of
          this invoice.
        </section>

        <section className="inv-payment">
          <div>
            <h4>Make Checks Payable To</h4>
            <div className="row"><span className="k">Payable to</span><span className="v">{company.name}</span></div>
            <div className="row"><span className="k">Mail to</span><span className="v">{company.line1}<br/>{company.line2}</span></div>
          </div>
          <div>
            <h4>Wire Transfer</h4>
            {banking.bankName      && <div className="row"><span className="k">Bank</span><span className="v">{banking.bankName}</span></div>}
            {banking.routingNumber && <div className="row"><span className="k">ABA Routing</span><span className="v">{banking.routingNumber}</span></div>}
            {banking.accountName   && <div className="row"><span className="k">For Credit To</span><span className="v">{banking.accountName}</span></div>}
            {banking.accountNumber && <div className="row"><span className="k">Account No.</span><span className="v">{banking.accountNumber}</span></div>}
            {banking.swiftCode     && <div className="row"><span className="k">SWIFT / BIC</span><span className="v">{banking.swiftCode}</span></div>}
            {banking.location      && <div className="row"><span className="k">Location</span><span className="v">{banking.location}</span></div>}
            {banking.memo          && <div className="row"><span className="k">Memo</span><span className="v">{banking.memo}</span></div>}
          </div>
        </section>

        <footer className="inv-footer">
          <div className="inv-footer-title">Shipping Policy</div>
          Risk of loss and title for all merchandise pass to the Buyer upon our delivery to
          the carrier. Any claims for damage or loss in transit must be filed by the Buyer
          with the carrier. To arrange alternative shipping or supplemental insurance,
          please contact us for written approval prior to shipment.
        </footer>
      </article>
    </div>
  )
}

function PartyBlock({ label, data }: { label: string; data?: InvoiceParty }) {
  if (!data) return <div className="inv-party"><div className="inv-label">{label}</div></div>
  const lines = [data.email, data.phone, data.line1, data.line2].filter(Boolean) as string[]
  return (
    <div className="inv-party">
      <div className="inv-label">{label}</div>
      {data.name && <div className="inv-party-name">{data.name}</div>}
      {lines.length > 0 && (
        <div className="inv-sub">
          {lines.map((ln, i) => (
            <React.Fragment key={i}>{ln}{i < lines.length - 1 && <br/>}</React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

function OrderBarCell({ head, value, small }: { head: string; value?: string; small?: boolean }) {
  return (
    <div className="inv-orderbar-cell">
      <div className="inv-orderbar-head">{head}</div>
      <div style={small ? { fontSize: "10px", lineHeight: "1.4" } : undefined}>{value}</div>
    </div>
  )
}

function TotalsRow({ lbl, val }: { lbl: string; val: string }) {
  return (
    <div className="inv-totals-row">
      <span className="lbl">{lbl}</span>
      <span>{val}</span>
    </div>
  )
}

const INVOICE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Inter:wght@300;400;500;600;700&display=swap');

.lxs-invoice-root {
  background: #eceaea;
  min-height: 100vh;
  padding: 32px 16px 80px;
  font-family: 'Inter', sans-serif;
}
.lxs-invoice-root *,
.lxs-invoice-root *::before,
.lxs-invoice-root *::after { box-sizing: border-box; }

.lxs-invoice-root .inv-toolbar {
  max-width: 820px; margin: 0 auto 18px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; flex-wrap: wrap;
}
.lxs-invoice-root .inv-back-btn {
  background: none; border: none; color: #525258; cursor: pointer;
  font: inherit; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
  padding: 8px 0; border-bottom: 1px solid #c8c8cc; font-weight: 500;
}
.lxs-invoice-root .inv-back-btn:hover { color: #7e5e10; }
.lxs-invoice-root .inv-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.lxs-invoice-root .inv-btn {
  padding: 11px 22px; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
  font-weight: 600; font-family: inherit; border: 1px solid transparent; cursor: pointer;
  background: none; transition: all 0.18s;
  min-height: 44px; display: inline-flex; align-items: center; gap: 8px;
}
.lxs-invoice-root .inv-btn-primary { background: #7e5e10; color: #ffffff; }
.lxs-invoice-root .inv-btn-primary:hover { background: #9a7218; }

.lxs-invoice-root .inv-sheet {
  width: 100%; max-width: 820px; margin: 0 auto;
  background: #ffffff; color: #1a1a1a;
  padding: 56px 56px 48px;
  box-shadow: 0 30px 80px rgba(0,0,0,0.32), 0 4px 16px rgba(0,0,0,0.18);
  line-height: 1.5; font-size: 11.5px; font-weight: 400;
}
.lxs-invoice-root .inv-gold { color: #7e5e10; font-weight: 600; }
.lxs-invoice-root .inv-label {
  font-size: 8px; letter-spacing: 0.22em; text-transform: uppercase;
  color: #707076; font-weight: 600; margin-bottom: 6px;
}
.lxs-invoice-root .inv-value { font-size: 12px; font-weight: 400; color: #1a1a1a; }

.lxs-invoice-root .inv-stripe { height: 3px; background: #7e5e10; margin: -56px -56px 36px; }

.lxs-invoice-root .inv-masthead {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 30px; padding-bottom: 28px; border-bottom: 1px solid #e4e4e6; margin-bottom: 28px;
}
.lxs-invoice-root .inv-brand { display: flex; flex-direction: column; gap: 4px; }
.lxs-invoice-root .inv-logo { height: 56px; width: auto; display: block; margin-bottom: 12px; filter: brightness(0.68) saturate(1.1); }
.lxs-invoice-root .inv-co { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 500; color: #1a1a1a; letter-spacing: 0.02em; }
.lxs-invoice-root .inv-meta { font-size: 11px; font-weight: 300; color: #525258; line-height: 1.6; }
.lxs-invoice-root .inv-meta a { color: inherit; text-decoration: none; }
.lxs-invoice-root .inv-title-block { text-align: right; flex-shrink: 0; }
.lxs-invoice-root .inv-title-word {
  font-family: 'Playfair Display', serif; font-size: 38px; font-weight: 400;
  letter-spacing: 0.12em; color: #1a1a1a; line-height: 1; text-transform: uppercase;
}
.lxs-invoice-root .inv-title-sub {
  font-size: 8.5px; letter-spacing: 0.28em; text-transform: uppercase;
  color: #7e5e10; font-weight: 600; margin-top: 8px;
}

.lxs-invoice-root .inv-meta-strip {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
  padding: 14px 18px; background: #faf7f0; border: 1px solid #efe9d6;
  border-left: 3px solid #7e5e10; margin-bottom: 32px;
}

.lxs-invoice-root .inv-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 30px; }
.lxs-invoice-root .inv-party { padding: 18px 20px; border: 1px solid #e4e4e6; }
.lxs-invoice-root .inv-party-name { font-weight: 500; font-size: 13px; color: #1a1a1a; margin-bottom: 4px; }
.lxs-invoice-root .inv-sub { font-size: 10.5px; color: #525258; font-weight: 300; line-height: 1.55; }

.lxs-invoice-root .inv-comments {
  padding: 16px 20px; border: 1px dashed #c8c8cc; margin-bottom: 32px;
  font-size: 10.5px; color: #525258; line-height: 1.7; font-weight: 300;
}
.lxs-invoice-root .inv-comments strong { color: #1a1a1a; font-weight: 500; }

.lxs-invoice-root .inv-orderbar {
  display: grid; grid-template-columns: repeat(5, 1fr);
  border: 1px solid #1a1a1a; margin-bottom: 22px; overflow: hidden;
}
.lxs-invoice-root .inv-orderbar-cell {
  padding: 10px 12px; border-right: 1px solid #1a1a1a; font-size: 10.5px;
  color: #1a1a1a; font-weight: 400; background: #ffffff; min-height: 56px;
  display: flex; flex-direction: column; gap: 4px;
}
.lxs-invoice-root .inv-orderbar-cell:last-child { border-right: none; }
.lxs-invoice-root .inv-orderbar-head {
  font-size: 7.5px; letter-spacing: 0.18em; text-transform: uppercase;
  font-weight: 700; background: #1a1a1a; color: #ffffff;
  margin: -10px -12px 6px; padding: 6px 12px;
}

.lxs-invoice-root .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
.lxs-invoice-root .inv-table thead th {
  background: #1a1a1a; color: #ffffff; font-size: 8.5px; letter-spacing: 0.18em;
  text-transform: uppercase; font-weight: 600; padding: 10px 12px; text-align: left;
}
.lxs-invoice-root .inv-table thead th.right { text-align: right; }
.lxs-invoice-root .inv-table thead th.center { text-align: center; }
.lxs-invoice-root .inv-table tbody td {
  padding: 14px 12px; border-bottom: 1px solid #e4e4e6;
  vertical-align: top; font-size: 11.5px;
}
.lxs-invoice-root .inv-table tbody td.right { text-align: right; font-variant-numeric: tabular-nums; }
.lxs-invoice-root .inv-table tbody td.center { text-align: center; }
.lxs-invoice-root .inv-item-title { font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 400; color: #1a1a1a; margin-bottom: 3px; }
.lxs-invoice-root .inv-item-meta { font-size: 10px; color: #707076; font-weight: 300; letter-spacing: 0.02em; line-height: 1.5; }
.lxs-invoice-root .inv-item-meta strong { color: #1a1a1a; font-weight: 500; letter-spacing: 0.04em; }

.lxs-invoice-root .inv-totals { display: flex; justify-content: flex-end; margin-bottom: 32px; }
.lxs-invoice-root .inv-totals-box { width: 320px; max-width: 100%; }
.lxs-invoice-root .inv-totals-row {
  display: flex; justify-content: space-between; padding: 8px 0;
  font-size: 11.5px; color: #1a1a1a;
}
.lxs-invoice-root .inv-totals-row .lbl {
  color: #525258; font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 500;
}
.lxs-invoice-root .inv-totals-row.total {
  border-top: 1px solid #1a1a1a; margin-top: 8px; padding-top: 14px; align-items: baseline;
}
.lxs-invoice-root .inv-totals-row.total .lbl { color: #1a1a1a; font-weight: 700; font-size: 10.5px; }
.lxs-invoice-root .inv-totals-row.total .val { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 500; color: #7e5e10; }

.lxs-invoice-root .inv-disclaimer {
  font-size: 10px; color: #707076; font-weight: 300;
  padding: 14px 18px; background: #fafafa; border-left: 2px solid #7e5e10;
  margin-bottom: 22px; line-height: 1.7;
}
.lxs-invoice-root .inv-disclaimer strong { color: #1a1a1a; font-weight: 500; }

.lxs-invoice-root .inv-payment {
  border-top: 1px solid #e4e4e6; padding-top: 22px;
  display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 22px;
}
.lxs-invoice-root .inv-payment h4 {
  font-size: 8.5px; letter-spacing: 0.22em; text-transform: uppercase;
  color: #7e5e10; font-weight: 600; margin: 0 0 10px;
}
.lxs-invoice-root .inv-payment .row {
  display: flex; justify-content: space-between; gap: 8px; padding: 4px 0; font-size: 11px;
}
.lxs-invoice-root .inv-payment .row .k { color: #707076; font-weight: 400; }
.lxs-invoice-root .inv-payment .row .v { color: #1a1a1a; font-weight: 500; font-variant-numeric: tabular-nums; text-align: right; }

.lxs-invoice-root .inv-footer {
  border-top: 1px solid #e4e4e6; padding-top: 18px;
  font-size: 9.5px; color: #707076; line-height: 1.7; font-weight: 300;
}
.lxs-invoice-root .inv-footer-title {
  font-size: 8.5px; letter-spacing: 0.22em; text-transform: uppercase;
  color: #1a1a1a; font-weight: 600; margin-bottom: 8px;
}

@media (max-width: 640px) {
  .lxs-invoice-root { padding: 16px 0 56px; }
  .lxs-invoice-root .inv-toolbar { padding: 0 14px; }
  .lxs-invoice-root .inv-sheet { padding: 28px 22px 32px; box-shadow: none; }
  .lxs-invoice-root .inv-stripe { margin: -28px -22px 24px; }
  .lxs-invoice-root .inv-masthead { flex-direction: column; align-items: stretch; gap: 20px; padding-bottom: 20px; margin-bottom: 22px; }
  .lxs-invoice-root .inv-title-block { text-align: left; }
  .lxs-invoice-root .inv-title-word { font-size: 30px; }
  .lxs-invoice-root .inv-meta-strip { grid-template-columns: 1fr; gap: 12px; padding: 14px 16px; margin-bottom: 22px; }
  .lxs-invoice-root .inv-parties { grid-template-columns: 1fr; gap: 14px; margin-bottom: 22px; }
  .lxs-invoice-root .inv-orderbar { grid-template-columns: 1fr 1fr; }
  .lxs-invoice-root .inv-orderbar-cell:nth-child(2n) { border-right: none; }
  .lxs-invoice-root .inv-orderbar-cell { border-bottom: 1px solid #1a1a1a; }
  .lxs-invoice-root .inv-orderbar-cell:nth-last-child(-n+2) { border-bottom: none; }
  .lxs-invoice-root .inv-orderbar-cell:last-child:nth-child(odd) { grid-column: 1 / -1; }
  .lxs-invoice-root .inv-table thead { display: none; }
  .lxs-invoice-root .inv-table tbody td { display: block; padding: 6px 0; border-bottom: none; }
  .lxs-invoice-root .inv-table tbody tr { display: block; border-bottom: 1px solid #e4e4e6; padding: 14px 0; }
  .lxs-invoice-root .inv-table tbody td.right { text-align: right; }
  .lxs-invoice-root .inv-table tbody td.center { text-align: left; }
  .lxs-invoice-root .inv-table tbody td.center::before { content: "Qty: "; color: #707076; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 500; }
  .lxs-invoice-root .inv-table tbody td.right.price::before { content: "Unit Price: "; color: #707076; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 500; }
  .lxs-invoice-root .inv-table tbody td.right.total::before { content: "Line Total: "; color: #707076; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 500; }
  .lxs-invoice-root .inv-totals-box { width: 100%; }
  .lxs-invoice-root .inv-payment { grid-template-columns: 1fr; gap: 18px; }
}

@media print {
  @page { size: Letter; margin: 0.4in; }
  html, body { background: #ffffff !important; }
  .lxs-invoice-root { background: #ffffff !important; padding: 0 !important; min-height: 0 !important; }
  .lxs-invoice-root .inv-toolbar { display: none !important; }
  .lxs-invoice-root .inv-sheet {
    box-shadow: none !important; padding: 0 !important;
    max-width: none !important; width: 100% !important;
    font-size: 9.5px !important; line-height: 1.4 !important;
  }
  .lxs-invoice-root .inv-stripe { height: 2px !important; margin: 0 0 14px !important; }
  .lxs-invoice-root .inv-masthead {
    flex-direction: row !important; align-items: flex-start !important;
    padding-bottom: 12px !important; margin-bottom: 14px !important; gap: 20px !important;
  }
  .lxs-invoice-root .inv-logo { height: 38px !important; margin-bottom: 6px !important; }
  .lxs-invoice-root .inv-co { font-size: 13px !important; }
  .lxs-invoice-root .inv-meta { font-size: 9px !important; line-height: 1.4 !important; }
  .lxs-invoice-root .inv-title-block { text-align: right !important; }
  .lxs-invoice-root .inv-title-word { font-size: 24px !important; }
  .lxs-invoice-root .inv-title-sub { font-size: 7.5px !important; margin-top: 4px !important; }
  .lxs-invoice-root .inv-meta-strip { grid-template-columns: repeat(3, 1fr) !important; padding: 8px 12px !important; margin-bottom: 14px !important; gap: 12px !important; }
  .lxs-invoice-root .inv-label { font-size: 7px !important; margin-bottom: 3px !important; }
  .lxs-invoice-root .inv-value { font-size: 10px !important; }
  .lxs-invoice-root .inv-parties { grid-template-columns: 1fr 1fr !important; gap: 12px !important; margin-bottom: 12px !important; }
  .lxs-invoice-root .inv-party { padding: 10px 12px !important; }
  .lxs-invoice-root .inv-party-name { font-size: 11px !important; margin-bottom: 2px !important; }
  .lxs-invoice-root .inv-sub { font-size: 9px !important; line-height: 1.45 !important; }
  .lxs-invoice-root .inv-comments { padding: 8px 12px !important; margin-bottom: 12px !important; font-size: 8.5px !important; line-height: 1.45 !important; }
  .lxs-invoice-root .inv-orderbar { grid-template-columns: repeat(5, 1fr) !important; margin-bottom: 10px !important; }
  .lxs-invoice-root .inv-orderbar-cell {
    border-right: 1px solid #1a1a1a !important; border-bottom: none !important;
    padding: 6px 8px !important; font-size: 9px !important; min-height: 0 !important;
  }
  .lxs-invoice-root .inv-orderbar-cell:last-child { border-right: none !important; }
  .lxs-invoice-root .inv-orderbar-head { font-size: 6.5px !important; margin: -6px -8px 4px !important; padding: 4px 8px !important; }
  .lxs-invoice-root .inv-table { margin-bottom: 10px !important; }
  .lxs-invoice-root .inv-table thead { display: table-header-group !important; }
  .lxs-invoice-root .inv-table thead th { padding: 6px 10px !important; font-size: 7.5px !important; }
  .lxs-invoice-root .inv-table tbody td {
    display: table-cell !important; padding: 8px 10px !important;
    border-bottom: 1px solid #e4e4e6 !important; font-size: 10px !important;
  }
  .lxs-invoice-root .inv-table tbody tr { display: table-row !important; }
  .lxs-invoice-root .inv-table tbody td::before { content: none !important; }
  .lxs-invoice-root .inv-table tbody td.right { text-align: right !important; }
  .lxs-invoice-root .inv-table tbody td.center { text-align: center !important; }
  .lxs-invoice-root .inv-item-title { font-size: 11.5px !important; margin-bottom: 2px !important; }
  .lxs-invoice-root .inv-item-meta { font-size: 8.5px !important; line-height: 1.4 !important; }
  .lxs-invoice-root .inv-totals { margin-bottom: 12px !important; }
  .lxs-invoice-root .inv-totals-box { width: 280px !important; }
  .lxs-invoice-root .inv-totals-row { padding: 4px 0 !important; font-size: 10px !important; }
  .lxs-invoice-root .inv-totals-row .lbl { font-size: 8.5px !important; }
  .lxs-invoice-root .inv-totals-row.total { padding-top: 8px !important; margin-top: 4px !important; }
  .lxs-invoice-root .inv-totals-row.total .lbl { font-size: 9.5px !important; }
  .lxs-invoice-root .inv-totals-row.total .val { font-size: 16px !important; }
  .lxs-invoice-root .inv-disclaimer { padding: 8px 12px !important; margin-bottom: 12px !important; font-size: 8.5px !important; line-height: 1.45 !important; }
  .lxs-invoice-root .inv-payment { grid-template-columns: 1fr 1fr !important; gap: 18px !important; padding-top: 12px !important; margin-bottom: 12px !important; }
  .lxs-invoice-root .inv-payment h4 { font-size: 7.5px !important; margin-bottom: 6px !important; }
  .lxs-invoice-root .inv-payment .row { padding: 2px 0 !important; font-size: 9px !important; }
  .lxs-invoice-root .inv-footer { padding-top: 10px !important; font-size: 8px !important; line-height: 1.45 !important; }
  .lxs-invoice-root .inv-footer-title { font-size: 7.5px !important; margin-bottom: 4px !important; }
  .lxs-invoice-root .inv-sheet,
  .lxs-invoice-root .inv-masthead,
  .lxs-invoice-root .inv-meta-strip,
  .lxs-invoice-root .inv-parties,
  .lxs-invoice-root .inv-comments,
  .lxs-invoice-root .inv-orderbar,
  .lxs-invoice-root .inv-totals,
  .lxs-invoice-root .inv-disclaimer,
  .lxs-invoice-root .inv-payment,
  .lxs-invoice-root .inv-footer { page-break-inside: avoid; break-inside: avoid; }
}
`
