import { useT } from "@/lib/i18n/use-t"
import { useNow } from "@/lib/now"
import { NotificationItem } from "@/features/notifications/components/notification-item"

// The row as it lands in the bell, in the viewer's language. Empty fields show a sample so the shape stays visible.
export function BroadcastPreview({
  title,
  body,
}: {
  title: { ar: string; en: string }
  body: { ar: string; en: string }
}) {
  const { t, locale } = useT()
  const now = useNow()
  const text = (v: { ar: string; en: string }, sample: string) =>
    v[locale].trim() || t(sample)
  const sampleTitle = text(title, "admin.broadcast_sample_title")
  const sampleBody = text(body, "admin.broadcast_sample_body")
  return (
    <section
      aria-labelledby="broadcast-preview"
      className="flex flex-col gap-2 rounded-xl bg-card p-4"
    >
      <h2 id="broadcast-preview" className="text-ui font-semibold">
        {t("admin.broadcast_preview")}
      </h2>
      <ul className="rounded-lg bg-background">
        <NotificationItem
          notification={{
            id: "preview",
            type: "broadcast",
            title: { ar: sampleTitle, en: sampleTitle },
            body: { ar: sampleBody, en: sampleBody },
            createdAt: new Date(now).toISOString(),
          }}
        />
      </ul>
      <p className="text-caption text-muted-foreground">
        {t("admin.broadcast_preview_hint")}
      </p>
    </section>
  )
}
