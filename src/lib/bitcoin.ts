/**
 * Legacy compatibility exports for PSBT helpers.
 *
 * Keeps older imports working while domain logic is centralized in `domain/psbt.ts`.
 */
export {
  DEFAULT_MAX_PSBT_BYTES,
  isValidPsbtBase64,
  validatePsbtBase64,
} from '../domain/psbt'
export { base64ToBytes, bytesToBase64 } from '../utils/encoding'
