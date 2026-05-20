import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260520000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_detail" add column if not exists "engraver" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_detail" drop column if exists "engraver";`);
  }

}
