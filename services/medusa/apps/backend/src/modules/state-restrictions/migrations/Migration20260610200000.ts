import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610200000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "state_restriction" (
        "id"               text not null,
        "state_code"       text not null,
        "restriction_type" text not null,
        "notes"            text null,
        "created_at"       timestamptz not null default now(),
        "updated_at"       timestamptz not null default now(),
        "deleted_at"       timestamptz null,
        constraint "state_restriction_pkey" primary key ("id")
      );
    `)
    this.addSql(`create index if not exists "sr_state_code_idx" on "state_restriction" ("state_code");`)
    this.addSql(`create index if not exists "sr_type_idx"       on "state_restriction" ("restriction_type");`)
    this.addSql(`create unique index if not exists "sr_state_type_idx" on "state_restriction" ("state_code", "restriction_type") where deleted_at is null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "state_restriction";`)
  }

}
