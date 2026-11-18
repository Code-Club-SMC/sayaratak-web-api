import type { SearchParams } from "./schemas"

/**
 * Owner, step 11.7-r4: the search-log key of a `GET /listings` call, or null
 * when it is not a person's search: a later page, a rail (`limit` or
 * `exclude`), a profile tab (`seller`) or the Featured rail. Typed text is
 * never kept, only whether there was some. An absent filter is "".
 */
export function searchLogKey(
  params: SearchParams,
  rail: { limit?: string; exclude?: string }
) {
  if (params.page !== 1 || rail.limit || rail.exclude) return null
  if (params.seller || params.featured) return null
  return {
    kind: params.kind,
    intent: params.intent ?? "",
    type: params.type ?? "",
    make: params.make ?? "",
    model: params.model ?? "",
    city: params.city ?? "",
    partCategory: params.partCategory ?? "",
    hasText: Boolean(params.q),
  }
}

export type SearchLogKey = NonNullable<ReturnType<typeof searchLogKey>>
