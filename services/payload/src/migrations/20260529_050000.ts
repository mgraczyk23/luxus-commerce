import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE site_settings
      ADD COLUMN IF NOT EXISTS footer_blurb          text,
      ADD COLUMN IF NOT EXISTS footer_copyright_line varchar,
      ADD COLUMN IF NOT EXISTS footer_legal_line      text
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE site_settings
      DROP COLUMN IF EXISTS footer_blurb,
      DROP COLUMN IF EXISTS footer_copyright_line,
      DROP COLUMN IF EXISTS footer_legal_line
  `)
}
