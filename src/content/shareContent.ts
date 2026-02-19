import type { PsbtDisplayMode } from '../composables/usePsbtDisplay'
import type { DeleteShareErrorCode, FetchErrorCode } from '../composables/useFetch'

export interface FetchErrorPresentationContent {
  title: string
  detail: string
  retryHint: string
}

export interface DeleteErrorPresentationContent {
  title: string
  detail: string
}

export const SHARE_QR_EXPORT_FORMAT_SEVERITY: Record<
  PsbtDisplayMode,
  'secondary' | 'info' | 'warn' | 'success'
> = {
  base64: 'info',
  hex: 'warn',
  binary: 'secondary',
  json: 'success',
}

export const SHARE_FETCH_ERROR_PRESENTATIONS: Record<
  FetchErrorCode,
  FetchErrorPresentationContent
> = {
  INVALID_SHARE_ID: {
    title: 'Invalid share link',
    detail: 'This share ID format is not recognized.',
    retryHint: 'Check the share URL and try again.',
  },
  SUPABASE_NOT_CONFIGURED: {
    title: 'Service configuration issue',
    detail: 'The decryption service is not configured for this environment.',
    retryHint: 'Try again later or contact support.',
  },
  FETCH_FAILED: {
    title: 'Unable to load share',
    detail: 'We could not retrieve the encrypted payload from the server.',
    retryHint: 'Retry in a moment.',
  },
  SHARE_NOT_FOUND: {
    title: 'Share not available',
    detail: 'This share may have expired, been removed, or never existed.',
    retryHint: 'Ask the sender for a fresh share link.',
  },
  MISSING_FRAGMENT_KEY: {
    title: 'Incomplete share link',
    detail: 'The decryption key fragment (#k=...) is missing from this URL.',
    retryHint: 'Open the original full link from the sender and retry.',
  },
  INVALID_FRAGMENT_KEY: {
    title: 'Invalid decryption key',
    detail: 'The key fragment in this URL cannot decrypt this share.',
    retryHint: 'Use the original full link from the sender and retry.',
  },
  INVALID_ENVELOPE: {
    title: 'Invalid encrypted payload',
    detail: 'The stored encrypted payload has an unsupported format.',
    retryHint: 'Ask the sender to create a new share.',
  },
  DECRYPTION_FAILED: {
    title: 'Decryption failed',
    detail: 'This share cannot be decrypted with the provided decryption secret.',
    retryHint: 'Verify the URL or password and try again.',
  },
  INVALID_PAYLOAD: {
    title: 'Invalid decrypted payload',
    detail: 'The decrypted data structure is invalid or unsupported.',
    retryHint: 'Ask the sender for a fresh share.',
  },
  INVALID_PSBT: {
    title: 'Invalid PSBT payload',
    detail: 'The decrypted data does not contain a valid PSBT.',
    retryHint: 'Ask the sender to regenerate the share.',
  },
  UNEXPECTED_ERROR: {
    title: 'Unexpected error',
    detail: 'An unexpected issue occurred while opening this share.',
    retryHint: 'Retry in a moment.',
  },
}

export const SHARE_DELETE_ERROR_PRESENTATIONS: Record<
  DeleteShareErrorCode,
  DeleteErrorPresentationContent
> = {
  INVALID_SHARE_ID: {
    title: 'Unable to delete share',
    detail: 'The share ID in this URL has an invalid format.',
  },
  MISSING_DELETE_CAPABILITY: {
    title: 'Delete unavailable',
    detail:
      'This share is missing a valid delete capability token. Decrypt the share first or create a fresh link.',
  },
  SUPABASE_NOT_CONFIGURED: {
    title: 'Delete unavailable',
    detail: 'The deletion service is not configured for this environment.',
  },
  DELETE_FAILED: {
    title: 'Delete failed',
    detail: 'The share could not be removed from the server right now.',
  },
  UNEXPECTED_ERROR: {
    title: 'Unexpected delete error',
    detail: 'An unexpected issue occurred while deleting this share.',
  },
}
