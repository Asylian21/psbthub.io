/**
 * Shared application-level constants and formatting helpers.
 */
const ONE_KIB = 1024
const ONE_MIB = ONE_KIB * ONE_KIB

export const APP_MAX_PSBT_BYTES = ONE_MIB

/**
 * Human-readable byte formatter used in UI hints and validations.
 */
export function formatByteSize(bytes: number): string {
  if (bytes % ONE_MIB === 0) {
    return `${bytes / ONE_MIB} MiB`
  }

  if (bytes % ONE_KIB === 0) {
    return `${bytes / ONE_KIB} KiB`
  }

  return `${bytes} bytes`
}
