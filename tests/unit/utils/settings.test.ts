/**
 * Unit coverage for shared settings constants and formatting helpers.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { APP_MAX_PSBT_BYTES, formatByteSize } from '../../../src/utils/settings'

describe('settings utils', () => {
  it('exports 1 MiB PSBT max size', () => {
    expect(APP_MAX_PSBT_BYTES).toBe(1024 * 1024)
  })

  it('formats byte sizes by unit boundaries', () => {
    expect(formatByteSize(1024 * 1024)).toBe('1 MiB')
    expect(formatByteSize(64 * 1024)).toBe('64 KiB')
    expect(formatByteSize(123)).toBe('123 bytes')
  })

  it('keeps DB size limit migration aligned with app constant', () => {
    const testFilePath = fileURLToPath(import.meta.url)
    const testDirectoryPath = dirname(testFilePath)
    const migrationPath = resolve(
      testDirectoryPath,
      '../../../supabase/migrations/0005_align_psbt_size_limit_1mib.sql',
    )
    const migrationSql = readFileSync(migrationPath, 'utf8')
    const limitMatch = migrationSql.match(/size_bytes\s*<=\s*(\d+)/i)

    expect(limitMatch).toBeTruthy()
    expect(Number(limitMatch?.[1])).toBe(APP_MAX_PSBT_BYTES)
  })
})
