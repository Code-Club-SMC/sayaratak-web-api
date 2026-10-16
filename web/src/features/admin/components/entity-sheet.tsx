import { useRef, type ReactNode } from "react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

// The detail panel of an admin table. It slides from the inline end (right in English, left in Arabic). The page keeps the open row's id in its `id` search param, so Back closes the sheet and a link can open it.
export function EntitySheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  // Sticky at the bottom: the sheet's actions.
  footer?: ReactNode
  children: ReactNode
}) {
  // Focus starts at the top of the body, not on its first control, which would scroll a long sheet (a receipt, documents) to the middle.
  const body = useRef<HTMLDivElement>(null)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="inline-end"
        initialFocus={body}
        className="gap-0 data-[side=inline-end]:w-full data-[side=inline-end]:sm:max-w-lg"
      >
        <SheetHeader className="border-b pe-12">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div
          ref={body}
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 outline-none"
        >
          {children}
        </div>
        {footer && (
          <SheetFooter className="flex-row flex-wrap border-t">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
