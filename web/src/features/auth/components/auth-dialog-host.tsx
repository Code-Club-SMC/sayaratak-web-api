import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { useT } from "@/lib/i18n/use-t"
import { closeAuthGate, resolveAuthGate, useAuthGate } from "../auth-gate"
import { AuthFlow } from "./auth-flow"

// Opened by `useRequireAuth` through the gate store: a dialog on desktop, a bottom sheet below md.
export function AuthDialogHost() {
  const { open } = useAuthGate()
  const mobile = useIsMobile()
  const { t } = useT()
  const onOpenChange = (next: boolean) => {
    if (!next) closeAuthGate()
  }
  const flow = <AuthFlow onDone={resolveAuthGate} />
  return mobile ? (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="p-6">
        <SheetTitle>{t("auth.title")}</SheetTitle>
        {flow}
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6">
        <DialogTitle>{t("auth.title")}</DialogTitle>
        {flow}
      </DialogContent>
    </Dialog>
  )
}
