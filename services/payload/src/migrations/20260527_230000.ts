import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "shipping_policy_sections" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "heading" varchar NOT NULL,
      "body" text NOT NULL
    );

    CREATE TABLE "shipping_policy" (
      "id" serial PRIMARY KEY NOT NULL,
      "last_updated" varchar,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    CREATE TABLE "privacy_policy_sections" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "heading" varchar NOT NULL,
      "body" text NOT NULL
    );

    CREATE TABLE "privacy_policy" (
      "id" serial PRIMARY KEY NOT NULL,
      "last_updated" varchar,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    CREATE TABLE "terms_policy_sections" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "heading" varchar NOT NULL,
      "body" text NOT NULL
    );

    CREATE TABLE "terms_policy" (
      "id" serial PRIMARY KEY NOT NULL,
      "last_updated" varchar,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    ALTER TABLE "shipping_policy_sections" ADD CONSTRAINT "shipping_policy_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shipping_policy"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "privacy_policy_sections"  ADD CONSTRAINT "privacy_policy_sections_parent_id_fk"  FOREIGN KEY ("_parent_id") REFERENCES "public"."privacy_policy"("id")  ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "terms_policy_sections"    ADD CONSTRAINT "terms_policy_sections_parent_id_fk"    FOREIGN KEY ("_parent_id") REFERENCES "public"."terms_policy"("id")    ON DELETE cascade ON UPDATE no action;

    CREATE INDEX "shipping_policy_sections_order_idx" ON "shipping_policy_sections" USING btree ("_order");
    CREATE INDEX "shipping_policy_sections_parent_idx" ON "shipping_policy_sections" USING btree ("_parent_id");
    CREATE INDEX "privacy_policy_sections_order_idx"  ON "privacy_policy_sections"  USING btree ("_order");
    CREATE INDEX "privacy_policy_sections_parent_idx" ON "privacy_policy_sections"  USING btree ("_parent_id");
    CREATE INDEX "terms_policy_sections_order_idx"    ON "terms_policy_sections"    USING btree ("_order");
    CREATE INDEX "terms_policy_sections_parent_idx"   ON "terms_policy_sections"    USING btree ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "shipping_policy_sections" CASCADE;
    DROP TABLE "shipping_policy" CASCADE;
    DROP TABLE "privacy_policy_sections" CASCADE;
    DROP TABLE "privacy_policy" CASCADE;
    DROP TABLE "terms_policy_sections" CASCADE;
    DROP TABLE "terms_policy" CASCADE;
  `)
}
