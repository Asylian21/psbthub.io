# Test Coverage Matrix

This document enumerates the functional surface of PSBTHub and maps each part to automated tests.

## Coverage layers

- **Unit tests (`vitest`)** validate pure/domain logic, state mapping, and repository orchestration.
- **Browser E2E (`playwright`)** validates real user click flows in Chromium with mocked Supabase REST endpoints.
- **CI workflow (`.github/workflows/tests.yml`)** runs typecheck + unit + e2e on every pull request and push to `main`.

## Functional inventory and test mapping

| Area                                    | Functional parts                                                                                                                                                                                                                                                         | Test files                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `domain/crypto.ts`                      | `createPasswordKeyDerivation()`, `deriveShareKeyFromPassword()`, `isPasswordProtectedEnvelope()`, `generateShareKeyBytes()`, `encodeShareKeyForFragment()`, `decodeShareKeyFromFragment()`, `encryptBytes()`, `decryptBytes()`, `serializeEnvelope()`, `parseEnvelope()` | `tests/unit/domain/crypto.test.ts`              |
| `domain/psbt.ts`                        | `base64ToBytes()`, `bytesToBase64()`, `hexToBytes()`, `validatePsbtBase64()`, `validatePsbtHex()`, `validatePsbtPayloadText()`, `validatePsbtBytes()`, `decodePsbtTransactionPreview()`, `isValidPsbtBase64()`                                                           | `tests/unit/domain/psbt.test.ts`                |
| `domain/sharePayload.ts`                | `encodeSharePayload()`, `decodeSharePayload()`, `createObfuscatedSizeBytes()`                                                                                                                                                                                            | `tests/unit/domain/sharePayload.test.ts`        |
| `domain/shareDeleteCapability.ts`       | `generateShareDeleteCapabilityToken()`, `hashShareDeleteCapabilityToken()`, token/hash validation helpers                                                                                                                                                                | `tests/unit/domain/shareDeleteCapability.test.ts` |
| `domain/sharePassword.ts`               | `normalizeSharePassword()`, `validateSharePassword()`, `assessSharePasswordStrength()`, `generateSharePassword()`                                                                                                                                                        | `tests/unit/domain/sharePassword.test.ts`       |
| `domain/shareExpiry.ts`                 | `createShareExpiryBounds()`, `createDefaultShareExpiryDate()`, `resolveShareExpiry()`                                                                                                                                                                                    | `tests/unit/domain/shareExpiry.test.ts`         |
| `utils/encoding.ts`                     | `base64` / `byte` conversion helpers                                                                                                                                                                                                                                      | `tests/unit/utils/encoding.test.ts`             |
| `utils/typeGuards.ts`                   | structural runtime guards (record checks)                                                                                                                                                                                                                                 | `tests/unit/utils/typeGuards.test.ts`           |
| `utils/webCrypto.ts`                    | environment-specific WebCrypto accessor                                                                                                                                                                                                                                   | `tests/unit/utils/webCrypto.test.ts`            |
| `utils/random.ts`                       | secure integer sampling bounds and randomness behavior                                                                                                                                                                                                                    | `tests/unit/utils/random.test.ts`               |
| `utils/settings.ts`                     | `formatByteSize()` and size constants                                                                                                                                                                                                                                    | `tests/unit/utils/settings.test.ts`             |
| `utils/theme.ts`                        | `initializeThemeMode()`, `updateThemeMode()`                                                                                                                                                                                                                             | `tests/unit/utils/theme.test.ts`                |
| `utils/shareCreationRateLimit.ts`       | browser-side rate-limit state evaluation, timestamp pruning, and attempt recording                                                                                                                                                                                       | `tests/unit/utils/shareCreationRateLimit.test.ts` |
| `utils/fileDownload.ts`                 | `downloadBlobFile()`, `downloadDataUrlFile()`                                                                                                                                                                                                                            | `tests/unit/utils/fileDownload.test.ts`         |
| `utils/qr.ts`                           | `scanQrImageFile()`, `generateQrPngDataUrl()`                                                                                                                                                                                                                            | `tests/unit/utils/qr.test.ts`                   |
| `composables/usePsbtDisplay.ts`         | payload mode switching, binary truncation hint, expansion state                                                                                                                                                                                                          | `tests/unit/composables/usePsbtDisplay.test.ts` |
| `composables/useQrCamera.ts`            | camera support handling, start/stop, duplicate scan suppression, error mapping                                                                                                                                                                                           | `tests/unit/composables/useQrCamera.test.ts`    |
| `composables/home/useHomeImport.ts`     | file import extraction and parse orchestration for `.psbt` / `.txt` inputs                                                                                                                                                                                              | `tests/unit/composables/home/useHomeImport.test.ts` |
| `composables/home/useHomeExpiryDateMode.ts` | local/UTC picker conversion helpers for expiry UX                                                                                                                                                                                                                     | `tests/unit/composables/home/useHomeExpiryDateMode.test.ts` |
| `composables/home/useStepCollapseTransition.ts` | transition hook behavior for animated collapsible steps                                                                                                                                                                                                           | `tests/unit/composables/home/useStepCollapseTransition.test.ts` |
| `composables/home/useHomeSecurityMode.ts` | default password-mode behavior, one-link acknowledgement gating, and security-mode reset handling                                                                                                                                                                      | `tests/unit/composables/home/useHomeSecurityMode.test.ts` |
| `composables/share/useSharePayloadFormats.ts` | QR/export payload formatting for base64/hex/binary/json display modes                                                                                                                                                                                            | `tests/unit/composables/share/useSharePayloadFormats.test.ts` |
| `composables/shared/useFooterVisibility.ts` | footer visibility behavior based on viewport/scroll state                                                                                                                                                                                                           | `tests/unit/composables/shared/useFooterVisibility.test.ts` |
| `composables/shared/useScrollVisibility.ts` | generic scroll visibility primitives                                                                                                                                                                                                                                 | `tests/unit/composables/shared/useScrollVisibility.test.ts` |
| `composables/shared/useCountdownTicker.ts` | reactive countdown tick lifecycle behavior                                                                                                                                                                                                                           | `tests/unit/composables/shared/useCountdownTicker.test.ts` |
| `composables/useUpload.ts`              | upload validation, security mode handling, encryption flow state mapping, repository error mapping                                                                                                                                                                       | `tests/unit/composables/useUpload.test.ts`      |
| `composables/useFetch.ts`               | fetch/decrypt flow (fragment and password), delete flow, error state mapping                                                                                                                                                                                             | `tests/unit/composables/useFetch.test.ts`       |
| `infra/repositories/shareRepository.ts` | insert/get/delete mapping and error handling                                                                                                                                                                                                                             | `tests/unit/infra/shareRepository.test.ts`      |
| `infra/supabaseClient.ts`               | configured vs non-configured client initialization                                                                                                                                                                                                                       | `tests/unit/infra/supabaseClient.test.ts`       |
| `infra/observability/errorMonitoring.ts` | error payload sanitization and monitoring payload shaping                                                                                                                                                                                                                 | `tests/unit/infra/errorMonitoring.test.ts`      |
| `stores/app.ts`                         | theme init/set/toggle actions                                                                                                                                                                                                                                            | `tests/unit/stores/app.test.ts`                 |

## Browser click coverage

`tests/e2e/app-flows.spec.ts` covers:

- Landing page navigation to app.
- Default **password mode** selection with generated password.
- One-link mode risk acknowledgement gate (mandatory checkbox before generation).
- Upload flow in **URL fragment mode** (create share, open share, decrypt success).
- Upload flow in **password mode** (create share, incorrect password, correct password).
- Manual server-side share deletion flow after successful decryption.
- Missing/expired share rendering (`Share not available` state).

`tests/e2e/helpers/supabaseMock.ts` provides deterministic REST endpoint mocking for:

- Share create RPC (`POST /rest/v1/rpc/create_psbt_share`)
- Share fetch (`GET /rest/v1/psbt_shares?id=eq...`)
- Manual delete RPC (`POST /rest/v1/rpc/delete_psbt_share_by_id`)

## Commands

- Unit tests with coverage: `npm run test:unit`
- Browser end-to-end tests: `npm run test:e2e`
- Full suite: `npm run test`
