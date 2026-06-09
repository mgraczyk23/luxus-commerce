import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260609000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "checkout_config" (
        "id" text not null,
        "key" text not null,
        "value" text not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "checkout_config_pkey" primary key ("id")
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_checkout_config_deleted_at" ON "checkout_config" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "checkout_config" cascade;`);
  }

}
