import { createApp, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useFooterVisibility,
  type UseFooterVisibility,
} from '../../../../src/composables/shared/useFooterVisibility'

type ObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver,
) => void

class MockIntersectionObserver {
  private readonly callback: ObserverCallback

  constructor(callback: ObserverCallback) {
    this.callback = callback
  }

  disconnect = vi.fn()
  observe = vi.fn()
  unobserve = vi.fn()
  takeRecords = vi.fn(() => [] as IntersectionObserverEntry[])
  root: Element | Document | null = null
  rootMargin = '0px'
  thresholds = [0]

  trigger(isIntersecting: boolean): void {
    const entry = {
      isIntersecting,
    } as IntersectionObserverEntry
    this.callback([entry], this as unknown as IntersectionObserver)
  }
}

function mountFooterVisibility(): {
  app: App<Element>
  state: UseFooterVisibility
} {
  let state: UseFooterVisibility | null = null
  const app = createApp({
    setup() {
      state = useFooterVisibility()
      return () => null
    },
  })
  const root = document.createElement('div')
  app.mount(root)

  return {
    app,
    state: state as UseFooterVisibility,
  }
}

describe('useFooterVisibility', () => {
  let footer: HTMLElement
  let observerInstance: MockIntersectionObserver | null

  beforeEach(() => {
    observerInstance = null
    footer = document.createElement('footer')
    footer.className = 'landing-footer'
    document.body.appendChild(footer)

    class TestIntersectionObserver extends MockIntersectionObserver {
      constructor(callback: ObserverCallback) {
        super(callback)
        observerInstance = this
      }
    }

    vi.stubGlobal(
      'IntersectionObserver',
      TestIntersectionObserver as unknown as typeof IntersectionObserver,
    )
  })

  afterEach(() => {
    footer.remove()
    vi.unstubAllGlobals()
  })

  it('updates visibility from observer events', () => {
    const { app, state } = mountFooterVisibility()
    expect(state.isVisible.value).toBe(false)

    observerInstance?.trigger(true)
    expect(state.isVisible.value).toBe(true)

    observerInstance?.trigger(false)
    expect(state.isVisible.value).toBe(false)

    app.unmount()
  })

  it('keeps default visibility when IntersectionObserver is unavailable', () => {
    vi.unstubAllGlobals()
    vi.stubGlobal('IntersectionObserver', undefined)

    const { app, state } = mountFooterVisibility()
    expect(state.isVisible.value).toBe(false)
    app.unmount()
  })

  it('keeps default visibility when footer element is missing', () => {
    footer.remove()
    const { app, state } = mountFooterVisibility()
    expect(state.isVisible.value).toBe(false)
    app.unmount()
  })
})
