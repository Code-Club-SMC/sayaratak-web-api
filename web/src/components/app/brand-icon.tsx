import { cn } from "@/lib/utils"

// The brand marks in public/icons. Colors are part of the mark, so they are an image, not a currentColor icon.
export function BrandIcon({
  name,
  className,
}: {
  name: "google" | "apple" | "facebook" | "whatsapp" | "telegram" | "tiktok"
  className?: string
}) {
  return (
    <img
      src={`/icons/${name}.svg`}
      alt=""
      width={20}
      height={20}
      // The Apple mark is plain black; flip it on the dark theme.
      className={cn(
        "size-5 shrink-0",
        name === "apple" && "dark:invert",
        className
      )}
    />
  )
}
