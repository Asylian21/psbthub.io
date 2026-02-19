interface UseStepCollapseTransitionOptions {
  onAfterLeave?: (element: HTMLElement) => void
}

interface UseStepCollapseTransition {
  handleStepCollapseBeforeEnter(element: Element): void
  handleStepCollapseEnter(element: Element): void
  handleStepCollapseAfterEnter(element: Element): void
  handleStepCollapseBeforeLeave(element: Element): void
  handleStepCollapseLeave(element: Element): void
  handleStepCollapseAfterLeave(element: Element): void
}

function toHtmlElement(element: Element): HTMLElement | null {
  if (element instanceof HTMLElement) {
    return element
  }

  return null
}

export function useStepCollapseTransition(
  options: UseStepCollapseTransitionOptions = {},
): UseStepCollapseTransition {
  function handleStepCollapseBeforeEnter(element: Element): void {
    const htmlElement = toHtmlElement(element)
    if (!htmlElement) {
      return
    }

    htmlElement.style.height = '0'
    htmlElement.style.opacity = '0'
  }

  function handleStepCollapseEnter(element: Element): void {
    const htmlElement = toHtmlElement(element)
    if (!htmlElement) {
      return
    }

    requestAnimationFrame(() => {
      htmlElement.style.height = `${htmlElement.scrollHeight}px`
      htmlElement.style.opacity = '1'
    })
  }

  function handleStepCollapseAfterEnter(element: Element): void {
    const htmlElement = toHtmlElement(element)
    if (!htmlElement) {
      return
    }

    htmlElement.style.height = ''
    htmlElement.style.opacity = ''
  }

  function handleStepCollapseBeforeLeave(element: Element): void {
    const htmlElement = toHtmlElement(element)
    if (!htmlElement) {
      return
    }

    htmlElement.style.height = `${htmlElement.scrollHeight}px`
    htmlElement.style.opacity = '1'
  }

  function handleStepCollapseLeave(element: Element): void {
    const htmlElement = toHtmlElement(element)
    if (!htmlElement) {
      return
    }

    void htmlElement.offsetHeight
    requestAnimationFrame(() => {
      htmlElement.style.height = '0'
      htmlElement.style.opacity = '0'
    })
  }

  function handleStepCollapseAfterLeave(element: Element): void {
    const htmlElement = toHtmlElement(element)
    if (!htmlElement) {
      return
    }

    htmlElement.style.height = ''
    htmlElement.style.opacity = ''
    options.onAfterLeave?.(htmlElement)
  }

  return {
    handleStepCollapseBeforeEnter,
    handleStepCollapseEnter,
    handleStepCollapseAfterEnter,
    handleStepCollapseBeforeLeave,
    handleStepCollapseLeave,
    handleStepCollapseAfterLeave,
  }
}
