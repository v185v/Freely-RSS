import type { InputHTMLAttributes } from "react"

import { cx } from "../lib/cx"

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  hint?: string
  label?: string
}

export function TextInput({ className, hint, label, ...props }: TextInputProps) {
  return (
    <label className="fr-field">
      {label ? <span className="fr-field__label">{label}</span> : null}
      <input {...props} className={cx("fr-input", className)} />
      {hint ? <span className="fr-field__hint">{hint}</span> : null}
    </label>
  )
}
