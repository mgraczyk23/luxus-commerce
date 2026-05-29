import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS shop_tile_images_models (
      _order      integer           NOT NULL,
      _parent_id  integer           NOT NULL,
      id          character varying NOT NULL,
      handle      character varying NOT NULL,
      image_id    integer           NOT NULL,
      PRIMARY KEY (id),
      CONSTRAINT shop_tile_images_models_image_id_media_id_fk
        FOREIGN KEY (image_id) REFERENCES media(id) ON DELETE SET NULL,
      CONSTRAINT shop_tile_images_models_parent_id_fk
        FOREIGN KEY (_parent_id) REFERENCES shop_tile_images(id) ON DELETE CASCADE
    )
  `)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS shop_tile_images_models_order_idx ON shop_tile_images_models (_order)`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS shop_tile_images_models_parent_id_idx ON shop_tile_images_models (_parent_id)`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS shop_tile_images_models_image_idx ON shop_tile_images_models (image_id)`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS shop_tile_images_models`)
}
