import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS support_page (
      id                  serial PRIMARY KEY,
      headline            varchar,
      intro_paragraph     text,
      topic1              varchar,
      topic2              varchar,
      topic3              varchar,
      topic4              varchar,
      topic5              varchar,
      topic6              varchar,
      topic7              varchar,
      topic8              varchar,
      topic9              varchar,
      topic10             varchar,
      email_card_sub      varchar,
      ffl_headline        varchar,
      ffl_intro           text,
      ffl_fee_note        text,
      ffl_step1_title     varchar,
      ffl_step1_desc      text,
      ffl_step2_title     varchar,
      ffl_step2_desc      text,
      ffl_step3_title     varchar,
      ffl_step3_desc      text,
      ffl_step4_title     varchar,
      ffl_step4_desc      text,
      ffl_step5_title     varchar,
      ffl_step5_desc      text,
      info_card1_heading  varchar,
      info_card1_body     text,
      info_card2_heading  varchar,
      info_card2_body     text,
      info_card3_heading  varchar,
      info_card3_body     text,
      updated_at          timestamp(3) with time zone NOT NULL DEFAULT now(),
      created_at          timestamp(3) with time zone NOT NULL DEFAULT now()
    )
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS support_page`)
}
