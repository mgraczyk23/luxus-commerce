import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS featured_page (
      id                    serial PRIMARY KEY,
      headline              varchar,
      intro_paragraph       text,
      classifieds_headline  varchar,
      classifieds_intro     text,
      classifieds_badge     varchar,
      updated_at            timestamp(3) with time zone NOT NULL DEFAULT now(),
      created_at            timestamp(3) with time zone NOT NULL DEFAULT now()
    )
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS featured_classifieds (
      id              serial PRIMARY KEY,
      title           varchar NOT NULL,
      price           numeric,
      price_note      varchar,
      condition       varchar,
      category        varchar,
      brand           varchar,
      model           varchar,
      caliber         varchar,
      description     text,
      location        varchar,
      listed_by       varchar,
      featured_image_id integer,
      sort_order      integer,
      active          boolean DEFAULT true,
      updated_at      timestamp(3) with time zone NOT NULL DEFAULT now(),
      created_at      timestamp(3) with time zone NOT NULL DEFAULT now()
    )
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS featured_page`)
  await db.execute(sql`DROP TABLE IF EXISTS featured_classifieds`)
}
