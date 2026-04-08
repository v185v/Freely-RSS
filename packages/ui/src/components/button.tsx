import type { ButtonHTMLAttributes } from "react"

import { cx } from "../lib/cx"

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "neutral" | "ghost"
  size?: "sm" | "md"
}

export function Button({
  children,
  className,
  tone = "neutral",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={cx("fr-button", `fr-button--${tone}`, `fr-button--${size}`, className)}
    >
      {children}
    </button>
  )
}
