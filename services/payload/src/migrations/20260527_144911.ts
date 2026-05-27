import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"contact_phone" varchar DEFAULT '(941) 253-3660',
  	"contact_phone_toll_free" varchar DEFAULT '(833) 486-6659',
  	"contact_email_info" varchar DEFAULT 'info@luxus-collection.com',
  	"contact_email_support" varchar DEFAULT 'support@luxus-collection.com',
  	"contact_email_sales" varchar DEFAULT 'sales@luxus-collection.com',
  	"contact_email_press" varchar DEFAULT 'press@luxus-collection.com',
  	"address_line1" varchar DEFAULT '1199 N Beneva Rd',
  	"address_city" varchar DEFAULT 'Sarasota',
  	"address_state" varchar DEFAULT 'FL',
  	"address_zip" varchar DEFAULT '34232',
  	"hours_weekday_open" varchar DEFAULT '8:30 AM',
  	"hours_weekday_close" varchar DEFAULT '6:00 PM',
  	"hours_saturday_open" varchar DEFAULT '10:00 AM',
  	"hours_saturday_close" varchar DEFAULT '2:00 PM',
  	"hours_timezone" varchar DEFAULT 'EST',
  	"hours_sunday_closed" boolean DEFAULT true,
  	"social_facebook" varchar,
  	"social_instagram" varchar,
  	"social_linkedin" varchar,
  	"social_twitter" varchar,
  	"social_youtube" varchar,
  	"social_pinterest" varchar,
  	"announcement_enabled" boolean DEFAULT false,
  	"announcement_message" varchar,
  	"announcement_link" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings" CASCADE;`)
}
