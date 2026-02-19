import { createApp, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCountdownTicker, type UseCountdownTicker } from '../../../../src/composables/shared/useCountdownTicker'

function mountTicker(options: { intervalMs?: number } = {}): {
  app: App<Element>
  ticker: UseCountdownTicker
} {
  let ticker: UseCountdownTicker | null = null
  const app = createApp({
    setup() {
      ticker = useCountdownTicker(options)
      return () => null
    },
  })

  const root = document.createElement('div')
  app.mount(root)

  return {
    app,
    ticker: ticker as UseCountdownTicker,
  }
}

describe('useCountdownTicker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts and updates timestamp on interval', () => {
    const { app, ticker } = mountTicker({ intervalMs: 500 })
    const initial = ticker.nowTimestamp.value

    ticker.start()
    vi.advanceTimersByTime(500)

    expect(ticker.isRunning.value).toBe(true)
    expect(ticker.nowTimestamp.value).toBeGreaterThanOrEqual(initial)

    app.unmount()
  })

  it('stops interval and reports not running', () => {
    const { app, ticker } = mountTicker({ intervalMs: 300 })
    ticker.start()
    expect(ticker.isRunning.value).toBe(true)

    ticker.stop()
    expect(ticker.isRunning.value).toBe(false)

    app.unmount()
  })
})
