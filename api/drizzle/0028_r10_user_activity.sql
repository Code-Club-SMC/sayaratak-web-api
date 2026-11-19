-- Owner, step 11.7-r10: one row per signed-in account, Khartoum day and device; history starts on deploy.
CREATE TYPE "public"."activity_device" AS ENUM('phone_web', 'computer_web', 'android_app', 'ios_app');--> statement-breakpoint
CREATE TABLE "user_activity" (
	"day" date NOT NULL,
	"user_id" text NOT NULL,
	"device" "activity_device" NOT NULL,
	CONSTRAINT "user_activity_day_user_id_device_pk" PRIMARY KEY("day","user_id","device")
);
--> statement-breakpoint
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_activity_user_id_index" ON "user_activity" USING btree ("user_id");