import { computed, onBeforeUnmount, ref, type ComputedRef, type Ref } from 'vue'

export interface UseCountdownTickerOptions {
  intervalMs?: number
}

export interface UseCountdownTicker {
  nowTimestamp: Ref<number>
  isRunning: ComputedRef<boolean>
  start(): void
  stop(): void
  syncNow(): void
}

const DEFAULT_TICK_INTERVAL_MS = 1_000

export function useCountdownTicker(
  options: UseCountdownTickerOptions = {},
): UseCountdownTicker {
  const intervalMs = options.intervalMs ?? DEFAULT_TICK_INTERVAL_MS
  const nowTimestamp = ref<number>(Date.now())
  const intervalId = ref<ReturnType<typeof setInterval> | null>(null)
  const isRunning = computed<boolean>(() => intervalId.value !== null)

  function syncNow(): void {
    nowTimestamp.value = Date.now()
  }

  function start(): void {
    if (intervalId.value !== null) {
      return
    }

    syncNow()
    intervalId.value = setInterval(() => {
      nowTimestamp.value = Date.now()
    }, intervalMs)
  }

  function stop(): void {
    if (intervalId.value === null) {
      return
    }

    clearInterval(intervalId.value)
    intervalId.value = null
  }

  onBeforeUnmount(() => {
    stop()
  })

  return {
    nowTimestamp,
    isRunning,
    start,
    stop,
    syncNow,
  }
}
