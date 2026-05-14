import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514213000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "attribute_type" add column if not exists "is_multi_select" boolean not null default true;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "attribute_type" drop column if exists "is_multi_select";`);
  }

}
