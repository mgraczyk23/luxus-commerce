import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendEmail } from "../../../../../lib/email"

const SALES = process.env.ADMIN_EMAIL ?? "sales@luxus-collection.com"

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(cents / 100)

function emailWrap(content: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px 0;background:#f0ede8;font-family:Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;background:#faf9f7;border:1px solid #e8e4df">
    ${content}
    <div style="padding:20px 28px;border-top:1px solid #e8e4df;font-size:10px;color:#c9a96e;font-family:Arial,sans-serif;letter-spacing:0.1em;text-transform:uppercase">
      Luxus Collection — luxus-collection.com
    </div>
  </div>
</body></html>`
}

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:9px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#9e9994;font-family:Arial,sans-serif;white-space:nowrap;border-bottom:1px solid #f0ede8;vertical-align:top;width:140px">${label}</td>
    <td style="padding:9px 16px;font-size:13px;color:#1a1a1a;font-family:Arial,sans-serif;line-height:1.6;border-bottom:1px solid #f0ede8">${value.replace(/</g, "&lt;")}</td>
  </tr>`
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const body = req.body as { type?: string; tracking_number?: string; carrier?: string }

  if (!body.type || !["payment_received", "shipped"].includes(body.type)) {
    return res.status(400).json({ error: "type must be payment_received or shipped" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  let order: any
  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "metadata",
        "summary",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "billing_address.first_name",
        "billing_address.last_name",
        "items.title",
        "items.unit_price",
        "items.detail.quantity",
      ],
      filters: { id },
    })
    order = orders?.[0]
  } catch {
    return res.status(404).json({ error: "Order not found" })
  }

  if (!order?.email) {
    return res.status(400).json({ error: "Order has no customer email" })
  }

  const displayId  = order.display_id ? `#${order.display_id}` : id.slice(-8).toUpperCase()
  const firstName  = order.shipping_address?.first_name || order.billing_address?.first_name || "Customer"
  const lastName   = order.shipping_address?.last_name  || order.billing_address?.last_name  || ""
  const fullName   = `${firstName} ${lastName}`.trim()

  // Use summary (query.graph computed fields return 0)
  const summary    = (order.summary as any) ?? {}
  const total: number = summary.current_order_total ?? 0

  const meta       = (order.metadata ?? {}) as Record<string, string>
  const fflName    = meta.ffl_dealer_name || ""
  const fflAddr    = [meta.ffl_dealer_address1, meta.ffl_dealer_city, meta.ffl_dealer_state]
    .filter(Boolean).join(", ")

  const itemRows = (order.items ?? []).map((item: any) => {
    const qty = item.detail?.quantity ?? 1
    return `
    <tr>
      <td style="padding:8px 16px;font-size:12px;color:#1a1a1a;font-family:Arial,sans-serif;border-bottom:1px solid #f0ede8">${String(item.title).replace(/</g, "&lt;")}</td>
      <td style="padding:8px 16px;font-size:12px;color:#1a1a1a;font-family:Arial,sans-serif;border-bottom:1px solid #f0ede8;text-align:right">${fmt((item.unit_price ?? 0) * qty)}</td>
    </tr>`
  }).join("")

  const itemsBlock = itemRows ? `
    <div style="padding:4px 28px 0">
      <table style="width:100%;border-collapse:collapse">${itemRows}</table>
    </div>
    <div style="padding:10px 28px 24px;text-align:right">
      <span style="font-size:15px;font-weight:500;color:#1a1a1a;font-family:Georgia,serif">Total: ${fmt(total)}</span>
    </div>` : ""

  const fflBlock = fflName ? `
    <div style="margin:0 28px 24px;padding:14px 16px;background:#f5f3ef;border-left:2px solid #c9a96e">
      <p style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#c9a96e;font-family:Arial,sans-serif;font-weight:500;margin:0 0 5px">FFL Transfer Dealer</p>
      <p style="font-size:13px;font-weight:500;color:#1a1a1a;font-family:Arial,sans-serif;margin:0 0 3px">${fflName.replace(/</g, "&lt;")}</p>
      ${fflAddr ? `<p style="font-size:12px;color:#555;font-family:Arial,sans-serif;margin:0">${fflAddr.replace(/</g, "&lt;")}</p>` : ""}
    </div>` : ""

  // ── Payment received ───────────────────────────────────────────────────────
  if (body.type === "payment_received") {
    const buyerHtml = emailWrap(`
      <div style="background:#1a1a1a;padding:20px 28px">
        <span style="font-size:9px;letter-spacing:0.26em;text-transform:uppercase;color:#c9a96e;font-family:Arial,sans-serif;font-weight:500">Luxus Collection</span>
      </div>
      <div style="padding:28px 28px 20px">
        <h2 style="font-size:24px;font-weight:400;color:#1a1a1a;margin:0 0 8px;font-family:Georgia,serif">Payment Received</h2>
        <p style="font-size:13px;color:#555;font-family:Arial,sans-serif;margin:0 0 4px">Thank you, ${firstName.replace(/</g, "&lt;")}. We've received your payment and your order is being prepared for shipment.</p>
        <p style="font-size:12px;color:#9e9994;font-family:Arial,sans-serif;margin:0 0 4px">Order: <strong style="color:#1a1a1a">${displayId}</strong></p>
      </div>
      ${itemsBlock}
      ${fflBlock ? fflBlock.replace("FFL Transfer Dealer", "Shipping To Your FFL Dealer") + `<p style="font-size:11px;color:#9e9994;font-family:Arial,sans-serif;margin:8px 0 0;padding:0 28px 24px;line-height:1.5">We'll notify you once your order ships. Your FFL dealer will contact you when the firearm arrives for pickup and transfer paperwork.</p>` : ""}
      <div style="padding:0 28px 28px">
        <p style="font-size:11px;color:#9e9994;font-family:Arial,sans-serif;line-height:1.7;margin:0">Questions? Contact us at <a href="mailto:${SALES}" style="color:#c9a96e">${SALES}</a></p>
      </div>`)

    const salesHtml = emailWrap(`
      <div style="background:#1a1a1a;padding:20px 28px">
        <span style="font-size:9px;letter-spacing:0.26em;text-transform:uppercase;color:#c9a96e;font-family:Arial,sans-serif;font-weight:500">Luxus Collection</span>
        <span style="font-size:11px;color:#c9a96e;font-family:Arial,sans-serif;margin-left:16px;font-weight:500">PAYMENT CONFIRMED — ${displayId}</span>
      </div>
      <div style="padding:28px 28px 8px">
        <h2 style="font-size:22px;font-weight:400;color:#1a1a1a;margin:0 0 4px;font-family:Georgia,serif">Payment Received</h2>
        <p style="font-size:12px;color:#9e9994;font-family:Arial,sans-serif;margin:0 0 24px">Customer notified. Prepare order for shipment.</p>
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${[
          ["Order", displayId],
          ["Customer", fullName],
          ["Email", order.email],
          ["Total", fmt(total)],
          ...(fflName ? [["FFL Dealer", fflName + (fflAddr ? " — " + fflAddr : "")]] : []),
        ].map(([l, v]) => infoRow(l, v)).join("")}
      </table>`)

    await Promise.all([
      sendEmail({ to: order.email, subject: `Payment Received — Order ${displayId}`, html: buyerHtml, replyTo: SALES }),
      sendEmail({ to: SALES,       subject: `Payment Confirmed — ${displayId} — ${fullName}`, html: salesHtml }),
    ])
  }

  // ── Shipped ────────────────────────────────────────────────────────────────
  if (body.type === "shipped") {
    const tracking = body.tracking_number || ""
    const carrier  = body.carrier || ""

    const trackingBlock = tracking ? `
      <div style="margin:0 28px 24px;padding:20px;background:#1a1a1a">
        <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#c9a96e;font-family:Arial,sans-serif;font-weight:500;margin:0 0 10px">Tracking Information</p>
        ${carrier ? `<p style="font-size:11px;color:#aaa;font-family:Arial,sans-serif;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.1em">${carrier.replace(/</g, "&lt;")}</p>` : ""}
        <p style="font-size:18px;color:#fff;font-family:monospace;margin:0;letter-spacing:0.08em;word-break:break-all">${tracking.replace(/</g, "&lt;")}</p>
      </div>` : ""

    const fflShipBlock = fflName ? `
      <div style="margin:0 28px 24px;padding:14px 16px;background:#f5f3ef;border-left:2px solid #c9a96e">
        <p style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#c9a96e;font-family:Arial,sans-serif;font-weight:500;margin:0 0 5px">Shipping To Your FFL Dealer</p>
        <p style="font-size:13px;font-weight:500;color:#1a1a1a;font-family:Arial,sans-serif;margin:0 0 3px">${fflName.replace(/</g, "&lt;")}</p>
        ${fflAddr ? `<p style="font-size:12px;color:#555;font-family:Arial,sans-serif;margin:0 0 8px">${fflAddr.replace(/</g, "&lt;")}</p>` : ""}
        <p style="font-size:11px;color:#9e9994;font-family:Arial,sans-serif;margin:0;line-height:1.5">Your dealer will contact you when the firearm arrives. Please bring a valid government-issued ID and any required paperwork for the transfer.</p>
      </div>` : ""

    const buyerHtml = emailWrap(`
      <div style="background:#1a1a1a;padding:20px 28px">
        <span style="font-size:9px;letter-spacing:0.26em;text-transform:uppercase;color:#c9a96e;font-family:Arial,sans-serif;font-weight:500">Luxus Collection</span>
      </div>
      <div style="padding:28px 28px 20px">
        <h2 style="font-size:24px;font-weight:400;color:#1a1a1a;margin:0 0 8px;font-family:Georgia,serif">Your Order Has Shipped</h2>
        <p style="font-size:13px;color:#555;font-family:Arial,sans-serif;margin:0 0 4px">Good news, ${firstName.replace(/</g, "&lt;")}. Your order ${displayId} is on its way.</p>
      </div>
      ${trackingBlock}
      ${fflShipBlock}
      ${itemsBlock}
      <div style="padding:0 28px 28px">
        <p style="font-size:11px;color:#9e9994;font-family:Arial,sans-serif;line-height:1.7;margin:0">Questions? Contact us at <a href="mailto:${SALES}" style="color:#c9a96e">${SALES}</a></p>
      </div>`)

    const salesHtml = emailWrap(`
      <div style="background:#1a1a1a;padding:20px 28px">
        <span style="font-size:9px;letter-spacing:0.26em;text-transform:uppercase;color:#c9a96e;font-family:Arial,sans-serif;font-weight:500">Luxus Collection</span>
        <span style="font-size:11px;color:#c9a96e;font-family:Arial,sans-serif;margin-left:16px;font-weight:500">ORDER SHIPPED — ${displayId}</span>
      </div>
      <div style="padding:28px 28px 8px">
        <h2 style="font-size:22px;font-weight:400;color:#1a1a1a;margin:0 0 4px;font-family:Georgia,serif">Order Marked as Shipped</h2>
        <p style="font-size:12px;color:#9e9994;font-family:Arial,sans-serif;margin:0 0 24px">Customer has been notified.</p>
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${[
          ["Order", displayId],
          ["Customer", fullName],
          ["Email", order.email],
          ...(carrier  ? [["Carrier",    carrier]]  : []),
          ...(tracking ? [["Tracking #", tracking]] : []),
          ...(fflName  ? [["FFL Dealer", fflName + (fflAddr ? " — " + fflAddr : "")]] : []),
        ].map(([l, v]) => infoRow(l, v)).join("")}
      </table>`)

    await Promise.all([
      sendEmail({ to: order.email, subject: `Your Order Has Shipped — ${displayId}`, html: buyerHtml, replyTo: SALES }),
      sendEmail({ to: SALES,       subject: `Order Shipped — ${displayId} — ${fullName}`, html: salesHtml }),
    ])
  }

  return res.json({ ok: true })
}
