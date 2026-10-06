import { useEffect } from "react"

import { useTrackEvent } from "./events"

// One `view` per browser session per listing. Read in an effect, because sessionStorage does not exist on the server.
export function useViewEvent(listingId: string) {
  const { mutate } = useTrackEvent()
  useEffect(() => {
    const key = `viewed:${listingId}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {
      // Storage blocked: count the view on every visit rather than none.
    }
    mutate({ type: "view", targetId: listingId })
  }, [listingId, mutate])
}
