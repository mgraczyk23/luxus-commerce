/**
 * Seed FAQ items into Payload CMS.
 * Run from the server: node scripts/seed-faq.mjs
 *
 * Requires PAYLOAD_URL and PAYLOAD_EMAIL + PAYLOAD_PASSWORD env vars,
 * or edit the constants below directly.
 */

const PAYLOAD_URL   = process.env.PAYLOAD_URL   ?? 'https://cms.luxus-collection.com'
const PAYLOAD_EMAIL = process.env.PAYLOAD_EMAIL ?? 'mgraczyk65@gmail.com'
const PAYLOAD_PASS  = process.env.PAYLOAD_PASSWORD ?? ''

if (!PAYLOAD_PASS) {
  console.error('Set PAYLOAD_PASSWORD env var before running.')
  process.exit(1)
}

// ── FAQ data ─────────────────────────────────────────────────────────────────
const FAQ = [
  // Ordering & Purchasing
  { category: 'Ordering & Purchasing', sortOrder: 10, question: 'Can I buy a gun online?', answer: 'Yes. Because Luxus Collection specializes in high-end collectibles, a customer service representative will personally assist with every order, confirming specifications, verifying FFL paperwork, and walking you through any state-specific considerations. Contact us by phone, email, or the inquiry form on any product page and we\'ll be happy to help.' },
  { category: 'Ordering & Purchasing', sortOrder: 20, question: 'How do I purchase a firearm from Luxus Collection?', answer: 'Browsing and adding items to your cart works just like any e-commerce store. At checkout you\'ll be asked to provide your FFL dealer\'s information — the dealer who will receive the firearm and complete the transfer paperwork on your behalf. Once your order is confirmed and payment cleared, we ship directly to your dealer.' },
  { category: 'Ordering & Purchasing', sortOrder: 30, question: 'Can I purchase a firearm if I live outside the United States?', answer: 'At this time Luxus Collection only ships to FFL-licensed dealers within the contiguous United States, Alaska, and Hawaii. We are unable to facilitate international transfers due to ITAR regulations and the complexity of import/export licensing.' },
  { category: 'Ordering & Purchasing', sortOrder: 40, question: 'Do I need to pass a background check?', answer: 'Yes. All firearm transfers are subject to an NICS (National Instant Criminal Background Check System) background check, which is conducted by your FFL dealer at the time of transfer. This is a federal requirement that applies to every firearm purchase regardless of the sale channel.' },
  { category: 'Ordering & Purchasing', sortOrder: 50, question: 'Can I purchase a firearm as a gift?', answer: 'Straw purchases — buying a firearm for someone who cannot legally purchase one themselves — are a federal felony. Gifting a firearm to someone who is legally permitted to own one is lawful in most states, but the recipient must still complete the FFL transfer paperwork in their name. We recommend consulting an attorney if you have questions about your specific situation.' },
  { category: 'Ordering & Purchasing', sortOrder: 60, question: "What if the firearm I want is listed as 'Contact Us For Pricing'?", answer: 'Certain pieces — prototype models, bespoke commissions, and items with provenance or appraisal value — are priced individually based on current market conditions. Use the inquiry form on the product page or contact us directly at info@luxus-collection.com and we will respond with pricing and availability within one business day.' },

  // FFL Transfers & Shipping
  { category: 'FFL Transfers & Shipping', sortOrder: 10, question: 'What is your policy regarding shipping firearms?', answer: 'Our standard policy is to ship every firearm to your local Federal Firearms Licensee (FFL). The FFL dealer completes the transfer paperwork and background check before releasing the firearm to you. If you don\'t already have an FFL dealer lined up, contact us — we\'ll help you locate one nearby or recommend a transfer partner in your area.' },
  { category: 'FFL Transfers & Shipping', sortOrder: 20, question: 'What is an FFL transfer and why is it required?', answer: 'A Federal Firearms Licensee (FFL) is a federally licensed dealer authorized to transfer firearms. Federal law requires that interstate firearm sales ship to and through an FFL dealer, who then conducts the background check and paperwork before releasing the firearm to you. This applies to all online firearm purchases, including ours.' },
  { category: 'FFL Transfers & Shipping', sortOrder: 30, question: 'How do I find an FFL dealer near me?', answer: 'Most local gun shops hold an FFL license. The ATF\'s online database (atfonline.gov) allows you to search for licensed dealers by ZIP code. When you\'ve identified a dealer willing to accept transfers, ask them to provide their FFL license copy and contact information, which you\'ll enter during checkout. Transfer fees vary by dealer, typically ranging from $25–$75.' },
  { category: 'FFL Transfers & Shipping', sortOrder: 40, question: 'How long does shipping take?', answer: 'Most in-stock orders ship within 2–3 business days of payment clearing. Transit to your FFL dealer typically takes 3–7 business days via FedEx or UPS. We ship signature-required and insured on all orders. You\'ll receive tracking information by email as soon as the label is created. Custom and contact-for-pricing items have individual lead times discussed at the time of order.' },
  { category: 'FFL Transfers & Shipping', sortOrder: 50, question: 'Do you ship to California, New York, or other states with stricter laws?', answer: 'We make every effort to accommodate customers in all 50 states, but certain firearms cannot legally be transferred in certain jurisdictions due to magazine capacity restrictions, feature bans, or roster requirements. At checkout, if your shipping state has restrictions that affect the item in your cart, we will notify you before processing payment. It is ultimately the buyer\'s responsibility to understand the laws in their state.' },
  { category: 'FFL Transfers & Shipping', sortOrder: 60, question: 'What happens if my FFL dealer closes or is unavailable?', answer: 'Contact us as soon as you become aware of the issue. If your firearm has not yet shipped, we can update the receiving FFL at no charge. If it has already shipped, we will work with you and FedEx or UPS to redirect the shipment. Firearms cannot be left with a carrier — they must be received by a licensed FFL.' },

  // Products & Inventory
  { category: 'Products & Inventory', sortOrder: 10, question: 'Are all firearms listed on the site currently in stock?', answer: 'We make every effort to keep our inventory current in real time. Items marked \'In Stock\' are physically on hand at our facility and ready to ship. Occasionally, high-demand pieces may sell between inventory updates — if this occurs, we will contact you promptly and offer a full refund or the option to be notified when the piece is available again.' },
  { category: 'Products & Inventory', sortOrder: 20, question: 'Do you sell factory-new firearms only, or also pre-owned?', answer: 'We carry both new-in-box production firearms and pre-owned pieces that meet our condition standards. All pre-owned listings include a detailed condition grade and are inspected before listing. \'Pre-owned\' on a Nighthawk or Cabot can mean a gun with 50 rounds through it — we describe what we know and photograph what we have.' },
  { category: 'Products & Inventory', sortOrder: 30, question: 'Can I request a specific configuration or custom build?', answer: 'Yes. We have direct relationships with our manufacturing partners and can facilitate custom orders with Nighthawk Custom, Cabot Guns, Korth, and Wilson Combat, among others. Lead times vary by manufacturer and specification — contact us with your requirements and we\'ll quote you a lead time and pricing.' },
  { category: 'Products & Inventory', sortOrder: 40, question: 'Do you provide test-fire or accuracy data with your firearms?', answer: 'Production firearms are test-fired at the factory prior to shipping to us. Select manufacturers — Nighthawk Custom and Cabot Guns in particular — include accuracy targets fired at the factory with each pistol. We pass these on to the buyer when available. We do not individually test-fire every piece on our end.' },

  // Payments & Pricing
  { category: 'Payments & Pricing', sortOrder: 10, question: 'What payment methods do you accept?', answer: 'We accept American Express, Discover, MasterCard, and Visa. We also accept bank wire transfers, which we recommend for purchases over $5,000 as they avoid card processing fees. We do not accept personal checks or money orders. Cryptocurrency is not accepted at this time.' },
  { category: 'Payments & Pricing', sortOrder: 20, question: 'Do you offer discounts on large purchases?', answer: 'We typically do not offer standard discounts on large orders. However, every request is evaluated on a case-by-case basis — the possibility of a discount depends on the specifics of the items in question. If you\'re planning a significant purchase, contact our sales team directly to discuss what you\'re looking at; we\'re happy to have the conversation.' },
  { category: 'Payments & Pricing', sortOrder: 30, question: 'Are prices negotiable?', answer: 'Our prices reflect current market value and the curation investment we make in sourcing exceptional pieces. We do not negotiate on production pieces. For pre-owned items and \'Contact Us For Pricing\' listings, there is occasionally flexibility — inquire directly and we will have an honest conversation.' },
  { category: 'Payments & Pricing', sortOrder: 40, question: 'Do you offer financing or layaway?', answer: 'We offer a layaway program for purchases over $2,000. A 25% non-refundable deposit holds the piece for up to 90 days, with the balance due before shipment. We do not currently offer third-party financing. Contact us to set up a layaway arrangement.' },
  { category: 'Payments & Pricing', sortOrder: 50, question: 'Is there a sales tax on my purchase?', answer: 'Sales tax is collected on orders shipped to states where we have nexus, in compliance with applicable law. The applicable rate and amount will be displayed at checkout before you complete your purchase.' },

  // Returns & Warranties
  { category: 'Returns & Warranties', sortOrder: 10, question: 'What is your return policy?', answer: 'New, unfired firearms may be returned within 10 days of FFL transfer for a full refund, minus a 5% restocking fee, provided the firearm is in its original, unaltered condition with all original packaging and accessories. Once a firearm has been fired, it is considered used and cannot be returned. Contact us before initiating any return — all returns require a Return Authorization number.' },
  { category: 'Returns & Warranties', sortOrder: 20, question: 'What if my firearm arrives damaged or defective?', answer: 'Document the damage photographically before accepting transfer from your FFL dealer, or refuse the shipment entirely if the outer packaging shows obvious damage. Contact us within 48 hours with photos and we will arrange return shipping at our expense and either replace the firearm or issue a full refund. Manufacturing defects are covered by the manufacturer\'s warranty.' },
  { category: 'Returns & Warranties', sortOrder: 30, question: 'What warranties apply to the firearms you sell?', answer: 'Every new firearm carries the manufacturer\'s warranty, which varies by brand. Nighthawk Custom and Wilson Combat offer limited lifetime warranties for the original owner. Cabot Guns and Korth offer similarly comprehensive coverage. Pre-owned firearms are sold as-is unless otherwise noted, though we will disclose any known issues.' },
  { category: 'Returns & Warranties', sortOrder: 40, question: 'Can I send a firearm directly to you for service or repair?', answer: 'We do not offer in-house service or repair. For warranty work, contact the manufacturer directly. For non-warranty gunsmithing, we are happy to refer you to qualified smiths who specialize in the relevant platform. Firearms sent to us without prior authorization will be refused.' },

  // Consignment & Trade-In
  { category: 'Consignment & Trade-In', sortOrder: 10, question: 'Do you accept firearms on consignment?', answer: 'Yes. We actively seek exceptional pieces for our consignment program. We specialize in production and custom pistols from the brands we carry, though we occasionally make exceptions for historically significant or particularly rare revolvers and pistols from other makers. The consignment process begins with a submission form and photos — we respond within 3 business days with our assessment.' },
  { category: 'Consignment & Trade-In', sortOrder: 20, question: 'What is your consignment commission rate?', answer: 'Our standard consignment rate is 15% of the final sale price for items listed at $1,500 or above, and 20% for items below $1,500. This covers listing, photography, storage, and transaction handling. There are no listing fees — you only pay if and when the item sells.' },
  { category: 'Consignment & Trade-In', sortOrder: 30, question: 'How do I ship a firearm to you for consignment?', answer: 'All consignment pieces must ship via a licensed FFL dealer on your end to our FFL on ours — the same process as any interstate firearm transfer. We will provide our FFL license copy and receiving instructions once a consignment agreement is signed. Never ship a firearm directly to our address without going through the FFL process.' },
  { category: 'Consignment & Trade-In', sortOrder: 40, question: 'Do you offer trade-in credit?', answer: 'We offer trade-in credit on a case-by-case basis for pieces that fit our inventory. Trade-in value is applied as a credit toward any purchase. To initiate a trade-in inquiry, send photos and a description — including any known history, original packaging, and accessories — to info@luxus-collection.com.' },
]

// ── Auth ──────────────────────────────────────────────────────────────────────
async function login() {
  const res = await fetch(`${PAYLOAD_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: PAYLOAD_EMAIL, password: PAYLOAD_PASS }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status}`)
  const data = await res.json()
  return data.token
}

// ── Seed ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log(`Connecting to ${PAYLOAD_URL}…`)
  const token = await login()
  console.log('Authenticated. Seeding FAQ items…\n')

  let ok = 0, fail = 0
  for (const item of FAQ) {
    const res = await fetch(`${PAYLOAD_URL}/api/faq-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
      body: JSON.stringify({ ...item, status: 'published' }),
    })
    if (res.ok) {
      ok++
      console.log(`  ✓  [${item.category}] ${item.question.slice(0, 60)}`)
    } else {
      fail++
      const err = await res.text()
      console.error(`  ✗  [${item.category}] ${item.question.slice(0, 60)}\n     → ${res.status}: ${err.slice(0, 120)}`)
    }
  }

  console.log(`\nDone — ${ok} created, ${fail} failed.`)
}

seed().catch(err => { console.error(err); process.exit(1) })
