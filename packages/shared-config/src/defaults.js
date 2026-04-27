export const APP_ENVS = ["development", "test", "production"]
export const RUNTIME_TARGETS = ["desktop", "web", "mobile", "sync-server"]
export const LOG_LEVELS = ["debug", "info", "warn", "error"]
export const SYNC_MODES = ["disabled", "cloud", "webdav", "nextcloud"]
export const AI_PROVIDERS = ["disabled", "openai-compatible", "ollama"]
export const CACHE_POLICIES = ["metadata-only", "content", "content-and-attachments"]

export const CONFIG_SOURCE_PRIORITY = Object.freeze([
  "defaults",
  "standard-proxy-env",
  "freelyrss-env",
  "explicit-overrides",
])

export const EXPERIMENTAL_FLAG_NAMES = Object.freeze([
  "desktopLocalApi",
  "webRemoteReader",
  "mobilePodcastQueue",
  "syncAdapters",
  "aiArtifacts",
])

export const createDefaultConfig = (appEnv = "development", runtimeTarget = "desktop") => {
  const logLevelByEnv = {
    development: "debug",
    test: "warn",
    production: "info",
  }

  return {
    appEnv,
    runtimeTarget,
    logLevel: logLevelByEnv[appEnv] ?? "info",
    proxy: {
      enabled: false,
      httpUrl: null,
      httpsUrl: null,
      noProxy: [],
      feedFetchProxyUrl: null,
      apiProxyUrl: null,
    },
    sync: {
      enabled: false,
      mode: "disabled",
      endpoint: null,
      deviceName: runtimeTarget === "desktop" ? "desktop-dev" : `${runtimeTarget}-client`,
      pollIntervalMinutes: appEnv === "test" ? 1 : 5,
      connectTimeoutMs: 5_000,
      requestTimeoutMs: 15_000,
    },
    ai: {
      enabled: false,
      provider: "disabled",
      baseUrl: null,
      apiKey: null,
      model: null,
      timeoutMs: 30_000,
    },
    cache: {
      maxBytes: 2_147_483_648,
      defaultPolicy: "content",
    },
    experimental: {
      desktopLocalApi: false,
      webRemoteReader: false,
      mobilePodcastQueue: false,
      syncAdapters: false,
      aiArtifacts: false,
    },
  }
}
