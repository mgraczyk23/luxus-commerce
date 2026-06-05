import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PRODUCT_ATTRIBUTES_MODULE } from "../../../modules/product-attributes"
import { PRODUCT_DETAILS_MODULE } from "../../../modules/product-details"
import { PRODUCT_SPECS_MODULE } from "../../../modules/product-specs"
import { INVENTORY_MANAGEMENT_MODULE } from "../../../modules/inventory-management"

// ── Payload types ──────────────────────────────────────────────────────────────

type ImportItem = {
  // Medusa native fields
  title: string
  subtitle?: string            // Short italic tagline shown under the title on the detail page
  handle?: string
  description?: string
  status?: "draft" | "published"
  sku?: string
  price?: number               // USD dollars, e.g. 3499.00
  thumbnail?: string           // URL of the product thumbnail image
  images?: string[]            // URLs of additional product gallery images
  highlights?: Array<{ title: string; body: string }>  // max 4, stored in product.metadata
  in_the_box?: string[]        // "What's in the Box" bullet list, stored in product.metadata
  extra_specs?: Record<string, string>  // Additional spec table rows (Height, Slide Material, etc.)
  categories?: string[]        // Product category handles (e.g. ["1911", "compact-edc"])
  collection?: string          // Collection handle (e.g. "1911-series")

  // Custom modules
  details?: {
    short_description?: string
    serial_number?: string
    optics_ready?: boolean
    contact_for_pricing?: boolean
    primary_category?: string
    engraver?: string
    seo_meta_title?: string
    seo_meta_description?: string
  }

  specs?: {
    overall_length?: string
    weight?: string
    frame_material?: string
    grip_material?: string
    sight_type?: string
    finish_type?: string
  }

  inventory?: {
    item_cost?: number
    is_consignment?: boolean
    consignor_customer_id?: string
    consignor_name?: string
    consignor_contact?: string
    consignor_cost?: number
    suggested_sale_price?: number
    consignment_notes?: string
    imported_by_luxus?: boolean
    importer_name?: string
    importer_mark?: string
    importer_mark_location?: string
    is_master_backroom?: boolean
    is_backroom?: boolean
  }

  /**
   * Attribute values to assign, keyed by attribute type slug.
   * Value can be a single string or array for multi-select.
   * Example: { "brand": "Nighthawk Custom", "caliber": [".45 ACP"] }
   */
  attributes?: Record<string, string | string[]>
}

type ImportResult = {
  title: string
  product_id?: string
  success: boolean
  error?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

async function importOne(
  item: ImportItem,
  deps: {
    productService: any
    pricingService: any
    detailsService: any
    specsService: any
    inventoryService: any
    attrService: any
    link: any
    attrLookup: Record<string, Record<string, string>> // typeSlug -> { valueLower -> valueId }
    categoryHandleToId: Record<string, string>
    collectionHandleToId: Record<string, string>
  }
): Promise<ImportResult> {
  const {
    productService, pricingService, detailsService, specsService,
    inventoryService, attrService, link, attrLookup,
    categoryHandleToId, collectionHandleToId,
  } = deps

  try {
    // Build metadata — storefront mapper reads these fields from product.metadata,
    // so anything displayed on listing pages or cards must be here as well as
    // in the custom module tables.
    const metadata: Record<string, any> = {}
    if (item.highlights?.length) metadata.highlights = item.highlights.slice(0, 4)
    if (item.in_the_box?.length) metadata.in_the_box = item.in_the_box
    if (item.extra_specs && Object.keys(item.extra_specs).length)
      metadata.extra_specs = item.extra_specs
    // Details fields also mirrored to metadata for listing-page display
    if (item.details?.short_description) metadata.short_description = item.details.short_description
    if (item.details?.engraver)           metadata.engraver          = item.details.engraver
    if (item.details?.primary_category)   metadata.primary_category  = item.details.primary_category
    if (item.details?.contact_for_pricing === true) metadata.contact_for_pricing = "true"
    // Backroom flag — hides product from all public store pages
    if (item.inventory?.is_master_backroom || item.inventory?.is_backroom)
      metadata.backroom_hidden = "true"

    // Resolve category IDs from handles
    const categoryIds = (item.categories ?? [])
      .map((h) => categoryHandleToId[h])
      .filter(Boolean)
      .map((id) => ({ id }))

    // Resolve collection ID from handle
    const collectionId = item.collection
      ? collectionHandleToId[item.collection]
      : undefined

    // 1. Create product with options (no variants yet — module service requires
    //    option IDs when creating variants, so we do it in two steps)
    const [product] = await productService.createProducts([{
      title: item.title,
      subtitle: item.subtitle,
      handle: item.handle ? slugify(item.handle) : slugify(item.title),
      description: item.description,
      status: item.status ?? "draft",
      thumbnail: item.thumbnail,
      images: item.images?.map((url) => ({ url })),
      ...(Object.keys(metadata).length ? { metadata } : {}),
      ...(categoryIds.length ? { categories: categoryIds } : {}),
      ...(collectionId ? { collection_id: collectionId } : {}),
      options: [{ title: "Title", values: ["Default"] }],
    }])

    // 2. Create default variant — options passed as title→value map
    const [variant] = await productService.createProductVariants([{
      product_id: product.id,
      title: "Default",
      sku: item.sku,
      options: { Title: "Default" },
    }])

    const variantId = variant?.id

    // 3. Create price set and link to variant
    if (item.price != null && variantId) {
      const [priceSet] = await pricingService.createPriceSets([{
        prices: [{ currency_code: "usd", amount: Math.round(item.price * 100) }],
      }])
      await link.create({
        [Modules.PRODUCT]: { variant_id: variantId },
        [Modules.PRICING]: { price_set_id: priceSet.id },
      })
    }

    // 4. Custom records in parallel
    const customOps: Promise<any>[] = []

    if (item.details) {
      customOps.push(
        detailsService.createProductDetails({
          short_description: item.details.short_description ?? null,
          serial_number: item.details.serial_number ?? null,
          optics_ready: item.details.optics_ready ?? false,
          contact_for_pricing: item.details.contact_for_pricing ?? false,
          primary_category: item.details.primary_category ?? null,
          engraver: item.details.engraver ?? null,
          seo_meta_title: item.details.seo_meta_title ?? null,
          seo_meta_description: item.details.seo_meta_description ?? null,
        }).then((detail: any) =>
          link.create({
            [Modules.PRODUCT]: { product_id: product.id },
            [PRODUCT_DETAILS_MODULE]: { product_detail_id: detail.id },
          })
        )
      )
    }

    if (item.specs) {
      customOps.push(
        specsService.createProductSpecs({
          overall_length: item.specs.overall_length ?? null,
          weight: item.specs.weight ?? null,
          frame_material: item.specs.frame_material ?? null,
          grip_material: item.specs.grip_material ?? null,
          sight_type: item.specs.sight_type ?? null,
          finish_type: item.specs.finish_type ?? null,
        }).then((spec: any) =>
          link.create({
            [Modules.PRODUCT]: { product_id: product.id },
            [PRODUCT_SPECS_MODULE]: { product_spec_id: spec.id },
          })
        )
      )
    }

    if (item.inventory) {
      const inv = item.inventory
      customOps.push(
        (inventoryService as any).createInventoryInfos({
          item_cost: inv.item_cost ?? null,
          is_consignment: inv.is_consignment ?? false,
          consignor_customer_id: inv.consignor_customer_id ?? null,
          consignor_name: inv.consignor_name ?? null,
          consignor_contact: inv.consignor_contact ?? null,
          consignor_cost: inv.consignor_cost ?? null,
          suggested_sale_price: inv.suggested_sale_price ?? null,
          consignment_notes: inv.consignment_notes ?? null,
          imported_by_luxus: inv.imported_by_luxus ?? false,
          importer_name: inv.importer_name ?? null,
          importer_mark: inv.importer_mark ?? null,
          importer_mark_location: inv.importer_mark_location ?? null,
          is_master_backroom: inv.is_master_backroom ?? false,
          is_backroom: inv.is_backroom ?? false,
        }).then((info: any) =>
          link.create({
            [Modules.PRODUCT]: { product_id: product.id },
            [INVENTORY_MANAGEMENT_MODULE]: { inventory_info_id: info.id },
          })
        )
      )
    }

    await Promise.all(customOps)

    // 5. Resolve and link attribute values
    const warnings: string[] = []

    if (item.categories?.length) {
      const unknown = item.categories.filter((h) => !categoryHandleToId[h])
      for (const h of unknown) warnings.push(`Unknown category handle: "${h}"`)
    }

    if (item.collection && !collectionHandleToId[item.collection]) {
      warnings.push(`Unknown collection handle: "${item.collection}"`)
    }

    if (item.attributes && Object.keys(item.attributes).length > 0) {
      const valueIds: string[] = []

      for (const [typeSlug, rawValues] of Object.entries(item.attributes)) {
        const valueMap = attrLookup[typeSlug]
        if (!valueMap) {
          warnings.push(`Unknown attribute type slug: "${typeSlug}"`)
          continue
        }

        const targets = Array.isArray(rawValues) ? rawValues : [rawValues]
        for (const v of targets) {
          const id = valueMap[v.toLowerCase()]
          if (!id) {
            warnings.push(`Unknown value "${v}" for type "${typeSlug}"`)
          } else {
            valueIds.push(id)
          }
        }
      }

      if (valueIds.length > 0) {
        await link.create(
          valueIds.map((value_id) => ({
            [Modules.PRODUCT]: { product_id: product.id },
            [PRODUCT_ATTRIBUTES_MODULE]: { attribute_value_id: value_id },
          }))
        )
      }
    }

    return {
      title: item.title,
      product_id: product.id,
      success: true,
      ...(warnings.length > 0 ? { warnings } : {}),
    } as any
  } catch (err: any) {
    return { title: item.title, success: false, error: err.message ?? String(err) }
  }
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const items: ImportItem[] = Array.isArray(req.body) ? req.body : [req.body as ImportItem]

  if (items.length === 0) {
    return res.status(400).json({ message: "No products provided" })
  }

  // Resolve services once
  const productService   = req.scope.resolve(Modules.PRODUCT)
  const pricingService   = req.scope.resolve(Modules.PRICING)
  const detailsService   = req.scope.resolve(PRODUCT_DETAILS_MODULE)
  const specsService     = req.scope.resolve(PRODUCT_SPECS_MODULE)
  const inventoryService = req.scope.resolve(INVENTORY_MANAGEMENT_MODULE)
  const attrService      = req.scope.resolve(PRODUCT_ATTRIBUTES_MODULE)
  const link             = req.scope.resolve(ContainerRegistrationKeys.LINK)

  // Build attribute lookup table once for all items
  const [allTypes, allValues, allCategories, allCollections] = await Promise.all([
    attrService.listAttributeTypes({}, { take: 1000 }),
    attrService.listAttributeValues({}, { take: 1000 }),
    productService.listProductCategories({}, { take: 1000 }),
    productService.listProductCollections({}, { take: 1000 }),
  ])

  const attrLookup: Record<string, Record<string, string>> = {}
  for (const type of allTypes as any[]) {
    attrLookup[type.slug] = {}
    for (const v of allValues as any[]) {
      if (v.attribute_type_id === type.id) {
        attrLookup[type.slug][v.value.toLowerCase()] = v.id
      }
    }
  }

  const categoryHandleToId: Record<string, string> = Object.fromEntries(
    (allCategories as any[]).map((c) => [c.handle, c.id])
  )

  const collectionHandleToId: Record<string, string> = Object.fromEntries(
    (allCollections as any[]).map((c) => [c.handle, c.id])
  )

  const deps = {
    productService, pricingService, detailsService, specsService,
    inventoryService, attrService, link, attrLookup,
    categoryHandleToId, collectionHandleToId,
  }

  // Process sequentially to avoid unique-handle conflicts in rapid bulk imports
  const results: ImportResult[] = []
  for (const item of items) {
    results.push(await importOne(item, deps))
  }

  const created = results.filter((r) => r.success).length
  const failed  = results.filter((r) => !r.success).length

  res.status(created > 0 ? 201 : 400).json({ created, failed, results })
}
