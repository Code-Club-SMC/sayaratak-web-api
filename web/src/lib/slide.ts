export type SlideIcon = "car" | "truck" | "wrench" | "bike" | "tuk"

// One hero carousel slide. `eyebrow` is the small line above the title (an ad shows `advertiser` there when it has one). `trackingUrl` only travels to the carousel callbacks; the carousel never calls it.
export type Slide = {
  id: string
  kind: "house" | "ad"
  eyebrow?: string
  title: string
  body?: string
  cta: { label: string; href: string }
  image?: { src: string; alt: string; objectPosition?: string; flip?: boolean }
  icon?: SlideIcon
  advertiser?: string
  trackingUrl?: string
}
