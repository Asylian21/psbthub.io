/**
 * Unit coverage for client-side observability payload sanitization.
 */
import type { App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildMonitoringPayload,
  installErrorMonitoring,
  sanitizeObservabilityMessage,
} from '../../../src/infra/observability/errorMonitoring'

describe('errorMonitoring infra', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sanitizes fragment secrets and long token-like payloads', () => {
    const token = 'A'.repeat(120)
    const sanitized = sanitizeObservabilityMessage(
      `Failed to open /p/abc#k=secretvalue with token ${token}`,
    )

    expect(sanitized).toContain('#k=[redacted]')
    expect(sanitized).toContain('[redacted]')
    expect(sanitized).not.toContain('secretvalue')
  })

  it('builds payload with sanitized metadata values', () => {
    const payload = buildMonitoringPayload('window', new Error('Boom failure'), {
      route: '/p/123#k=topsecret',
      statusCode: 500,
      nested: { invalid: true },
    })

    expect(payload.scope).toBe('window')
    expect(payload.message).toContain('Boom failure')
    expect(payload.path).toBe('/')
    expect(payload.metadata.route).toBe('/p/123#k=[redacted]')
    expect(payload.metadata.statusCode).toBe(500)
    expect(payload.metadata.nested).toBeNull()
  })

  it('truncates overly long messages after sanitization', () => {
    const veryLongMessage = `Failure #k=secret ${'A'.repeat(500)}`
    const sanitized = sanitizeObservabilityMessage(veryLongMessage)

    expect(sanitized).toContain('#k=[redacted]')
    expect(sanitized.length).toBeLessThanOrEqual(243)
  })

  it('normalizes empty/whitespace-only messages to unknown error text', () => {
    expect(sanitizeObservabilityMessage('   ')).toBe('Unknown runtime error')
  })

  it('does not install global monitoring hooks without endpoint configuration', () => {
    vi.stubEnv('VITE_OBSERVABILITY_ENDPOINT', '')
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const previousErrorHandler = vi.fn()
    const app = {
      config: {
        errorHandler: previousErrorHandler,
      },
    }

    installErrorMonitoring(app as unknown as App)

    expect(app.config.errorHandler).toBe(previousErrorHandler)
    expect(addEventListenerSpy).not.toHaveBeenCalled()
  })

  it('installs hooks, reports vue/window/promise errors, and chains previous handler', () => {
    vi.stubEnv('VITE_OBSERVABILITY_ENDPOINT', 'https://monitoring.example/collect')
    const fetchMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('fetch', fetchMock)

    const previousErrorHandler = vi.fn()
    const app = {
      config: {
        errorHandler: previousErrorHandler,
      },
    }

    installErrorMonitoring(app as unknown as App)

    const vueError = new Error('Render failed #k=supersecret')
    const vueInstance = { $options: { name: 'ShareView' } }
    app.config.errorHandler?.(vueError, vueInstance as never, 'render')

    window.dispatchEvent(
      new ErrorEvent('error', {
        error: new Error('window failure'),
        filename: '/app.js',
        lineno: 17,
        colno: 9,
      }),
    )

    const rejectionEvent = new Event('unhandledrejection')
    Object.defineProperty(rejectionEvent, 'reason', {
      configurable: true,
      value: new Error('promise failure'),
    })
    window.dispatchEvent(rejectionEvent)

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(previousErrorHandler).toHaveBeenCalledWith(vueError, vueInstance, 'render')

    const vuePayload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(vuePayload.scope).toBe('vue')
    expect(vuePayload.message).toContain('#k=[redacted]')
    expect(vuePayload.metadata.component).toBe('ShareView')
    expect(vuePayload.metadata.info).toBe('render')

    const windowPayload = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))
    expect(windowPayload.scope).toBe('window')
    expect(windowPayload.metadata.filename).toBe('/app.js')
    expect(windowPayload.metadata.lineno).toBe(17)
    expect(windowPayload.metadata.colno).toBe(9)

    const rejectionPayload = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))
    expect(rejectionPayload.scope).toBe('unhandled_rejection')
    expect(rejectionPayload.message).toContain('promise failure')
  })

  it('logs warning in development when monitoring delivery fails', async () => {
    vi.stubEnv('VITE_OBSERVABILITY_ENDPOINT', 'https://monitoring.example/collect')
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', fetchMock)

    const app = {
      config: {
        errorHandler: undefined,
      },
    }

    installErrorMonitoring(app as unknown as App)
    app.config.errorHandler?.(new Error('delivery check'), null, 'setup')

    await Promise.resolve()
    await Promise.resolve()

    if (import.meta.env.DEV) {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[errorMonitoring] Failed to deliver monitoring payload:'),
      )
    } else {
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    }
  })
})
