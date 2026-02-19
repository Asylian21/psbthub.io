import type { App } from 'vue'

type ErrorScope = 'vue' | 'window' | 'unhandled_rejection'

interface MonitoringPayload {
  scope: ErrorScope
  message: string
  path: string
  userAgent: string
  timestamp: string
  metadata: Record<string, string | number | boolean | null>
}

const MAX_MONITORING_MESSAGE_LENGTH = 240
const LONG_TOKEN_PATTERN = /[A-Za-z0-9+/_-]{80,}/g
const FRAGMENT_KEY_PATTERN = /#k=[A-Za-z0-9+/_-]+/gi

function normalizeUnknownError(input: unknown): string {
  if (input instanceof Error) {
    return input.message || input.name
  }

  if (typeof input === 'string') {
    return input
  }

  if (typeof input === 'number' || typeof input === 'boolean') {
    return String(input)
  }

  return 'Unknown runtime error'
}

export function sanitizeObservabilityMessage(rawMessage: string): string {
  const collapsedWhitespace = rawMessage.replace(/\s+/g, ' ').trim()
  const withoutFragmentKey = collapsedWhitespace.replace(FRAGMENT_KEY_PATTERN, '#k=[redacted]')
  const withoutLongTokens = withoutFragmentKey.replace(LONG_TOKEN_PATTERN, '[redacted]')
  if (!withoutLongTokens) {
    return 'Unknown runtime error'
  }

  if (withoutLongTokens.length <= MAX_MONITORING_MESSAGE_LENGTH) {
    return withoutLongTokens
  }

  return `${withoutLongTokens.slice(0, MAX_MONITORING_MESSAGE_LENGTH)}...`
}

function toMetadataValue(
  value: unknown,
): string | number | boolean | null {
  if (typeof value === 'string') {
    return sanitizeObservabilityMessage(value)
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value
  }

  return null
}

function sanitizeMetadata(
  metadata: Record<string, unknown>,
): Record<string, string | number | boolean | null> {
  const normalizedEntries = Object.entries(metadata).map(([key, value]) => [
    key,
    toMetadataValue(value),
  ] as const)

  return Object.fromEntries(normalizedEntries)
}

export function buildMonitoringPayload(
  scope: ErrorScope,
  errorLike: unknown,
  metadata: Record<string, unknown> = {},
): MonitoringPayload {
  return {
    scope,
    message: sanitizeObservabilityMessage(normalizeUnknownError(errorLike)),
    path: window.location.pathname,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    metadata: sanitizeMetadata(metadata),
  }
}

function sendMonitoringPayload(
  endpoint: string,
  payload: MonitoringPayload,
): void {
  void fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch((error: unknown) => {
    // Intentionally swallowed to avoid creating recursive crash loops.
    if (import.meta.env.DEV) {
      const normalizedError = sanitizeObservabilityMessage(normalizeUnknownError(error))
      console.warn(
        `[errorMonitoring] Failed to deliver monitoring payload: ${normalizedError}`,
      )
    }
  })
}

function getMonitoringEndpoint(): string | null {
  const rawEndpoint = import.meta.env.VITE_OBSERVABILITY_ENDPOINT?.trim()
  if (!rawEndpoint) {
    return null
  }

  return rawEndpoint
}

/**
 * Installs global error hooks for production observability.
 *
 * Reports uncaught Vue errors, browser runtime errors, and unhandled promise
 * rejections to a configurable ingest endpoint.
 */
export function installErrorMonitoring(app: App): void {
  const endpoint = getMonitoringEndpoint()
  if (!endpoint) {
    return
  }

  const previousErrorHandler = app.config.errorHandler
  app.config.errorHandler = (error, instance, info): void => {
    sendMonitoringPayload(
      endpoint,
      buildMonitoringPayload('vue', error, {
        info,
        component: instance?.$options.name ?? null,
      }),
    )
    previousErrorHandler?.(error, instance, info)
  }

  window.addEventListener('error', (event: ErrorEvent): void => {
    sendMonitoringPayload(
      endpoint,
      buildMonitoringPayload('window', event.error ?? event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }),
    )
  })

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent): void => {
    sendMonitoringPayload(
      endpoint,
      buildMonitoringPayload('unhandled_rejection', event.reason),
    )
  })
}
