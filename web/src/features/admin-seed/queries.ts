import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import {
  type SeedOperation,
  seedOperationSchema,
  seedStatusSchema,
} from "@sayaratak/shared/schemas/admin-seed"

import { apiFetch, buildUrl, errorFrom } from "@/lib/api/client"
import { keys } from "@/lib/api/query-keys"

export const seedQueries = {
  status: queryOptions({
    queryKey: keys.admin.seed,
    queryFn: ({ signal }) =>
      apiFetch("/admin/seed", { schema: seedStatusSchema, signal }),
    staleTime: 0,
    refetchInterval: (query) => {
      const state = query.state.data?.operation?.state
      return state === "receiving" || state === "queued" || state === "running"
        ? 2000
        : false
    },
  }),
}

export async function computeSha256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function downloadSeedPrompts(): Promise<void> {
  const url = buildUrl("/admin/seed/manifest")
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  })
  if (!res.ok) {
    throw errorFrom(res.status, await res.json().catch(() => ({})))
  }
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = blobUrl
  a.download = "sayaratak-seed-prompts-v1.json"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}

export function usePrepareSeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch("/admin/seed/prepare", {
        method: "POST",
        schema: seedStatusSchema,
        body: {},
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(keys.admin.seed, data)
      void queryClient.invalidateQueries({ queryKey: keys.admin.seed })
    },
  })
}

export function useUploadSeedArchive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      file: File
      manifestDigest: string
      replaceGenerations?: Array<{ assetId: string; generation: number }>
      supersedesOperationId?: string
    }): Promise<SeedOperation> => {
      const buffer = await params.file.arrayBuffer()
      const digest = await computeSha256(buffer)
      const queryRecord: Record<string, unknown> = {
        archiveDigest: digest,
        manifestDigest: params.manifestDigest,
        archiveBytes: params.file.size,
        replaceGenerations: JSON.stringify(params.replaceGenerations ?? []),
      }
      if (params.supersedesOperationId) {
        queryRecord.supersedesOperationId = params.supersedesOperationId
      }
      const url = buildUrl("/admin/seed/archives", queryRecord)
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/zip" },
        body: buffer,
      })
      if (!res.ok) {
        throw errorFrom(res.status, await res.json().catch(() => ({})))
      }
      return seedOperationSchema.parse(await res.json())
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.admin.seed })
    },
  })
}

export function useStartSeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (manifestDigest: string) =>
      apiFetch("/admin/seed/start", {
        method: "POST",
        schema: seedOperationSchema,
        body: { manifestDigest, confirmation: true },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.admin.seed })
      void queryClient.invalidateQueries({ queryKey: keys.content.site })
      void queryClient.invalidateQueries({ queryKey: keys.listings.all })
      void queryClient.invalidateQueries({
        queryKey: keys.directory.all("dealership"),
      })
      void queryClient.invalidateQueries({
        queryKey: keys.directory.all("workshop"),
      })
      void queryClient.invalidateQueries({
        queryKey: keys.directory.all("mechanic"),
      })
      void queryClient.invalidateQueries({ queryKey: keys.map(undefined) })
    },
  })
}

export function useRetrySeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { operationId: string; manifestDigest: string }) =>
      apiFetch("/admin/seed/retry", {
        method: "POST",
        schema: seedOperationSchema,
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.admin.seed })
    },
  })
}

export function useRemoveSeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { datasetId: string; manifestDigest: string }) =>
      apiFetch("/admin/seed/remove", {
        method: "POST",
        schema: seedOperationSchema,
        body: { ...input, confirmation: true },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.admin.seed })
      void queryClient.invalidateQueries({ queryKey: keys.content.site })
      void queryClient.invalidateQueries({ queryKey: keys.listings.all })
      void queryClient.invalidateQueries({
        queryKey: keys.directory.all("dealership"),
      })
      void queryClient.invalidateQueries({
        queryKey: keys.directory.all("workshop"),
      })
      void queryClient.invalidateQueries({
        queryKey: keys.directory.all("mechanic"),
      })
      void queryClient.invalidateQueries({ queryKey: keys.map(undefined) })
    },
  })
}
