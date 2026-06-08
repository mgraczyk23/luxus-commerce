import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS brands_catalogs (
      _order         integer NOT NULL,
      _parent_id     integer NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      id             varchar PRIMARY KEY,
      title          varchar NOT NULL,
      file_id        integer REFERENCES media(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS brands_catalogs_order_idx    ON brands_catalogs (_order);
    CREATE INDEX IF NOT EXISTS brands_catalogs_parent_idx   ON brands_catalogs (_parent_id);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS brands_catalogs;`)
}
