/**
 * Share ID domain module.
 *
 * Generates and validates short, high-entropy share IDs used in `/p/:id` links.
 * IDs are fixed-length alphanumeric tokens with no special characters.
 */
const SHARE_ID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const SHARE_ID_ALPHABET_SIZE = SHARE_ID_ALPHABET.length
const SHARE_ID_REJECTION_THRESHOLD = Math.floor(256 / SHARE_ID_ALPHABET_SIZE) * SHARE_ID_ALPHABET_SIZE
const SHARE_ID_PATTERN = /^[A-Za-z0-9]{22}$/

export const SHARE_ID_LENGTH = 22

export function isValidShareId(rawShareId: string): boolean {
  return SHARE_ID_PATTERN.test(rawShareId.trim())
}

/**
 * Generates a fixed-length, URL-safe share ID without special characters.
 */
export function generateShareId(): string {
  let shareId = ''
  const randomBytes = new Uint8Array(SHARE_ID_LENGTH * 2)

  while (shareId.length < SHARE_ID_LENGTH) {
    globalThis.crypto.getRandomValues(randomBytes)

    for (const byte of randomBytes) {
      if (byte >= SHARE_ID_REJECTION_THRESHOLD) {
        continue
      }

      shareId += SHARE_ID_ALPHABET.charAt(byte % SHARE_ID_ALPHABET_SIZE)

      if (shareId.length === SHARE_ID_LENGTH) {
        break
      }
    }
  }

  return shareId
}
