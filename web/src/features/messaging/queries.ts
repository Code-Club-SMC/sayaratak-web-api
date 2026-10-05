import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { z } from "zod"

import type { ApiError } from "@/lib/api/client"
import { apiFetch } from "@/lib/api/client"
import {
  patchRows,
  restore,
  snapshot,
  useApiMutation,
} from "@/lib/api/mutation"
import { keys } from "@/lib/api/query-keys"
import { okSchema, type Counts } from "@/schemas/api"
import { pageOf } from "@/schemas/fields"
import type { messageInputSchema, threadInputSchema } from "@/schemas/inputs"
import { messageSchema, threadSchema } from "@/schemas/messaging"

// Clients poll: the inbox refetches on focus, the open thread every 10 seconds.
export const messagingQueries = {
  threads: queryOptions({
    queryKey: keys.threads.all,
    queryFn: ({ signal }) =>
      apiFetch("/threads", { schema: z.array(threadSchema), signal }),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  }),
  messages: (id: string) =>
    queryOptions({
      queryKey: keys.threads.messages(id),
      queryFn: ({ signal }) =>
        apiFetch(`/threads/${id}/messages`, {
          query: { pageSize: 100 },
          schema: pageOf(messageSchema),
          signal,
        }),
      refetchInterval: 10_000,
      refetchOnWindowFocus: true,
    }),
}

const touched = [keys.threads.all, keys.counts] as const
export const useStartThread = () =>
  useApiMutation(
    (body: z.input<typeof threadInputSchema>) =>
      apiFetch("/threads", { method: "POST", body, schema: threadSchema }),
    touched
  )
export const useSendMessage = (threadId: string) =>
  useApiMutation(
    (body: z.input<typeof messageInputSchema>) =>
      apiFetch(`/threads/${threadId}/messages`, {
        method: "POST",
        body,
        schema: messageSchema,
      }),
    touched
  )

// Optimistic: the unread badge clears at once.
export function useMarkThreadRead() {
  const qc = useQueryClient()
  return useMutation<
    unknown,
    ApiError,
    { id: string; unread: number },
    Awaited<ReturnType<typeof snapshot>>
  >({
    mutationFn: ({ id }) =>
      apiFetch(`/threads/${id}/read`, { method: "POST", schema: okSchema }),
    onMutate: async ({ id, unread }) => {
      const snap = await snapshot(qc, keys.threads.all)
      patchRows(qc, keys.threads.all, (rowId) => rowId === id, {
        unreadCount: 0,
      })
      qc.setQueryData<Counts>(keys.counts, (c) =>
        c ? { ...c, unreadMessages: Math.max(0, c.unreadMessages - unread) } : c
      )
      return snap
    },
    onError: (_error, _vars, snap) => restore(qc, snap),
    onSettled: () =>
      Promise.all(
        touched.map((queryKey) => qc.invalidateQueries({ queryKey }))
      ),
  })
}
