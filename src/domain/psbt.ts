/**
 * PSBT domain module.
 *
 * Provides normalization, validation, parsing, and lightweight transaction
 * preview utilities for base64/hex/text payload inputs.
 */
import { Psbt, Transaction } from 'bitcoinjs-lib'
import { APP_MAX_PSBT_BYTES } from '../utils/settings'
import { base64ToBytes, bytesToBase64 } from '../utils/encoding'
import { isRecord } from '../utils/typeGuards'

export { base64ToBytes, bytesToBase64 }

export const DEFAULT_MAX_PSBT_BYTES = APP_MAX_PSBT_BYTES

export type PsbtValidationErrorCode =
  | 'EMPTY_INPUT'
  | 'INVALID_BASE64'
  | 'INVALID_HEX'
  | 'INVALID_BASE64_OR_HEX'
  | 'PSBT_TOO_LARGE'
  | 'INVALID_PSBT'

export interface PsbtValidationError {
  kind: 'psbt_validation_error'
  code: PsbtValidationErrorCode
  message: string
}

export interface ValidatedPsbt {
  base64: string
  bytes: Uint8Array
  byteLength: number
}

export type PsbtValidationResult =
  | {
    ok: true
    value: ValidatedPsbt
  }
  | {
    ok: false
    error: PsbtValidationError
  }

export interface PsbtTransactionInputPreview {
  coinbase: boolean
  txid: string
  output: number
  sigscript: string
  sequence: number
  witness: string[]
}

export interface PsbtTransactionOutputPreview {
  value: number
  scriptpubkey: string
  address: string | null
}

export interface PsbtTransactionPreview {
  txid: string
  size: number
  vsize: number
  weight: number
  version: number
  locktime: number
  fee: number | null
  finalized: boolean
  inputs: PsbtTransactionInputPreview[]
  outputs: PsbtTransactionOutputPreview[]
}

export type PsbtTransactionPreviewResult =
  | {
    ok: true
    value: PsbtTransactionPreview
  }
  | {
    ok: false
    error: PsbtValidationError
  }

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/
const HEX_PATTERN = /^[0-9a-fA-F]+$/
const PSBT_JSON_KEY_CANDIDATES = new Set<string>([
  'psbt',
  'psbtbase64',
  'psbthex',
  'base64',
  'hex',
])

function normalizeBase64Input(input: string): string {
  return input.trim().replace(/\s+/g, '')
}

function normalizeHexInput(input: string): string {
  const compact = input.trim().replace(/[\s+]+/g, '')
  return compact.toLowerCase().startsWith('0x') ? compact.slice(2) : compact
}

function decodeURIComponentSafely(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function extractPsbtCandidateFromQueryLikeValue(queryLikeValue: string): string {
  const entries = queryLikeValue.split('&')

  for (const entry of entries) {
    if (!entry) {
      continue
    }

    const separatorIndex = entry.indexOf('=')
    const rawKey = separatorIndex >= 0 ? entry.slice(0, separatorIndex) : entry
    const rawValue = separatorIndex >= 0 ? entry.slice(separatorIndex + 1) : ''
    const decodedKey = decodeURIComponentSafely(rawKey).trim().toLowerCase()

    if (decodedKey !== 'psbt') {
      continue
    }

    return decodeURIComponentSafely(rawValue)
  }

  return ''
}

function extractPsbtCandidateFromStringInput(input: string): string {
  const normalizedInput = input.trim()

  if (!normalizedInput) {
    return ''
  }

  const normalizedLower = normalizedInput.toLowerCase()

  if (normalizedLower.startsWith('psbt:')) {
    return normalizeBase64Input(normalizedInput.slice(5))
  }

  const queryStartIndex = normalizedInput.indexOf('?')
  const queryLikeValue =
    queryStartIndex >= 0
      ? normalizedInput.slice(queryStartIndex + 1)
      : normalizedInput
  const psbtQueryValue = extractPsbtCandidateFromQueryLikeValue(queryLikeValue)

  if (psbtQueryValue) {
    return normalizeBase64Input(psbtQueryValue)
  }

  if (normalizedLower.startsWith('psbt=')) {
    const normalizedPrefixedValue = decodeURIComponentSafely(normalizedInput.slice('psbt='.length))
    return normalizeBase64Input(normalizedPrefixedValue)
  }

  return normalizeBase64Input(normalizedInput)
}

function normalizeJsonKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function extractPsbtCandidateFromJsonValue(
  value: unknown,
  depth: number = 0,
): string {
  if (depth > 8) {
    return ''
  }

  if (typeof value === 'string') {
    return extractPsbtCandidateFromStringInput(value)
  }

  if (Array.isArray(value)) {
    for (const nestedValue of value) {
      const candidate = extractPsbtCandidateFromJsonValue(
        nestedValue,
        depth + 1,
      )
      if (candidate) {
        return candidate
      }
    }
    return ''
  }

  if (!isRecord(value)) {
    return ''
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = normalizeJsonKey(key)
    if (
      PSBT_JSON_KEY_CANDIDATES.has(normalizedKey) ||
      normalizedKey.includes('psbt')
    ) {
      const candidate = extractPsbtCandidateFromJsonValue(
        nestedValue,
        depth + 1,
      )
      if (candidate) {
        return candidate
      }
    }
  }

  for (const nestedValue of Object.values(value)) {
    if (typeof nestedValue !== 'object' || nestedValue === null) {
      continue
    }
    const candidate = extractPsbtCandidateFromJsonValue(
      nestedValue,
      depth + 1,
    )
    if (candidate) {
      return candidate
    }
  }

  return ''
}

function extractPsbtCandidateFromJsonInput(input: string): string {
  const normalizedInput = input.trim()

  if (
    !normalizedInput.startsWith('{') &&
    !normalizedInput.startsWith('[')
  ) {
    return ''
  }

  try {
    const parsedJson = JSON.parse(normalizedInput) as unknown
    return extractPsbtCandidateFromJsonValue(parsedJson)
  } catch {
    return ''
  }
}

function extractPsbtCandidate(input: string): string {
  const jsonCandidate = extractPsbtCandidateFromJsonInput(input)

  if (jsonCandidate) {
    return jsonCandidate
  }

  return extractPsbtCandidateFromStringInput(input)
}

function createValidationError(
  code: PsbtValidationErrorCode,
  message: string,
): Extract<PsbtValidationResult, { ok: false }> {
  return {
    ok: false,
    error: {
      kind: 'psbt_validation_error',
      code,
      message,
    },
  }
}

function isBase64ShapeValid(value: string): boolean {
  if (value.length === 0 || value.length % 4 !== 0) {
    return false
  }

  return BASE64_PATTERN.test(value)
}

function isHexShapeValid(value: string): boolean {
  if (value.length === 0 || value.length % 2 !== 0) {
    return false
  }

  return HEX_PATTERN.test(value)
}

function bytesToHex(bytes: Uint8Array): string {
  let output = ''

  for (const byte of bytes) {
    output += byte.toString(16).padStart(2, '0')
  }

  return output
}

function toReversedHex(bytes: Uint8Array): string {
  const reversed = new Uint8Array(bytes.byteLength)

  for (let sourceIndex = 0; sourceIndex < bytes.byteLength; sourceIndex += 1) {
    const targetIndex = bytes.byteLength - sourceIndex - 1
    const sourceByte = bytes[sourceIndex]

    if (typeof sourceByte === 'undefined') {
      continue
    }

    reversed[targetIndex] = sourceByte
  }

  return bytesToHex(reversed)
}

function toSafeSatoshiNumber(value: bigint): number | null {
  const maxSafeInteger = BigInt(Number.MAX_SAFE_INTEGER)

  if (value > maxSafeInteger) {
    return null
  }

  return Number(value)
}

function resolveDisplayTransaction(psbt: Psbt): {
  transaction: Transaction
  finalized: boolean
} {
  try {
    return {
      transaction: psbt.extractTransaction(true),
      finalized: true,
    }
  } catch {
    const unsignedTransaction = new Transaction()
    unsignedTransaction.version = psbt.version
    unsignedTransaction.locktime = psbt.locktime

    for (const input of psbt.txInputs) {
      unsignedTransaction.addInput(input.hash, input.index, input.sequence)
    }

    for (const output of psbt.txOutputs) {
      unsignedTransaction.addOutput(output.script, output.value)
    }

    return {
      transaction: unsignedTransaction,
      finalized: false,
    }
  }
}

function resolveFeeSats(psbt: Psbt): number | null {
  try {
    const fee = psbt.getFee()
    return toSafeSatoshiNumber(fee)
  } catch {
    return null
  }
}

/**
 * Converts hex text into bytes.
 */
export function hexToBytes(hex: string): Uint8Array {
  const output = new Uint8Array(hex.length / 2)

  for (let index = 0; index < hex.length; index += 2) {
    output[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16)
  }

  return output
}

/**
 * Validates PSBT payload represented as base64.
 */
export function validatePsbtBase64(
  input: string,
  maxBytes: number = DEFAULT_MAX_PSBT_BYTES,
): PsbtValidationResult {
  const normalized = normalizeBase64Input(input)

  if (!normalized) {
    return createValidationError('EMPTY_INPUT', 'PSBT input is empty.')
  }

  if (!isBase64ShapeValid(normalized)) {
    return createValidationError(
      'INVALID_BASE64',
      'PSBT must be a valid base64 string.',
    )
  }

  let psbtBytes: Uint8Array

  try {
    psbtBytes = base64ToBytes(normalized)
  } catch {
    return createValidationError(
      'INVALID_BASE64',
      'PSBT must be a valid base64 string.',
    )
  }

  if (psbtBytes.byteLength > maxBytes) {
    return createValidationError(
      'PSBT_TOO_LARGE',
      `PSBT is larger than ${maxBytes} bytes.`,
    )
  }

  try {
    Psbt.fromBase64(normalized)
  } catch {
    return createValidationError(
      'INVALID_PSBT',
      'PSBT payload could not be parsed.',
    )
  }

  return {
    ok: true,
    value: {
      base64: normalized,
      bytes: psbtBytes,
      byteLength: psbtBytes.byteLength,
    },
  }
}

/**
 * Validates PSBT payload represented as hex.
 */
export function validatePsbtHex(
  input: string,
  maxBytes: number = DEFAULT_MAX_PSBT_BYTES,
): PsbtValidationResult {
  const normalized = normalizeHexInput(input)

  if (!normalized) {
    return createValidationError('EMPTY_INPUT', 'PSBT input is empty.')
  }

  if (!isHexShapeValid(normalized)) {
    return createValidationError(
      'INVALID_HEX',
      'PSBT must be a valid hex string.',
    )
  }

  const hexByteLength = normalized.length / 2

  if (hexByteLength > maxBytes) {
    return createValidationError(
      'PSBT_TOO_LARGE',
      `PSBT is larger than ${maxBytes} bytes.`,
    )
  }

  return validatePsbtBytes(hexToBytes(normalized), maxBytes)
}

/**
 * Validates free-form text payload and extracts PSBT candidate (base64/hex/JSON/query).
 */
export function validatePsbtPayloadText(
  input: string,
  maxBytes: number = DEFAULT_MAX_PSBT_BYTES,
): PsbtValidationResult {
  const candidate = extractPsbtCandidate(input)
  const normalizedCandidate = candidate.trim()

  if (!normalizedCandidate) {
    return createValidationError('EMPTY_INPUT', 'PSBT input is empty.')
  }

  const base64Validation = validatePsbtBase64(normalizedCandidate, maxBytes)

  if (base64Validation.ok) {
    return base64Validation
  }

  const hexValidation = validatePsbtHex(normalizedCandidate, maxBytes)

  if (hexValidation.ok) {
    return hexValidation
  }

  if (
    base64Validation.error.code === 'PSBT_TOO_LARGE' ||
    hexValidation.error.code === 'PSBT_TOO_LARGE'
  ) {
    return createValidationError(
      'PSBT_TOO_LARGE',
      `PSBT is larger than ${maxBytes} bytes.`,
    )
  }

  if (
    base64Validation.error.code === 'INVALID_PSBT' ||
    hexValidation.error.code === 'INVALID_PSBT'
  ) {
    return createValidationError(
      'INVALID_PSBT',
      'PSBT payload could not be parsed.',
    )
  }

  return createValidationError(
    'INVALID_BASE64_OR_HEX',
    'PSBT must be a valid base64 or hex string.',
  )
}

/**
 * Validates raw byte payload as a PSBT and returns normalized base64 representation.
 */
export function validatePsbtBytes(
  inputBytes: Uint8Array,
  maxBytes: number = DEFAULT_MAX_PSBT_BYTES,
): PsbtValidationResult {
  if (inputBytes.byteLength === 0) {
    return createValidationError('EMPTY_INPUT', 'PSBT input is empty.')
  }

  if (inputBytes.byteLength > maxBytes) {
    return createValidationError(
      'PSBT_TOO_LARGE',
      `PSBT is larger than ${maxBytes} bytes.`,
    )
  }

  const copiedBytes = new Uint8Array(inputBytes.byteLength)
  copiedBytes.set(inputBytes)
  const normalizedBase64 = bytesToBase64(copiedBytes)

  try {
    Psbt.fromBase64(normalizedBase64)
  } catch {
    return createValidationError(
      'INVALID_PSBT',
      'PSBT payload could not be parsed.',
    )
  }

  return {
    ok: true,
    value: {
      base64: normalizedBase64,
      bytes: copiedBytes,
      byteLength: copiedBytes.byteLength,
    },
  }
}

/**
 * Decodes a PSBT into a signer-friendly transaction preview object.
 */
export function decodePsbtTransactionPreview(
  input: string,
  maxBytes: number = DEFAULT_MAX_PSBT_BYTES,
): PsbtTransactionPreviewResult {
  const validationResult = validatePsbtBase64(input, maxBytes)

  if (!validationResult.ok) {
    return validationResult
  }

  try {
    const psbt = Psbt.fromBase64(validationResult.value.base64)
    const { transaction, finalized } = resolveDisplayTransaction(psbt)
    const inputs: PsbtTransactionInputPreview[] = []
    const outputs: PsbtTransactionOutputPreview[] = []

    for (let index = 0; index < psbt.txInputs.length; index += 1) {
      const psbtInput = psbt.txInputs[index]

      if (typeof psbtInput === 'undefined') {
        continue
      }

      const transactionInput = transaction.ins[index]
      const inputState = psbt.data.inputs[index]
      const scriptSource =
        transactionInput && transactionInput.script.byteLength > 0
          ? transactionInput.script
          : inputState?.finalScriptSig ?? new Uint8Array(0)

      const witnessChunks =
        transactionInput && transactionInput.witness.length > 0
          ? transactionInput.witness.map((witnessChunk) =>
            bytesToHex(witnessChunk),
          )
          : []

      inputs.push({
        coinbase: Transaction.isCoinbaseHash(psbtInput.hash),
        txid: toReversedHex(psbtInput.hash),
        output: psbtInput.index,
        sigscript: bytesToHex(scriptSource),
        sequence:
          transactionInput?.sequence ??
          psbtInput.sequence ??
          Transaction.DEFAULT_SEQUENCE,
        witness: witnessChunks,
      })
    }

    for (const output of psbt.txOutputs) {
      const outputValue = toSafeSatoshiNumber(output.value)

      if (outputValue === null) {
        return createValidationError(
          'INVALID_PSBT',
          'PSBT payload contains values outside supported range.',
        )
      }

      outputs.push({
        value: outputValue,
        scriptpubkey: bytesToHex(output.script),
        address: typeof output.address === 'string' ? output.address : null,
      })
    }

    return {
      ok: true,
      value: {
        txid: transaction.getId(),
        size: transaction.byteLength(),
        vsize: transaction.virtualSize(),
        weight: transaction.weight(),
        version: transaction.version,
        locktime: transaction.locktime,
        fee: resolveFeeSats(psbt),
        finalized,
        inputs,
        outputs,
      },
    }
  } catch {
    return createValidationError(
      'INVALID_PSBT',
      'PSBT payload could not be parsed.',
    )
  }
}

/**
 * Convenience predicate for quick base64 PSBT validity checks.
 */
export function isValidPsbtBase64(input: string): boolean {
  return validatePsbtBase64(input).ok
}
