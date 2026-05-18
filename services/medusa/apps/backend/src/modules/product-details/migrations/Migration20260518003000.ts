import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518003000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_detail" drop column if exists "thumbnail_url";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_detail" add column if not exists "thumbnail_url" text null;`);
  }

}
