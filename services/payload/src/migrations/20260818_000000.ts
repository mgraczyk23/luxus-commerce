import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE site_settings
      ADD COLUMN IF NOT EXISTS analytics_google_tag_manager_id text;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE site_settings
      DROP COLUMN IF EXISTS analytics_google_tag_manager_id;
  `)
}
