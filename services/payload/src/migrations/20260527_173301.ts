import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "banking_bank_name" varchar DEFAULT 'Truist Bank';
  ALTER TABLE "site_settings" ADD COLUMN "banking_account_name" varchar DEFAULT 'Luxus Capital, LLC';
  ALTER TABLE "site_settings" ADD COLUMN "banking_routing_number" varchar DEFAULT '263191387';
  ALTER TABLE "site_settings" ADD COLUMN "banking_account_number" varchar DEFAULT '1100009085694';
  ALTER TABLE "site_settings" ADD COLUMN "banking_swift_code" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "banking_location" varchar DEFAULT 'Sarasota, FL';
  ALTER TABLE "site_settings" ADD COLUMN "banking_memo" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN "banking_bank_name";
  ALTER TABLE "site_settings" DROP COLUMN "banking_account_name";
  ALTER TABLE "site_settings" DROP COLUMN "banking_routing_number";
  ALTER TABLE "site_settings" DROP COLUMN "banking_account_number";
  ALTER TABLE "site_settings" DROP COLUMN "banking_swift_code";
  ALTER TABLE "site_settings" DROP COLUMN "banking_location";
  ALTER TABLE "site_settings" DROP COLUMN "banking_memo";`)
}
