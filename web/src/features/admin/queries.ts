import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { apiFetch } from "@/lib/api/client"
import { useApiMutation } from "@/lib/api/mutation"
import { keys } from "@/lib/api/query-keys"
import {
  adminReportSchema,
  adminReviewSchema,
  backupSchema,
  bannerSchema,
  adminVerificationSchema,
  settingsSchema,
  sitePageSchema,
  type Settings,
} from "@/schemas/admin"
import {
  adminBusinessSchema,
  broadcastSchema,
  okSchema,
  taxonomyRowSchema,
  type Range,
  type taxonomyTypeSchema,
} from "@/schemas/api"
import {
  paymentSchema,
  planSchema,
  promotionPriceSchema,
  subscriptionSchema,
} from "@/schemas/billing"
import { pageOf } from "@/schemas/fields"
import {
  activitySchema,
  adminPaymentsPageSchema,
  adminSearchSchema,
  adminStatsSchema,
  estimateSchema,
  myPromotionSchema,
} from "@/schemas/responses"
import type {
  banInputSchema,
  bannerInputSchema,
  broadcastInputSchema,
  grantInputSchema,
  adminListingPatchSchema,
  pagePatchSchema,
  reportActionInputSchema,
} from "@/schemas/inputs"
import { listingSchema, type PromotionType } from "@/schemas/listing"
import { reviewSchema } from "@/schemas/review"
import { userSchema } from "@/schemas/user"

type Params = Record<string, unknown>
const adminList = <TSchema extends z.ZodType>(
  name: string,
  path: string,
  schema: TSchema,
  params: Params = {}
) =>
  queryOptions({
    queryKey: keys.admin.list(name, params),
    queryFn: ({ signal }) =>
      apiFetch(path, { query: params, schema: pageOf(schema), signal }),
    placeholderData: keepPreviousData,
  })
const adminPlain = <TSchema extends z.ZodType>(
  name: string,
  path: string,
  schema: TSchema,
  params?: Params
) =>
  queryOptions({
    queryKey: keys.admin.list(name, params),
    queryFn: ({ signal }) => apiFetch(path, { query: params, schema, signal }),
  })

export const adminQueries = {
  stats: (range: Range = "30d") =>
    adminPlain("stats", "/admin/stats", adminStatsSchema, { range }),
  activity: adminPlain("activity", "/admin/activity", activitySchema),
  search: (q: string) =>
    adminPlain("search", "/admin/search", adminSearchSchema, { q }),
  moderation: (p?: Params) =>
    adminList("moderation", "/admin/moderation", listingSchema, p),
  listings: (p?: Params) =>
    adminList("listings", "/admin/listings", listingSchema, p),
  users: (p?: Params) => adminList("users", "/admin/users", userSchema, p),
  businesses: (p?: Params) =>
    adminList("businesses", "/admin/businesses", adminBusinessSchema, p),
  verifications: (p?: Params) =>
    adminList(
      "verifications",
      "/admin/verifications",
      adminVerificationSchema,
      p
    ),
  // A page plus the summary strip (approved this month, pending count and amount).
  payments: (p: Params = {}) =>
    queryOptions({
      queryKey: keys.admin.list("payments", p),
      queryFn: ({ signal }) =>
        apiFetch("/admin/payments", {
          query: p,
          schema: adminPaymentsPageSchema,
          signal,
        }),
      placeholderData: keepPreviousData,
    }),
  plans: adminPlain("plans", "/admin/plans", z.array(planSchema)),
  subscriptions: (p?: Params) =>
    adminList("subscriptions", "/admin/subscriptions", subscriptionSchema, p),
  promotionPrices: adminPlain(
    "promotion-prices",
    "/admin/promotion-prices",
    z.array(promotionPriceSchema)
  ),
  promotions: (p?: Params) =>
    adminList("promotions", "/admin/promotions", myPromotionSchema, p),
  reviews: (p?: Params) =>
    adminList("reviews", "/admin/reviews", adminReviewSchema, p),
  reports: (p?: Params) =>
    adminList("reports", "/admin/reports", adminReportSchema, p),
  taxonomy: (type: z.infer<typeof taxonomyTypeSchema>) =>
    adminPlain(
      `taxonomy-${type}`,
      `/admin/taxonomy/${type}`,
      z.array(taxonomyRowSchema)
    ),
  broadcasts: (p?: Params) =>
    adminList("broadcasts", "/admin/broadcasts", broadcastSchema, p),
  broadcastEstimate: (audience: string) =>
    adminPlain(
      "broadcast-estimate",
      "/admin/broadcasts/estimate",
      estimateSchema,
      { audience }
    ),
  banners: adminPlain("banners", "/admin/banners", z.array(bannerSchema)),
  page: (slug: string) =>
    adminPlain(`page-${slug}`, `/admin/pages/${slug}`, sitePageSchema),
  settings: adminPlain("settings", "/admin/settings", settingsSchema),
  backups: adminPlain("backups", "/admin/backups", z.array(backupSchema)),
}

// Admin writes refresh every admin table, the counts in the sidebar and (for listings and payments) the public side.
const touched = [keys.admin.all, keys.counts] as const
const withListings = [...touched, keys.listings.all] as const
const send =
  <TSchema extends z.ZodType>(
    method: "POST" | "PATCH" | "PUT" | "DELETE",
    schema: TSchema
  ) =>
  (path: string, body?: unknown) =>
    apiFetch(path, { method, body, schema })
const post = <TSchema extends z.ZodType>(schema: TSchema) =>
  send("POST", schema)
const patch = <TSchema extends z.ZodType>(schema: TSchema) =>
  send("PATCH", schema)
const del = send("DELETE", okSchema)
type Row = Record<string, unknown>

// Moderation
export const useApproveListing = () =>
  useApiMutation(
    (id: string) => post(listingSchema)(`/admin/listings/${id}/approve`),
    withListings
  )
export const useRejectListing = () =>
  useApiMutation(
    ({ id, reason }: { id: string; reason: string }) =>
      post(listingSchema)(`/admin/listings/${id}/reject`, { reason }),
    withListings
  )
export const useRemoveListing = () =>
  useApiMutation(
    (id: string) => post(listingSchema)(`/admin/listings/${id}/remove`),
    withListings
  )
export const useRestoreListing = () =>
  useApiMutation(
    (id: string) => post(listingSchema)(`/admin/listings/${id}/restore`),
    withListings
  )
export const useBulkListings = () =>
  useApiMutation(
    (body: {
      ids: string[]
      action: "approve" | "reject" | "remove" | "restore"
      reason?: string
    }) => post(okSchema)("/admin/listings/bulk", body),
    withListings
  )
export const useAdminUpdateListing = () =>
  useApiMutation(
    ({
      id,
      ...body
    }: { id: string } & z.input<typeof adminListingPatchSchema>) =>
      patch(listingSchema)(`/admin/listings/${id}`, body),
    withListings
  )

// People and businesses
export const useBanUser = () =>
  useApiMutation(
    ({ id, ...body }: { id: string } & z.input<typeof banInputSchema>) =>
      post(userSchema)(`/admin/users/${id}/ban`, body),
    touched
  )
export const useUnbanUser = () =>
  useApiMutation(
    (id: string) => post(userSchema)(`/admin/users/${id}/unban`, {}),
    touched
  )
export const useUpdateBusinessAdmin = () =>
  useApiMutation(
    ({
      id,
      ...body
    }: {
      id: string
      status?: "active" | "suspended"
      verified?: boolean
    }) => patch(adminBusinessSchema)(`/admin/businesses/${id}`, body),
    [
      ...touched,
      keys.directory.all("dealerships"),
      keys.directory.all("workshops"),
      keys.directory.all("mechanics"),
    ]
  )
export const useAssignPlan = () =>
  useApiMutation(
    ({ id, planId }: { id: string; planId: string }) =>
      post(okSchema)(`/admin/businesses/${id}/assign-plan`, { planId }),
    touched
  )
// The badge shows on the business page, in directories and on its listings.
export const useApproveVerification = () =>
  useApiMutation(
    (id: string) =>
      post(adminVerificationSchema)(`/admin/verifications/${id}/approve`),
    [
      ...withListings,
      keys.business.all,
      keys.directory.all("dealerships"),
      keys.directory.all("workshops"),
      keys.directory.all("mechanics"),
    ]
  )
export const useRejectVerification = () =>
  useApiMutation(
    ({ id, reason }: { id: string; reason: string }) =>
      post(adminVerificationSchema)(`/admin/verifications/${id}/reject`, {
        reason,
      }),
    touched
  )

// Billing
export const useApprovePayment = () =>
  useApiMutation(
    (id: string) => post(paymentSchema)(`/admin/payments/${id}/approve`),
    [...touched, keys.billing.all, keys.listings.all]
  )
export const useRejectPayment = () =>
  useApiMutation(
    ({ id, reason }: { id: string; reason: string }) =>
      post(paymentSchema)(`/admin/payments/${id}/reject`, { reason }),
    [...touched, keys.billing.all]
  )
export const useCreatePlan = () =>
  useApiMutation(
    (body: Omit<z.input<typeof planSchema>, "id">) =>
      post(planSchema)("/admin/plans", body),
    [...touched, keys.billing.all]
  )
export const useUpdatePlan = () =>
  useApiMutation(
    ({
      id,
      ...body
    }: { id: string } & Partial<Omit<z.input<typeof planSchema>, "id">>) =>
      patch(planSchema)(`/admin/plans/${id}`, body),
    [...touched, keys.billing.all]
  )
export const useDeletePlan = () =>
  useApiMutation(
    (id: string) => del(`/admin/plans/${id}`),
    [...touched, keys.billing.all]
  )
export const useCreatePromotionPrice = () =>
  useApiMutation(
    (body: z.input<typeof promotionPriceSchema>) =>
      post(promotionPriceSchema)("/admin/promotion-prices", body),
    [...touched, keys.billing.promotionPrices]
  )
export const useUpdatePromotionPrice = () =>
  useApiMutation(
    ({
      type,
      ...body
    }: { type: PromotionType } & Partial<
      z.input<typeof promotionPriceSchema>
    >) => patch(promotionPriceSchema)(`/admin/promotion-prices/${type}`, body),
    [...touched, keys.billing.promotionPrices]
  )
export const useDeletePromotionPrice = () =>
  useApiMutation(
    (type: PromotionType) => del(`/admin/promotion-prices/${type}`),
    [...touched, keys.billing.promotionPrices]
  )
export const useGrantPromotion = () =>
  useApiMutation(
    (body: z.input<typeof grantInputSchema>) =>
      post(myPromotionSchema)("/admin/promotions/grant", body),
    withListings
  )
export const useEndPromotion = () =>
  useApiMutation(
    (id: string) => post(myPromotionSchema)(`/admin/promotions/${id}/end`),
    [...withListings, keys.billing.all]
  )
export const useSendBroadcast = () =>
  useApiMutation(
    (body: z.input<typeof broadcastInputSchema>) =>
      post(broadcastSchema)("/admin/broadcasts", body),
    touched
  )

// Reviews and reports. Hiding or showing a review changes the business rating in directories and profiles.
const withRatings = [
  ...touched,
  keys.reviews.all,
  keys.business.all,
  keys.directory.all("dealerships"),
  keys.directory.all("workshops"),
  keys.directory.all("mechanics"),
] as const
export const useHideReview = () =>
  useApiMutation(
    (id: string) => post(reviewSchema)(`/admin/reviews/${id}/hide`),
    withRatings
  )
export const useShowReview = () =>
  useApiMutation(
    (id: string) => post(reviewSchema)(`/admin/reviews/${id}/show`),
    withRatings
  )
export const useDismissReport = () =>
  useApiMutation(
    ({ id, note }: { id: string; note: string }) =>
      post(adminReportSchema)(`/admin/reports/${id}/dismiss`, { note }),
    touched
  )
// Removes the listing, or with `ban` bans its seller; either closes every open report on the listing.
export const useActionReport = () =>
  useApiMutation(
    ({
      id,
      ...body
    }: { id: string } & z.input<typeof reportActionInputSchema>) =>
      post(adminReportSchema)(`/admin/reports/${id}/action`, body),
    withListings
  )

// Taxonomy, banners, pages, settings, backups
type TaxonomyType = z.infer<typeof taxonomyTypeSchema>
export const useCreateTaxonomyRow = (type: TaxonomyType) =>
  useApiMutation(
    (body: Row) => post(taxonomyRowSchema)(`/admin/taxonomy/${type}`, body),
    [...touched, keys.taxonomy]
  )
export const useUpdateTaxonomyRow = (type: TaxonomyType) =>
  useApiMutation(
    ({ id, ...body }: { id: string } & Row) =>
      patch(taxonomyRowSchema)(`/admin/taxonomy/${type}/${id}`, body),
    [...touched, keys.taxonomy]
  )
export const useDeleteTaxonomyRow = (type: TaxonomyType) =>
  useApiMutation(
    (id: string) => del(`/admin/taxonomy/${type}/${id}`),
    [...touched, keys.taxonomy]
  )
export const useCreateBanner = () =>
  useApiMutation(
    (body: z.input<typeof bannerInputSchema>) =>
      post(bannerSchema)("/admin/banners", body),
    [...touched, keys.content.banners()]
  )
export const useUpdateBanner = () =>
  useApiMutation(
    ({
      id,
      ...body
    }: { id: string } & Partial<z.input<typeof bannerInputSchema>>) =>
      patch(bannerSchema)(`/admin/banners/${id}`, body),
    [...touched, ["content"]]
  )
export const useDeleteBanner = () =>
  useApiMutation(
    (id: string) => del(`/admin/banners/${id}`),
    [...touched, ["content"]]
  )
export const useUpdatePage = () =>
  useApiMutation(
    ({ slug, ...body }: { slug: string } & z.input<typeof pagePatchSchema>) =>
      patch(sitePageSchema)(`/admin/pages/${slug}`, body),
    [...touched, ["content"]]
  )
export const useUpdateSettings = () =>
  useApiMutation(
    (body: Partial<Settings>) => patch(settingsSchema)("/admin/settings", body),
    [...touched, keys.content.site]
  )
export const useCreateBackup = () =>
  useApiMutation(() => post(backupSchema)("/admin/backups"), touched)
export const useRestoreBackup = () =>
  useApiMutation(
    (id: string) => post(okSchema)(`/admin/backups/${id}/restore`),
    touched
  )
// Reseeds the demo data and signs everyone out.
export const useResetDemoData = () =>
  useApiMutation(() => post(okSchema)("/mock/reset"), [["me"]])
