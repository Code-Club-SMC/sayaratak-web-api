import { okSchema } from "@/schemas/api"
import { messageInputSchema, threadInputSchema } from "@/schemas/inputs"
import { messageSchema, threadSchema, type Thread } from "@/schemas/messaging"
import { pageOf } from "@/schemas/fields"

import { db, find, insert, newId, paginate } from "../db"
import { fail, needUser, pageParams, route } from "../http"
import { findBusiness, nowIso, notify } from "../lib"
import type { ThreadRow, UserRow } from "../types"

const messagesOf = (id: string) =>
  db.messages
    .filter((m) => m.threadId === id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

export function toThread(row: ThreadRow, me: string): Thread {
  const all = messagesOf(row.id)
  const last = all.at(-1)
  return threadSchema.parse({
    ...row,
    participants: row.participantIds.map((id) => {
      const u = find(db.users, id)
      return { id, name: u?.fullName ?? "", avatarUrl: u?.avatarUrl ?? null }
    }),
    lastMessage: {
      body: last?.body ?? "",
      createdAt: last?.createdAt ?? nowIso(),
      senderId: last?.senderId ?? me,
    },
    unreadCount: all.filter((m) => m.senderId !== me && !m.readAt).length,
  })
}
const threadFor = (user: UserRow, id: string) => {
  const row = find(db.threads, id)
  if (!row) throw fail(404, "not_found")
  if (!row.participantIds.includes(user.id)) throw fail(403, "forbidden")
  return row
}
function post(row: ThreadRow, sender: UserRow, body: string) {
  const message = insert(db.messages, {
    id: newId("msg"),
    threadId: row.id,
    senderId: sender.id,
    body,
    createdAt: nowIso(),
  })
  for (const id of row.participantIds.filter((p) => p !== sender.id)) {
    notify(
      id,
      "message",
      { ar: "رسالة جديدة", en: "New message" },
      {
        ar: `رسالة من ${sender.fullName}`,
        en: `Message from ${sender.fullName}`,
      },
      "/messages"
    )
  }
  return messageSchema.parse(message)
}

route("GET", "/threads", (c) => {
  const user = needUser(c)
  const rows = db.threads
    .filter((t) => t.participantIds.includes(user.id))
    .map((t) => toThread(t, user.id))
  return rows.sort((a, b) =>
    b.lastMessage.createdAt.localeCompare(a.lastMessage.createdAt)
  )
})

// One thread per pair of people and subject: asking again reuses it.
route("POST", "/threads", async (c) => {
  const user = needUser(c)
  const input = await c.body(threadInputSchema)
  const listing =
    input.subjectType === "listing"
      ? find(db.listings, input.subjectId)
      : undefined
  const business =
    input.subjectType === "listing" ? undefined : findBusiness(input.subjectId)
  const ownerId = listing?.ownerUserId ?? business?.ownerId
  if (!ownerId) throw fail(404, "not_found")
  if (ownerId === user.id)
    throw fail(422, "validation", { body: "validation.required" })
  let row = db.threads.find(
    (t) =>
      t.subjectType === input.subjectType &&
      t.subjectId === input.subjectId &&
      t.participantIds.includes(user.id) &&
      t.participantIds.includes(ownerId)
  )
  if (!row) {
    row = insert(db.threads, {
      id: newId("t"),
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      subjectTitle: listing?.title ?? business?.name ?? "",
      subjectImage: listing?.media[0]?.url,
      participantIds: [user.id, ownerId],
    })
  }
  post(row, user, input.body)
  return toThread(row, user.id)
})

route("GET", "/threads/:id/messages", (c) => {
  const row = threadFor(needUser(c), c.params.id ?? "")
  const { page, pageSize } = pageParams(c.query, 50)
  return pageOf(messageSchema).parse(
    paginate(messagesOf(row.id), page, pageSize)
  )
})
route("POST", "/threads/:id/messages", async (c) => {
  const user = needUser(c)
  const row = threadFor(user, c.params.id ?? "")
  return post(row, user, (await c.body(messageInputSchema)).body)
})
route("POST", "/threads/:id/read", (c) => {
  const user = needUser(c)
  const row = threadFor(user, c.params.id ?? "")
  const now = nowIso()
  for (const m of messagesOf(row.id))
    if (m.senderId !== user.id && !m.readAt) m.readAt = now
  return okSchema.parse({ ok: true })
})
