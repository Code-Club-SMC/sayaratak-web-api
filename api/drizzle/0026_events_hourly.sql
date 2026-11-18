CREATE TABLE "events_hourly" (
	"day" date NOT NULL,
	"hour" smallint NOT NULL,
	"target_id" text NOT NULL,
	"type" "event_type" NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "events_hourly_target_id_day_hour_type_pk" PRIMARY KEY("target_id","day","hour","type"),
	CONSTRAINT "events_hourly_count_positive" CHECK ("events_hourly"."count" > 0),
	CONSTRAINT "events_hourly_hour_range" CHECK ("events_hourly"."hour" between 0 and 23)
);
--> statement-breakpoint
CREATE INDEX "events_hourly_day_index" ON "events_hourly" USING btree ("day");