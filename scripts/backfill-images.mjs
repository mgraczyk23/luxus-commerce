#!/usr/bin/env node
/**
 * Backfill missing featured images on already-imported Payload posts.
 *
 * Usage:
 *   PAYLOAD_EMAIL=you@example.com PAYLOAD_PASSWORD=yourpass node scripts/backfill-images.mjs
 *
 * Optional:
 *   WP_URL=https://luxus-collection.com
 *   PAYLOAD_URL=https://api.luxus-collection.com/cms
 *   DRY_RUN=1   — show what would be done without writing
 */

const WP_URL      = process.env.WP_URL      || 'https://luxus-collection.com'
const PAYLOAD_URL = process.env.PAYLOAD_URL  || 'https://api.luxus-collection.com/cms'
const DRY_RUN     = process.env.DRY_RUN === '1'

const EMAIL    = process.env.PAYLOAD_EMAIL
const PASSWORD = process.env.PAYLOAD_PASSWORD

if (!EMAIL || !PASSWORD) {
  console.error('ERROR: Set PAYLOAD_EMAIL and PAYLOAD_PASSWORD.')
  process.exit(1)
}

// ── Auth ────────────────────────────────────────────────────────────────────

process.stdout.write('Authenticating... ')
const loginRes = await fetch(`${PAYLOAD_URL}/api/users/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
})
if (!loginRes.ok) { console.error('Login failed:', await loginRes.text()); process.exit(1) }
const { token } = await loginRes.json()
if (!token) { console.error('No token returned'); process.exit(1) }
console.log('OK\n')

const AUTH = { 'Authorization': `JWT ${token}` }

// ── Helpers ──────────────────────────────────────────────────────────────────

async function payloadGet(path) {
  const res = await fetch(`${PAYLOAD_URL}/api${path}`, { headers: AUTH })
  if (!res.ok) throw new Error(`Payload GET ${path} → ${res.status}`)
  return res.json()
}

async function payloadPatch(path, body) {
  const res = await fetch(`${PAYLOAD_URL}/api${path}`, {
    method: 'PATCH',
    headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(`Payload PATCH ${path} → ${res.status}: ${JSON.stringify(j.errors ?? j)}`)
  }
  return res.json()
}

async function wpGet(path) {
  const res = await fetch(`${WP_URL}/wp-json/wp/v2${path}`)
  if (!res.ok) throw new Error(`WP GET ${path} → ${res.status}`)
  return res.json()
}

async function uploadImage(imageUrl, alt) {
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) return null
  const buffer = Buffer.from(await imgRes.arrayBuffer())
  const filename = imageUrl.split('/').pop().split('?')[0] || 'image.jpg'
  const mimeType = /\.png$/i.test(filename) ? 'image/png'
    : /\.gif$/i.test(filename) ? 'image/gif'
    : /\.webp$/i.test(filename) ? 'image/webp'
    : 'image/jpeg'
  const altText = alt || filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')

  const boundary = `----Boundary${Math.random().toString(36).slice(2)}`
  const filePart = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  )
  const metaPart = Buffer.from(
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="_payload"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ alt: altText })}`
  )
  const footer = Buffer.from(`\r\n--${boundary}--`)
  const body = Buffer.concat([filePart, buffer, metaPart, footer])

  const res = await fetch(`${PAYLOAD_URL}/api/media`, {
    method: 'POST',
    headers: { ...AUTH, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  })
  const json = await res.json()
  if (!res.ok) {
    console.warn(`    upload failed: ${JSON.stringify(json.errors ?? json.message ?? res.status)}`)
    return null
  }
  return json.doc?.id ?? json.id ?? null
}

// ── Main ─────────────────────────────────────────────────────────────────────

// 1. Fetch all Payload posts without a featuredImage (paginated)
console.log('Fetching Payload posts without featured image...')
let page = 1
const missing = []
while (true) {
  const result = await payloadGet(
    `/posts?where[featuredImage][exists]=false&limit=100&page=${page}&select=id,slug,title`
  )
  missing.push(...(result.docs ?? []))
  if (!result.hasNextPage) break
  page++
}
console.log(`Found ${missing.length} posts without a featured image.\n`)

if (missing.length === 0) {
  console.log('Nothing to do.')
  process.exit(0)
}

// 2. For each, fetch the WP post by slug → get featured_media ID → upload → patch
let fixed = 0, skipped = 0, failed = 0

for (let i = 0; i < missing.length; i++) {
  const { id, slug, title } = missing[i]
  process.stdout.write(`[${i + 1}/${missing.length}] ${title?.slice(0, 55).padEnd(55)} `)

  try {
    // Look up the WP post by slug
    const wpResults = await wpGet(`/posts?slug=${encodeURIComponent(slug)}&_fields=id,featured_media&per_page=1`)
    const wpPost = wpResults[0]
    if (!wpPost?.featured_media) {
      console.log('no WP featured_media — skip')
      skipped++
      continue
    }

    // Fetch the media URL
    const media = await wpGet(`/media/${wpPost.featured_media}?_fields=source_url,alt_text`)
    if (!media?.source_url) {
      console.log('no source_url — skip')
      skipped++
      continue
    }

    if (DRY_RUN) {
      console.log(`[DRY] would upload ${media.source_url.split('/').pop()}`)
      skipped++
      continue
    }

    // Upload to Payload
    process.stdout.write(`uploading... `)
    const mediaId = await uploadImage(media.source_url, media.alt_text || title)
    if (!mediaId) { failed++; continue }

    // Patch the post
    await payloadPatch(`/posts/${id}`, { featuredImage: mediaId })
    console.log(`OK`)
    fixed++

  } catch (err) {
    console.log(`ERROR: ${err.message.slice(0, 80)}`)
    failed++
  }
}

console.log(`\nDone. Fixed: ${fixed}  Skipped: ${skipped}  Failed: ${failed}`)
