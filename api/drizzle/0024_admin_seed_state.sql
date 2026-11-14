CREATE TYPE "public"."seed_dataset_state" AS ENUM('preparing', 'ready', 'seeding', 'installed', 'removing', 'removed', 'retained');--> statement-breakpoint
CREATE TYPE "public"."seed_operation_kind" AS ENUM('archive', 'seed', 'remove');--> statement-breakpoint
CREATE TYPE "public"."seed_operation_state" AS ENUM('receiving', 'queued', 'running', 'failed', 'completed');--> statement-breakpoint
CREATE TYPE "public"."seed_stage" AS ENUM('upload', 'validate', 'store-images', 'insert-businesses', 'insert-listings', 'hide', 'remove-records', 'remove-media', 'complete');--> statement-breakpoint
CREATE TYPE "public"."seed_asset_state" AS ENUM('expected', 'validated', 'stored', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."seed_record_domain" AS ENUM('owner', 'listing', 'dealership', 'workshop', 'mechanic', 'upload');--> statement-breakpoint
CREATE TYPE "public"."seed_storage_state" AS ENUM('pending', 'stored', 'delete-pending', 'deleted');--> statement-breakpoint
CREATE TABLE "seed_datasets" (
	"id" text PRIMARY KEY NOT NULL,
	"version" text NOT NULL,
	"manifest_digest" text NOT NULL,
	"manifest" jsonb NOT NULL,
	"state" "seed_dataset_state" DEFAULT 'preparing' NOT NULL,
	"live_slot" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "seed_dataset_slot" CHECK ("seed_datasets"."live_slot" is null or "seed_datasets"."live_slot" is true),
	CONSTRAINT "seed_dataset_removed_slot" CHECK (("seed_datasets"."state" = 'removed') = ("seed_datasets"."live_slot" is null)),
	CONSTRAINT "seed_dataset_digest" CHECK ("seed_datasets"."manifest_digest" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "seed_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"dataset_id" text NOT NULL,
	"kind" "seed_operation_kind" NOT NULL,
	"state" "seed_operation_state" NOT NULL,
	"stage" "seed_stage" NOT NULL,
	"active_slot" boolean DEFAULT true,
	"superseded_by" text,
	"actor_id" text,
	"actor_ip" text NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"committed_images" integer DEFAULT 0 NOT NULL,
	"committed_businesses" integer DEFAULT 0 NOT NULL,
	"committed_listings" integer DEFAULT 0 NOT NULL,
	"retained_records" integer DEFAULT 0 NOT NULL,
	"checkpoint" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "seed_operation_slot" CHECK ("seed_operations"."active_slot" is null or "seed_operations"."active_slot" is true),
	CONSTRAINT "seed_operation_terminal_slot" CHECK (("seed_operations"."active_slot" is null) = ("seed_operations"."state" = 'completed' or "seed_operations"."superseded_by" is not null)),
	CONSTRAINT "seed_operation_superseded" CHECK ("seed_operations"."superseded_by" is null or ("seed_operations"."state" = 'failed' and "seed_operations"."superseded_by" <> "seed_operations"."id")),
	CONSTRAINT "seed_operation_receiving" CHECK ("seed_operations"."state" <> 'receiving' or "seed_operations"."kind" = 'archive'),
	CONSTRAINT "seed_operation_progress" CHECK ("seed_operations"."completed" >= 0 and "seed_operations"."total" >= "seed_operations"."completed"),
	CONSTRAINT "seed_operation_completed" CHECK ("seed_operations"."state" <> 'completed' or ("seed_operations"."completed" = "seed_operations"."total" and "seed_operations"."stage" = 'complete')),
	CONSTRAINT "seed_operation_counts" CHECK ("seed_operations"."committed_images" between 0 and 460 and "seed_operations"."committed_businesses" between 0 and 30 and "seed_operations"."committed_listings" between 0 and 200 and "seed_operations"."retained_records" between 0 and 230),
	CONSTRAINT "seed_operation_error" CHECK ("seed_operations"."error_code" is null or "seed_operations"."error_code" ~ '^[a-z0-9_]+$')
);
--> statement-breakpoint
CREATE TABLE "seed_assets" (
	"dataset_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"generation" integer DEFAULT 1 NOT NULL,
	"filename" text NOT NULL,
	"operation_id" text,
	"state" "seed_asset_state" DEFAULT 'expected' NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	"input_digest" text,
	"bytes" integer,
	"width" integer,
	"height" integer,
	"mime" text,
	"upload_id" text,
	"provider_id" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "seed_assets_dataset_id_asset_id_generation_pk" PRIMARY KEY("dataset_id","asset_id","generation"),
	CONSTRAINT "seed_asset_generation" CHECK ("seed_assets"."generation" >= 1),
	CONSTRAINT "seed_asset_digest" CHECK ("seed_assets"."input_digest" is null or "seed_assets"."input_digest" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "seed_asset_bytes" CHECK ("seed_assets"."bytes" between 1 and 2097152),
	CONSTRAINT "seed_asset_dimensions" CHECK ("seed_assets"."width" between 1200 and 4096 and "seed_assets"."height" between 900 and 3072 and "seed_assets"."width" * 3 = "seed_assets"."height" * 4),
	CONSTRAINT "seed_asset_mime" CHECK ("seed_assets"."mime" in ('image/jpeg', 'image/png', 'image/webp')),
	CONSTRAINT "seed_asset_accepted" CHECK (not "seed_assets"."accepted" or ("seed_assets"."state" = 'stored' and "seed_assets"."upload_id" is not null and "seed_assets"."provider_id" is not null and "seed_assets"."input_digest" is not null and "seed_assets"."bytes" is not null and "seed_assets"."width" is not null and "seed_assets"."height" is not null and "seed_assets"."mime" is not null))
);
--> statement-breakpoint
CREATE TABLE "seed_records" (
	"dataset_id" text NOT NULL,
	"domain" "seed_record_domain" NOT NULL,
	"record_id" text NOT NULL,
	"record_digest" text NOT NULL,
	"outcome" text DEFAULT 'owned' NOT NULL,
	"retention_reason" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "seed_records_dataset_id_domain_record_id_pk" PRIMARY KEY("dataset_id","domain","record_id"),
	CONSTRAINT "seed_record_digest" CHECK ("seed_records"."record_digest" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "seed_record_outcome" CHECK ("seed_records"."outcome" in ('owned', 'removed', 'retained'))
);
--> statement-breakpoint
CREATE TABLE "seed_storage_intents" (
	"id" text PRIMARY KEY NOT NULL,
	"dataset_id" text NOT NULL,
	"operation_id" text,
	"asset_id" text,
	"generation" integer,
	"provider" text NOT NULL,
	"object_key" text NOT NULL,
	"digest" text NOT NULL,
	"purpose" text NOT NULL,
	"state" "seed_storage_state" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "seed_storage_digest" CHECK ("seed_storage_intents"."digest" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "seed_storage_provider" CHECK ("seed_storage_intents"."provider" in ('r2', 'cloudinary')),
	CONSTRAINT "seed_storage_purpose" CHECK ("seed_storage_intents"."purpose" in ('archive', 'image')),
	CONSTRAINT "seed_storage_generation" CHECK ("seed_storage_intents"."generation" is null or "seed_storage_intents"."generation" >= 1)
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "seed_dataset_id" text;--> statement-breakpoint
ALTER TABLE "dealerships" ADD COLUMN "seed_dataset_id" text;--> statement-breakpoint
ALTER TABLE "dealerships" ADD COLUMN "seed_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mechanics" ADD COLUMN "seed_dataset_id" text;--> statement-breakpoint
ALTER TABLE "mechanics" ADD COLUMN "seed_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "seed_dataset_id" text;--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "seed_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "seed_dataset_id" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "seed_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "seed_dataset_id" text;--> statement-breakpoint
ALTER TABLE "seed_datasets" ADD CONSTRAINT "seed_datasets_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seed_operations" ADD CONSTRAINT "seed_operations_dataset_id_seed_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."seed_datasets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seed_operations" ADD CONSTRAINT "seed_operations_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seed_assets" ADD CONSTRAINT "seed_assets_dataset_id_seed_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."seed_datasets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seed_assets" ADD CONSTRAINT "seed_assets_operation_id_seed_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."seed_operations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seed_records" ADD CONSTRAINT "seed_records_dataset_id_seed_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."seed_datasets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seed_storage_intents" ADD CONSTRAINT "seed_storage_intents_dataset_id_seed_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."seed_datasets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seed_storage_intents" ADD CONSTRAINT "seed_storage_intents_operation_id_seed_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."seed_operations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "seed_one_live_dataset" ON "seed_datasets" USING btree ("live_slot") WHERE "seed_datasets"."live_slot" is true;--> statement-breakpoint
CREATE INDEX "seed_operations_dataset_id_created_at_index" ON "seed_operations" USING btree ("dataset_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "seed_one_active_operation" ON "seed_operations" USING btree ("active_slot") WHERE "seed_operations"."active_slot" is true;--> statement-breakpoint
CREATE UNIQUE INDEX "seed_one_accepted_asset" ON "seed_assets" USING btree ("dataset_id","asset_id") WHERE "seed_assets"."accepted";--> statement-breakpoint
CREATE UNIQUE INDEX "seed_storage_intents_provider_object_key_index" ON "seed_storage_intents" USING btree ("provider","object_key");--> statement-breakpoint
CREATE INDEX "seed_storage_intents_dataset_id_state_index" ON "seed_storage_intents" USING btree ("dataset_id","state");