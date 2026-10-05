import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { closeAuthGate, resolveAuthGate, useAuthGate } from "../auth-gate"
import { AuthFlow } from "./auth-flow"

// Opened by `useRequireAuth` through the gate store: a 400 px dialog on desktop, a bottom sheet below md.
export function AuthDialog() {
  const { open } = useAuthGate()
  const mobile = useIsMobile()
  const onOpenChange = (next: boolean) => {
    if (!next) closeAuthGate()
  }
  const flow = <AuthFlow mode="dialog" onDone={resolveAuthGate} />
  return mobile ? (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="p-6">
        {flow}
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-6 sm:max-w-[400px]">
        {flow}
      </DialogContent>
    </Dialog>
  )
}
