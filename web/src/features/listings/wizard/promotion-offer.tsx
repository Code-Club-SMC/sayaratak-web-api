import { useId, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { FieldError } from "@/components/app/field-error"
import { PromotionOption } from "@/components/app/promotion-option"
import { SubmitButton } from "@/components/app/submit-button"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { billingQueries, useCreatePromotion } from "@/features/billing/queries"
import { errorText } from "@/lib/api/error-text"
import { focusFirstInvalid } from "@/lib/focus-invalid"
import { useT } from "@/lib/i18n/use-t"
import { dashboardPath, localeHref } from "@/lib/navigation"
import type { User } from "@/schemas/user"
import { promotionChoiceSchema } from "../schemas"

type Choice = z.input<typeof promotionChoiceSchema>

// "Get more views": the four paid promotions of an approved listing. Continue creates the unpaid promotion and opens its checkout in the owner's dashboard; Not now closes the offer and creates nothing. Nothing shows while the prices load, fail or are empty: the offer is an extra, not part of the result.
export function PromotionOffer({
  listingId,
  role,
  onSkip,
}: {
  listingId: string
  role: User["role"]
  onSkip: () => void
}) {
  const { t, locale } = useT()
  const router = useRouter()
  const prices = useQuery(billingQueries.promotionPrices)
  const create = useCreatePromotion()
  const heading = useId()
  const error = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const form = useForm<Choice>({ resolver: zodResolver(promotionChoiceSchema) })
  const chosen = form.watch("promotion")
  const message = form.formState.errors.promotion?.message

  if (!prices.data?.length) return null

  const submit = form.handleSubmit(
    async ({ promotion }) => {
      try {
        const promo = await create.mutateAsync({ listingId, type: promotion })
        const item = new URLSearchParams({ item: `promotion:${promo.id}` })
        router.history.push(
          localeHref(`${dashboardPath(role)}/billing/checkout?${item}`, locale)
        )
      } catch (e) {
        toast.add({ title: errorText(t, e) })
      }
    },
    () => focusFirstInvalid(formRef.current)
  )

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-4 pt-2"
    >
      <h2 id={heading} className="text-title font-semibold">
        {t("post.promo_title")}
      </h2>
      <div
        role="radiogroup"
        aria-labelledby={heading}
        aria-describedby={message ? error : undefined}
        aria-invalid={!!message}
        tabIndex={message ? 0 : undefined}
        className="flex flex-col gap-2"
      >
        {prices.data.map((p) => (
          <PromotionOption
            key={p.type}
            name="promotion"
            type={p.type}
            durationDays={p.durationDays}
            price={p.price}
            selected={chosen === p.type}
            onSelect={() =>
              form.setValue("promotion", p.type, { shouldValidate: !!message })
            }
          />
        ))}
      </div>
      <FieldError id={error} message={message} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton variant="signal" pending={form.formState.isSubmitting}>
          {t("post.promo_continue")}
        </SubmitButton>
        <Button type="button" variant="ghost" onClick={onSkip}>
          {t("post.promo_skip")}
        </Button>
      </div>
    </form>
  )
}
