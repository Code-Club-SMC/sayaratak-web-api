-- Owner, step 11.7-r12a: reason codes and flag times start on deploy; older rejections and flags stay null (shown as not recorded).
CREATE TYPE "public"."rejection_code" AS ENUM('photos', 'category', 'duplicate', 'prohibited', 'missing', 'other');--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "rejection_code" "rejection_code";--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "flagged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "decided_at" timestamp with time zone;