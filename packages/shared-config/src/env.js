import {
  AI_PROVIDERS,
  APP_ENVS,
  CACHE_POLICIES,
  EXPERIMENTAL_FLAG_NAMES,
  LOG_LEVELS,
  RUNTIME_TARGETS,
  SYNC_MODES,
} from "./defaults.js"
import { ConfigValidationError } from "./errors.js"

const hasOwn = (env, key) => Object.prototype.hasOwnProperty.call(env, key)

const readString = (env, key) => {
  if (!hasOwn(env, key)) {
    return undefined
  }

  const value = env[key]
  if (value === undefined || value === null || String(value).trim() === "") {
    return null
  }

  return String(value).trim()
}

const readBoolean = (env, key) => {
  const value = readString(env, key)
  if (value === undefined || value === null) {
    return value
  }

  if (value === "true") {
    return true
  }

  if (value === "false") {
    return false
  }

  throw new ConfigValidationError(key, 'must be either "true" or "false"')
}

const readInteger = (env, key) => {
  const value = readString(env, key)
  if (value === undefined || value === null) {
    return value
  }

  if (!/^-?\d+$/.test(value)) {
    throw new ConfigValidationError(key, "must be an integer")
  }

  return Number.parseInt(value, 10)
}

const readEnum = (env, key, values) => {
  const value = readString(env, key)
  if (value === undefined || value === null) {
    return value
  }

  if (!values.includes(value)) {
    throw new ConfigValidationError(key, `must be one of: ${values.join(", ")}`)
  }

  return value
}

const readList = (env, key) => {
  const value = readString(env, key)
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return []
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export const parseStandardProxyEnv = (env = process.env) => {
  const httpUrl = readString(env, "HTTP_PROXY")
  const httpsUrl = readString(env, "HTTPS_PROXY")
  const noProxy = readList(env, "NO_PROXY")

  if (httpUrl === undefined && httpsUrl === undefined && noProxy === undefined) {
    return {}
  }

  return {
    proxy: {
      enabled: Boolean(httpUrl || httpsUrl),
      httpUrl: httpUrl ?? undefined,
      httpsUrl: httpsUrl ?? undefined,
      noProxy: noProxy ?? undefined,
    },
  }
}

export const parseFreelyRssEnv = (env = process.env) => {
  const partialConfig = {}

  const appEnv = readEnum(env, "FREELYRSS_APP_ENV", APP_ENVS)
  const runtimeTarget = readEnum(env, "FREELYRSS_RUNTIME_TARGET", RUNTIME_TARGETS)
  const logLevel = readEnum(env, "FREELYRSS_LOG_LEVEL", LOG_LEVELS)

  if (appEnv !== undefined) {
    partialConfig.appEnv = appEnv
  }

  if (runtimeTarget !== undefined) {
    partialConfig.runtimeTarget = runtimeTarget
  }

  if (logLevel !== undefined) {
    partialConfig.logLevel = logLevel
  }

  const proxyPartial = {
    enabled: readBoolean(env, "FREELYRSS_PROXY_ENABLED"),
    httpUrl: readString(env, "FREELYRSS_PROXY_HTTP_URL"),
    httpsUrl: readString(env, "FREELYRSS_PROXY_HTTPS_URL"),
    noProxy: readList(env, "FREELYRSS_PROXY_NO_PROXY"),
    feedFetchProxyUrl: readString(env, "FREELYRSS_PROXY_FEED_URL"),
    apiProxyUrl: readString(env, "FREELYRSS_PROXY_API_URL"),
  }

  if (Object.values(proxyPartial).some((value) => value !== undefined)) {
    partialConfig.proxy = proxyPartial
  }

  const syncPartial = {
    enabled: readBoolean(env, "FREELYRSS_SYNC_ENABLED"),
    mode: readEnum(env, "FREELYRSS_SYNC_MODE", SYNC_MODES),
    endpoint: readString(env, "FREELYRSS_SYNC_ENDPOINT"),
    deviceName: readString(env, "FREELYRSS_SYNC_DEVICE_NAME"),
    pollIntervalMinutes: readInteger(env, "FREELYRSS_SYNC_POLL_INTERVAL_MINUTES"),
    connectTimeoutMs: readInteger(env, "FREELYRSS_SYNC_CONNECT_TIMEOUT_MS"),
    requestTimeoutMs: readInteger(env, "FREELYRSS_SYNC_REQUEST_TIMEOUT_MS"),
  }

  if (Object.values(syncPartial).some((value) => value !== undefined)) {
    partialConfig.sync = syncPartial
  }

  const aiPartial = {
    enabled: readBoolean(env, "FREELYRSS_AI_ENABLED"),
    provider: readEnum(env, "FREELYRSS_AI_PROVIDER", AI_PROVIDERS),
    baseUrl: readString(env, "FREELYRSS_AI_BASE_URL"),
    apiKey: readString(env, "FREELYRSS_AI_API_KEY"),
    model: readString(env, "FREELYRSS_AI_MODEL"),
    timeoutMs: readInteger(env, "FREELYRSS_AI_TIMEOUT_MS"),
  }

  if (Object.values(aiPartial).some((value) => value !== undefined)) {
    partialConfig.ai = aiPartial
  }

  const cachePartial = {
    maxBytes: readInteger(env, "FREELYRSS_CACHE_MAX_BYTES"),
    defaultPolicy: readEnum(env, "FREELYRSS_CACHE_DEFAULT_POLICY", CACHE_POLICIES),
  }

  if (Object.values(cachePartial).some((value) => value !== undefined)) {
    partialConfig.cache = cachePartial
  }

  const experimentalPartial = {}
  const experimentalEnvNames = {
    desktopLocalApi: "FREELYRSS_EXPERIMENTAL_DESKTOP_LOCAL_API",
    webRemoteReader: "FREELYRSS_EXPERIMENTAL_WEB_REMOTE_READER",
    mobilePodcastQueue: "FREELYRSS_EXPERIMENTAL_MOBILE_PODCAST_QUEUE",
    syncAdapters: "FREELYRSS_EXPERIMENTAL_SYNC_ADAPTERS",
    aiArtifacts: "FREELYRSS_EXPERIMENTAL_AI_ARTIFACTS",
  }

  for (const flagName of EXPERIMENTAL_FLAG_NAMES) {
    const envName = experimentalEnvNames[flagName]
    const value = readBoolean(env, envName)
    if (value !== undefined) {
      experimentalPartial[flagName] = value
    }
  }

  if (Object.keys(experimentalPartial).length > 0) {
    partialConfig.experimental = experimentalPartial
  }

  return partialConfig
}
