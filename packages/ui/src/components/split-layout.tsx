import { forwardRef } from "react"
import type { HTMLAttributes } from "react"

import { cx } from "../lib/cx"

export type SplitLayoutProps = HTMLAttributes<HTMLDivElement>

export function SplitLayout({ children, className, ...props }: SplitLayoutProps) {
  return (
    <div {...props} className={cx("fr-split-layout", className)}>
      {children}
    </div>
  )
}

export type SplitPaneProps = HTMLAttributes<HTMLElement>

export const SplitPane = forwardRef<HTMLElement, SplitPaneProps>(function SplitPane(
  { children, className, ...props },
  ref,
) {
  return (
    <section {...props} className={cx("fr-split-pane", className)} ref={ref}>
      {children}
    </section>
  )
})
