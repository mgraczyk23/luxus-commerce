import express, { Request, Response } from 'express'
import { randomUUID } from 'crypto'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js')

import { z } from 'zod'

// ── Config ──────────────────────────────────────────────────────────────────
const PORT          = Number(process.env.MCP_PORT ?? 3002)
const MEDUSA_URL    = process.env.MEDUSA_URL ?? 'http://medusa:9000'
const PAYLOAD_URL   = process.env.PAYLOAD_URL ?? 'http://payload:3000'
const PK            = process.env.MEDUSA_PUBLISHABLE_KEY ?? ''
const RATE_LIMIT    = Number(process.env.RATE_LIMIT_RPM ?? 60)

// ── Rate limiter ─────────────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; reset: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + 60_000 })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

// Prune expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.reset) rateLimitMap.delete(ip)
  }
}, 5 * 60_000)

// ── Backroom filter ──────────────────────────────────────────────────────────
function isBackroom(product: Record<string, unknown>): boolean {
  const meta = (product.metadata ?? {}) as Record<string, unknown>
  return (
    meta.is_backroom_hidden === 'true' ||
    meta.backroom === 'true' ||
    meta.is_private_room === 'true'
  )
}

// ── Attribute helpers ────────────────────────────────────────────────────────
interface AttributeValue { attribute_type?: { slug?: string }; value?: string }

function getAttribute(product: Record<string, unknown>, slug: string): string {
  const av = product.attribute_values as AttributeValue[] | undefined
  if (Array.isArray(av)) {
    const match = av.find(a => a.attribute_type?.slug === slug)
    if (match?.value) return match.value
  }
  const meta = (product.metadata ?? {}) as Record<string, string>
  return meta[slug] ?? ''
}

// ── Medusa fetch helpers ─────────────────────────────────────────────────────
const medusaHeaders = {
  'Content-Type': 'application/json',
  'x-publishable-api-key': PK,
}

async function medusaGet(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${MEDUSA_URL}${path}`, { headers: medusaHeaders })
  if (!res.ok) throw new Error(`Medusa ${path} → ${res.status}`)
  return res.json() as Promise<Record<string, unknown>>
}

async function payloadGet(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${PAYLOAD_URL}${path}`)
  if (!res.ok) throw new Error(`Payload ${path} → ${res.status}`)
  return res.json() as Promise<Record<string, unknown>>
}

// ── Product serializer (public fields only) ───────────────────────────────────
function serializeProduct(p: Record<string, unknown>, full = false) {
  const variant = ((p.variants as Record<string, unknown>[])?.[0] ?? {}) as Record<string, unknown>
  const price   = ((variant.prices as Record<string, unknown>[])?.[0]) as Record<string, unknown> | undefined
  const thumbnail = p.thumbnail as string | undefined

  const base = {
    handle:      p.handle,
    title:       p.title,
    description: full ? p.description : undefined,
    brand:       getAttribute(p, 'brand'),
    model:       getAttribute(p, 'model'),
    caliber:     getAttribute(p, 'caliber'),
    action:      getAttribute(p, 'action'),
    condition:   getAttribute(p, 'condition'),
    contact_for_pricing: (p.metadata as Record<string, unknown>)?.contact_for_pricing === 'true' || (p.metadata as Record<string, unknown>)?.contact_for_pricing === true,
    price_cents: price?.amount ?? null,
    price_usd:   price?.amount ? `$${((price.amount as number) / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}` : null,
    in_stock:    variant.inventory_quantity ? Number(variant.inventory_quantity) > 0 : false,
    thumbnail,
    url:         `https://luxus-collection.com/product/${p.handle}`,
  }

  if (full) {
    return {
      ...base,
      subtitle:    p.subtitle,
      tags:        ((p.tags as { value?: string }[] | undefined) ?? []).map(t => t.value),
      images:      ((p.images as { url?: string }[] | undefined) ?? []).map(i => i.url),
      variants:    (p.variants as Record<string, unknown>[]).map(v => ({
        id:       v.id,
        title:    v.title,
        sku:      v.sku,
        price:    ((v.prices as Record<string, unknown>[])?.[0])?.amount ?? null,
        quantity: v.inventory_quantity,
      })),
    }
  }
  return base
}

// ── Build and register MCP server ─────────────────────────────────────────────
function buildMcpServer() {
  const server = new McpServer({
    name:    'Luxus Collection',
    version: '1.0.0',
  })

  // 1. search_products
  server.registerTool(
    'search_products',
    {
      description: 'Search the Luxus Collection public product catalog by keyword. Returns matching firearms and accessories. Excludes backroom/VIP-only items.',
      inputSchema: {
        query:  z.string().describe('Search keyword or phrase'),
        limit:  z.number().int().min(1).max(50).default(20).describe('Number of results (max 50)'),
        offset: z.number().int().min(0).default(0).describe('Pagination offset'),
      },
    },
    async ({ query, limit = 20, offset = 0 }: { query: string; limit?: number; offset?: number }) => {
      const params = new URLSearchParams({
        q:      query,
        limit:  String(limit + 10),
        offset: String(offset),
        fields: '+attribute_values,+attribute_values.attribute_type',
      })
      const data   = await medusaGet(`/store/products?${params}`)
      const all    = (data.products as Record<string, unknown>[]) ?? []
      const public_ = all.filter(p => !isBackroom(p))
      const sliced  = public_.slice(0, limit)
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            count:    sliced.length,
            products: sliced.map(p => serializeProduct(p)),
          }, null, 2),
        }],
      }
    }
  )

  // 2. get_product
  server.registerTool(
    'get_product',
    {
      description: 'Get full details for a single product by its URL handle (slug). Returns specs, price, images, and availability. Returns error if the product is backroom-only.',
      inputSchema: {
        handle: z.string().describe('Product handle/slug from the URL, e.g. "colt-python-357"'),
      },
    },
    async ({ handle }: { handle: string }) => {
      const params = new URLSearchParams({
        handle,
        fields: '+attribute_values,+attribute_values.attribute_type',
      })
      const data    = await medusaGet(`/store/products?${params}`)
      const product = ((data.products as Record<string, unknown>[]) ?? [])[0]
      if (!product) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Product not found' }) }] }
      if (isBackroom(product)) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Product not found' }) }] }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(serializeProduct(product, true), null, 2),
        }],
      }
    }
  )

  // 3. check_availability
  server.registerTool(
    'check_availability',
    {
      description: 'Check if a specific product is in stock. Returns stock status and quantity.',
      inputSchema: {
        handle: z.string().describe('Product handle/slug'),
      },
    },
    async ({ handle }: { handle: string }) => {
      const params  = new URLSearchParams({ handle, fields: '+attribute_values' })
      const data    = await medusaGet(`/store/products?${params}`)
      const product = ((data.products as Record<string, unknown>[]) ?? [])[0]
      if (!product || isBackroom(product)) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Product not found' }) }] }
      }
      const variant   = ((product.variants as Record<string, unknown>[])?.[0]) ?? {}
      const qty       = Number(variant.inventory_quantity ?? 0)
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            handle,
            title:    product.title,
            in_stock: qty > 0,
            quantity: qty,
          }),
        }],
      }
    }
  )

  // 4. list_brands
  server.registerTool(
    'list_brands',
    {
      description: 'List all firearm brands carried by Luxus Collection, with optional product counts.',
      inputSchema: {
        limit: z.number().int().min(1).max(200).default(100).describe('Max brands to return'),
      },
    },
    async ({ limit = 100 }: { limit?: number }) => {
      const data = await payloadGet(`/api/brands?limit=${limit}&depth=0`)
      const docs = (data.docs as Record<string, unknown>[]) ?? []
      const brands = docs.map(b => ({
        name:        b.name,
        slug:        b.slug,
        country:     b.country,
        description: (b.description as Record<string, unknown>[])?.[0]?.children
          ? undefined
          : b.description,
        url: `https://luxus-collection.com/brand/${b.slug}`,
      }))
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ count: brands.length, brands }, null, 2),
        }],
      }
    }
  )

  // 5. get_brand_products
  server.registerTool(
    'get_brand_products',
    {
      description: 'List public products for a specific brand. Excludes backroom items.',
      inputSchema: {
        brand: z.string().describe('Brand name, e.g. "Colt", "Smith & Wesson"'),
        limit: z.number().int().min(1).max(50).default(20).describe('Max products to return'),
      },
    },
    async ({ brand, limit = 20 }: { brand: string; limit?: number }) => {
      const params = new URLSearchParams({
        q:      brand,
        limit:  '60',
        fields: '+attribute_values,+attribute_values.attribute_type',
      })
      const data   = await medusaGet(`/store/products?${params}`)
      const all    = (data.products as Record<string, unknown>[]) ?? []
      const matched = all
        .filter(p => !isBackroom(p))
        .filter(p => getAttribute(p, 'brand').toLowerCase().includes(brand.toLowerCase()))
        .slice(0, limit)
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            brand,
            count:    matched.length,
            products: matched.map(p => serializeProduct(p)),
          }, null, 2),
        }],
      }
    }
  )

  // 6. list_categories
  server.registerTool(
    'list_categories',
    {
      description: 'List all product categories available on the Luxus Collection storefront.',
      inputSchema: {},
    },
    async () => {
      const data = await medusaGet('/store/product-categories?limit=100&include_descendants_tree=true')
      const cats = (data.product_categories as Record<string, unknown>[]) ?? []
      const publicCats = cats.map(c => ({
        name:   c.name,
        handle: c.handle,
        url:    `https://luxus-collection.com/category/${c.handle}`,
      }))
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ count: publicCats.length, categories: publicCats }, null, 2),
        }],
      }
    }
  )

  // 7. list_articles
  server.registerTool(
    'list_articles',
    {
      description: 'List blog articles and guides from the Luxus Collection Resources section.',
      inputSchema: {
        limit: z.number().int().min(1).max(50).default(10).describe('Number of articles'),
      },
    },
    async ({ limit = 10 }: { limit?: number }) => {
      const data = await payloadGet(`/api/posts?limit=${limit}&depth=1&sort=-publishedAt`)
      const docs = (data.docs as Record<string, unknown>[]) ?? []
      const articles = docs.map(a => ({
        title:       a.title,
        slug:        a.slug,
        excerpt:     a.excerpt,
        publishedAt: a.publishedAt,
        url:         `https://luxus-collection.com/resources-on-guns/${a.slug}`,
      }))
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ count: articles.length, articles }, null, 2),
        }],
      }
    }
  )

  // 8. get_site_info
  server.registerTool(
    'get_site_info',
    {
      description: 'Get Luxus Collection business information: location, hours, contact, and policies.',
      inputSchema: {},
    },
    async () => {
      const data = await payloadGet('/api/globals/site-settings?depth=0')
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            name:        data.storeName ?? 'Luxus Collection',
            tagline:     data.tagline,
            phone:       data.phone,
            email:       data.email,
            address:     data.address,
            city:        data.city,
            state:       data.state,
            zip:         data.zip,
            hours:       data.hours,
            ffl_license: data.fflLicense,
            website:     'https://luxus-collection.com',
            description: 'Premium curated firearms dealer specializing in collectible and modern firearms.',
          }),
        }],
      }
    }
  )

  return server
}

// ── Express app ───────────────────────────────────────────────────────────────
const app = express()
app.use(express.json())

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'luxus-mcp', version: '1.0.0' })
})

// MCP endpoint — stateless per-request transport
app.post('/mcp', async (req: Request, res: Response) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    ?? req.socket.remoteAddress
    ?? 'unknown'

  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'Rate limit exceeded. Max 60 requests per minute.' })
    return
  }

  const server    = buildMcpServer()
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  })

  res.on('close', () => transport.close())

  try {
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

app.listen(PORT, () => {
  console.log(`Luxus MCP server listening on port ${PORT}`)
})
