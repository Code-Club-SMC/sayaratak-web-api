// Every query key in the app comes from here; mutations invalidate by prefix.
export const keys = {
  me: ["me"] as const,
  taxonomy: ["taxonomy"] as const,
}
