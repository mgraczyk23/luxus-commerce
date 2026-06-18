const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

// Shared layout wrapper
function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Luxus Collection</title>
</head>
<body style="margin:0;padding:0;background:#f3f3f5;font-family:'Inter',Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr><td style="background:#ffffff;border-top:2px solid #7e5e10;padding:28px 40px 22px;text-align:center;border-bottom:1px solid #e4e4e6;">
          <p style="margin:0;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#7e5e10;font-weight:600;">Luxus Collection</p>
        </td></tr>

        <!-- Content -->
        <tr><td style="background:#ffffff;padding:36px 40px 32px;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#ffffff;border-top:1px solid #e4e4e6;padding:20px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;color:#707076;">Luxus Collection · Curated Fine Firearms</p>
          <p style="margin:0;font-size:10px;color:#9a9a9a;">Questions? Reply to this email or contact us at <a href="mailto:info@luxus-collection.com" style="color:#7e5e10;">info@luxus-collection.com</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Reusable pieces
function eyebrow(text: string): string {
  return `<p style="margin:0 0 10px;font-size:8.5px;letter-spacing:0.26em;text-transform:uppercase;color:#7e5e10;font-weight:600;">${text}</p>`
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 14px;font-size:26px;font-weight:400;color:#1a1a1a;line-height:1.2;">${text}</h1>`
}

function body(text: string): string {
  return `<p style="margin:0 0 18px;font-size:13px;font-weight:300;color:#525258;line-height:1.8;">${text}</p>`
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 14px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#707076;font-weight:500;white-space:nowrap;width:1%;border-bottom:1px solid #e4e4e6;">${label}</td>
    <td style="padding:8px 14px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #e4e4e6;">${value}</td>
  </tr>`
}

function infoTable(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e6;border-bottom:none;margin-bottom:24px;">${rows}</table>`
}

function amountBox(label: string, amount: number, sub?: string): string {
  return `<div style="background:#fafafa;border:1px solid #e4e4e6;border-left:2px solid #7e5e10;padding:16px 20px;margin-bottom:24px;">
    <p style="margin:0 0 4px;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#707076;">${label}</p>
    <p style="margin:0;font-size:28px;font-weight:400;color:#1a1a1a;">${fmt(amount)}</p>
    ${sub ? `<p style="margin:4px 0 0;font-size:11px;color:#7e5e10;">${sub}</p>` : ""}
  </div>`
}

function cta(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;padding:13px 32px;background:#7e5e10;color:#ffffff;font-size:9.5px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;text-decoration:none;">
    ${text}
  </a>`
}

function divider(): string {
  return `<div style="height:1px;background:linear-gradient(to right,#7e5e1040,transparent);margin:24px 0;"></div>`
}

// ── Templates ──────────────────────────────────────────────────────────────

export type NewOfferData = {
  productTitle:  string
  productHandle: string
  buyerName:     string
  buyerEmail:    string
  buyerPhone:    string | null
  offerAmount:   number
  listedPrice:   number | null
  message:       string | null
  adminUrl:      string
  productId:     string
}

export function newOfferAdminEmail(d: NewOfferData): { subject: string; html: string } {
  const pct = d.listedPrice ? Math.round((d.offerAmount / d.listedPrice) * 100) : null
  const sub = pct !== null ? `${pct}% of listed price` : undefined

  const content = `
    ${eyebrow("New Offer Received")}
    ${heading(d.productTitle)}
    ${body(`A new offer has been submitted on <strong>${d.productTitle}</strong>. Review and respond from the admin panel.`)}
    ${amountBox("Offer Amount", d.offerAmount, sub)}
    ${infoTable([
      infoRow("Buyer",   d.buyerName),
      infoRow("Email",   `<a href="mailto:${d.buyerEmail}" style="color:#7e5e10;">${d.buyerEmail}</a>`),
      d.buyerPhone ? infoRow("Phone", d.buyerPhone) : "",
      d.listedPrice ? infoRow("Listed At", fmt(d.listedPrice)) : "",
    ].filter(Boolean).join(""))}
    ${d.message ? `
      <p style="margin:0 0 8px;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#707076;">Buyer Message</p>
      <div style="background:#fafafa;border:1px solid #e4e4e6;padding:14px 16px;margin-bottom:24px;font-size:13px;color:#525258;line-height:1.7;">${d.message}</div>
    ` : ""}
    ${cta("Review Offer in Admin", `${d.adminUrl}/products/${d.productId}`)}
  `

  return {
    subject: `New Offer: ${d.productTitle} — ${fmt(d.offerAmount)}`,
    html:    layout(content),
  }
}

export type OfferAcceptedData = {
  productTitle:   string
  productHandle:  string
  buyerFirstName: string
  offerAmount:    number
  checkoutUrl:    string
  storefrontUrl:  string
}

export function offerAcceptedEmail(d: OfferAcceptedData): { subject: string; html: string } {
  const content = `
    ${eyebrow("Offer Accepted")}
    ${heading(`Congratulations, ${d.buyerFirstName}!`)}
    ${body(`We are pleased to accept your offer on the <strong>${d.productTitle}</strong>.`)}
    ${amountBox("Accepted Offer", d.offerAmount)}
    ${body("Use the button below to complete your purchase. You'll provide your billing address, FFL transfer dealer, and payment details — the whole process takes under two minutes.")}
    <p style="margin:0 0 10px;font-size:11px;color:#707076;line-height:1.6;">This checkout link is valid for <strong style="color:#1a1a1a;">72 hours</strong>. After that, please contact us to arrange an extension.</p>
    ${cta("Complete Your Purchase →", d.checkoutUrl)}
    ${divider()}
    ${body("If you have any questions, please reply to this email and we will be happy to assist.")}
  `

  return {
    subject: `Your Offer Was Accepted — Complete Your Purchase`,
    html:    layout(content),
  }
}

export type OfferRejectedData = {
  productTitle:   string
  productHandle:  string
  buyerFirstName: string
  offerAmount:    number
  storefrontUrl:  string
}

export function offerRejectedEmail(d: OfferRejectedData): { subject: string; html: string } {
  const content = `
    ${eyebrow("Regarding Your Offer")}
    ${heading(`Thank you, ${d.buyerFirstName}`)}
    ${body(`Thank you for your interest in the <strong>${d.productTitle}</strong> and for taking the time to submit an offer.`)}
    ${body(`After careful consideration, we are unable to accept your offer of <strong>${fmt(d.offerAmount)}</strong> at this time.`)}
    ${body("We invite you to browse our current collection — new pieces are added regularly, and we would be glad to assist you in finding a piece that meets your requirements.")}
    ${divider()}
    ${cta("Browse the Collection", `${d.storefrontUrl}/shop`)}
  `

  return {
    subject: `Regarding Your Offer — ${d.productTitle}`,
    html:    layout(content),
  }
}

export type OfferCounteredData = {
  productTitle:   string
  productHandle:  string
  buyerFirstName: string
  originalAmount: number
  counterAmount:  number
  acceptUrl:      string
  storefrontUrl:  string
}

export function offerCounteredEmail(d: OfferCounteredData): { subject: string; html: string } {
  const content = `
    ${eyebrow("Counter Offer")}
    ${heading(`A Counter Offer for ${d.buyerFirstName}`)}
    ${body(`Thank you for your offer on the <strong>${d.productTitle}</strong>. We appreciate your interest and would like to propose a counter offer.`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="width:50%;padding-right:8px;">
          <div style="background:#fafafa;border:1px solid #e4e4e6;padding:14px 16px;text-align:center;">
            <p style="margin:0 0 4px;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#707076;">Your Offer</p>
            <p style="margin:0;font-size:20px;font-weight:400;color:#9a9a9a;text-decoration:line-through;">${fmt(d.originalAmount)}</p>
          </div>
        </td>
        <td style="width:50%;padding-left:8px;">
          <div style="background:#fafafa;border:1px solid #e4e4e6;border-left:2px solid #7e5e10;padding:14px 16px;text-align:center;">
            <p style="margin:0 0 4px;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#7e5e10;">Our Counter</p>
            <p style="margin:0;font-size:20px;font-weight:400;color:#1a1a1a;">${fmt(d.counterAmount)}</p>
          </div>
        </td>
      </tr>
    </table>
    ${body("If you'd like to accept this counter offer, click the button below to confirm and proceed directly to checkout.")}
    ${cta("Accept Counter Offer & Checkout →", d.acceptUrl)}
    ${divider()}
    <p style="margin:0;font-size:11px;color:#707076;line-height:1.6;">This counter offer is valid for the duration of your original offer period. If you'd prefer to discuss further, reply to this email and we'll be happy to assist.</p>
  `

  return {
    subject: `Counter Offer: ${d.productTitle} — ${fmt(d.counterAmount)}`,
    html:    layout(content),
  }
}
