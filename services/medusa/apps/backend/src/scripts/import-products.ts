/**
 * import-products.ts — bulk-create draft firearm products from a JSON file in the
 * import-API shape, WITH everything the /import/products API does not do:
 *   - mirrors every image into our S3 bucket (storefront only allows our own hosts)
 *   - product type, tag, sales channel (exactly one), shipping profile
 *   - contact-for-pricing on every product (no price set)
 *   - inventory item (title = SKU) + level at the stock location, stocked qty
 *   - attribute links, auto-creating missing values after applying approved aliases
 *
 * Run inside the medusa container (defaults to a DRY RUN — no writes, no uploads):
 *   IMPORT_JSON=/tmp/items.json npx medusa exec ./src/scripts/import-products.ts
 *   DRY_RUN=false [LIMIT=3] [ONLY_SKUS=A,B] IMPORT_JSON=... npx medusa exec ...
 * Safe to re-run: products whose handle or SKU already exist are skipped, and the
 * image mirror cache (/tmp/image_cache.json) prevents re-uploading.
 */
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_ATTRIBUTES_MODULE } from "../modules/product-attributes"
import { PRODUCT_DETAILS_MODULE } from "../modules/product-details"
import { PRODUCT_SPECS_MODULE } from "../modules/product-specs"
import fs from "fs"

const DRY_RUN = process.env.DRY_RUN !== "false"
const JSON_PATH = process.env.IMPORT_JSON ?? "/tmp/import_items.json"
const LIMIT = Number(process.env.LIMIT ?? 0)
const ONLY = process.env.ONLY_SKUS ? process.env.ONLY_SKUS.split(",") : null
const CACHE_PATH = "/tmp/image_cache.json"
const TYPE_VALUE = process.env.TYPE_VALUE ?? "Firearm"
const TAG_VALUE = process.env.TAG_VALUE ?? "Modern Firearms"
const CHANNEL_NAME = process.env.CHANNEL_NAME ?? "Web Site"
const LOCATION_NAME = process.env.LOCATION_NAME ?? "Luxus Collection"
const STOCK_QTY = Number(process.env.STOCK_QTY ?? 1)
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

// Approved wording aliases (lowercased source value -> canonical existing value(s))
const ALIASES: Record<string, Record<string, string | string[]>> = {
  brand: {
    "hk": "Heckler & Koch",
    "vudoo": "Vudoo Gun Works",
    "alchemy": "Alchemy Custom Weaponry",
    "cz custom": "CZ",
  },
  action: {
    "single action": "Single Action (SAO)",
    "single action only": "Single Action (SAO)",
    "double/single action": "DA / SA",
  },
  caliber: {
    "5.56mm nato": "5.56 NATO", "5.56mm": "5.56 NATO", "5.56x45mm": "5.56 NATO",
    "5.56x45mm nato": "5.56 NATO", "5.56": "5.56 NATO",
    "7.62x51mm": "7.62x51", "7.62x51mm (.308)": "7.62x51",
    "7.62x51mm nato / .308 win": ["7.62x51", ".308 Winchester"],
    "7.62x51mm / .308 winchester": ["7.62x51", ".308 Winchester"],
    "7.62x51mm nato / .308 winchester": ["7.62x51", ".308 Winchester"],
    "6.8x51 (convertible to 7.62x51 and 6.5 creedmoor)": "6.8x51",
  },
}
const CATEGORY_ALIASES: Record<string, string> = { shotguns: "shotgun", pistols: "handguns" }

type Row = {
  title: string; subtitle?: string; handle: string; sku: string; description: string
  thumbnail?: string; images: string[]; categories: string[]
  highlights: Array<{ title: string; body: string }>; in_the_box?: string[]
  details: Record<string, any>; specs: Record<string, any>; extra_specs: Record<string, string>
  attributes: Record<string, string | string[]>
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" }

export default async function run({ container }: { container: any }) {
  let rows: Row[] = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"))
  if (ONLY) rows = rows.filter((r) => ONLY.includes(r.sku))
  if (LIMIT) rows = rows.slice(0, LIMIT)

  const productService = container.resolve(Modules.PRODUCT)
  const scService = container.resolve(Modules.SALES_CHANNEL)
  const fulfillment = container.resolve(Modules.FULFILLMENT)
  const stockLoc = container.resolve(Modules.STOCK_LOCATION)
  const inventory = container.resolve(Modules.INVENTORY)
  const fileService = container.resolve(Modules.FILE)
  const attrService = container.resolve(PRODUCT_ATTRIBUTES_MODULE)
  const detailsService = container.resolve(PRODUCT_DETAILS_MODULE)
  const specsService = container.resolve(PRODUCT_SPECS_MODULE)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  const one = async (label: string, list: any[]) => {
    if (list.length !== 1) throw new Error(`${label}: expected exactly 1 match, found ${list.length}`)
    return list[0]
  }
  const type = await one(`type "${TYPE_VALUE}"`, await productService.listProductTypes({ value: TYPE_VALUE }))
  const tag = await one(`tag "${TAG_VALUE}"`, await productService.listProductTags({ value: TAG_VALUE }))
  const channel = await one(`sales channel "${CHANNEL_NAME}"`, await scService.listSalesChannels({ name: CHANNEL_NAME }))
  const location = await one(`location "${LOCATION_NAME}"`, await stockLoc.listStockLocations({ name: LOCATION_NAME }))
  const profile = await one("default shipping profile", await fulfillment.listShippingProfiles({ type: "default" }))

  // NB: listProductCategories returns only `id` unless `select` names the fields.
  const cats = await productService.listProductCategories({}, { take: 1000, select: ["id", "handle"] })
  const catId: Record<string, string> = Object.fromEntries(cats.map((c: any) => [c.handle, c.id]))

  const atypes = await attrService.listAttributeTypes({}, { take: 100 })
  const avals = await attrService.listAttributeValues({}, { take: 10000 })
  const typeId: Record<string, string> = {}
  const valueId: Record<string, Record<string, string>> = {}
  for (const t of atypes as any[]) {
    typeId[t.slug] = t.id
    valueId[t.slug] = {}
    for (const v of avals as any[]) if (v.attribute_type_id === t.id) valueId[t.slug][v.value.toLowerCase()] = v.id
  }

  const existing = await productService.listProducts({}, { take: 5000, select: ["id", "handle"] })
  const variantsAll = await productService.listProductVariants({}, { take: 20000, select: ["sku"] })
  const handles = new Set(existing.map((p: any) => p.handle))
  const skus = new Set(variantsAll.map((v: any) => v.sku).filter(Boolean))

  const cache: Record<string, string> = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8")) : {}
  const stats = { created: 0, skipped: 0, errors: 0, imagesOk: 0, imagesFailed: 0, newValues: {} as Record<string, string[]> }
  const failedImages: string[] = []
  const warnings: string[] = []
  const results: any[] = []

  async function mirror(url: string, name: string): Promise<string | null> {
    if (cache[url]) return cache[url]
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/avif,image/webp,image/*,*/*" }, signal: AbortSignal.timeout(30000) })
      const ctype = (res.headers.get("content-type") ?? "").split(";")[0]
      if (!res.ok || !EXT[ctype]) return null
      const buf = Buffer.from(await res.arrayBuffer())
      if (!buf.length || buf.length > 8_000_000) return null
      const out = await fileService.createFiles({ filename: `${name}.${EXT[ctype]}`, mimeType: ctype, content: buf.toString("binary"), access: "public" })
      const file = Array.isArray(out) ? out[0] : out
      cache[url] = file.url
      return file.url
    } catch { return null }
  }

  async function resolveAttr(slug: string, raw: string | string[]): Promise<string[]> {
    const ids: string[] = []
    for (const r of Array.isArray(raw) ? raw : [raw]) {
      const mapped = ALIASES[slug]?.[String(r).toLowerCase()] ?? String(r)
      for (const val of Array.isArray(mapped) ? mapped : [mapped]) {
        let id = valueId[slug][val.toLowerCase()]
        if (!id) {
          ;(stats.newValues[slug] ??= []).push(val)
          if (!DRY_RUN) {
            const [nv] = await attrService.createAttributeValues([{ attribute_type_id: typeId[slug], value: val }])
            id = nv.id
          } else id = `dry_${slug}_${val}`
          valueId[slug][val.toLowerCase()] = id
        }
        ids.push(id)
      }
    }
    return ids
  }

  for (const row of rows) {
    if (handles.has(row.handle) || skus.has(row.sku)) { stats.skipped++; results.push({ sku: row.sku, status: "skipped (already exists)" }); continue }

    const created: { productId?: string; detailId?: string; specId?: string; invItemId?: string } = {}
    try {
      // categories
      const catIds: string[] = []
      for (const c of row.categories) {
        const h = CATEGORY_ALIASES[c] ?? c
        if (catId[h]) { if (!catIds.includes(catId[h])) catIds.push(catId[h]) } else warnings.push(`${row.sku}: unknown category "${c}"`)
      }

      // images (mirror to our S3)
      const urls = Array.from(new Set(row.images))
      const mirrored: Record<string, string | null> = {}
      if (!DRY_RUN) {
        const queue = [...urls]
        await Promise.all(Array.from({ length: 5 }, async () => {
          for (let u = queue.shift(); u; u = queue.shift()) mirrored[u] = await mirror(u, `${row.handle}-${urls.indexOf(u) + 1}`)
        }))
        if (row.thumbnail && !mirrored[row.thumbnail]) mirrored[row.thumbnail] = await mirror(row.thumbnail, `${row.handle}-thumb`)
      }
      const okImages = urls.map((u) => mirrored[u]).filter(Boolean) as string[]
      urls.forEach((u) => { if (!DRY_RUN) { mirrored[u] ? stats.imagesOk++ : (stats.imagesFailed++, failedImages.push(`${row.sku} ${u}`)) } })
      const thumb = (row.thumbnail && mirrored[row.thumbnail]) || okImages[0] || undefined
      if (!DRY_RUN && !thumb) throw new Error("no usable images")

      // attributes (resolved/created before the product so a failure here leaves nothing behind)
      const attrIds: string[] = []
      for (const [slug, raw] of Object.entries(row.attributes ?? {})) {
        if (!typeId[slug]) { warnings.push(`${row.sku}: unknown attribute type "${slug}"`); continue }
        for (const id of await resolveAttr(slug, raw)) if (!attrIds.includes(id)) attrIds.push(id)
      }

      // metadata (storefront cards read these) — every product is contact-for-pricing
      const d: Record<string, any> = { ...row.details, contact_for_pricing: true }
      const metadata: Record<string, any> = { contact_for_pricing: "true" }
      if (row.highlights?.length) metadata.highlights = row.highlights.slice(0, 4)
      if (row.in_the_box?.length) metadata.in_the_box = row.in_the_box
      if (row.extra_specs && Object.keys(row.extra_specs).length) metadata.extra_specs = row.extra_specs
      if (d.short_description) metadata.short_description = d.short_description
      if (d.engraver) metadata.engraver = d.engraver
      if (d.primary_category) metadata.primary_category = d.primary_category

      if (DRY_RUN) { stats.created++; results.push({ sku: row.sku, status: "would create", images: urls.length, categories: catIds.length, attrs: attrIds.length }); continue }

      const [product] = await productService.createProducts([{
        title: row.title, subtitle: row.subtitle, handle: row.handle, description: row.description,
        status: "draft", thumbnail: thumb, images: okImages.map((url) => ({ url })),
        metadata, type_id: type.id, tag_ids: [tag.id], category_ids: catIds,
        options: [{ title: "Title", values: ["Default"] }],
      }])
      created.productId = product.id

      const [variant] = await productService.createProductVariants([{
        product_id: product.id, title: "Default", sku: row.sku, manage_inventory: true, options: { Title: "Default" },
      }])

      await link.create([
        { [Modules.PRODUCT]: { product_id: product.id }, [Modules.SALES_CHANNEL]: { sales_channel_id: channel.id } },
        { [Modules.PRODUCT]: { product_id: product.id }, [Modules.FULFILLMENT]: { shipping_profile_id: profile.id } },
      ])

      const detail = await detailsService.createProductDetails({
        short_description: d.short_description ?? null, serial_number: d.serial_number ?? null,
        optics_ready: d.optics_ready ?? false, contact_for_pricing: true,
        primary_category: d.primary_category ?? null, engraver: d.engraver ?? null,
        seo_meta_title: d.seo_meta_title ?? null, seo_meta_description: d.seo_meta_description ?? null,
      })
      created.detailId = detail.id
      await link.create({ [Modules.PRODUCT]: { product_id: product.id }, [PRODUCT_DETAILS_MODULE]: { product_detail_id: detail.id } })

      const s = row.specs ?? {}
      if (Object.values(s).some((v) => v)) {
        const spec = await specsService.createProductSpecs({
          overall_length: s.overall_length ?? null, weight: s.weight ?? null, frame_material: s.frame_material ?? null,
          grip_material: s.grip_material ?? null, sight_type: s.sight_type ?? null, finish_type: s.finish_type ?? null,
        })
        created.specId = spec.id
        await link.create({ [Modules.PRODUCT]: { product_id: product.id }, [PRODUCT_SPECS_MODULE]: { product_spec_id: spec.id } })
      }

      if (attrIds.length) {
        await link.create(attrIds.map((id) => ({
          [Modules.PRODUCT]: { product_id: product.id }, [PRODUCT_ATTRIBUTES_MODULE]: { attribute_value_id: id },
        })))
      }

      const invItems = await inventory.createInventoryItems([{ sku: row.sku, title: row.sku, requires_shipping: true }])
      created.invItemId = invItems[0].id
      await inventory.createInventoryLevels([{ inventory_item_id: invItems[0].id, location_id: location.id, stocked_quantity: STOCK_QTY }])
      await link.create({
        [Modules.PRODUCT]: { variant_id: variant.id }, [Modules.INVENTORY]: { inventory_item_id: invItems[0].id },
        data: { required_quantity: 1 },
      })

      stats.created++
      results.push({ sku: row.sku, status: "created", product_id: product.id, images: okImages.length, of: urls.length })
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache))
    } catch (err: any) {
      stats.errors++
      results.push({ sku: row.sku, status: "ERROR", error: String(err?.message ?? err).slice(0, 200) })
      // best-effort rollback so a re-run starts clean
      try { if (created.invItemId) await inventory.deleteInventoryItems([created.invItemId]) } catch {}
      try { if (created.detailId) await detailsService.deleteProductDetails([created.detailId]) } catch {}
      try { if (created.specId) await specsService.deleteProductSpecs([created.specId]) } catch {}
      try { if (created.productId) await productService.deleteProducts([created.productId]) } catch {}
    }
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache))
  fs.writeFileSync("/tmp/import_results.json", JSON.stringify({ results, warnings, failedImages, stats }, null, 2))
  console.log(`SUMMARY DRY_RUN=${DRY_RUN} rows=${rows.length} created=${stats.created} skipped=${stats.skipped} errors=${stats.errors}`)
  console.log(`SUMMARY images ok=${stats.imagesOk} failed=${stats.imagesFailed}`)
  for (const [slug, vals] of Object.entries(stats.newValues)) console.log(`SUMMARY new ${slug} values (${new Set(vals).size}): ${JSON.stringify([...new Set(vals)].slice(0, 200))}`)
  warnings.slice(0, 40).forEach((w) => console.log(`WARN ${w}`))
  results.filter((r) => r.status === "ERROR").forEach((r) => console.log(`ERR ${r.sku}: ${r.error}`))
  console.log(`SUMMARY warnings=${warnings.length}`)
}
