import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514144609 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "inventory_info" add column if not exists "item_cost" numeric null, add column if not exists "is_master_backroom" boolean not null default false, add column if not exists "is_backroom" boolean not null default false, add column if not exists "raw_item_cost" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "inventory_info" drop column if exists "item_cost", drop column if exists "is_master_backroom", drop column if exists "is_backroom", drop column if exists "raw_item_cost";`);
  }

}
