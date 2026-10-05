import { useEffect, useRef } from "react"

// Takes focus when `step` changes, so a screen reader hears the new step. Not on first render.
export function StepHeader({
  title,
  helper,
  step,
}: {
  title: string
  helper?: string
  step: string | number
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const previous = useRef(step)
  useEffect(() => {
    if (previous.current === step) return
    previous.current = step
    heading.current?.focus()
  }, [step])
  return (
    <div className="flex flex-col gap-1">
      <h1
        ref={heading}
        tabIndex={-1}
        className="text-page font-semibold focus-visible:outline-none"
      >
        {title}
      </h1>
      {helper && <p className="text-body text-muted-foreground">{helper}</p>}
    </div>
  )
}
