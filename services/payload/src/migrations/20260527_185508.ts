import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "shop_tile_images_collections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"handle" varchar NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "shop_tile_images_categories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"handle" varchar NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "shop_tile_images" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "shop_tile_images_collections" ADD CONSTRAINT "shop_tile_images_collections_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_tile_images_collections" ADD CONSTRAINT "shop_tile_images_collections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_tile_images"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shop_tile_images_categories" ADD CONSTRAINT "shop_tile_images_categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_tile_images_categories" ADD CONSTRAINT "shop_tile_images_categories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_tile_images"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "shop_tile_images_collections_order_idx" ON "shop_tile_images_collections" USING btree ("_order");
  CREATE INDEX "shop_tile_images_collections_parent_id_idx" ON "shop_tile_images_collections" USING btree ("_parent_id");
  CREATE INDEX "shop_tile_images_collections_image_idx" ON "shop_tile_images_collections" USING btree ("image_id");
  CREATE INDEX "shop_tile_images_categories_order_idx" ON "shop_tile_images_categories" USING btree ("_order");
  CREATE INDEX "shop_tile_images_categories_parent_id_idx" ON "shop_tile_images_categories" USING btree ("_parent_id");
  CREATE INDEX "shop_tile_images_categories_image_idx" ON "shop_tile_images_categories" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "shop_tile_images_collections" CASCADE;
  DROP TABLE "shop_tile_images_categories" CASCADE;
  DROP TABLE "shop_tile_images" CASCADE;`)
}
