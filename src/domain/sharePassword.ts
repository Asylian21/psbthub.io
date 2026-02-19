/**
 * Share password domain module.
 *
 * Includes normalization, validation, strength assessment,
 * and secure random password generation for password-protected shares.
 */
import { randomIntegerInRange } from '../utils/random'
import { getWebCrypto } from '../utils/webCrypto'

const PASSWORD_GENERATION_MIN_LENGTH = 8
const PASSWORD_GENERATION_MAX_LENGTH = 128
const DEFAULT_GENERATED_PASSWORD_LENGTH = 24
const PASSWORD_UPPERCASE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const PASSWORD_LOWERCASE_ALPHABET = 'abcdefghijkmnopqrstuvwxyz'
const PASSWORD_DIGIT_ALPHABET = '23456789'
const PASSWORD_SYMBOL_ALPHABET = '!@#$%&*+=?_-'
const PASSWORD_ALPHABET = `${PASSWORD_UPPERCASE_ALPHABET}${PASSWORD_LOWERCASE_ALPHABET}${PASSWORD_DIGIT_ALPHABET}${PASSWORD_SYMBOL_ALPHABET}`

export type SharePasswordStrengthLevel =
  | 'very_weak'
  | 'weak'
  | 'fair'
  | 'strong'
  | 'very_strong'

export type SharePasswordErrorCode = 'INVALID_PASSWORD' | 'WEB_CRYPTO_UNAVAILABLE'

export interface SharePasswordError {
  kind: 'share_password_error'
  code: SharePasswordErrorCode
  message: string
}

export type SharePasswordResult<T> =
  | {
      ok: true
      value: T
    }
  | {
      ok: false
      error: SharePasswordError
    }

export interface SharePasswordStrengthSignals {
  length: number
  hasLowercase: boolean
  hasUppercase: boolean
  hasDigit: boolean
  hasSymbol: boolean
  hasSequentialPattern: boolean
  hasLongRepeatedRun: boolean
}

export interface SharePasswordStrengthAssessment {
  score: number
  level: SharePasswordStrengthLevel
  label: string
  guidance: string
  signals: SharePasswordStrengthSignals
}

function createSharePasswordError(
  code: SharePasswordErrorCode,
  message: string,
): SharePasswordResult<never> {
  return {
    ok: false,
    error: {
      kind: 'share_password_error',
      code,
      message,
    },
  }
}

function pickRandomCharacter(alphabet: string, cryptoApi: Crypto): string {
  const alphabetIndex = randomIntegerInRange(0, alphabet.length - 1, cryptoApi)
  return alphabet[alphabetIndex] ?? alphabet[0] ?? 'a'
}

function shuffleCharactersInPlace(characters: string[], cryptoApi: Crypto): void {
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIntegerInRange(0, index, cryptoApi)
    const currentValue = characters[index]
    const swapValue = characters[swapIndex]

    if (typeof currentValue === 'undefined' || typeof swapValue === 'undefined') {
      continue
    }

    characters[index] = swapValue
    characters[swapIndex] = currentValue
  }
}

export function normalizeSharePassword(rawPassword: string): string {
  return rawPassword.trim()
}

/**
 * Validates password input used for password-protected share mode.
 *
 * Strength checks are advisory and intentionally non-blocking.
 */
export function validateSharePassword(rawPassword: string): SharePasswordResult<string> {
  const password = normalizeSharePassword(rawPassword)

  if (!password) {
    return createSharePasswordError(
      'INVALID_PASSWORD',
      'Password is required.',
    )
  }

  return {
    ok: true,
    value: password,
  }
}

function clampScore(rawScore: number): number {
  if (rawScore < 0) {
    return 0
  }

  if (rawScore > 100) {
    return 100
  }

  return rawScore
}

function countSequentialPatterns(password: string): number {
  let count = 0

  for (let index = 0; index <= password.length - 3; index += 1) {
    const first = password.charCodeAt(index)
    const second = password.charCodeAt(index + 1)
    const third = password.charCodeAt(index + 2)

    if (second - first === 1 && third - second === 1) {
      count += 1
    }
  }

  return count
}

function longestRepeatedRun(password: string): number {
  if (!password) {
    return 0
  }

  let longestRun = 1
  let currentRun = 1

  for (let index = 1; index < password.length; index += 1) {
    if (password[index] === password[index - 1]) {
      currentRun += 1
      longestRun = Math.max(longestRun, currentRun)
    } else {
      currentRun = 1
    }
  }

  return longestRun
}

function toStrengthLevel(score: number): {
  level: SharePasswordStrengthLevel
  label: string
  guidance: string
} {
  if (score >= 85) {
    return {
      level: 'very_strong',
      label: 'Very strong',
      guidance: 'Excellent resistance against guessing and brute-force attempts.',
    }
  }

  if (score >= 70) {
    return {
      level: 'strong',
      label: 'Strong',
      guidance: 'Strong for most handoffs. A longer passphrase still improves resilience.',
    }
  }

  if (score >= 50) {
    return {
      level: 'fair',
      label: 'Fair',
      guidance: 'Decent baseline. Add more length or character variety for stronger protection.',
    }
  }

  if (score >= 30) {
    return {
      level: 'weak',
      label: 'Weak',
      guidance: 'Easy to guess. Increase length and avoid predictable patterns.',
    }
  }

  return {
    level: 'very_weak',
    label: 'Very weak',
    guidance: 'Very easy to crack. Prefer a long passphrase with mixed characters.',
  }
}

/**
 * Computes advisory password strength score and signal breakdown.
 */
export function assessSharePasswordStrength(
  rawPassword: string,
): SharePasswordStrengthAssessment {
  const password = normalizeSharePassword(rawPassword)

  if (!password) {
    return {
      score: 0,
      level: 'very_weak',
      label: 'No password',
      guidance: 'Add a password to see a live strength estimate.',
      signals: {
        length: 0,
        hasLowercase: false,
        hasUppercase: false,
        hasDigit: false,
        hasSymbol: false,
        hasSequentialPattern: false,
        hasLongRepeatedRun: false,
      },
    }
  }

  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)
  const uniqueCharacters = new Set(password).size
  const sequentialPatterns = countSequentialPatterns(password.toLowerCase())
  const repeatedRun = longestRepeatedRun(password)

  let score = 0
  score += Math.min(password.length * 3, 45)
  score += hasLowercase ? 8 : 0
  score += hasUppercase ? 8 : 0
  score += hasDigit ? 8 : 0
  score += hasSymbol ? 8 : 0
  score += Math.min(Math.max(uniqueCharacters - 6, 0) * 2, 15)
  score += password.length >= 16 ? 8 : 0
  score += password.length >= 24 ? 6 : 0
  score -= password.length < 8 ? 10 : 0
  score -= Math.min(sequentialPatterns * 6, 18)
  score -= repeatedRun > 2 ? Math.min((repeatedRun - 2) * 6, 18) : 0
  score -= uniqueCharacters <= Math.ceil(password.length / 3) ? 10 : 0

  const normalizedScore = clampScore(score)
  const strength = toStrengthLevel(normalizedScore)

  return {
    score: normalizedScore,
    level: strength.level,
    label: strength.label,
    guidance: strength.guidance,
    signals: {
      length: password.length,
      hasLowercase,
      hasUppercase,
      hasDigit,
      hasSymbol,
      hasSequentialPattern: sequentialPatterns > 0,
      hasLongRepeatedRun: repeatedRun > 2,
    },
  }
}

/**
 * Generates a random password with guaranteed character-class diversity.
 */
export function generateSharePassword(
  length: number = DEFAULT_GENERATED_PASSWORD_LENGTH,
): SharePasswordResult<string> {
  if (
    !Number.isInteger(length) ||
    length < PASSWORD_GENERATION_MIN_LENGTH ||
    length > PASSWORD_GENERATION_MAX_LENGTH
  ) {
    return createSharePasswordError(
      'INVALID_PASSWORD',
      `Generated password length must be between ${PASSWORD_GENERATION_MIN_LENGTH} and ${PASSWORD_GENERATION_MAX_LENGTH}.`,
    )
  }

  const cryptoApi = getWebCrypto()

  if (!cryptoApi) {
    return createSharePasswordError(
      'WEB_CRYPTO_UNAVAILABLE',
      'WebCrypto API is not available in this environment.',
    )
  }

  // Guarantee minimum diversity for generated passwords.
  const generatedCharacters: string[] = [
    pickRandomCharacter(PASSWORD_UPPERCASE_ALPHABET, cryptoApi),
    pickRandomCharacter(PASSWORD_LOWERCASE_ALPHABET, cryptoApi),
    pickRandomCharacter(PASSWORD_DIGIT_ALPHABET, cryptoApi),
    pickRandomCharacter(PASSWORD_SYMBOL_ALPHABET, cryptoApi),
  ]

  for (let index = generatedCharacters.length; index < length; index += 1) {
    generatedCharacters.push(pickRandomCharacter(PASSWORD_ALPHABET, cryptoApi))
  }

  shuffleCharactersInPlace(generatedCharacters, cryptoApi)

  return {
    ok: true,
    value: generatedCharacters.join(''),
  }
}
