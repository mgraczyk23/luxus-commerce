import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "brands" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"origin" varchar,
  	"description" varchar,
  	"logo_id" integer,
  	"featured" boolean DEFAULT false,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "hero_slides_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"image_id" integer,
  	"kicker" varchar,
  	"caption" varchar
  );
  
  CREATE TABLE "hero_slides" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "about_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_image_id" integer,
  	"story_image_main_id" integer,
  	"story_image_left_id" integer,
  	"story_image_right_id" integer,
  	"values_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "brands_id" integer;
  ALTER TABLE "brands" ADD CONSTRAINT "brands_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "hero_slides_slides" ADD CONSTRAINT "hero_slides_slides_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "hero_slides_slides" ADD CONSTRAINT "hero_slides_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."hero_slides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page" ADD CONSTRAINT "about_page_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page" ADD CONSTRAINT "about_page_story_image_main_id_media_id_fk" FOREIGN KEY ("story_image_main_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page" ADD CONSTRAINT "about_page_story_image_left_id_media_id_fk" FOREIGN KEY ("story_image_left_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page" ADD CONSTRAINT "about_page_story_image_right_id_media_id_fk" FOREIGN KEY ("story_image_right_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page" ADD CONSTRAINT "about_page_values_image_id_media_id_fk" FOREIGN KEY ("values_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "brands_slug_idx" ON "brands" USING btree ("slug");
  CREATE INDEX "brands_logo_idx" ON "brands" USING btree ("logo_id");
  CREATE INDEX "brands_updated_at_idx" ON "brands" USING btree ("updated_at");
  CREATE INDEX "brands_created_at_idx" ON "brands" USING btree ("created_at");
  CREATE INDEX "hero_slides_slides_order_idx" ON "hero_slides_slides" USING btree ("_order");
  CREATE INDEX "hero_slides_slides_parent_id_idx" ON "hero_slides_slides" USING btree ("_parent_id");
  CREATE INDEX "hero_slides_slides_image_idx" ON "hero_slides_slides" USING btree ("image_id");
  CREATE INDEX "about_page_hero_image_idx" ON "about_page" USING btree ("hero_image_id");
  CREATE INDEX "about_page_story_image_main_idx" ON "about_page" USING btree ("story_image_main_id");
  CREATE INDEX "about_page_story_image_left_idx" ON "about_page" USING btree ("story_image_left_id");
  CREATE INDEX "about_page_story_image_right_idx" ON "about_page" USING btree ("story_image_right_id");
  CREATE INDEX "about_page_values_image_idx" ON "about_page" USING btree ("values_image_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_brands_id_idx" ON "payload_locked_documents_rels" USING btree ("brands_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "brands" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "hero_slides_slides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "hero_slides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "about_page" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "brands" CASCADE;
  DROP TABLE "hero_slides_slides" CASCADE;
  DROP TABLE "hero_slides" CASCADE;
  DROP TABLE "about_page" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_brands_fk";
  
  DROP INDEX "payload_locked_documents_rels_brands_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "brands_id";`)
}
