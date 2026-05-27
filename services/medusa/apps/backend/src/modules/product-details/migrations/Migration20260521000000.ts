import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260521000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_detail" add column if not exists "seo_meta_title" text null;`);
    this.addSql(`alter table if exists "product_detail" add column if not exists "seo_meta_description" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_detail" drop column if exists "seo_meta_title";`);
    this.addSql(`alter table if exists "product_detail" drop column if exists "seo_meta_description";`);
  }

}
