import type { Thread } from "@/schemas/messaging"

// The other person in a two-person thread.
export const counterpart = (thread: Thread, meId: string) =>
  thread.participants.find((p) => p.id !== meId) ?? thread.participants[0]
