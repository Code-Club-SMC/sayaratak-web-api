import { useFormContext, useWatch } from "react-hook-form"

import { useT } from "@/lib/i18n/use-t"
import { BannerCopy } from "@/components/app/banner-copy"
import type { BannerForm } from "../schemas"
import { ImageIcon } from "lucide-react"
import { EmptyState } from "@/components/app/empty-state"

// Both languages as the strip banner shows them (the hero uses the same text on a taller photo).
export function BannerPreview() {
  const { t } = useT()
  const { control } = useFormContext<BannerForm>()
  const [copy, imageAr, imageEn, focus, sponsored] = useWatch({
    control,
    name: ["copy", "imageAr", "imageEn", "focus", "sponsored"],
  })
  return (
    <section
      aria-label={t("admin.banners_preview")}
      className="flex flex-col gap-3"
    >
      <h3 className="text-ui font-medium">{t("admin.banners_preview")}</h3>
      {imageAr ? (
        (["ar", "en"] as const).map((l) => (
          <div
            key={l}
            dir={l === "ar" ? "rtl" : "ltr"}
            lang={l}
            className="overflow-hidden rounded-xl bg-background"
          >
            <BannerCopy
              banner={{ sponsored, focus }}
              copy={copy[l]}
              src={(l === "en" && imageEn) || imageAr}
            />
          </div>
        ))
      ) : (
        <EmptyState
          icon={ImageIcon}
          title={t("admin.banners_preview_empty")}
          level={3}
          className="rounded-lg bg-muted py-6"
        />
      )}
    </section>
  )
}
