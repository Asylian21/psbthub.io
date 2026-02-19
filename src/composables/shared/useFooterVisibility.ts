import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export interface UseFooterVisibility {
  isVisible: Ref<boolean>
}

interface UseFooterVisibilityOptions {
  selector?: string
  threshold?: number
}

const DEFAULT_SELECTOR = '.landing-footer'
const DEFAULT_THRESHOLD = 0.1

export function useFooterVisibility(
  options: UseFooterVisibilityOptions = {},
): UseFooterVisibility {
  const selector = options.selector ?? DEFAULT_SELECTOR
  const threshold = options.threshold ?? DEFAULT_THRESHOLD
  const isVisible = ref(false)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return
    }

    const footerNode = document.querySelector<HTMLElement>(selector)
    if (!footerNode) {
      return
    }

    observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]): void => {
        const [entry] = entries
        isVisible.value = entry?.isIntersecting ?? false
      },
      {
        root: null,
        threshold,
      },
    )

    observer.observe(footerNode)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  return {
    isVisible,
  }
}
