import { createContext, use, type ReactNode } from "react"

export type Prefs = { dataSaver: boolean; listingView: "grid" | "row" }

const PrefsContext = createContext<Prefs>({
  dataSaver: false,
  listingView: "grid",
})

// Read from cookies in the root loader, so server and client render the same.
export function PrefsProvider({
  prefs,
  children,
}: {
  prefs: Prefs
  children: ReactNode
}) {
  return <PrefsContext value={prefs}>{children}</PrefsContext>
}

export const usePrefs = () => use(PrefsContext)
