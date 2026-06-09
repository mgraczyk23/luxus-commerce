/**
 * setup-checkout.mjs
 *
 * One-time Medusa admin setup:
 *   - US tax region + Florida 7% rate
 *   - FedEx Next Day Air shipping option (flat-rate)
 *   - Elavon payment provider enabled for US region
 *
 * Usage:
 *   MEDUSA_ADMIN_EMAIL=admin@luxus-collection.com \
 *   MEDUSA_ADMIN_PASSWORD=yourpassword \
 *   SHIPPING_RATE=85 \
 *   node scripts/setup-checkout.mjs
 *
 * SHIPPING_RATE: flat rate in USD (default 85)
 */

const MEDUSA_URL = process.env.MEDUSA_URL || "http://localhost:9000"
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD
const SHIPPING_RATE_USD = parseFloat(process.env.SHIPPING_RATE || "85")

const US_REGION_ID = "reg_01KRM4PNPXXVRHKQP5NN4XFMQX"  // existing US region
const LUXUS_LOCATION_ID = "sloc_01KRM4E1EXP5DK3N9E6EPKFQ9B"  // existing Luxus Collection location

if (!EMAIL || !PASSWORD) {
  console.error("Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD")
  process.exit(1)
}

async function getToken() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const data = await res.json()
  if (!data.token) {
    console.error("Auth failed:", JSON.stringify(data))
    process.exit(1)
  }
  return data.token
}

async function api(token, method, path, body) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) {
    console.error(`[${method} ${path}] ${res.status}:`, JSON.stringify(data))
    throw new Error(`API error ${res.status}`)
  }
  return data
}

async function main() {
  console.log("Authenticating...")
  const token = await getToken()
  console.log("✓ Authenticated\n")

  // ─── 1. US Tax Region ──────────────────────────────────────────────────────
  console.log("Setting up US tax region...")
  let usRegionId
  try {
    const existing = await api(token, "GET", "/admin/tax-regions?country_code=us&limit=1")
    if (existing.tax_regions?.length > 0) {
      usRegionId = existing.tax_regions[0].id
      console.log("  ✓ US tax region already exists:", usRegionId)
    }
  } catch { /* not found */ }

  if (!usRegionId) {
    const { tax_region } = await api(token, "POST", "/admin/tax-regions", {
      country_code: "us",
      provider_id: "tp_system",
    })
    usRegionId = tax_region.id
    console.log("  ✓ Created US tax region:", usRegionId)
  }

  // ─── 2. Florida Province Tax Region ────────────────────────────────────────
  console.log("Setting up Florida tax region...")
  let flRegionId
  try {
    const existing = await api(token, "GET", "/admin/tax-regions?country_code=us&province_code=fl&limit=1")
    if (existing.tax_regions?.length > 0) {
      flRegionId = existing.tax_regions[0].id
      console.log("  ✓ Florida tax region already exists:", flRegionId)
    }
  } catch { /* not found */ }

  if (!flRegionId) {
    const { tax_region } = await api(token, "POST", "/admin/tax-regions", {
      country_code: "us",
      province_code: "fl",
      parent_id: usRegionId,
      provider_id: "tp_system",
    })
    flRegionId = tax_region.id
    console.log("  ✓ Created Florida tax region:", flRegionId)
  }

  // ─── 3. Florida 7% Tax Rate ─────────────────────────────────────────────────
  console.log("Setting up Florida 7% tax rate...")
  const { tax_rates: existingRates } = await api(token, "GET", `/admin/tax-rates?tax_region_id=${flRegionId}&limit=10`)
  if (existingRates?.length > 0) {
    console.log("  ✓ Florida tax rates already set:", existingRates.map(r => `${r.name} ${r.rate}%`).join(", "))
  } else {
    const { tax_rate } = await api(token, "POST", "/admin/tax-rates", {
      tax_region_id: flRegionId,
      rate: 7,
      name: "FL Sales Tax (6% state + 1% Sarasota Co.)",
      is_default: true,
    })
    console.log("  ✓ Created FL 7% tax rate:", tax_rate.id)
  }

  // ─── 4. Shipping Profile ────────────────────────────────────────────────────
  console.log("Setting up shipping profile...")
  let shippingProfileId
  const { shipping_profiles } = await api(token, "GET", "/admin/shipping-profiles?limit=20")
  const existing = shipping_profiles?.find(p => p.name === "FFL Firearms" || p.type === "default")
  if (existing) {
    shippingProfileId = existing.id
    console.log("  ✓ Using shipping profile:", existing.name, shippingProfileId)
  } else {
    const { shipping_profile } = await api(token, "POST", "/admin/shipping-profiles", {
      name: "FFL Firearms",
      type: "default",
    })
    shippingProfileId = shipping_profile.id
    console.log("  ✓ Created shipping profile:", shippingProfileId)
  }

  // ─── 5. Fulfillment Set for Stock Location ──────────────────────────────────
  console.log("Setting up fulfillment set...")
  let fulfillmentSetId
  const { stock_location } = await api(token, "GET", `/admin/stock-locations/${LUXUS_LOCATION_ID}?fields=*fulfillment_sets`)
  if (stock_location?.fulfillment_sets?.length > 0) {
    fulfillmentSetId = stock_location.fulfillment_sets[0].id
    console.log("  ✓ Fulfillment set already exists:", fulfillmentSetId)
  } else {
    const { fulfillment_set } = await api(token, "POST", `/admin/stock-locations/${LUXUS_LOCATION_ID}/fulfillment-sets`, {
      name: "Luxus Collection Shipping",
      type: "shipping",
    })
    fulfillmentSetId = fulfillment_set.id
    console.log("  ✓ Created fulfillment set:", fulfillmentSetId)
  }

  // ─── 6. Service Zone (US) ───────────────────────────────────────────────────
  console.log("Setting up US service zone...")
  let serviceZoneId
  const { fulfillment_set } = await api(token, "GET", `/admin/fulfillment-sets/${fulfillmentSetId}?fields=*service_zones`)
  if (fulfillment_set?.service_zones?.length > 0) {
    serviceZoneId = fulfillment_set.service_zones[0].id
    console.log("  ✓ Service zone already exists:", serviceZoneId)
  } else {
    const { fulfillment_set: updated } = await api(token, "POST", `/admin/fulfillment-sets/${fulfillmentSetId}/service-zones`, {
      name: "United States",
      geo_zones: [{ type: "country", country_code: "us" }],
    })
    serviceZoneId = updated.service_zones?.[0]?.id
    console.log("  ✓ Created US service zone:", serviceZoneId)
  }

  // ─── 7. Shipping Option (Next Day Air) ─────────────────────────────────────
  console.log(`Setting up Next Day Air shipping option at $${SHIPPING_RATE_USD}...`)
  const { shipping_options: existingOpts } = await api(token, "GET", `/admin/shipping-options?service_zone_id=${serviceZoneId}&limit=10`)
  const existingOpt = existingOpts?.find(o => o.name?.includes("Next Day"))
  if (existingOpt) {
    console.log("  ✓ Next Day Air option already exists:", existingOpt.id)
  } else {
    const { shipping_option } = await api(token, "POST", "/admin/shipping-options", {
      name: "FedEx Next Day Air",
      service_zone_id: serviceZoneId,
      shipping_profile_id: shippingProfileId,
      provider_id: "manual_manual",
      price_type: "flat",
      type: { label: "Next Day Air", description: "FedEx overnight, signature required", code: "next_day_air" },
      prices: [
        { currency_code: "usd", amount: Math.round(SHIPPING_RATE_USD * 100) },
        { region_id: US_REGION_ID, amount: Math.round(SHIPPING_RATE_USD * 100) },
      ],
      rules: [],
    })
    console.log("  ✓ Created Next Day Air shipping option:", shipping_option.id)
  }

  // ─── 8. Enable Elavon Payment Provider for US Region ───────────────────────
  console.log("Enabling payment providers for US region...")
  try {
    await api(token, "POST", `/admin/regions/${US_REGION_ID}/payment-providers`, {
      add: ["pp_elavon_elavon", "pp_system_default"],
    })
    console.log("  ✓ Elavon + system payment providers enabled for US region")
  } catch (e) {
    console.log("  ! Could not enable payment providers (may already be enabled):", e.message)
  }

  // ─── 9. Link Stock Location to Sales Channel ────────────────────────────────
  console.log("Linking stock location to sales channel...")
  try {
    const { sales_channels } = await api(token, "GET", "/admin/sales-channels?limit=5")
    if (sales_channels?.length > 0) {
      const scId = sales_channels[0].id
      await api(token, "POST", `/admin/stock-locations/${LUXUS_LOCATION_ID}/sales-channels`, {
        add: [scId],
      })
      console.log("  ✓ Linked to sales channel:", sales_channels[0].name)
    }
  } catch (e) {
    console.log("  ! Sales channel link (may already be linked):", e.message)
  }

  console.log("\n✅ Checkout setup complete!")
  console.log("\nNext steps:")
  console.log("  1. Rebuild Medusa: docker compose up -d --build medusa")
  console.log("  2. In Medusa admin, verify the shipping option shows the correct rate")
  console.log("  3. Verify Tax Regions show US > Florida at 7%")
  console.log("  4. Test checkout with a Florida FFL dealer address")
}

main().catch(e => { console.error("Setup failed:", e); process.exit(1) })
