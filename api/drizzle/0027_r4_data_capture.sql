CREATE TABLE "searches_daily" (
	"day" date NOT NULL,
	"kind" text NOT NULL,
	"intent" text NOT NULL,
	"type" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"city" text NOT NULL,
	"part_category" text NOT NULL,
	"has_text" boolean NOT NULL,
	"searches" integer NOT NULL,
	"zero_results" integer NOT NULL,
	"results" bigint NOT NULL,
	CONSTRAINT "searches_daily_pk" PRIMARY KEY("day","kind","intent","type","make","model","city","part_category","has_text"),
	CONSTRAINT "searches_daily_searches_positive" CHECK ("searches_daily"."searches" > 0)
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "sold_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
-- Owner, step 11.7-r4: decided-at backfilled exactly from the audit log; sold_at stays null for old rows.
UPDATE "listings" l SET "decided_at" = a.at FROM (SELECT "target_id", max("created_at") AS at FROM "audit_log" WHERE "target_type" = 'listing' AND "action" IN ('listing.approve', 'listing.reject', 'listing.remove', 'listing.restore') GROUP BY "target_id") a WHERE l."id" = a."target_id";--> statement-breakpoint
UPDATE "verification_requests" v SET "decided_at" = a.at FROM (SELECT "target_id", max("created_at") AS at FROM "audit_log" WHERE "target_type" = 'verification' AND "action" IN ('verification.approve', 'verification.reject') GROUP BY "target_id") a WHERE v."id" = a."target_id" AND v."status" <> 'pending';--> statement-breakpoint
UPDATE "reports" r SET "decided_at" = a.at FROM (SELECT "target_id", max("created_at") AS at FROM "audit_log" WHERE "target_type" = 'report' AND "action" IN ('report.dismiss', 'report.action') GROUP BY "target_id") a WHERE r."id" = a."target_id" AND r."status" <> 'open';--> statement-breakpoint
-- A report closed together with another on the same listing has no audit row of its own: it takes that action's time.
UPDATE "reports" r SET "decided_at" = (SELECT min(a."created_at") FROM "audit_log" a JOIN "reports" o ON o."id" = a."target_id" WHERE a."target_type" = 'report' AND a."action" = 'report.action' AND o."listing_id" = r."listing_id" AND a."created_at" >= r."created_at") WHERE r."status" = 'actioned' AND r."decided_at" IS NULL AND r."listing_id" IS NOT NULL;
