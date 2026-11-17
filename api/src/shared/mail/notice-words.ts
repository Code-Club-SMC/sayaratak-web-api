import type { Locale } from "./send"

type Item = "plan" | "promotion" | "campaign"
type Words = {
  amount: string
  reference: string
  transactionRef: string
  reason: string
  footer: string
  button: { billing: string; campaigns: string; listings: string }
  approved: {
    subject: (item: string) => string
    heading: string
    intro: (item: string) => string
    plan: (until: string) => string
    promotion: (until: string) => string
    campaign: (from: string, to: string) => string
    bump: string
  }
  rejected: {
    subject: (item: string) => string
    heading: string
    intro: (item: string) => string
    next: Record<Item, string>
  }
  featured: {
    title: string
    lines: (listing: string, until: string) => string[]
  }
  bumped: { title: string; lines: (listing: string) => string[] }
  ended: { title: string; lines: (listing: string, on: string) => string[] }
}

// Terms match the web app: "Reference code", "Transaction number", Featured (مميز), Contact (اتصل بنا).
export const NOTICE_WORDS: Record<Locale, Words> = {
  en: {
    amount: "Amount",
    reference: "Reference code",
    transactionRef: "Bankak transaction number",
    reason: "Reason:",
    footer:
      "You are receiving this email about your Sayaratak account. Need help? Reach us through the Contact page on Sayaratak.",
    button: {
      billing: "View billing",
      campaigns: "View your campaigns",
      listings: "View your listings",
    },
    approved: {
      subject: (item) => `Payment approved: ${item}`,
      heading: "Your payment is approved",
      intro: (item) => `We have verified your Bankak transfer for ${item}.`,
      plan: (until) => `Your plan is active until ${until}.`,
      promotion: (until) => `Your Featured promotion is live until ${until}.`,
      campaign: (from, to) =>
        `Your banner campaign runs from ${from} to ${to}.`,
      bump: "Your listing is back at the top of the newest listings.",
    },
    rejected: {
      subject: (item) => `Payment not approved: ${item}`,
      heading: "We could not approve your payment",
      intro: (item) =>
        `We reviewed the receipt you sent for ${item} and could not approve it.`,
      next: {
        plan: "Your plan has not started. Check the reason below, then send a new receipt from your billing page.",
        promotion:
          "Your promotion has not started. Check the reason below, then send a new receipt from your billing page.",
        campaign:
          "Your banner campaign is back to awaiting payment and its ad slots have been released. Check the reason below, then send a new receipt while slots are still free.",
      },
    },
    featured: {
      title: "Your listing is now Featured",
      lines: (listing, until) => [
        `Sayaratak has given “${listing}” a free Featured promotion.`,
        `It is live until ${until}. There is nothing to pay.`,
      ],
    },
    bumped: {
      title: "Your listing was moved to the top",
      lines: (listing) => [
        `Sayaratak has moved “${listing}” back to the top of the newest listings, free of charge.`,
      ],
    },
    ended: {
      title: "Your Featured promotion has ended",
      lines: (listing, on) => [
        `Sayaratak ended the Featured promotion on “${listing}” on ${on}.`,
        "Your listing itself is unchanged; it no longer appears among the Featured listings.",
        "If you think this is a mistake, reach us through the Contact page.",
      ],
    },
  },
  ar: {
    amount: "المبلغ",
    reference: "رمز المرجع",
    transactionRef: "رقم عملية بنكك",
    reason: "السبب:",
    footer:
      "تصلك هذه الرسالة بخصوص حسابك في سيارتك. تحتاج إلى مساعدة؟ تواصل معنا عبر صفحة «اتصل بنا» في سيارتك.",
    button: {
      billing: "عرض الفوترة",
      campaigns: "عرض حملاتك",
      listings: "عرض إعلاناتك",
    },
    approved: {
      subject: (item) => `تمت الموافقة على الدفع: ${item}`,
      heading: "تمت الموافقة على دفعتك",
      intro: (item) => `تحققنا من تحويلك عبر بنكك مقابل ${item}.`,
      plan: (until) => `اشتراكك فعّال حتى ${until}.`,
      promotion: (until) => `ترويج «مميز» لإعلانك فعّال حتى ${until}.`,
      campaign: (from, to) => `تُعرض حملتك الإعلانية من ${from} إلى ${to}.`,
      bump: "عاد إعلانك إلى أعلى قائمة أحدث الإعلانات.",
    },
    rejected: {
      subject: (item) => `لم تتم الموافقة على الدفع: ${item}`,
      heading: "لم نتمكن من الموافقة على دفعتك",
      intro: (item) =>
        `راجعنا الإيصال الذي أرسلته مقابل ${item} ولم نتمكن من الموافقة عليه.`,
      next: {
        plan: "لم يبدأ اشتراكك بعد. راجع السبب أدناه، ثم أرسل إيصالًا جديدًا من صفحة الفوترة.",
        promotion:
          "لم يبدأ الترويج بعد. راجع السبب أدناه، ثم أرسل إيصالًا جديدًا من صفحة الفوترة.",
        campaign:
          "أُعيدت حملتك الإعلانية إلى حالة «بانتظار الدفع» وأُتيحت أماكنها الإعلانية لغيرك. راجع السبب أدناه، ثم أرسل إيصالًا جديدًا ما دامت الأماكن متاحة.",
      },
    },
    featured: {
      title: "أصبح إعلانك مميزًا",
      lines: (listing, until) => [
        `منحت سيارتك إعلانك «${listing}» ترويج «مميز» مجانًا.`,
        `يبقى فعّالًا حتى ${until}، دون أي رسوم.`,
      ],
    },
    bumped: {
      title: "عاد إعلانك إلى الأعلى",
      lines: (listing) => [
        `أعادت سيارتك إعلانك «${listing}» إلى أعلى قائمة أحدث الإعلانات مجانًا.`,
      ],
    },
    ended: {
      title: "انتهى ترويج إعلانك المميز",
      lines: (listing, on) => [
        `أنهت سيارتك ترويج «مميز» لإعلانك «${listing}» بتاريخ ${on}.`,
        "لم يتغير إعلانك نفسه، لكنه لم يعد يظهر ضمن الإعلانات المميزة.",
        "إذا كنت ترى أن ذلك خطأ، تواصل معنا عبر صفحة «اتصل بنا».",
      ],
    },
  },
}
export type NoticeWords = Words
