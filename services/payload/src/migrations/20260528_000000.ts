import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Expand brands table with editorial hub fields
    ALTER TABLE "brands"
      ADD COLUMN "hero_image_id" integer,
      ADD COLUMN "tagline" varchar,
      ADD COLUMN "founding_year" numeric,
      ADD COLUMN "history" jsonb,
      ADD COLUMN "seo_title" varchar,
      ADD COLUMN "seo_description" varchar;

    -- Photo gallery array (one row per image)
    CREATE TABLE "brands_gallery" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "image_id" integer,
      "caption" varchar
    );

    -- Model series / product lines array
    CREATE TABLE "brands_model_series" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "year_introduced" numeric,
      "description" jsonb,
      "image_id" integer,
      "product_handle" varchar
    );

    -- Brand timeline milestones array
    CREATE TABLE "brands_timeline" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "year" varchar NOT NULL,
      "title" varchar NOT NULL,
      "body" text,
      "image_id" integer
    );

    -- Add brand relationship to posts (hasMany: false → direct FK column)
    ALTER TABLE "posts" ADD COLUMN "brand_id" integer;

    -- FK: brands.hero_image_id → media
    ALTER TABLE "brands" ADD CONSTRAINT "brands_hero_image_id_media_id_fk"
      FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;

    -- FK: brands_gallery
    ALTER TABLE "brands_gallery" ADD CONSTRAINT "brands_gallery_image_id_media_id_fk"
      FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "brands_gallery" ADD CONSTRAINT "brands_gallery_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;

    -- FK: brands_model_series
    ALTER TABLE "brands_model_series" ADD CONSTRAINT "brands_model_series_image_id_media_id_fk"
      FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "brands_model_series" ADD CONSTRAINT "brands_model_series_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;

    -- FK: brands_timeline
    ALTER TABLE "brands_timeline" ADD CONSTRAINT "brands_timeline_image_id_media_id_fk"
      FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "brands_timeline" ADD CONSTRAINT "brands_timeline_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;

    -- FK: posts.brand_id → brands
    ALTER TABLE "posts" ADD CONSTRAINT "posts_brand_id_brands_id_fk"
      FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;

    -- Indexes: brands new columns
    CREATE INDEX "brands_hero_image_idx" ON "brands" USING btree ("hero_image_id");

    -- Indexes: brands_gallery
    CREATE INDEX "brands_gallery_order_idx"     ON "brands_gallery" USING btree ("_order");
    CREATE INDEX "brands_gallery_parent_id_idx" ON "brands_gallery" USING btree ("_parent_id");
    CREATE INDEX "brands_gallery_image_idx"     ON "brands_gallery" USING btree ("image_id");

    -- Indexes: brands_model_series
    CREATE INDEX "brands_model_series_order_idx"     ON "brands_model_series" USING btree ("_order");
    CREATE INDEX "brands_model_series_parent_id_idx" ON "brands_model_series" USING btree ("_parent_id");
    CREATE INDEX "brands_model_series_image_idx"     ON "brands_model_series" USING btree ("image_id");

    -- Indexes: brands_timeline
    CREATE INDEX "brands_timeline_order_idx"     ON "brands_timeline" USING btree ("_order");
    CREATE INDEX "brands_timeline_parent_id_idx" ON "brands_timeline" USING btree ("_parent_id");
    CREATE INDEX "brands_timeline_image_idx"     ON "brands_timeline" USING btree ("image_id");

    -- Index: posts.brand_id
    CREATE INDEX "posts_brand_idx" ON "posts" USING btree ("brand_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_brand_id_brands_id_fk";
    ALTER TABLE "posts" DROP COLUMN IF EXISTS "brand_id";

    DROP TABLE IF EXISTS "brands_gallery" CASCADE;
    DROP TABLE IF EXISTS "brands_model_series" CASCADE;
    DROP TABLE IF EXISTS "brands_timeline" CASCADE;

    ALTER TABLE "brands" DROP CONSTRAINT IF EXISTS "brands_hero_image_id_media_id_fk";
    ALTER TABLE "brands" DROP COLUMN IF EXISTS "hero_image_id";
    ALTER TABLE "brands" DROP COLUMN IF EXISTS "tagline";
    ALTER TABLE "brands" DROP COLUMN IF EXISTS "founding_year";
    ALTER TABLE "brands" DROP COLUMN IF EXISTS "history";
    ALTER TABLE "brands" DROP COLUMN IF EXISTS "seo_title";
    ALTER TABLE "brands" DROP COLUMN IF EXISTS "seo_description";
  `)
}
