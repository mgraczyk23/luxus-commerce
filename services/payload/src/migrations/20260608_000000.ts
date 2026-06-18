import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // New text fields on the hero_slides global table
  await db.execute(sql`ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS wordmark character varying`)
  await db.execute(sql`ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS tagline character varying`)
  await db.execute(sql`ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS intro_body character varying`)

  // Featured images array for the right-column slider
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_slides_featured_images (
      _order      integer           NOT NULL,
      _parent_id  integer           NOT NULL,
      id          character varying NOT NULL,
      image_id    integer,
      caption     character varying,
      PRIMARY KEY (id),
      CONSTRAINT hero_slides_featured_images_image_id_media_id_fk
        FOREIGN KEY (image_id) REFERENCES media(id) ON DELETE SET NULL,
      CONSTRAINT hero_slides_featured_images_parent_id_fk
        FOREIGN KEY (_parent_id) REFERENCES hero_slides(id) ON DELETE CASCADE
    )
  `)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS hero_slides_featured_images_order_idx ON hero_slides_featured_images (_order)`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS hero_slides_featured_images_parent_id_idx ON hero_slides_featured_images (_parent_id)`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS hero_slides_featured_images_image_idx ON hero_slides_featured_images (image_id)`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS hero_slides_featured_images`)
  await db.execute(sql`ALTER TABLE hero_slides DROP COLUMN IF EXISTS wordmark`)
  await db.execute(sql`ALTER TABLE hero_slides DROP COLUMN IF EXISTS tagline`)
  await db.execute(sql`ALTER TABLE hero_slides DROP COLUMN IF EXISTS intro_body`)
}
