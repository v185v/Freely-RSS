import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react"

import { cx } from "../lib/cx"

export type ListSectionProps = HTMLAttributes<HTMLDivElement> & {
  actions?: ReactNode
  description?: string
  title?: string
}

export function ListSection({
  actions,
  children,
  className,
  description,
  title,
  ...props
}: ListSectionProps) {
  return (
    <section {...props} className={cx("fr-list-section", className)}>
      {title || description || actions ? (
        <header className="fr-list-section__header">
          <div>
            {title ? <h2 className="fr-list-section__title">{title}</h2> : null}
            {description ? <p className="fr-list-section__description">{description}</p> : null}
          </div>
          {actions ? <div className="fr-list-section__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="fr-list-section__content">{children}</div>
    </section>
  )
}

export type ListRowProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  eyebrow?: string
  meta?: string
  summary?: ReactNode
  title: string
}

export function ListRow({
  active = false,
  className,
  eyebrow,
  meta,
  summary,
  title,
  type = "button",
  ...props
}: ListRowProps) {
  return (
    <button
      {...props}
      type={type}
      className={cx("fr-list-row", active && "fr-list-row--active", className)}
    >
      <div className="fr-list-row__header">
        {eyebrow ? <span className="fr-list-row__eyebrow">{eyebrow}</span> : <span />}
        {meta ? <span className="fr-list-row__meta">{meta}</span> : null}
      </div>
      <strong className="fr-list-row__title">{title}</strong>
      {summary ? <p className="fr-list-row__summary">{summary}</p> : null}
    </button>
  )
}
