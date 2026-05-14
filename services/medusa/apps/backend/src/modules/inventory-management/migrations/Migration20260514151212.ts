import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514151212 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "inventory_info" add column if not exists "consignor_customer_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "inventory_info" drop column if exists "consignor_customer_id";`);
  }

}
