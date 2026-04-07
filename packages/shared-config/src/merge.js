const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value)

export const deepMerge = (baseConfig, overrideConfig) => {
  if (!isPlainObject(overrideConfig)) {
    return baseConfig
  }

  const result = { ...baseConfig }

  for (const [key, value] of Object.entries(overrideConfig)) {
    if (value === undefined) {
      continue
    }

    if (isPlainObject(value) && isPlainObject(baseConfig[key])) {
      result[key] = deepMerge(baseConfig[key], value)
      continue
    }

    result[key] = Array.isArray(value) ? [...value] : value
  }

  return result
}
