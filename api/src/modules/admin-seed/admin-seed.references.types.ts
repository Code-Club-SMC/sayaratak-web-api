export type SeedReference = {
  referencingDomain: string
  referencingId: string
  referencedDomain: "listing" | "business" | "owner" | "upload"
  referencedId: string
  reason: string
}

export type SeedReferenceScope = {
  datasetId: string
  ownerIds: string[]
  listingIds: string[]
  businessIds: string[]
  uploadIds?: string[]
}

export type SeedRemovalScope = {
  datasetId: string
  manifestDigest: string
  orderedOwnedIds: string[]
  orderedProtectedIds: string[]
}

export type SeedRemovalResult = {
  domain: string
  deletedIds: string[]
  alreadyMissingIds: string[]
  retained: Array<{ id: string; reason: string }>
  pendingStorageIntents?: string[]
}

export type SeedCleanupStatus = {
  pending: number
  failed: number
  deleted: number
  error?: string | null
}
