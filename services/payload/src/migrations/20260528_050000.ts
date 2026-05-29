import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "consignment_page" (
      "id"                        serial PRIMARY KEY NOT NULL,
      "headline"                  varchar,
      "intro_paragraph"           text,
      "diff_box_title"            varchar,
      "option1_heading"           varchar,
      "option1_body"              text,
      "option2_heading"           varchar,
      "option2_body"              text,
      "commission_note"           text,
      "sales_email_response_time" varchar,
      "form_heading"              varchar,
      "step1_title"               varchar,
      "step1_body"                text,
      "step2_title"               varchar,
      "step2_body"                text,
      "step3_title"               varchar,
      "step3_body"                text,
      "step4_title"               varchar,
      "step4_body"                text,
      "outright_box_body"         text,
      "updated_at"                timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at"                timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "consignment_page";`)
}
