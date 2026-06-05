import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Gallery section heading + intro text on the About page global
  await db.execute(sql`ALTER TABLE about_page ADD COLUMN IF NOT EXISTS gallery_heading character varying`)
  await db.execute(sql`ALTER TABLE about_page ADD COLUMN IF NOT EXISTS gallery_intro character varying`)

  // Gallery items array (image + optional title + optional caption)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS about_page_gallery (
      _order      integer           NOT NULL,
      _parent_id  integer           NOT NULL,
      id          character varying NOT NULL,
      image_id    integer,
      title       character varying,
      caption     character varying,
      PRIMARY KEY (id),
      CONSTRAINT about_page_gallery_image_id_media_id_fk
        FOREIGN KEY (image_id) REFERENCES media(id) ON DELETE SET NULL,
      CONSTRAINT about_page_gallery_parent_id_fk
        FOREIGN KEY (_parent_id) REFERENCES about_page(id) ON DELETE CASCADE
    )
  `)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS about_page_gallery_order_idx ON about_page_gallery (_order)`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS about_page_gallery_parent_id_idx ON about_page_gallery (_parent_id)`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS about_page_gallery_image_idx ON about_page_gallery (image_id)`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS about_page_gallery`)
  await db.execute(sql`ALTER TABLE about_page DROP COLUMN IF EXISTS gallery_heading`)
  await db.execute(sql`ALTER TABLE about_page DROP COLUMN IF EXISTS gallery_intro`)
}
