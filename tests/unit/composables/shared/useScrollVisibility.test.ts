import { createApp, type App } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  useScrollVisibility,
  type UseScrollVisibility,
} from '../../../../src/composables/shared/useScrollVisibility'

function mountScrollVisibility(showOffset: number): {
  app: App<Element>
  state: UseScrollVisibility
} {
  let state: UseScrollVisibility | null = null
  const app = createApp({
    setup() {
      state = useScrollVisibility(showOffset)
      return () => null
    },
  })
  const root = document.createElement('div')
  app.mount(root)

  return {
    app,
    state: state as UseScrollVisibility,
  }
}

describe('useScrollVisibility', () => {
  it('tracks visibility based on scroll threshold', () => {
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 0,
    })

    const { app, state } = mountScrollVisibility(100)
    expect(state.isVisible.value).toBe(false)

    window.scrollY = 120
    window.dispatchEvent(new Event('scroll'))
    expect(state.isVisible.value).toBe(true)

    app.unmount()
  })
})
