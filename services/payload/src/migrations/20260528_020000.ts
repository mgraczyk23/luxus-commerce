import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_resource_pages_status" AS ENUM('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE TABLE IF NOT EXISTS "resource_pages" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "excerpt" varchar,
      "featured_image_id" integer,
      "brand_id" integer NOT NULL,
      "status" "enum_resource_pages_status" NOT NULL DEFAULT 'draft',
      "sort_order" numeric DEFAULT 0,
      "seo_title" varchar,
      "seo_description" varchar,
      "content" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "resource_pages_slug_unique" UNIQUE("slug")
    );

    CREATE TABLE IF NOT EXISTS "resource_pages_specs" (
      "id" serial PRIMARY KEY NOT NULL,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "heading" varchar,
      "note" varchar
    );

    CREATE TABLE IF NOT EXISTS "resource_pages_specs_entries" (
      "id" serial PRIMARY KEY NOT NULL,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "label" varchar NOT NULL,
      "value" varchar NOT NULL
    );

    ALTER TABLE "resource_pages"
      ADD CONSTRAINT "resource_pages_featured_image_id_media_id_fk"
      FOREIGN KEY ("featured_image_id") REFERENCES "media"("id") ON DELETE SET NULL;

    ALTER TABLE "resource_pages"
      ADD CONSTRAINT "resource_pages_brand_id_brands_id_fk"
      FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL;

    ALTER TABLE "resource_pages_specs"
      ADD CONSTRAINT "resource_pages_specs_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "resource_pages"("id") ON DELETE CASCADE;

    ALTER TABLE "resource_pages_specs_entries"
      ADD CONSTRAINT "resource_pages_specs_entries_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "resource_pages_specs"("id") ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS "resource_pages_brand_idx" ON "resource_pages" ("brand_id");
    CREATE INDEX IF NOT EXISTS "resource_pages_status_idx" ON "resource_pages" ("status");
    CREATE INDEX IF NOT EXISTS "resource_pages_specs_order_idx" ON "resource_pages_specs" ("_order");
    CREATE INDEX IF NOT EXISTS "resource_pages_specs_parent_idx" ON "resource_pages_specs" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "resource_pages_specs_entries_order_idx" ON "resource_pages_specs_entries" ("_order");
    CREATE INDEX IF NOT EXISTS "resource_pages_specs_entries_parent_idx" ON "resource_pages_specs_entries" ("_parent_id");

    -- Payload document-locking: register resource_pages as a lockable collection
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "resource_pages_id" integer
        REFERENCES "resource_pages"("id") ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_resource_pages_id_idx"
      ON "payload_locked_documents_rels" ("resource_pages_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "resource_pages_id";
    DROP TABLE IF EXISTS "resource_pages_specs_entries";
    DROP TABLE IF EXISTS "resource_pages_specs";
    DROP TABLE IF EXISTS "resource_pages";
    DROP TYPE IF EXISTS "public"."enum_resource_pages_status";
  `)
}
