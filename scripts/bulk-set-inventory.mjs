#!/usr/bin/env node
/**
 * bulk-set-inventory.mjs
 *
 * Creates inventory items (qty=1) for every product variant that doesn't
 * already have one, linked to the "Luxus Collection" stock location.
 *
 * Safe to re-run — skips variants that already have an inventory item.
 *
 * Usage:
 *   node scripts/bulk-set-inventory.mjs
 *   node scripts/bulk-set-inventory.mjs --dry-run   (preview only, no writes)
 */

import pg from '/home/ubuntu/luxus-commerce/services/medusa/node_modules/pg/lib/index.js'
import { randomBytes } from 'crypto'

const { Client } = pg

// Crockford base32 alphabet — matches Medusa's ULID format
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
function ulid() {
  // 10-char time component + 16-char random component = 26 chars total
  const t = Date.now()
  let time = ''
  let ms = t
  for (let i = 9; i >= 0; i--) {
    time = ENCODING[ms % 32] + time
    ms = Math.floor(ms / 32)
  }
  const rand = randomBytes(10)
  let random = ''
  for (let i = 0; i < 16; i++) {
    random += ENCODING[rand[i % 10] % 32]
  }
  return time + random
}

const DRY_RUN = process.argv.includes('--dry-run')

// DB connection from env — never hardcode credentials.
// e.g. DATABASE_URL=postgres://user:pass@localhost:5432/luxus_medusa
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL env var is required (postgres://user:pass@host:5432/luxus_medusa)')
  process.exit(1)
}

// The "Luxus Collection" stock location
const LOCATION_ID = 'sloc_01KRM4E1EXP5DK3N9E6EPKFQ9B'

// Quantity to set for each variant — 1 means "in stock, one available"
const STOCKED_QTY = 1

function makeId(prefix) {
  return `${prefix}_${ulid()}`
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  console.log('Connected to database.')

  try {
    // Get all variants that have NO inventory item linked
    const { rows: variants } = await client.query(`
      SELECT pv.id, pv.sku, p.title
      FROM product_variant pv
      JOIN product p ON p.id = pv.product_id
      WHERE pv.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM product_variant_inventory_item pvii
          WHERE pvii.variant_id = pv.id
            AND pvii.deleted_at IS NULL
        )
      ORDER BY p.title, pv.id
    `)

    console.log(`\nFound ${variants.length} variants without inventory.\n`)

    if (variants.length === 0) {
      console.log('Nothing to do — all variants already have inventory items.')
      return
    }

    if (DRY_RUN) {
      console.log('DRY RUN — no changes will be written.\n')
      for (const v of variants.slice(0, 20)) {
        console.log(`  • ${v.title} (${v.sku ?? v.id})`)
      }
      if (variants.length > 20) console.log(`  ... and ${variants.length - 20} more`)
      return
    }

    let created = 0
    let errors  = 0

    for (const variant of variants) {
      try {
        const inventoryItemId = makeId('iitem')
        const linkId          = makeId('pvitem')
        const levelId         = makeId('ilev')
        const now             = new Date().toISOString()

        await client.query('BEGIN')

        // 1. Create inventory_item
        await client.query(`
          INSERT INTO inventory_item (id, created_at, updated_at, sku, requires_shipping)
          VALUES ($1, $2, $2, $3, true)
        `, [inventoryItemId, now, variant.sku ?? null])

        // 2. Link variant → inventory_item
        await client.query(`
          INSERT INTO product_variant_inventory_item (id, variant_id, inventory_item_id, required_quantity, created_at, updated_at)
          VALUES ($1, $2, $3, 1, $4, $4)
        `, [linkId, variant.id, inventoryItemId, now])

        // 3. Create inventory_level for the Luxus Collection stock location
        await client.query(`
          INSERT INTO inventory_level (
            id, inventory_item_id, location_id,
            stocked_quantity, reserved_quantity, incoming_quantity,
            raw_stocked_quantity, raw_reserved_quantity, raw_incoming_quantity,
            created_at, updated_at
          )
          VALUES (
            $1, $2, $3,
            $4, 0, 0,
            $5, '{"value":"0","precision":20}', '{"value":"0","precision":20}',
            $6, $6
          )
        `, [
          levelId,
          inventoryItemId,
          LOCATION_ID,
          STOCKED_QTY,
          JSON.stringify({ value: String(STOCKED_QTY), precision: 20 }),
          now,
        ])

        await client.query('COMMIT')
        created++

        if (created % 50 === 0) {
          process.stdout.write(`  ${created}/${variants.length} done...\r`)
        }
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`\nError on variant ${variant.id} (${variant.sku}): ${err.message}`)
        errors++
      }
    }

    console.log(`\n✓ Done. Created inventory for ${created} variants. Errors: ${errors}`)

    // Summary
    const { rows: [summary] } = await client.query(`
      SELECT COUNT(*) as total FROM inventory_level
      WHERE location_id = $1
    `, [LOCATION_ID])
    console.log(`Total inventory levels at Luxus Collection: ${summary.total}`)

  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
