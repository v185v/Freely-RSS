import { AI_PROVIDERS, APP_ENVS, LOG_LEVELS, RUNTIME_TARGETS, SYNC_MODES } from "./defaults.js"
import { ConfigValidationError } from "./errors.js"

const assertEnum = (path, value, values) => {
  if (!values.includes(value)) {
    throw new ConfigValidationError(path, `must be one of: ${values.join(", ")}`)
  }
}

const assertNonNegativeInteger = (path, value) => {
  if (!Number.isInteger(value) || value < 0) {
    throw new ConfigValidationError(path, "must be a non-negative integer")
  }
}

const assertUrl = (path, value) => {
  if (value === null) {
    return
  }

  try {
    new URL(value)
  } catch {
    throw new ConfigValidationError(path, "must be a valid URL")
  }
}

export const validateConfig = (config) => {
  assertEnum("appEnv", config.appEnv, APP_ENVS)
  assertEnum("runtimeTarget", config.runtimeTarget, RUNTIME_TARGETS)
  assertEnum("logLevel", config.logLevel, LOG_LEVELS)

  assertUrl("proxy.httpUrl", config.proxy.httpUrl)
  assertUrl("proxy.httpsUrl", config.proxy.httpsUrl)
  assertUrl("proxy.feedFetchProxyUrl", config.proxy.feedFetchProxyUrl)
  assertUrl("proxy.apiProxyUrl", config.proxy.apiProxyUrl)

  if (config.proxy.enabled) {
    const hasProxyUrl =
      config.proxy.httpUrl ||
      config.proxy.httpsUrl ||
      config.proxy.feedFetchProxyUrl ||
      config.proxy.apiProxyUrl

    if (!hasProxyUrl) {
      throw new ConfigValidationError(
        "proxy.enabled",
        "cannot be true when no proxy URL is configured",
      )
    }
  }

  assertEnum("sync.mode", config.sync.mode, SYNC_MODES)
  assertNonNegativeInteger("sync.pollIntervalMinutes", config.sync.pollIntervalMinutes)
  assertNonNegativeInteger("sync.connectTimeoutMs", config.sync.connectTimeoutMs)
  assertNonNegativeInteger("sync.requestTimeoutMs", config.sync.requestTimeoutMs)

  if (!config.sync.enabled && config.sync.mode !== "disabled") {
    throw new ConfigValidationError("sync.mode", 'must stay "disabled" when sync.enabled is false')
  }

  if (config.sync.enabled) {
    if (config.sync.mode === "disabled") {
      throw new ConfigValidationError(
        "sync.mode",
        'must not be "disabled" when sync.enabled is true',
      )
    }

    if (!config.sync.endpoint) {
      throw new ConfigValidationError("sync.endpoint", "is required when sync.enabled is true")
    }

    assertUrl("sync.endpoint", config.sync.endpoint)
  } else if (config.sync.endpoint !== null) {
    assertUrl("sync.endpoint", config.sync.endpoint)
  }

  assertEnum("ai.provider", config.ai.provider, AI_PROVIDERS)
  assertNonNegativeInteger("ai.timeoutMs", config.ai.timeoutMs)

  if (!config.ai.enabled && config.ai.provider !== "disabled") {
    throw new ConfigValidationError("ai.provider", 'must stay "disabled" when ai.enabled is false')
  }

  if (config.ai.enabled) {
    if (config.ai.provider === "disabled") {
      throw new ConfigValidationError(
        "ai.provider",
        'must not be "disabled" when ai.enabled is true',
      )
    }

    if (!config.ai.baseUrl) {
      throw new ConfigValidationError("ai.baseUrl", "is required when ai.enabled is true")
    }

    if (!config.ai.model) {
      throw new ConfigValidationError("ai.model", "is required when ai.enabled is true")
    }

    assertUrl("ai.baseUrl", config.ai.baseUrl)

    if (config.ai.provider === "openai-compatible" && !config.ai.apiKey) {
      throw new ConfigValidationError(
        "ai.apiKey",
        'is required when ai.provider is "openai-compatible"',
      )
    }
  } else if (config.ai.baseUrl !== null) {
    assertUrl("ai.baseUrl", config.ai.baseUrl)
  }

  return config
}
