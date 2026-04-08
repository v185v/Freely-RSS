import type { HTMLAttributes } from "react"

import { cx } from "../lib/cx"

export type SurfaceProps = HTMLAttributes<HTMLElement> & {
  compact?: boolean
}

export function Surface({ children, className, compact = false, ...props }: SurfaceProps) {
  return (
    <section {...props} className={cx("fr-surface", compact && "fr-surface--compact", className)}>
      {children}
    </section>
  )
}
