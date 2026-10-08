import { buttonVariants } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"
import type { Payment } from "@/schemas/billing"

export function ReceiptLink({ payment }: { payment: Payment }) {
  const { t } = useT()
  return (
    <a
      href={payment.receiptUrl}
      target="_blank"
      rel="noreferrer"
      className={buttonVariants({ variant: "link", size: "sm" })}
    >
      {t("billing.view_receipt")}
    </a>
  )
}
