import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE consignment_page
      ADD COLUMN IF NOT EXISTS option1_link_text      varchar,
      ADD COLUMN IF NOT EXISTS option2_link_text      varchar,
      ADD COLUMN IF NOT EXISTS option3_link_text      varchar,
      ADD COLUMN IF NOT EXISTS option4_link_text      varchar,
      ADD COLUMN IF NOT EXISTS option5_link_text      varchar,
      ADD COLUMN IF NOT EXISTS outright_box_link      varchar,
      ADD COLUMN IF NOT EXISTS outright_box_link_text varchar
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE consignment_page
      DROP COLUMN IF EXISTS option1_link_text,
      DROP COLUMN IF EXISTS option2_link_text,
      DROP COLUMN IF EXISTS option3_link_text,
      DROP COLUMN IF EXISTS option4_link_text,
      DROP COLUMN IF EXISTS option5_link_text,
      DROP COLUMN IF EXISTS outright_box_link,
      DROP COLUMN IF EXISTS outright_box_link_text
  `)
}
