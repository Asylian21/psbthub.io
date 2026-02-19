/**
 * Keeps share-view hash state in sync with browser URL hash changes.
 */
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export interface UseShareHashSync {
  currentHash: Ref<string>
  syncCurrentHash(): void
}

export function useShareHashSync(onHashChanged: () => void): UseShareHashSync {
  const currentHash = ref(window.location.hash)

  function syncCurrentHash(): void {
    currentHash.value = window.location.hash
  }

  function handleHashChange(): void {
    syncCurrentHash()
    onHashChanged()
  }

  onMounted(() => {
    window.addEventListener('hashchange', handleHashChange)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('hashchange', handleHashChange)
  })

  return {
    currentHash,
    syncCurrentHash,
  }
}
