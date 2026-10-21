import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import type { Bilingual } from "@/schemas/fields"
import { StatusSwitch } from "@/features/admin/components/status-switch"
import { RemoveButton } from "@/components/app/remove-button"
import { Button } from "@/components/ui/button"

// One category: both names, move buttons, then either the enabled switch (vehicle types) or Remove (part categories), and Edit.
export function CategoryRow({
  id,
  name,
  first,
  last,
  onMove,
  onEdit,
  enabled,
  onToggle,
  onRemove,
}: {
  id: string
  name: Bilingual
  first: boolean
  last: boolean
  onMove: (step: -1 | 1) => void
  onEdit: () => void
  enabled?: boolean
  onToggle?: (next: boolean) => Promise<unknown>
  onRemove?: () => void
}) {
  const { t, locale } = useT()
  const label = name[locale]
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-40 flex-1 flex-col">
        <span className="text-ui font-medium">
          <bdi>{label}</bdi>
        </span>
        <span className="text-caption text-muted-foreground">
          <bdi
            dir={locale === "ar" ? "ltr" : "rtl"}
            lang={locale === "ar" ? "en" : "ar"}
          >
            {name[locale === "ar" ? "en" : "ar"]}
          </bdi>
        </span>
      </div>
      {onToggle && enabled !== undefined && (
        <StatusSwitch
          checked={enabled}
          label={t("admin.categories_enabled_label", { name: label })}
          confirmTitle={(next) =>
            t(
              next ? "admin.categories_on_title" : "admin.categories_off_title",
              {
                name: label,
              }
            )
          }
          confirmBody={(next) =>
            t(next ? "admin.categories_on_body" : "admin.categories_off_body")
          }
          confirmLabel={(next) =>
            t(next ? "admin.categories_on" : "admin.categories_off")
          }
          destructive={(next) => !next}
          onConfirm={onToggle}
        />
      )}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          data-move={`${id}:-1`}
          disabled={first}
          aria-label={t("admin.categories_move_up", { name: label })}
          onClick={() => onMove(-1)}
        >
          <ArrowUpIcon aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          data-move={`${id}:1`}
          disabled={last}
          aria-label={t("admin.categories_move_down", { name: label })}
          onClick={() => onMove(1)}
        >
          <ArrowDownIcon aria-hidden="true" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          aria-label={t("admin.categories_edit_label", { name: label })}
          onClick={onEdit}
        >
          {t("common.edit")}
        </Button>
        {onRemove && (
          <RemoveButton
            variant="ghost"
            size="sm"
            aria-label={t("admin.categories_remove_label", { name: label })}
            title={t("admin.categories_remove_title", { name: label })}
            onConfirm={onRemove}
          >
            {t("common.remove")}
          </RemoveButton>
        )}
      </div>
    </li>
  )
}
