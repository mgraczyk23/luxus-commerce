import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518002000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_detail" add column if not exists "contact_for_pricing" boolean not null default false, add column if not exists "primary_category" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_detail" drop column if exists "contact_for_pricing", drop column if exists "primary_category";`);
  }

}
