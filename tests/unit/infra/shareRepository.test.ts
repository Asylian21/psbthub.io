/**
 * Unit coverage for repository query mapping and error translation.
 */
import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createShareRepository } from '../../../src/infra/repositories/shareRepository'

interface QueryResult {
  data: unknown
  error: unknown
}

function createMockClient(options: {
  createResult?: QueryResult
  fetchResult?: QueryResult
  deleteResult?: QueryResult
}): SupabaseClient {
  const createResult = options.createResult ?? { data: null, error: null }
  const fetchResult = options.fetchResult ?? { data: null, error: null }
  const deleteResult = options.deleteResult ?? { data: true, error: null }

  const client = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(fetchResult),
        }),
      }),
    }),
    rpc: vi.fn((rpcName: string) => {
      if (rpcName === 'create_psbt_share') {
        return Promise.resolve(createResult)
      }

      if (rpcName === 'delete_psbt_share_by_id') {
        return Promise.resolve(deleteResult)
      }

      return Promise.resolve({
        data: null,
        error: new Error('Unexpected RPC function call.'),
      })
    }),
  }

  return client as unknown as SupabaseClient
}

describe('shareRepository', () => {
  const validDeleteTokenHash = 'a'.repeat(64)

  it('returns SUPABASE_NOT_CONFIGURED when client is missing', async () => {
    const repository = createShareRepository(null)
    const result = await repository.insertShare({
      id: 'id',
      ciphertextPayload: 'cipher',
      deleteTokenHash: validDeleteTokenHash,
      sizeBytes: 10,
      version: 1,
      expiresAt: null,
    })

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'SUPABASE_NOT_CONFIGURED',
        }),
      }),
    )
  })

  it('inserts and maps a share row', async () => {
    const repository = createShareRepository(
      createMockClient({
        createResult: {
          data: {
            id: 'share-id',
            ciphertext_payload: 'ciphertext',
            size_bytes: 1234,
            version: 1,
            created_at: '2026-02-14T00:00:00.000Z',
            expires_at: null,
          },
          error: null,
        },
      }),
    )

    const result = await repository.insertShare({
      id: 'share-id',
      ciphertextPayload: 'ciphertext',
      deleteTokenHash: validDeleteTokenHash,
      sizeBytes: 1234,
      version: 1,
      expiresAt: null,
    })

    expect(result).toEqual({
      ok: true,
      value: {
        id: 'share-id',
        ciphertextPayload: 'ciphertext',
        sizeBytes: 1234,
        version: 1,
        createdAt: '2026-02-14T00:00:00.000Z',
        expiresAt: null,
      },
    })
  })

  it('maps create RPC row arrays returned by PostgREST', async () => {
    const repository = createShareRepository(
      createMockClient({
        createResult: {
          data: [
            {
              id: 'share-id',
              ciphertext_payload: 'ciphertext',
              size_bytes: 1234,
              version: 1,
              created_at: '2026-02-14T00:00:00.000Z',
              expires_at: null,
            },
          ],
          error: null,
        },
      }),
    )

    const result = await repository.insertShare({
      id: 'share-id',
      ciphertextPayload: 'ciphertext',
      deleteTokenHash: validDeleteTokenHash,
      sizeBytes: 1234,
      version: 1,
      expiresAt: null,
    })

    expect(result).toEqual({
      ok: true,
      value: {
        id: 'share-id',
        ciphertextPayload: 'ciphertext',
        sizeBytes: 1234,
        version: 1,
        createdAt: '2026-02-14T00:00:00.000Z',
        expiresAt: null,
      },
    })
  })

  it('maps server throttling RPC errors to RATE_LIMITED', async () => {
    const repository = createShareRepository(
      createMockClient({
        createResult: {
          data: null,
          error: {
            code: 'PSBTHUB_RATE_LIMITED',
            message: 'Too many share creation requests from this IP.',
          },
        },
      }),
    )

    const result = await repository.insertShare({
      id: 'share-id',
      ciphertextPayload: 'ciphertext',
      deleteTokenHash: validDeleteTokenHash,
      sizeBytes: 1234,
      version: 1,
      expiresAt: null,
    })

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'RATE_LIMITED',
        }),
      }),
    )
  })

  it('fetches a share by id and returns null when missing', async () => {
    const repository = createShareRepository(
      createMockClient({
        fetchResult: {
          data: null,
          error: null,
        },
      }),
    )

    const result = await repository.getShareById('missing')

    expect(result).toEqual({
      ok: true,
      value: null,
    })
  })

  it('returns invalid data error on malformed row', async () => {
    const repository = createShareRepository(
      createMockClient({
        fetchResult: {
          data: {
            bad: true,
          },
          error: null,
        },
      }),
    )

    const result = await repository.getShareById('id')

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_DATA',
        }),
      }),
    )
  })

  it('deletes share by rpc and maps boolean response', async () => {
    const repository = createShareRepository(
      createMockClient({
        deleteResult: {
          data: true,
          error: null,
        },
      }),
    )

    const result = await repository.deleteShareById(' share-id ', validDeleteTokenHash.toUpperCase())

    expect(result).toEqual({
      ok: true,
      value: true,
    })
  })

  it('returns invalid capability error when delete token hash is malformed', async () => {
    const repository = createShareRepository(createMockClient({}))

    const result = await repository.deleteShareById('share-id', 'bad-hash')

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_DELETE_CAPABILITY',
        }),
      }),
    )
  })
})
