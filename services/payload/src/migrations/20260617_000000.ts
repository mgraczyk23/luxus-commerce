import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE site_settings
      ADD COLUMN IF NOT EXISTS product_cards_show_category_badge    boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS product_cards_show_availability_badge boolean DEFAULT true;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE site_settings
      DROP COLUMN IF EXISTS product_cards_show_category_badge,
      DROP COLUMN IF EXISTS product_cards_show_availability_badge;
  `)
}
