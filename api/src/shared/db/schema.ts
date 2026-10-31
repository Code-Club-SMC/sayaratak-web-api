// Re-exports every module's *.tables.ts so drizzle-kit and the client see the
// whole schema. Add a line here when a module adds tables.
export * from "~/modules/account/account.tables"
export * from "~/modules/auth/auth.tables"
export * from "~/modules/businesses/businesses.tables"
export * from "~/modules/content/content.tables"
export * from "~/modules/listings/listings.tables"
export * from "~/modules/taxonomy/taxonomy.tables"
export * from "~/modules/uploads/uploads.tables"
export * from "~/shared/http/idempotency.tables"
