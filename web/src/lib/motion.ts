// False on the server, under reduced motion and with data saver on (the root sets `data-data-saver` on <html>). Smooth scrolling and view transitions check it.
export const motionAllowed = () =>
  typeof window !== "undefined" &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
  !document.documentElement.hasAttribute("data-data-saver")

// A route change cross fades the page content. Navigations that only change search params (filters, sort, pages) do not move.
export const pageTransition = {
  types: ({ pathChanged }: { pathChanged: boolean }) =>
    pathChanged && motionAllowed() ? ["page"] : (false as const),
}
