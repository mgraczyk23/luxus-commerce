import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE consignment_page
      ADD COLUMN IF NOT EXISTS option1_link       varchar,
      ADD COLUMN IF NOT EXISTS option2_link       varchar,
      ADD COLUMN IF NOT EXISTS option3_heading    varchar,
      ADD COLUMN IF NOT EXISTS option3_body       text,
      ADD COLUMN IF NOT EXISTS option3_link       varchar,
      ADD COLUMN IF NOT EXISTS option4_heading    varchar,
      ADD COLUMN IF NOT EXISTS option4_body       text,
      ADD COLUMN IF NOT EXISTS option4_link       varchar,
      ADD COLUMN IF NOT EXISTS option5_heading    varchar,
      ADD COLUMN IF NOT EXISTS option5_body       text,
      ADD COLUMN IF NOT EXISTS option5_link       varchar
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE consignment_page
      DROP COLUMN IF EXISTS option1_link,
      DROP COLUMN IF EXISTS option2_link,
      DROP COLUMN IF EXISTS option3_heading,
      DROP COLUMN IF EXISTS option3_body,
      DROP COLUMN IF EXISTS option3_link,
      DROP COLUMN IF EXISTS option4_heading,
      DROP COLUMN IF EXISTS option4_body,
      DROP COLUMN IF EXISTS option4_link,
      DROP COLUMN IF EXISTS option5_heading,
      DROP COLUMN IF EXISTS option5_body,
      DROP COLUMN IF EXISTS option5_link
  `)
}
