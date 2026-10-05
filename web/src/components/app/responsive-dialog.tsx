import type { ReactNode } from "react"

import { useIsMobile } from "@/hooks/use-mobile"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

// A dialog on desktop and a bottom sheet below md, the same pattern as the auth dialog.
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}) {
  const mobile = useIsMobile()
  const body = (
    <>
      {description && (
        <p className="text-ui text-muted-foreground">{description}</p>
      )}
      {children}
    </>
  )
  return mobile ? (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-4 p-6">
        <SheetTitle>{title}</SheetTitle>
        {body}
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 p-6">
        <DialogTitle>{title}</DialogTitle>
        {body}
      </DialogContent>
    </Dialog>
  )
}
