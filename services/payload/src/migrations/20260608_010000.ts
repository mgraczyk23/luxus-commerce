import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE site_settings
      ADD COLUMN IF NOT EXISTS branding_logo_id    integer REFERENCES media(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS branding_favicon_id integer REFERENCES media(id) ON DELETE SET NULL
  `)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS site_settings_branding_logo_idx    ON site_settings (branding_logo_id)`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS site_settings_branding_favicon_idx ON site_settings (branding_favicon_id)`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE site_settings DROP COLUMN IF EXISTS branding_logo_id`)
  await db.execute(sql`ALTER TABLE site_settings DROP COLUMN IF EXISTS branding_favicon_id`)
}
