#!/usr/bin/env node
/**
 * Migrate articles from WordPress to Payload CMS
 *
 * Usage:
 *   PAYLOAD_API_KEY=<key> node scripts/migrate-from-wordpress.mjs
 *
 * Optional env vars:
 *   WP_URL        WordPress site URL       (default: https://luxus-collection.com)
 *   PAYLOAD_URL   Payload CMS base URL     (default: https://api.luxus-collection.com/cms)
 *   DRY_RUN=1     Print what would happen, don't import
 */

const WP_URL      = process.env.WP_URL      || 'https://luxus-collection.com'
const PAYLOAD_URL = process.env.PAYLOAD_URL  || 'https://api.luxus-collection.com/cms'
const API_KEY     = process.env.PAYLOAD_API_KEY
const DRY_RUN     = process.env.DRY_RUN === '1'

if (!API_KEY) {
  console.error('ERROR: Set PAYLOAD_API_KEY env var before running.')
  console.error('Create an API key in the Payload admin → your user profile → API Keys.')
  process.exit(1)
}

const PAYLOAD_HEADERS = {
  'Authorization': `users API-KEY ${API_KEY}`,
  'Content-Type': 'application/json',
}

/* ── WordPress fetch helpers ────────────────────────────────────────────── */

async function wpGet(path) {
  const res = await fetch(`${WP_URL}/wp-json/wp/v2${path}`)
  if (!res.ok) throw new Error(`WP fetch failed: ${res.status} ${path}`)
  return res.json()
}

async function fetchAllPosts() {
  let page = 1
  const all = []
  while (true) {
    const res = await fetch(
      `${WP_URL}/wp-json/wp/v2/posts?per_page=100&page=${page}&status=publish` +
      `&_fields=id,slug,title,content,excerpt,date,featured_media,categories,author&_embed`
    )
    if (!res.ok) break
    const batch = await res.json()
    if (!batch.length) break
    all.push(...batch)
    const totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1', 10)
    if (page >= totalPages) break
    page++
  }
  return all
}

async function fetchCategoryMap() {
  const cats = await wpGet('/categories?per_page=100&_fields=id,name')
  return Object.fromEntries(cats.map(c => [c.id, c.name]))
}

async function fetchMediaUrl(mediaId) {
  if (!mediaId) return null
  try {
    const media = await wpGet(`/media/${mediaId}?_fields=source_url,mime_type`)
    return { url: media.source_url, mime: media.mime_type }
  } catch {
    return null
  }
}

/* ── HTML → Lexical JSON converter ─────────────────────────────────────── */

function decodeEntities(str) {
  return (str || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘').replace(/&#8220;/g, '“').replace(/&#8221;/g, '”')
    .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—').replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, m => String.fromCharCode(parseInt(m.slice(2,-1), 10)))
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, ''))
}

function parseInlineHtml(rawHtml) {
  const nodes = []
  // Tokenise runs of inline HTML
  const tokenRe = /(<(?:strong|b|em|i|a|code|span)\b[^>]*>[\s\S]*?<\/(?:strong|b|em|i|a|code|span)>)|([^<]+)|(<[^>]+>)/gi
  let m
  while ((m = tokenRe.exec(rawHtml)) !== null) {
    const [full, tagged, text] = m
    if (text) {
      const t = decodeEntities(text)
      if (t.trim() || t.includes(' ')) {
        nodes.push({ type: 'text', text: t, version: 1, format: 0, style: '', mode: 'normal', detail: 0 })
      }
      continue
    }
    if (tagged) {
      const isStrong = /^<(?:strong|b)/i.test(tagged)
      const isEm     = /^<(?:em|i)/i.test(tagged)
      const isCode   = /^<code/i.test(tagged)
      const isLink   = /^<a\s/i.test(tagged)

      if (isLink) {
        const hrefM = tagged.match(/href="([^"]*)"/)
        const url = hrefM ? decodeEntities(hrefM[1]) : '#'
        const innerM = tagged.match(/>([\s\S]*?)<\/a>$/i)
        const children = innerM ? parseInlineHtml(innerM[1]) : []
        if (children.length) {
          nodes.push({ type: 'link', version: 1, fields: { url, newTab: true, linkType: 'custom' }, rel: 'noopener noreferrer', target: '_blank', children })
        }
        continue
      }

      const innerM = tagged.match(/>([\s\S]*?)<\/\w+>$/i)
      if (!innerM) continue
      const inner = stripTags(innerM[1])
      if (!inner) continue
      const format = isStrong ? 1 : isEm ? 2 : isCode ? 16 : 0
      nodes.push({ type: 'text', text: inner, version: 1, format, style: '', mode: 'normal', detail: 0 })
    }
  }
  return nodes.filter(n => n.type !== 'text' || n.text)
}

function lexPara(children) {
  return { type: 'paragraph', version: 1, format: '', indent: 0, direction: 'ltr', children }
}

function htmlToLexical(rawHtml) {
  // Strip WP block comments and structural wrappers
  let html = rawHtml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?(?:article|section|header|div)[^>]*>/gi, '\n')

  const blocks = []

  // Pull out all block-level elements in order using a single pass regex
  // Each match is one complete block element; we process the original string linearly
  const blockRe = /<(h[23]|p|ul|ol|blockquote|figure)[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi

  let lastEnd = 0
  let match

  while ((match = blockRe.exec(html)) !== null) {
    lastEnd = match.index + match[0].length

    const tag     = (match[1] || 'hr').toLowerCase()
    const content = match[2] || ''

    if (tag === 'hr') {
      blocks.push({ type: 'horizontalrule', version: 1 })
      continue
    }

    if (tag === 'h2' || tag === 'h3') {
      const text = stripTags(content)
      if (!text) continue
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      blocks.push({
        type: 'heading', tag, id, version: 1, format: '', indent: 0, direction: 'ltr',
        children: [{ type: 'text', text, version: 1, format: 0, style: '', mode: 'normal', detail: 0 }],
      })
      continue
    }

    if (tag === 'blockquote') {
      const text = stripTags(content).trim()
      if (!text) continue
      blocks.push({
        type: 'quote', version: 1, format: '', indent: 0, direction: 'ltr',
        children: [{ type: 'text', text, version: 1, format: 0, style: '', mode: 'normal', detail: 0 }],
      })
      continue
    }

    if (tag === 'figure') {
      // Images from WordPress — just extract the caption as italic text
      const captionM = content.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i)
      if (captionM) {
        const text = stripTags(captionM[1]).trim()
        if (text) blocks.push(lexPara([{ type: 'text', text, version: 1, format: 2, style: '', mode: 'normal', detail: 0 }]))
      }
      continue
    }

    if (tag === 'ul' || tag === 'ol') {
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
      const items = []
      let li
      while ((li = liRe.exec(content)) !== null) {
        // Strip any nested ul/ol
        const inner = li[1].replace(/<(?:ul|ol)[\s\S]*?<\/(?:ul|ol)>/gi, '').trim()
        const children = parseInlineHtml(inner)
        if (children.length) items.push(children)
      }
      if (items.length) {
        blocks.push({
          type: 'list', listType: tag === 'ol' ? 'number' : 'bullet', tag, start: 1,
          version: 1, format: '', indent: 0, direction: 'ltr',
          children: items.map((children, i) => ({
            type: 'listitem', value: i + 1, version: 1, format: '', indent: 0, direction: 'ltr', children,
          })),
        })
      }
      continue
    }

    if (tag === 'p') {
      const children = parseInlineHtml(content)
      if (children.length) blocks.push(lexPara(children))
      continue
    }
  }

  return {
    root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children: blocks },
  }
}

/* ── Payload API helpers ────────────────────────────────────────────────── */

async function payloadGet(path) {
  const res = await fetch(`${PAYLOAD_URL}/api${path}`, { headers: PAYLOAD_HEADERS })
  if (!res.ok) return null
  return res.json()
}

async function payloadPost(path, body) {
  const res = await fetch(`${PAYLOAD_URL}/api${path}`, {
    method: 'POST',
    headers: PAYLOAD_HEADERS,
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`Payload POST failed ${path}: ${JSON.stringify(json.errors ?? json.message ?? json)}`)
  return json
}

async function uploadImageToPayload(imageUrl, alt) {
  try {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) return null
    const buffer = Buffer.from(await imgRes.arrayBuffer())
    const filename = imageUrl.split('/').pop().split('?')[0]

    // Use multipart form — build manually without external deps
    const boundary = `----FormBoundary${Math.random().toString(36).slice(2)}`
    const mimeType = filename.match(/\.png$/i) ? 'image/png' : filename.match(/\.gif$/i) ? 'image/gif' : filename.match(/\.webp$/i) ? 'image/webp' : 'image/jpeg'

    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    )
    const altPart = Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="alt"\r\n\r\n${alt || filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')}`
    )
    const footer = Buffer.from(`\r\n--${boundary}--`)
    const body = Buffer.concat([header, buffer, altPart, footer])

    const res = await fetch(`${PAYLOAD_URL}/api/media`, {
      method: 'POST',
      headers: {
        'Authorization': `users API-KEY ${API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    })
    const json = await res.json()
    if (!res.ok) { console.warn(`  ⚠ Media upload failed: ${json.message || res.status}`); return null }
    return json.doc?.id ?? json.id ?? null
  } catch (err) {
    console.warn(`  ⚠ Media upload error: ${err.message}`)
    return null
  }
}

async function slugExistsInPayload(slug) {
  const res = await payloadGet(`/posts?where[slug][equals]=${encodeURIComponent(slug)}&limit=1`)
  return (res?.totalDocs ?? 0) > 0
}

/* ── Category normaliser ────────────────────────────────────────────────── */
const CATEGORY_MAP = {
  'buyer guides':              "Buyer's Guide",
  "buyer's guides":            "Buyer's Guide",
  'buying guides':             "Buyer's Guide",
  'collector guides':          "Collector's Guide",
  'collecting guides':         "Collector's Guide",
  'collecting':                "Collector's Guide",
  'brand histories':           'Brand Spotlight',
  'model profiles':            'Brand Spotlight',
  'pistol profiles':           'Brand Spotlight',
  'history':                   'History',
  'firearms history':          'History',
  'gunsmithing':               'Craft & Engineering',
  'gunsmithing & maintenance': 'Craft & Engineering',
  'gunsmithing & tech':        'Craft & Engineering',
  'maintenance':               'Craft & Engineering',
  'technical':                 'Craft & Engineering',
  'technical guides':          'Craft & Engineering',
  'ballistics':                'Craft & Engineering',
  'reloading':                 'Craft & Engineering',
  'handguns':                  'Reviews',
  'handgun guides':            'Reviews',
  'pistols':                   'Reviews',
  'rifles':                    'Reviews',
  'shotguns':                  'Reviews',
  'revolvers':                 'Reviews',
  'ar-15':                     'Reviews',
  'bolt-action rifles':        'Reviews',
  'education':                 'Enthusiast Education',
  'enthusiast education':      'Enthusiast Education',
}

function normaliseCategory(name) {
  const key = decodeEntities(name).toLowerCase().trim()
  return CATEGORY_MAP[key] || decodeEntities(name)
}

/* ── Main migration ─────────────────────────────────────────────────────── */

async function main() {
  console.log(`\nMigrating WordPress → Payload CMS`)
  console.log(`  WP source:  ${WP_URL}`)
  console.log(`  Payload:    ${PAYLOAD_URL}`)
  if (DRY_RUN) console.log(`  DRY RUN — nothing will be written\n`)

  console.log('Fetching WordPress posts...')
  const [posts, catMap] = await Promise.all([fetchAllPosts(), fetchCategoryMap()])
  console.log(`Found ${posts.length} published posts\n`)

  let imported = 0, skipped = 0, failed = 0

  for (const [i, post] of posts.entries()) {
    const slug = post.slug
    const title = decodeEntities(post.title.rendered)
    process.stdout.write(`[${i + 1}/${posts.length}] ${title.slice(0, 55).padEnd(55)} `)

    // Skip duplicates
    if (!DRY_RUN && await slugExistsInPayload(slug)) {
      console.log('SKIP')
      skipped++
      continue
    }

    // Category
    const categoryId = post.categories?.find(id => catMap[id] && catMap[id].toLowerCase() !== 'uncategorized')
    const rawCategory = categoryId ? catMap[categoryId] : 'General'
    const category = normaliseCategory(rawCategory)

    // Author
    const authorName = post._embedded?.author?.[0]?.name || 'Luxus Collection'

    // Excerpt
    const excerpt = stripTags(post.excerpt?.rendered || '')
      .replace(/\[&hellip;\]|\[…\]/g, '').replace(/\s+/g, ' ').trim()

    // Featured image upload
    let featuredImageId = null
    if (!DRY_RUN && post.featured_media) {
      const media = await fetchMediaUrl(post.featured_media)
      if (media) {
        process.stdout.write('[img] ')
        featuredImageId = await uploadImageToPayload(media.url, title)
      }
    }

    // Convert HTML → Lexical
    const content = htmlToLexical(post.content.rendered)

    // Read time estimate
    const wordCount = post.content.rendered.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
    const readTime = `${Math.max(1, Math.round(wordCount / 200))} min read`

    if (DRY_RUN) {
      console.log(`cat="${category}" words=${wordCount} blocks=${content.root.children.length}`)
      imported++
      continue
    }

    const body = {
      title,
      slug,
      status: 'published',
      publishedAt: post.date,
      category,
      excerpt: excerpt || title,
      readTime,
      author: { name: authorName, role: null, bio: null },
      content,
      tags: [],
      ...(featuredImageId && { featuredImage: featuredImageId }),
    }

    try {
      await payloadPost('/posts', body)
      console.log(`OK  cat="${category}" ${readTime}`)
      imported++
    } catch (err) {
      console.log(`FAIL ${err.message.slice(0, 70)}`)
      failed++
    }

    await new Promise(r => setTimeout(r, 150))
  }

  console.log(`\n─────────────────────────────────────`)
  console.log(`Imported: ${imported}`)
  console.log(`Skipped:  ${skipped} (already existed)`)
  console.log(`Failed:   ${failed}`)
  console.log(`─────────────────────────────────────\n`)
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
