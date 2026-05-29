import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS contact_page (
      id                  serial PRIMARY KEY,
      headline            varchar,
      intro_paragraph     text,
      topic1              varchar,
      topic2              varchar,
      topic3              varchar,
      topic4              varchar,
      topic5              varchar,
      topic6              varchar,
      topic7              varchar,
      topic8              varchar,
      topic9              varchar,
      topic10             varchar,
      email_channel_sub   varchar,
      sales_channel_sub   text,
      press_channel_sub   varchar,
      expect1_title       varchar,
      expect1_body        text,
      expect2_title       varchar,
      expect2_body        text,
      expect3_title       varchar,
      expect3_body        text,
      expect4_title       varchar,
      expect4_body        text,
      updated_at          timestamp(3) with time zone NOT NULL DEFAULT now(),
      created_at          timestamp(3) with time zone NOT NULL DEFAULT now()
    )
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS contact_page`)
}
