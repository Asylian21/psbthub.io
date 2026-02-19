/**
 * Repository abstraction for `psbt_shares`.
 *
 * Centralizes Supabase CRUD/RPC calls and normalizes all outcomes into
 * strongly typed repository results.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../supabaseClient'
import { isRecord } from '../../utils/typeGuards'
import { isValidShareDeleteCapabilityHash } from '../../domain/shareDeleteCapability'

const SHARE_TABLE = 'psbt_shares'
const SHARE_COLUMNS = 'id,ciphertext_payload,size_bytes,version,created_at,expires_at'
const DELETE_SHARE_RPC = 'delete_psbt_share_by_id'
const CREATE_SHARE_RPC = 'create_psbt_share'

export interface ShareRecord {
  id: string
  ciphertextPayload: string
  sizeBytes: number
  version: number
  createdAt: string
  expiresAt: string | null
}

export interface CreateShareInput {
  id: string
  ciphertextPayload: string
  deleteTokenHash: string
  sizeBytes: number
  version: number
  expiresAt: string | null
}

type ShareRow = {
  id: string
  ciphertext_payload: string
  size_bytes: number
  version: number
  created_at: string
  expires_at: string | null
}

export type ShareRepositoryErrorCode =
  | 'SUPABASE_NOT_CONFIGURED'
  | 'RATE_LIMITED'
  | 'INSERT_FAILED'
  | 'FETCH_FAILED'
  | 'DELETE_FAILED'
  | 'INVALID_DELETE_CAPABILITY'
  | 'INVALID_DATA'

export interface ShareRepositoryError {
  kind: 'share_repository_error'
  code: ShareRepositoryErrorCode
  message: string
}

export type ShareRepositoryResult<T> =
  | {
      ok: true
      value: T
    }
  | {
      ok: false
      error: ShareRepositoryError
    }

export interface ShareRepository {
  insertShare(input: CreateShareInput): Promise<ShareRepositoryResult<ShareRecord>>
  getShareById(shareId: string): Promise<ShareRepositoryResult<ShareRecord | null>>
  deleteShareById(shareId: string, deleteTokenHash: string): Promise<ShareRepositoryResult<boolean>>
}

function createRepositoryError(
  code: ShareRepositoryErrorCode,
  message: string,
): ShareRepositoryResult<never> {
  return {
    ok: false,
    error: {
      kind: 'share_repository_error',
      code,
      message,
    },
  }
}

function isShareRow(value: unknown): value is ShareRow {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.ciphertext_payload === 'string' &&
    typeof value.size_bytes === 'number' &&
    typeof value.version === 'number' &&
    typeof value.created_at === 'string' &&
    (typeof value.expires_at === 'string' || value.expires_at === null)
  )
}

function isRateLimitedInsertError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false
  }

  if (error.code === 'PSBTHUB_RATE_LIMITED') {
    return true
  }

  return (
    typeof error.message === 'string' &&
    error.message.toLowerCase().includes('too many share creation requests')
  )
}

function mapRowToShareRecord(row: ShareRow): ShareRecord {
  return {
    id: row.id,
    ciphertextPayload: row.ciphertext_payload,
    sizeBytes: row.size_bytes,
    version: row.version,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }
}

function ensureClient(client: SupabaseClient | null): ShareRepositoryResult<SupabaseClient> {
  if (!client) {
    return createRepositoryError(
      'SUPABASE_NOT_CONFIGURED',
      'Supabase environment variables are not configured.',
    )
  }

  return {
    ok: true,
    value: client,
  }
}

export function createShareRepository(
  providedClient: SupabaseClient | null = getSupabaseClient(),
): ShareRepository {
  return {
    /**
     * Inserts a new encrypted share row and returns the canonical persisted shape.
     */
    async insertShare(input: CreateShareInput): Promise<ShareRepositoryResult<ShareRecord>> {
      const clientResult = ensureClient(providedClient)

      if (!clientResult.ok) {
        return clientResult
      }

      const normalizedDeleteTokenHash = input.deleteTokenHash.trim().toLowerCase()

      if (!isValidShareDeleteCapabilityHash(normalizedDeleteTokenHash)) {
        return createRepositoryError(
          'INVALID_DELETE_CAPABILITY',
          'Share delete capability hash has an invalid format.',
        )
      }

      const { data, error } = await clientResult.value.rpc(CREATE_SHARE_RPC, {
        input_id: input.id,
        input_ciphertext_payload: input.ciphertextPayload,
        input_delete_token_hash: normalizedDeleteTokenHash,
        input_size_bytes: input.sizeBytes,
        input_version: input.version,
        input_expires_at: input.expiresAt,
      })

      if (error) {
        if (isRateLimitedInsertError(error)) {
          return createRepositoryError(
            'RATE_LIMITED',
            'Too many share creation requests in a short time. Please retry in about one minute.',
          )
        }

        return createRepositoryError(
          'INSERT_FAILED',
          'Unable to store encrypted PSBT payload.',
        )
      }

      const rowCandidate = Array.isArray(data) ? data[0] : data

      if (!isShareRow(rowCandidate)) {
        return createRepositoryError(
          'INVALID_DATA',
          'Stored share payload response has an invalid shape.',
        )
      }

      return {
        ok: true,
        value: mapRowToShareRecord(rowCandidate),
      }
    },

    async getShareById(
      shareId: string,
    ): Promise<ShareRepositoryResult<ShareRecord | null>> {
      const clientResult = ensureClient(providedClient)

      if (!clientResult.ok) {
        return clientResult
      }

      const { data, error } = await clientResult.value
        .from(SHARE_TABLE)
        .select(SHARE_COLUMNS)
        .eq('id', shareId)
        .maybeSingle()

      if (error) {
        return createRepositoryError(
          'FETCH_FAILED',
          'Unable to fetch encrypted PSBT payload.',
        )
      }

      if (!data) {
        return {
          ok: true,
          value: null,
        }
      }

      if (!isShareRow(data)) {
        return createRepositoryError(
          'INVALID_DATA',
          'Fetched share payload response has an invalid shape.',
        )
      }

      return {
        ok: true,
        value: mapRowToShareRecord(data),
      }
    },

    async deleteShareById(
      shareId: string,
      deleteTokenHash: string,
    ): Promise<ShareRepositoryResult<boolean>> {
      // Manual deletion uses a dedicated RPC function so the policy surface remains explicit.
      const clientResult = ensureClient(providedClient)

      if (!clientResult.ok) {
        return clientResult
      }

      const normalizedShareId = shareId.trim()
      const normalizedDeleteTokenHash = deleteTokenHash.trim().toLowerCase()

      if (!isValidShareDeleteCapabilityHash(normalizedDeleteTokenHash)) {
        return createRepositoryError(
          'INVALID_DELETE_CAPABILITY',
          'Share delete capability hash has an invalid format.',
        )
      }

      const { data, error } = await clientResult.value.rpc(DELETE_SHARE_RPC, {
        input_share_id: normalizedShareId,
        input_delete_token_hash: normalizedDeleteTokenHash,
      })

      if (error) {
        return createRepositoryError(
          'DELETE_FAILED',
          'Unable to delete shared PSBT payload.',
        )
      }

      if (typeof data !== 'boolean') {
        return createRepositoryError(
          'INVALID_DATA',
          'Delete share response has an invalid shape.',
        )
      }

      return {
        ok: true,
        value: data,
      }
    },
  }
}
