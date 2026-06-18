#!/usr/bin/env node
/**
 * One-time + on-demand product indexer.
 * Fetches all products from Medusa and indexes them into Meilisearch.
 * Run: node scripts/index-products.js
 */

const MEDUSA_URL    = process.env.MEDUSA_URL    ?? 'http://localhost:9000'
const MEILI_URL     = process.env.MEILI_URL     ?? 'http://localhost:7700'
const MEILI_KEY     = process.env.MEILI_KEY     ?? ''   // required — never hardcode
const MEDUSA_KEY    = process.env.MEDUSA_API_KEY ?? ''

if (!MEILI_KEY) {
  console.error('MEILI_KEY env var is required.')
  process.exit(1)
}

const FIELDS = [
  'id', 'handle', 'title', 'subtitle', 'thumbnail',
  '*variants', '*variants.prices',
  '+metadata',
  '*attribute_values', '*attribute_values.attribute_type',
  '*categories', '*images',
].join(',')

function buildAttrMap(p) {
  const map = {}
  for (const av of (p.attribute_values ?? [])) {
    const slug = av.attribute_type?.slug
    if (!slug || av.value == null) continue
    const val = String(av.value).trim()
    if (!val) continue
    if (!map[slug]) map[slug] = []
    if (!map[slug].includes(val)) map[slug].push(val)
  }
  return map
}

function mapProduct(p) {
  const attrs = buildAttrMap(p)
  const brand  = (attrs['brand']         ?? []).join(' / ') || null
  const model  = (attrs['model']         ?? []).join(' / ') || null
  const caliber= (attrs['caliber']       ?? []).join(' / ') || null
  const action = (attrs['action']        ?? []).join(' / ') || null
  const barrel = (attrs['barrel-length'] ?? []).join(' / ') || null

  const price = p.variants?.[0]?.prices?.[0]?.amount
    ? Math.round(p.variants[0].prices[0].amount / 100)
    : null

  const inStock = p.variants?.[0]?.manage_inventory === false
    ? true
    : (p.variants?.[0]?.inventory_quantity ?? 1) > 0

  return {
    id:                  p.id,
    handle:              p.handle,
    title:               p.title,
    subtitle:            p.subtitle ?? null,
    sku:                 p.variants?.[0]?.sku ?? null,
    brand,
    model,
    caliber,
    action,
    barrel_length:       barrel,
    price,
    contact_for_pricing: p.metadata?.contact_for_pricing === 'true',
    in_stock:            inStock,
    thumbnail:           p.thumbnail ?? null,
    primary_category:    p.metadata?.primary_category ?? null,
    collection_handle:   p.collection?.handle ?? null,
    short_description:   p.metadata?.short_description ?? null,
  }
}

// Backroom/private items must never appear in public search. Mirror the
// storefront's is_backroom_hidden check (master_backroom + legacy backroom_hidden).
function isBackroomHidden(p) {
  return p?.metadata?.master_backroom === 'true' || p?.metadata?.backroom_hidden === 'true'
}

async function fetchAllProducts() {
  const PAGE = 100
  let offset = 0
  const all = []

  while (true) {
    const url = `${MEDUSA_URL}/store/products?limit=${PAGE}&offset=${offset}&fields=${encodeURIComponent(FIELDS)}`
    const headers = { 'x-publishable-api-key': MEDUSA_KEY }
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`Medusa ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const products = data.products ?? []
    all.push(...products)
    console.log(`  Fetched ${all.length} / ${data.count ?? '?'} products`)
    if (all.length >= (data.count ?? 0) || products.length === 0) break
    offset += PAGE
  }
  return all
}

async function waitForTask(taskUid) {
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500))
    const res = await fetch(`${MEILI_URL}/tasks/${taskUid}`, {
      headers: { Authorization: `Bearer ${MEILI_KEY}` },
    })
    const task = await res.json()
    if (task.status === 'succeeded') return task
    if (task.status === 'failed') throw new Error(`Task failed: ${JSON.stringify(task.error)}`)
  }
  throw new Error('Task timed out')
}

async function main() {
  console.log('Fetching products from Medusa...')
  const raw = await fetchAllProducts()
  console.log(`Total: ${raw.length} products`)

  // Exclude backroom/private items — they must never be in the public search index.
  const publicProducts = raw.filter(p => !isBackroomHidden(p))
  const excluded = raw.length - publicProducts.length
  console.log(`Excluding ${excluded} backroom/private product(s); indexing ${publicProducts.length} public.`)

  const docs = publicProducts.map(mapProduct)

  // Clean rebuild: clear the index first so any previously-indexed backroom items
  // (or deleted/renamed products) are purged, then re-add only the public docs.
  console.log('\nClearing existing documents...')
  const del = await fetch(`${MEILI_URL}/indexes/products/documents`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${MEILI_KEY}` },
  })
  await waitForTask((await del.json()).taskUid)

  console.log(`Indexing ${docs.length} documents into Meilisearch...`)

  // Send in batches of 100
  const BATCH = 100
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH)
    const res = await fetch(`${MEILI_URL}/indexes/products/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${MEILI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    })
    const task = await res.json()
    await waitForTask(task.taskUid)
    console.log(`  Indexed ${Math.min(i + BATCH, docs.length)} / ${docs.length}`)
  }

  console.log('\nDone. Verifying...')
  const stats = await fetch(`${MEILI_URL}/indexes/products/stats`, {
    headers: { Authorization: `Bearer ${MEILI_KEY}` },
  })
  const s = await stats.json()
  console.log(`Meilisearch products index: ${s.numberOfDocuments} documents`)
}

main().catch(err => { console.error(err); process.exit(1) })
