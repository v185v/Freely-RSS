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

export function SplitPane({ children, className, ...props }: SplitPaneProps) {
  return (
    <section {...props} className={cx("fr-split-pane", className)}>
      {children}
    </section>
  )
}
