import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518001000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_detail" rename column "featured_image_url" to "thumbnail_url";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_detail" rename column "thumbnail_url" to "featured_image_url";`);
  }

}
