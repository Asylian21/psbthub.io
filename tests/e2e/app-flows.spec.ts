/**
 * End-to-end browser coverage for core user journeys:
 * landing navigation, fragment-mode share, and password-mode share.
 */
import { expect, test, type Page } from '@playwright/test'
import { createSamplePsbtBase64 } from '../shared/psbtFixture'
import { installSupabaseMock } from './helpers/supabaseMock'

const SAMPLE_PSBT_BASE64 = createSamplePsbtBase64()
const VALID_TEST_SHARE_ID = 'AAAAAAAAAAAAAAAAAAAAAA'
const EXPIRED_TEST_SHARE_ID = 'BBBBBBBBBBBBBBBBBBBBBB'
const DUMMY_DELETE_TOKEN_HASH = 'a'.repeat(64)

test.beforeEach(async ({ page }) => {
  await installSupabaseMock(page)
})

test('ships restrictive CSP policy meta tag', async ({ page }) => {
  await page.goto('/')

  const cspMeta = page.locator('meta[http-equiv="Content-Security-Policy"]')
  await expect(cspMeta).toHaveCount(1)

  const cspContent = await cspMeta.getAttribute('content')
  expect(cspContent).toContain("default-src 'self'")
  expect(cspContent).toContain("script-src 'self'")
  expect(cspContent).toContain("connect-src 'self' https://*.supabase.co")
  expect(cspContent).toContain("object-src 'none'")
  expect(cspContent).toContain("frame-ancestors 'none'")
})

test('ships foundational SEO metadata and crawler directives', async ({
  page,
  request,
}) => {
  await page.goto('/')

  await expect(page).toHaveTitle('PSBTHub | Encrypted PSBT Relay for Bitcoin Multisig')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /end-to-end encrypted PSBT relay/i,
  )
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /index, follow/i,
  )
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://psbthub.io/',
  )
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    /Encrypted PSBT Relay/i,
  )
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  )

  const robotsResponse = await request.get('/robots.txt')
  expect(robotsResponse.ok()).toBe(true)
  const robotsText = await robotsResponse.text()
  expect(robotsText).toContain('Disallow: /app')
  expect(robotsText).toContain('Disallow: /p/')
  expect(robotsText).toContain('Sitemap: https://psbthub.io/sitemap.xml')

  const sitemapResponse = await request.get('/sitemap.xml')
  expect(sitemapResponse.ok()).toBe(true)
  const sitemapXml = await sitemapResponse.text()
  expect(sitemapXml).toContain('<loc>https://psbthub.io/</loc>')
})

async function fillPsbtTextInput(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Paste base64 / hex' }).click()
  const psbtInput = page.locator('#psbt-input')
  await expect(psbtInput).toBeVisible()
  await psbtInput.fill(SAMPLE_PSBT_BASE64)
}

async function ensureSecurityStepExpanded(page: Page): Promise<void> {
  const expandStepButton = page.getByRole('button', { name: 'Expand Step 2' })
  if (await expandStepButton.isVisible()) {
    await expandStepButton.click()
  }
}

async function switchToOneLinkModeAndAcknowledge(page: Page): Promise<void> {
  await ensureSecurityStepExpanded(page)
  await page.locator('.security-mode-card', { hasText: 'One-link handoff' }).click()
  await page
    .getByLabel(/I understand this mode is not recommended on shared devices/i)
    .check()
}

async function createFragmentShareAndGetUrl(page: Page): Promise<string> {
  await page.goto('/app')
  await fillPsbtTextInput(page)
  await switchToOneLinkModeAndAcknowledge(page)

  const uploadButton = page.getByRole('button', { name: 'Encrypt + copy share link' })
  await expect(uploadButton).toBeEnabled()
  await uploadButton.click()
  await expect(page.getByText('Share link ready')).toBeVisible()

  const shareUrl = await page.locator('.share-success-link').getAttribute('href')
  expect(shareUrl).toBeTruthy()
  return shareUrl ?? '/'
}

async function seedExpiredShare(page: Page, shareId: string): Promise<void> {
  await page.evaluate(
    async ({
      seededShareId,
      deleteTokenHash,
    }: {
      seededShareId: string
      deleteTokenHash: string
    }) => {
      const expiresAtPast = new Date(Date.now() - 60_000).toISOString()
      await fetch('/rest/v1/rpc/create_psbt_share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_id: seededShareId,
          input_ciphertext_payload: '{"version":1}',
          input_delete_token_hash: deleteTokenHash,
          input_size_bytes: 512,
          input_version: 1,
          input_expires_at: expiresAtPast,
        }),
      })
    },
    {
      seededShareId: shareId,
      deleteTokenHash: DUMMY_DELETE_TOKEN_HASH,
    },
  )
}

test('navigates from landing page to app', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Hand Off PSBTs Between Signers,' }),
  ).toBeVisible()
  await expect(
    page.getByText(/neutral bridge between Sparrow, Caravan, Specter/i),
  ).toBeVisible()

  await page.locator('a[href="/app"]').first().click()
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByText('Create encrypted PSBT link')).toBeVisible()
})

test('defaults to password mode with generated password', async ({ page }) => {
  await page.goto('/app')
  await fillPsbtTextInput(page)
  await ensureSecurityStepExpanded(page)

  await expect(
    page.locator('.security-mode-card', { hasText: 'Link + password' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Decryption password input')).not.toHaveValue('')
})

test('requires explicit acknowledgement in one-link mode', async ({ page }) => {
  await page.goto('/app')
  await fillPsbtTextInput(page)
  await ensureSecurityStepExpanded(page)

  await page.locator('.security-mode-card', { hasText: 'One-link handoff' }).click()
  const uploadButton = page.getByRole('button', { name: 'Encrypt + copy share link' })
  await expect(uploadButton).toBeDisabled()

  await page
    .getByLabel(/I understand this mode is not recommended on shared devices/i)
    .check()
  await expect(uploadButton).toBeEnabled()
})

test('creates and opens a fragment-key share', async ({ page }) => {
  const shareUrl = await createFragmentShareAndGetUrl(page)
  expect(shareUrl).toContain('#k=')

  await page.goto(shareUrl)

  await expect(page.getByRole('heading', { name: 'Decrypt PSBT share' })).toBeVisible()
  await expect(page.getByText('Decryption successful')).toBeVisible()
  await expect(page.locator('#decrypted-psbt')).toContainText(
    SAMPLE_PSBT_BASE64.slice(0, 16),
  )
})

test('creates a password share and decrypts with password', async ({ page }) => {
  await page.goto('/app')
  await fillPsbtTextInput(page)
  await ensureSecurityStepExpanded(page)
  await page.locator('.security-mode-card', { hasText: 'Link + password' }).click()

  const passwordInput = page.getByLabel('Decryption password input')
  await expect(passwordInput).not.toHaveValue('')

  const uploadButton = page.getByRole('button', { name: 'Encrypt + copy share link' })
  await expect(uploadButton).toBeEnabled()
  await uploadButton.click()

  await expect(page.getByText('Share link ready')).toBeVisible()

  const shareUrl = await page.locator('.share-success-link').getAttribute('href')
  const password = await page.locator('.share-success-password-value').textContent()
  expect(shareUrl).toBeTruthy()
  expect(password).toBeTruthy()
  expect(shareUrl).not.toContain('#k=')

  await page.goto(shareUrl ?? '/')

  await expect(page.getByText('Password-protected share')).toBeVisible()
  await page.getByLabel('Share decryption password').fill('WrongPassword#2027')
  await page.getByRole('button', { name: 'Decrypt with password' }).click()
  await expect(
    page.getByText('Password is incorrect or does not match this share.'),
  ).toBeVisible()

  await page.getByLabel('Share decryption password').fill(password ?? '')
  await page.getByRole('button', { name: 'Decrypt with password' }).click()
  await expect(page.getByText('Decryption successful')).toBeVisible()
})

test('manually deletes a decrypted share', async ({ page }) => {
  const shareUrl = await createFragmentShareAndGetUrl(page)

  await page.goto(shareUrl)
  await expect(page.getByText('Decryption successful')).toBeVisible()
  await page.getByRole('button', { name: 'Delete share now' }).click()
  await page.getByRole('button', { name: 'Yes, delete now' }).click()

  await expect(page.getByText('Share deleted from server')).toBeVisible()
  await expect(page).toHaveURL(/\/app$/)
})

test('shows unavailable state for missing shares', async ({ page }) => {
  await page.goto(`/p/${VALID_TEST_SHARE_ID}`)
  await expect(page.getByText('Share not available')).toBeVisible()
})

test('shows unavailable state for expired shares', async ({ page }) => {
  await page.goto('/app')
  await seedExpiredShare(page, EXPIRED_TEST_SHARE_ID)
  await page.goto(`/p/${EXPIRED_TEST_SHARE_ID}`)
  await expect(page.getByText('Share not available')).toBeVisible()
})
