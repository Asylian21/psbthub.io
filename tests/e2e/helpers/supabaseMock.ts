/**
 * Playwright request-layer mock for Supabase REST endpoints.
 *
 * Simulates insert/fetch/delete flows in-memory to keep e2e tests deterministic
 * and independent from external infrastructure.
 */
import type { Page, Route } from '@playwright/test'

interface ShareRow {
  id: string
  ciphertext_payload: string
  delete_token_hash: string
  size_bytes: number
  version: number
  created_at: string
  expires_at: string | null
}

interface JsonResponseOptions {
  status?: number
  body: unknown
}

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info,prefer',
}
const SHARE_ID_PATTERN = /^[A-Za-z0-9]{22}$/
const DELETE_TOKEN_HASH_PATTERN = /^[0-9a-f]{64}$/

function getRequestPathname(route: Route): string {
  const requestUrl = new URL(route.request().url())
  return requestUrl.pathname
}

function getRequestUrl(route: Route): URL {
  return new URL(route.request().url())
}

async function fulfillJson(
  route: Route,
  options: JsonResponseOptions,
): Promise<void> {
  await route.fulfill({
    status: options.status ?? 200,
    headers: CORS_HEADERS,
    contentType: 'application/json',
    body: JSON.stringify(options.body),
  })
}

function readPostBody(route: Route): unknown {
  const raw = route.request().postData()

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function normalizeRpcPayload(rawPayload: unknown): Record<string, unknown> | null {
  if (Array.isArray(rawPayload)) {
    const [firstPayload] = rawPayload
    if (firstPayload && typeof firstPayload === 'object') {
      return firstPayload as Record<string, unknown>
    }
    return null
  }

  if (!rawPayload || typeof rawPayload !== 'object') {
    return null
  }

  return rawPayload as Record<string, unknown>
}

function mapCreateRpcPayloadToShareRow(payload: Record<string, unknown>): ShareRow | null {
  if (
    typeof payload.input_id !== 'string' ||
    typeof payload.input_ciphertext_payload !== 'string' ||
    typeof payload.input_delete_token_hash !== 'string' ||
    typeof payload.input_size_bytes !== 'number' ||
    typeof payload.input_version !== 'number'
  ) {
    return null
  }

  const normalizedShareId = payload.input_id.trim()

  if (!normalizedShareId || !SHARE_ID_PATTERN.test(normalizedShareId)) {
    return null
  }

  const normalizedDeleteTokenHash = payload.input_delete_token_hash.trim().toLowerCase()

  if (!DELETE_TOKEN_HASH_PATTERN.test(normalizedDeleteTokenHash)) {
    return null
  }

  return {
    id: normalizedShareId,
    ciphertext_payload: payload.input_ciphertext_payload,
    delete_token_hash: normalizedDeleteTokenHash,
    size_bytes: payload.input_size_bytes,
    version: payload.input_version,
    created_at: new Date().toISOString(),
    expires_at: typeof payload.input_expires_at === 'string' ? payload.input_expires_at : null,
  }
}

function parseShareIdFromQuery(url: URL): string | null {
  const idFilter = url.searchParams.get('id')

  if (!idFilter || !idFilter.startsWith('eq.')) {
    return null
  }

  const shareId = idFilter.slice(3).trim()
  return shareId || null
}

function isShareRowActive(row: ShareRow): boolean {
  if (!row.expires_at) {
    return true
  }

  const expiresAtTimestamp = new Date(row.expires_at).getTime()

  if (!Number.isFinite(expiresAtTimestamp)) {
    return false
  }

  return expiresAtTimestamp > Date.now()
}

export async function installSupabaseMock(page: Page): Promise<void> {
  const shares = new Map<string, ShareRow>()

  await page.route('**/rest/v1/**', async (route) => {
    const method = route.request().method().toUpperCase()
    const pathname = getRequestPathname(route)
    const requestUrl = getRequestUrl(route)

    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: CORS_HEADERS,
      })
      return
    }

    if (pathname.endsWith('/rest/v1/rpc/create_psbt_share') && method === 'POST') {
      const rawPayload = readPostBody(route)
      const normalizedPayload = normalizeRpcPayload(rawPayload)
      const row = normalizedPayload ? mapCreateRpcPayloadToShareRow(normalizedPayload) : null

      if (!row) {
        await fulfillJson(route, {
          status: 400,
          body: {
            message: 'Invalid create share RPC payload',
          },
        })
        return
      }

      shares.set(row.id, row)
      await fulfillJson(route, {
        body: row,
      })
      return
    }

    if (pathname.endsWith('/rest/v1/psbt_shares') && method === 'GET') {
      const shareId = parseShareIdFromQuery(requestUrl)
      const row = shareId ? shares.get(shareId) ?? null : null
      const activeRow = row && isShareRowActive(row) ? row : null
      await fulfillJson(route, {
        body: activeRow,
      })
      return
    }

    if (pathname.endsWith('/rest/v1/rpc/delete_psbt_share_by_id') && method === 'POST') {
      const body = readPostBody(route)
      const bodyRecord =
        body && typeof body === 'object' ? (body as Record<string, unknown>) : null
      const inputShareId =
        bodyRecord && typeof bodyRecord.input_share_id === 'string'
          ? bodyRecord.input_share_id.trim()
          : ''
      const inputDeleteTokenHash =
        bodyRecord && typeof bodyRecord.input_delete_token_hash === 'string'
          ? bodyRecord.input_delete_token_hash.trim().toLowerCase()
          : ''
      const storedShareRow = inputShareId ? shares.get(inputShareId) ?? null : null
      const deleted =
        !!storedShareRow &&
        DELETE_TOKEN_HASH_PATTERN.test(inputDeleteTokenHash) &&
        storedShareRow.delete_token_hash === inputDeleteTokenHash

      if (deleted) {
        shares.delete(inputShareId)
      }

      await fulfillJson(route, {
        body: deleted,
      })
      return
    }

    await route.continue()
  })
}
