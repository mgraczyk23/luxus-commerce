import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260612BackroomPasswords extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "backroom_password" (
        "id"            text        not null,
        "room_slug"     text        not null,
        "password_hash" text        not null,
        "created_at"    timestamptz not null default now(),
        "updated_at"    timestamptz not null default now(),
        "deleted_at"    timestamptz null,
        constraint "backroom_password_pkey" primary key ("id")
      );
    `)
    this.addSql(`
      create unique index if not exists "backroom_password_room_slug_unique"
        on "backroom_password" ("room_slug")
        where "deleted_at" is null;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "backroom_password";`)
  }
}
