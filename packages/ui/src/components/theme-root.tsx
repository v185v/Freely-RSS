import type { HTMLAttributes } from "react"

import { cx } from "../lib/cx"

export type ThemeRootProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "midnight"
}

export function ThemeRoot({ children, className, tone = "midnight", ...props }: ThemeRootProps) {
  return (
    <div {...props} className={cx("fr-theme-root", `fr-theme-root--${tone}`, className)}>
      {children}
    </div>
  )
}
