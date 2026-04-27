import type { CachePolicy } from "@freelyrss/shared-types"

export const CACHE_POLICY_OPTIONS: Array<{
  description: string
  label: string
  value: CachePolicy
}> = [
  {
    value: "metadata-only",
    label: "Metadata only",
    description: "Keep feed metadata searchable, but skip local body and attachment caching.",
  },
  {
    value: "content",
    label: "Content only",
    description: "Keep article bodies offline, but leave attachments available on demand.",
  },
  {
    value: "content-and-attachments",
    label: "Content + attachments",
    description: "Keep article bodies and downloaded attachments available offline.",
  },
]

export const CACHE_LIMIT_STEP_MB = 128

export function getCachePolicyOption(policy: CachePolicy) {
  return CACHE_POLICY_OPTIONS.find((option) => option.value === policy) ?? CACHE_POLICY_OPTIONS[1]
}

export function bytesToMegabytes(bytes: number) {
  return Math.max(1, Math.round(bytes / (1024 * 1024)))
}

export function megabytesToBytes(megabytes: number) {
  return Math.round(megabytes * 1024 * 1024)
}

export function formatCacheLimit(bytes: number) {
  const megabytes = bytesToMegabytes(bytes)

  if (megabytes % 1024 === 0) {
    return `${megabytes / 1024} GB`
  }

  if (megabytes > 1024) {
    return `${(megabytes / 1024).toFixed(1)} GB`
  }

  return `${megabytes} MB`
}
