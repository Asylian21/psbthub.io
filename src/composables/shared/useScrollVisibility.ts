import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export interface UseScrollVisibility {
  isVisible: Ref<boolean>
  update(): void
}

export function useScrollVisibility(showOffset: number): UseScrollVisibility {
  const isVisible = ref(false)

  function update(): void {
    isVisible.value = window.scrollY > showOffset
  }

  onMounted(() => {
    update()
    window.addEventListener('scroll', update, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', update)
  })

  return {
    isVisible,
    update,
  }
}
