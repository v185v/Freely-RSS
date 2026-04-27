# @freelyrss/shared-config

`@freelyrss/shared-config` centralizes runtime configuration for FreelyRSS clients.

## Scope

The package currently owns six configuration areas:

- runtime environment and target
- proxy settings
- sync settings
- AI settings
- cache settings
- experimental feature flags

## Source Priority

Configuration is resolved in this order, from lowest to highest priority:

1. package defaults
2. standard proxy environment variables: `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`
3. FreelyRSS-prefixed environment variables
4. explicit in-memory overrides passed by the caller

This keeps desktop and test runners deterministic while still allowing local developer overrides.

## Environment Variables

Runtime:

- `FREELYRSS_APP_ENV`: `development`, `test`, `production`
- `FREELYRSS_RUNTIME_TARGET`: `desktop`, `web`, `mobile`, `sync-server`
- `FREELYRSS_LOG_LEVEL`: `debug`, `info`, `warn`, `error`

Proxy:

- `FREELYRSS_PROXY_ENABLED`
- `FREELYRSS_PROXY_HTTP_URL`
- `FREELYRSS_PROXY_HTTPS_URL`
- `FREELYRSS_PROXY_NO_PROXY`
- `FREELYRSS_PROXY_FEED_URL`
- `FREELYRSS_PROXY_API_URL`

Sync:

- `FREELYRSS_SYNC_ENABLED`
- `FREELYRSS_SYNC_MODE`: `disabled`, `cloud`, `webdav`, `nextcloud`
- `FREELYRSS_SYNC_ENDPOINT`
- `FREELYRSS_SYNC_DEVICE_NAME`
- `FREELYRSS_SYNC_POLL_INTERVAL_MINUTES`
- `FREELYRSS_SYNC_CONNECT_TIMEOUT_MS`
- `FREELYRSS_SYNC_REQUEST_TIMEOUT_MS`

AI:

- `FREELYRSS_AI_ENABLED`
- `FREELYRSS_AI_PROVIDER`: `disabled`, `openai-compatible`, `ollama`
- `FREELYRSS_AI_BASE_URL`
- `FREELYRSS_AI_API_KEY`
- `FREELYRSS_AI_MODEL`
- `FREELYRSS_AI_TIMEOUT_MS`

Cache:

- `FREELYRSS_CACHE_MAX_BYTES`
- `FREELYRSS_CACHE_DEFAULT_POLICY`: `metadata-only`, `content`, `content-and-attachments`

Experimental flags:

- `FREELYRSS_EXPERIMENTAL_DESKTOP_LOCAL_API`
- `FREELYRSS_EXPERIMENTAL_WEB_REMOTE_READER`
- `FREELYRSS_EXPERIMENTAL_MOBILE_PODCAST_QUEUE`
- `FREELYRSS_EXPERIMENTAL_SYNC_ADAPTERS`
- `FREELYRSS_EXPERIMENTAL_AI_ARTIFACTS`

## Validation Rules

- Sync can only be enabled when `mode` is not `disabled` and `endpoint` is present.
- AI can only be enabled when a provider, base URL, and model are present.
- `openai-compatible` also requires an API key.
- Proxy cannot be enabled without at least one configured proxy URL.
- Cache must keep a positive global byte limit and one of the supported default cache policies.

Validation failures throw `ConfigValidationError` with the failing path and a clear message.
