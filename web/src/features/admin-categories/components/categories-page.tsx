import { useT } from "@/lib/i18n/use-t"
import { usePageTitle } from "@/features/dashboard/components/page-title"
import { PageHeader } from "@/components/app/page-header"
import { CategorySection } from "./category-section"

// The five vehicle types and the part categories, in the order the public site lists them.
export function AdminCategoriesPage() {
  const { t } = useT()
  const title = t("dashboard.nav_categories")
  usePageTitle(title)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} />
      <CategorySection kind="vehicle-types" />
      <CategorySection kind="part-categories" />
    </div>
  )
}
