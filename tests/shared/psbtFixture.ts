/**
 * Shared deterministic PSBT fixtures used across unit/e2e suites.
 */
import { validatePsbtBase64, type ValidatedPsbt } from '../../src/domain/psbt'

/**
 * Returns a stable sample PSBT in base64 format.
 */
export function createSamplePsbtBase64(): string {
  return 'cHNidP8BAFICAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////AZBfAQAAAAAAFgAUIiIiIiIiIiIiIiIiIiIiIiIiIiIAAAAAAAEBH6CGAQAAAAAAFgAUEREREREREREREREREREREREREREAAA=='
}

/**
 * Returns the validated fixture shape for tests that need parsed metadata.
 */
export function createSampleValidatedPsbt(): ValidatedPsbt {
  const validationResult = validatePsbtBase64(createSamplePsbtBase64())

  if (!validationResult.ok) {
    throw new Error(`Unable to build PSBT test fixture: ${validationResult.error.message}`)
  }

  return validationResult.value
}
