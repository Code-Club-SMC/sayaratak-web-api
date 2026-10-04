import { useT } from "@/lib/i18n/use-t"

// Minimal for step 1.1; step 3.2 adds the search link.
export function NotFound() {
  const { t } = useT()
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">{t("error.not_found_title")}</h1>
      <p className="mt-2">{t("error.not_found_body")}</p>
    </main>
  )
}
