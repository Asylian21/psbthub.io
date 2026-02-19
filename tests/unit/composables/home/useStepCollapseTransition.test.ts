import { describe, expect, it, vi } from 'vitest'
import { useStepCollapseTransition } from '../../../../src/composables/home/useStepCollapseTransition'

describe('useStepCollapseTransition', () => {
  it('applies enter/leave styles and invokes after-leave callback', () => {
    const onAfterLeave = vi.fn()
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback): number => {
        callback(16)
        return 1
      })
    const transition = useStepCollapseTransition({ onAfterLeave })
    const element = document.createElement('div')
    Object.defineProperty(element, 'scrollHeight', {
      configurable: true,
      value: 120,
    })
    const offsetHeightGetter = vi.fn(() => 120)
    Object.defineProperty(element, 'offsetHeight', {
      configurable: true,
      get: offsetHeightGetter,
    })

    transition.handleStepCollapseBeforeEnter(element)
    expect(element.style.height).toBe('0px')
    expect(element.style.opacity).toBe('0')

    transition.handleStepCollapseEnter(element)
    expect(element.style.height).toBe('120px')
    expect(element.style.opacity).toBe('1')

    transition.handleStepCollapseAfterEnter(element)
    expect(element.style.height).toBe('')
    expect(element.style.opacity).toBe('')

    transition.handleStepCollapseBeforeLeave(element)
    expect(element.style.height).toBe('120px')
    expect(element.style.opacity).toBe('1')

    transition.handleStepCollapseLeave(element)
    expect(offsetHeightGetter).toHaveBeenCalled()
    expect(element.style.height).toBe('0px')
    expect(element.style.opacity).toBe('0')

    transition.handleStepCollapseAfterLeave(element)
    expect(onAfterLeave).toHaveBeenCalledWith(element)
    rafSpy.mockRestore()
  })

  it('gracefully skips non-HTMLElement nodes', () => {
    const transition = useStepCollapseTransition()
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

    expect(() => transition.handleStepCollapseBeforeEnter(svgElement)).not.toThrow()
    expect(() => transition.handleStepCollapseEnter(svgElement)).not.toThrow()
    expect(() => transition.handleStepCollapseAfterLeave(svgElement)).not.toThrow()
  })
})
