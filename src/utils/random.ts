/**
 * Shared cryptographically secure random helpers.
 */
const UINT32_MAX_EXCLUSIVE = 0x1_0000_0000

export function randomUint32(cryptoApi: Crypto): number {
  const randomValues = new Uint32Array(1)
  cryptoApi.getRandomValues(randomValues)
  return randomValues[0] ?? 0
}

export function randomIntegerInRange(
  minimum: number,
  maximum: number,
  cryptoApi: Crypto,
): number {
  const range = maximum - minimum + 1
  const maxUnbiased = Math.floor(UINT32_MAX_EXCLUSIVE / range) * range
  let randomValue = randomUint32(cryptoApi)

  while (randomValue >= maxUnbiased) {
    randomValue = randomUint32(cryptoApi)
  }

  return minimum + (randomValue % range)
}
