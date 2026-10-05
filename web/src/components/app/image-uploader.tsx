import { lazy, Suspense } from "react"

import type { Media } from "@/schemas/listing"
import { Skeleton } from "@/components/ui/skeleton"

export type ImageUploaderProps = {
  mode: "multi" | "single"
  value: Media[]
  onChange: (value: Media[]) => void
  min?: number
  max?: number
  shape?: "wide" | "square" | "round"
  label?: string
}

// The implementation (resizing, upload state, reordering) stays out of the first load.
const Impl = lazy(() =>
  import("./image-uploader-impl").then((m) => ({
    default: m.ImageUploaderImpl,
  }))
)

export function ImageUploader(props: ImageUploaderProps) {
  return (
    <Suspense
      fallback={
        <Skeleton className="aspect-[4/3] w-full max-w-lg rounded-lg" />
      }
    >
      <Impl {...props} />
    </Suspense>
  )
}
