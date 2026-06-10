import { Migration } from "@mikro-orm/migrations"

export class Migration20260610500000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "state_restriction"
        ADD COLUMN IF NOT EXISTS "magazine_limit" integer,
        ADD COLUMN IF NOT EXISTS "firearm_type"   varchar(20);
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "state_restriction"
        DROP COLUMN IF EXISTS "magazine_limit",
        DROP COLUMN IF EXISTS "firearm_type";
    `)
  }
}
