import { PhoneIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { formatPhone } from "@/lib/phone"
import type { Dealership } from "@/schemas/profile"
import { HoursTable } from "@/components/app/hours-table"
import { LocationBlock } from "@/components/app/location-block"

// Description, where and when, and the numbers. Every block shows only when the dealership filled it in.
export function DealershipAbout({ dealership: d }: { dealership: Dealership }) {
  const { t, locale } = useT()
  const text = d.description[locale] || d.description.ar
  return (
    <div className="flex flex-col gap-8 rounded-xl bg-card p-4 md:p-5">
      {text && (
        <section className="flex flex-col gap-3">
          <h2 className="text-title font-semibold">
            {t("directory.about_title")}
          </h2>
          <p className="max-w-prose text-body whitespace-pre-line">{text}</p>
        </section>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">
          {t("directory.address_title")}
        </h2>
        <LocationBlock
          cityId={d.cityId}
          address={d.address}
          location={d.location}
        />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">
          {t("directory.hours_title")}
        </h2>
        <HoursTable hours={d.hours} />
      </section>
      {d.phones.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-title font-semibold">
            {t("directory.phones_title")}
          </h2>
          <ul className="flex flex-col gap-1">
            {d.phones.map((phone) => (
              <li key={phone}>
                <a
                  href={`tel:${phone}`}
                  className="inline-flex min-h-11 items-center gap-2 text-body text-primary hover:underline md:min-h-0"
                >
                  <PhoneIcon aria-hidden strokeWidth={1.5} className="size-4" />
                  <bdi dir="ltr" className="num">
                    {formatPhone(phone)}
                  </bdi>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
