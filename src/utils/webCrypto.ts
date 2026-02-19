/**
 * Returns browser WebCrypto API if available.
 */
export function getWebCrypto(): Crypto | null {
  if (typeof globalThis.crypto === 'undefined') {
    return null
  }

  return globalThis.crypto
}
