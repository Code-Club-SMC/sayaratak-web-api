import { useState } from "react"
import { MessageCircleIcon, PhoneIcon } from "lucide-react"

import { useTrackEvent } from "@/features/listings/events"
import { useT } from "@/lib/i18n/use-t"
import { formatPhone, toWhatsappUrl } from "@/lib/phone"
import { usePageUrl } from "@/lib/use-page-url"
import { cn } from "@/lib/utils"
import { buttonVariants, Button } from "@/components/ui/button"
import { MessageComposer, type MessageSubject } from "./message-composer"

type Method = "call" | "whatsapp" | "chat"

// Call shows the number on the first tap and dials on the second. Buttons the seller turned off are not rendered.
export function ContactActions({
  target,
  phone,
  whatsapp,
  showPhone = true,
  methods = ["call", "whatsapp", "chat"],
  layout = "stack",
  className,
}: {
  target: MessageSubject
  phone: string
  whatsapp: string | null
  showPhone?: boolean
  methods?: Method[]
  layout?: "stack" | "row"
  className?: string
}) {
  const { t } = useT()
  const url = usePageUrl()
  const [revealed, setRevealed] = useState(false)
  const { mutate: track } = useTrackEvent()
  const item = layout === "row" ? "flex-1" : "w-full"
  const text = t(
    target.type === "listing"
      ? "listing.whatsapp_text"
      : "listing.whatsapp_text_profile",
    { title: target.title, url }
  )
  return (
    <div
      className={cn(
        layout === "row" ? "flex gap-2" : "flex flex-col gap-3",
        className
      )}
    >
      {methods.includes("call") &&
        showPhone &&
        (revealed ? (
          <a
            href={`tel:${phone}`}
            autoFocus
            aria-label={t("listing.call_number", { phone: formatPhone(phone) })}
            className={cn(buttonVariants(), item)}
          >
            <PhoneIcon aria-hidden="true" strokeWidth={1.5} />
            <bdi dir="ltr">{formatPhone(phone)}</bdi>
          </a>
        ) : (
          <Button
            type="button"
            className={item}
            onClick={() => {
              setRevealed(true)
              track({ type: "phone_click", targetId: target.id })
            }}
          >
            <PhoneIcon aria-hidden="true" strokeWidth={1.5} />
            {t("listing.call")}
          </Button>
        ))}
      {methods.includes("whatsapp") && whatsapp && (
        <a
          href={toWhatsappUrl(whatsapp, text)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track({ type: "whatsapp_click", targetId: target.id })}
          className={cn(buttonVariants({ variant: "outline" }), item)}
        >
          <MessageCircleIcon aria-hidden="true" strokeWidth={1.5} />
          {t("listing.whatsapp")}
        </a>
      )}
      {methods.includes("chat") && (
        <MessageComposer subject={target} className={item} />
      )}
    </div>
  )
}
