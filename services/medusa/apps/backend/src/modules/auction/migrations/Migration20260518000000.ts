import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "auction_listing" (
        "id" text not null,
        "status" text not null default 'draft',
        "starting_bid" numeric not null,
        "raw_starting_bid" jsonb not null,
        "reserve_price" numeric null,
        "raw_reserve_price" jsonb null,
        "bid_increment" numeric not null default 50,
        "raw_bid_increment" jsonb null,
        "starts_at" timestamptz null,
        "ends_at" timestamptz null,
        "notes" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "auction_listing_pkey" primary key ("id")
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_auction_listing_deleted_at" ON "auction_listing" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "auction_listing" cascade;`);
  }

}
