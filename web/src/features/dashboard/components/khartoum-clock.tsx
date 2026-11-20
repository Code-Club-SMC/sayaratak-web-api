import { useEffect, useState } from "react"

import { formatTime } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"

// Khartoum time beside the waiting counter: queues, expiry and backups all run on it, and admins also work from abroad.
// It ticks on the minute boundary, so it never trails the device clock (useNow ticks once a minute from mount).
export function KhartoumClock() {
  const { t, locale } = useT()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>
    const tick = () => {
      setNow(new Date())
      id = setTimeout(tick, 60_000 - (Date.now() % 60_000))
    }
    id = setTimeout(tick, 60_000 - (Date.now() % 60_000))
    return () => clearTimeout(id)
  }, [])
  return (
    <p className="hidden px-1 text-caption whitespace-nowrap text-muted-foreground xl:block">
      {t("dashboard.clock_khartoum")}{" "}
      <time dateTime={now.toISOString()} className="font-medium num">
        {formatTime(now.toISOString(), locale)}
      </time>
    </p>
  )
}
