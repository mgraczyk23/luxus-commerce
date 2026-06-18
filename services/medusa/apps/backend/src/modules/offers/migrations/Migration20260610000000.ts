import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      alter table "offer"
        add column if not exists "checkout_token"            text null,
        add column if not exists "checkout_token_expires_at" timestamptz null;
    `)
    this.addSql(`create unique index if not exists "offer_checkout_token_idx" on "offer" ("checkout_token") where checkout_token is not null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "offer" drop column if exists "checkout_token", drop column if exists "checkout_token_expires_at";`)
    this.addSql(`drop index if exists "offer_checkout_token_idx";`)
  }

}
