import { useQuery } from "@tanstack/react-query"

import { ImageUploader } from "@/components/app/image-uploader"
import { PageHeader } from "@/components/app/page-header"
import { SectionError } from "@/components/app/section-error"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import { usePageTitle } from "@/features/dashboard/components/page-title"
import {
  businessQueries,
  useSaveBusinessImages,
} from "@/features/directory/queries"
import { errorText } from "@/lib/api/error-text"
import { useT } from "@/lib/i18n/use-t"
import { workshopSchema } from "@/schemas/profile"

// The workshop's public gallery: upload, reorder, remove. Each change saves at once.
export function PhotosPage() {
  const { t } = useT()
  const title = t("dashboard.nav_photos")
  usePageTitle(title)
  const mine = useQuery(businessQueries.mine)
  const save = useSaveBusinessImages()
  const w = workshopSchema.safeParse(mine.data).data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} hint={t("dashboard.photos_hint")} />
      {mine.isError && !w ? (
        <SectionError
          message={t("dashboard.photos_load_error")}
          onRetry={() => void mine.refetch()}
        />
      ) : !w ? (
        <Skeleton
          role="status"
          aria-label={t("common.loading")}
          className="h-64 w-full rounded-xl"
        />
      ) : (
        <section className="rounded-xl bg-card p-4 md:p-5">
          <ImageUploader
            mode="multi"
            max={20}
            cover={false}
            label={t("dashboard.photos_label")}
            value={w.images}
            onChange={(images) =>
              save.mutate(images, {
                onSuccess: () =>
                  toast.add({ title: t("toast.photos_updated") }),
                onError: (error) => toast.add({ title: errorText(t, error) }),
              })
            }
          />
        </section>
      )}
    </div>
  )
}
