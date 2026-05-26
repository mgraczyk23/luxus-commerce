import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260526000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "offer" (
        "id"                  text not null,
        "product_id"          text not null,
        "product_handle"      text not null,
        "product_title"       text not null,
        "first_name"          text not null,
        "last_name"           text null,
        "email"               text not null,
        "phone"               text null,
        "offer_amount"        numeric not null,
        "raw_offer_amount"    jsonb null,
        "counter_amount"      numeric null,
        "raw_counter_amount"  jsonb null,
        "status"              text not null default 'pending',
        "message"             text null,
        "admin_notes"         text null,
        "expires_at"          timestamptz null,
        "created_at"          timestamptz not null default now(),
        "updated_at"          timestamptz not null default now(),
        "deleted_at"          timestamptz null,
        constraint "offer_pkey" primary key ("id")
      );
    `)

    this.addSql(`create index if not exists "offer_status_idx"     on "offer" ("status");`)
    this.addSql(`create index if not exists "offer_product_id_idx" on "offer" ("product_id");`)
    this.addSql(`create index if not exists "offer_email_idx"      on "offer" ("email");`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "offer";`)
  }

}
