import assert from "node:assert/strict"
import test from "node:test"

import { CONFIG_SOURCE_PRIORITY, ConfigValidationError, loadConfig } from "./index.js"

test("loads a desktop development config with layered proxy settings", () => {
  const config = loadConfig({
    env: {
      FREELYRSS_APP_ENV: "development",
      FREELYRSS_RUNTIME_TARGET: "desktop",
      HTTP_PROXY: "http://standard-proxy.internal:8080",
      NO_PROXY: "localhost,127.0.0.1",
      FREELYRSS_PROXY_API_URL: "http://api-proxy.internal:9000",
      FREELYRSS_EXPERIMENTAL_DESKTOP_LOCAL_API: "true",
    },
  })

  assert.equal(config.appEnv, "development")
  assert.equal(config.runtimeTarget, "desktop")
  assert.equal(config.logLevel, "debug")
  assert.deepEqual(CONFIG_SOURCE_PRIORITY, [
    "defaults",
    "standard-proxy-env",
    "freelyrss-env",
    "explicit-overrides",
  ])
  assert.equal(config.proxy.enabled, true)
  assert.equal(config.proxy.httpUrl, "http://standard-proxy.internal:8080")
  assert.equal(config.proxy.apiProxyUrl, "http://api-proxy.internal:9000")
  assert.deepEqual(config.proxy.noProxy, ["localhost", "127.0.0.1"])
  assert.equal(config.experimental.desktopLocalApi, true)
  assert.equal(config.sync.enabled, false)
  assert.equal(config.ai.enabled, false)
})

test("loads a desktop test config with deterministic defaults and explicit overrides", () => {
  const config = loadConfig({
    env: {
      FREELYRSS_APP_ENV: "test",
      FREELYRSS_RUNTIME_TARGET: "desktop",
    },
    overrides: {
      sync: {
        enabled: false,
        mode: "disabled",
        deviceName: "desktop-test-runner",
      },
      experimental: {
        syncAdapters: true,
      },
    },
  })

  assert.equal(config.appEnv, "test")
  assert.equal(config.runtimeTarget, "desktop")
  assert.equal(config.logLevel, "warn")
  assert.equal(config.sync.deviceName, "desktop-test-runner")
  assert.equal(config.sync.pollIntervalMinutes, 1)
  assert.equal(config.experimental.syncAdapters, true)
})

test("throws a clear error when sync is enabled without an endpoint", () => {
  assert.throws(
    () =>
      loadConfig({
        env: {
          FREELYRSS_APP_ENV: "development",
          FREELYRSS_RUNTIME_TARGET: "desktop",
          FREELYRSS_SYNC_ENABLED: "true",
          FREELYRSS_SYNC_MODE: "cloud",
        },
      }),
    (error) => {
      assert.ok(error instanceof ConfigValidationError)
      assert.equal(error.path, "sync.endpoint")
      assert.match(error.message, /required when sync\.enabled is true/)
      return true
    },
  )
})

test("throws a clear error when AI is enabled without required provider credentials", () => {
  assert.throws(
    () =>
      loadConfig({
        env: {
          FREELYRSS_APP_ENV: "development",
          FREELYRSS_RUNTIME_TARGET: "desktop",
          FREELYRSS_AI_ENABLED: "true",
          FREELYRSS_AI_PROVIDER: "openai-compatible",
          FREELYRSS_AI_BASE_URL: "https://example.invalid/v1",
          FREELYRSS_AI_MODEL: "gpt-5.4",
        },
      }),
    (error) => {
      assert.ok(error instanceof ConfigValidationError)
      assert.equal(error.path, "ai.apiKey")
      assert.match(error.message, /required when ai\.provider is "openai-compatible"/)
      return true
    },
  )
})
