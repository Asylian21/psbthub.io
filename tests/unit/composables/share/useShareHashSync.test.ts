/**
 * Unit coverage for share hash synchronization lifecycle behavior.
 */
import { createApp, defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useShareHashSync } from '../../../../src/composables/share/useShareHashSync'

describe('useShareHashSync composable', () => {
  it('syncs current hash and reacts to hashchange events', () => {
    const onHashChanged = vi.fn()
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    let hashState: ReturnType<typeof useShareHashSync> | null = null

    const TestHost = defineComponent({
      setup() {
        hashState = useShareHashSync(() => {
          onHashChanged()
        })
        return () => null
      },
    })

    const mountTarget = document.createElement('div')
    document.body.appendChild(mountTarget)
    const app = createApp(TestHost)
    app.mount(mountTarget)

    expect(hashState).not.toBeNull()
    const addHashChangeCall = addEventListenerSpy.mock.calls.find(
      ([eventName]) => eventName === 'hashchange',
    )
    expect(addHashChangeCall).toBeDefined()
    if (!hashState) {
      app.unmount()
      mountTarget.remove()
      return
    }

    window.location.hash = '#k=abc'
    window.dispatchEvent(new Event('hashchange'))

    expect(hashState.currentHash.value).toBe('#k=abc')
    expect(onHashChanged).toHaveBeenCalledTimes(1)

    hashState.syncCurrentHash()
    expect(hashState.currentHash.value).toBe('#k=abc')

    app.unmount()
    mountTarget.remove()
    const removeHashChangeCall = removeEventListenerSpy.mock.calls.find(
      ([eventName]) => eventName === 'hashchange',
    )
    expect(removeHashChangeCall?.[1]).toBe(addHashChangeCall?.[1])

    window.location.hash = '#k=def'
    window.dispatchEvent(new Event('hashchange'))
    expect(onHashChanged).toHaveBeenCalledTimes(1)
  })

  it('captures initial hash and allows manual sync without firing callback', () => {
    window.location.hash = '#k=initial'
    const onHashChanged = vi.fn()
    let hashState: ReturnType<typeof useShareHashSync> | null = null

    const TestHost = defineComponent({
      setup() {
        hashState = useShareHashSync(onHashChanged)
        return () => null
      },
    })

    const mountTarget = document.createElement('div')
    document.body.appendChild(mountTarget)
    const app = createApp(TestHost)
    app.mount(mountTarget)

    expect(hashState?.currentHash.value).toBe('#k=initial')
    window.location.hash = '#k=updated'
    hashState?.syncCurrentHash()
    expect(hashState?.currentHash.value).toBe('#k=updated')
    expect(onHashChanged).not.toHaveBeenCalled()

    app.unmount()
    mountTarget.remove()
  })
})
