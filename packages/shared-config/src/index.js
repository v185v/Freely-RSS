import { CONFIG_SOURCE_PRIORITY, createDefaultConfig } from "./defaults.js"
import { parseFreelyRssEnv, parseStandardProxyEnv } from "./env.js"
import { deepMerge } from "./merge.js"
import { validateConfig } from "./validate.js"

const resolveBaseIdentity = (env, overrides) => {
  const appEnv =
    overrides.appEnv ?? env.FREELYRSS_APP_ENV ?? process.env.FREELYRSS_APP_ENV ?? "development"
  const runtimeTarget =
    overrides.runtimeTarget ??
    env.FREELYRSS_RUNTIME_TARGET ??
    process.env.FREELYRSS_RUNTIME_TARGET ??
    "desktop"

  return { appEnv, runtimeTarget }
}

export const loadConfig = ({ env = process.env, overrides = {} } = {}) => {
  const identity = resolveBaseIdentity(env, overrides)
  const defaults = createDefaultConfig(identity.appEnv, identity.runtimeTarget)
  const standardProxyEnv = parseStandardProxyEnv(env)
  const freelyRssEnv = parseFreelyRssEnv(env)

  const mergedConfig = [standardProxyEnv, freelyRssEnv, overrides].reduce(
    (currentConfig, layer) => deepMerge(currentConfig, layer),
    defaults,
  )

  return validateConfig(mergedConfig)
}

export { CONFIG_SOURCE_PRIORITY, createDefaultConfig }
export { ConfigValidationError } from "./errors.js"
