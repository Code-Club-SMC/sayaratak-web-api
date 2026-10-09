import { useT } from "@/lib/i18n/use-t"
import { toast } from "@/components/ui/toast"
import { useToggleFavorite } from "./queries"

// Save and remove for the heart and for the favorites page. Removing answers with a toast that undoes it.
export function useFavoriteActions() {
  const { t } = useT()
  const { mutate } = useToggleFavorite()
  const save = (id: string) => mutate({ id, on: true })
  const remove = (id: string) => {
    mutate({ id, on: false })
    toast.add({
      title: t("toast.favorite_removed"),
      actionProps: { children: t("common.undo"), onClick: () => save(id) },
    })
  }
  return { save, remove }
}
