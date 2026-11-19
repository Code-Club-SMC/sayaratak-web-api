export type FkEdge = {
  tableName: string
  columnName: string
  foreignTableName: string
  foreignColumnName: string
}

const TUPLES: ReadonlyArray<readonly [string, string, string, string]> = [
  ["favorites", "listing_id", "listings", "id"],
  ["listing_media", "listing_id", "listings", "id"],
  ["listing_stats", "listing_id", "listings", "id"],
  ["promotions", "listing_id", "listings", "id"],
  ["reports", "listing_id", "listings", "id"],
  ["mechanic_cities", "mechanic_id", "mechanics", "id"],
  ["mechanic_specializations", "mechanic_id", "mechanics", "id"],
  ["portfolio_items", "mechanic_id", "mechanics", "id"],
  ["workshop_images", "workshop_id", "workshops", "id"],
  ["workshop_services", "workshop_id", "workshops", "id"],
  ["banners", "image_ar_upload_id", "uploads", "id"],
  ["banners", "image_en_upload_id", "uploads", "id"],
  ["campaigns", "image_upload_id", "uploads", "id"],
  ["dealerships", "cover_upload_id", "uploads", "id"],
  ["dealerships", "logo_upload_id", "uploads", "id"],
  ["listing_media", "upload_id", "uploads", "id"],
  ["mechanics", "photo_upload_id", "uploads", "id"],
  ["payments", "receipt_upload_id", "uploads", "id"],
  ["portfolio_items", "upload_id", "uploads", "id"],
  ["uploads", "poster_id", "uploads", "id"],
  ["user", "avatar_upload_id", "uploads", "id"],
  ["verification_documents", "upload_id", "uploads", "id"],
  ["workshop_images", "upload_id", "uploads", "id"],
  ["workshops", "cover_upload_id", "uploads", "id"],
  ["workshops", "logo_upload_id", "uploads", "id"],
  ["account", "user_id", "user", "id"],
  ["audit_log", "admin_id", "user", "id"],
  ["backups", "created_by", "user", "id"],
  ["broadcasts", "sent_by", "user", "id"],
  ["campaigns", "owner_id", "user", "id"],
  ["dealerships", "owner_user_id", "user", "id"],
  ["devices", "user_id", "user", "id"],
  ["drafts", "user_id", "user", "id"],
  ["favorites", "user_id", "user", "id"],
  ["listings", "owner_user_id", "user", "id"],
  ["mechanics", "owner_user_id", "user", "id"],
  ["messages", "sender_id", "user", "id"],
  ["notifications", "user_id", "user", "id"],
  ["payments", "reviewed_by", "user", "id"],
  ["payments", "user_id", "user", "id"],
  ["reports", "reporter_id", "user", "id"],
  ["reviews", "author_id", "user", "id"],
  ["saved_searches", "user_id", "user", "id"],
  // Step 11.7-r10: signed-in days; cascade with the account, never protect it.
  ["user_activity", "user_id", "user", "id"],
  ["seed_datasets", "created_by", "user", "id"],
  ["seed_operations", "actor_id", "user", "id"],
  ["session", "user_id", "user", "id"],
  ["subscriptions", "user_id", "user", "id"],
  ["thread_participants", "user_id", "user", "id"],
  ["two_factor", "user_id", "user", "id"],
  ["uploads", "owner_user_id", "user", "id"],
  ["verification_requests", "owner_id", "user", "id"],
  ["workshops", "owner_user_id", "user", "id"],
]

export const REVIEWED_FK_EDGES: FkEdge[] = TUPLES.map(
  ([tableName, columnName, foreignTableName, foreignColumnName]) => ({
    tableName,
    columnName,
    foreignTableName,
    foreignColumnName,
  })
)
