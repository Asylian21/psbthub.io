import type { ShareSecurityMode } from '../composables/useUpload'

export interface ShareSecurityOptionContent {
  title: string
  subtitle: string
  icon: string
  capabilityTag: string
  primaryBenefit: string
  tradeoff: string
  usageHint: string
  value: ShareSecurityMode
}

export const HOME_SHARE_SECURITY_MODE_OPTIONS: ShareSecurityOptionContent[] = [
  {
    title: 'Link + password',
    subtitle: 'Recommended default',
    icon: 'pi pi-key',
    capabilityTag: 'Two pieces',
    primaryBenefit: 'Send the URL and password via separate channels.',
    tradeoff: 'Recipient must enter the password to decrypt.',
    usageHint: 'Best when the share URL might travel through a less trusted channel.',
    value: 'password',
  },
  {
    title: 'One-link handoff',
    subtitle: 'Fastest for multisig rounds',
    icon: 'pi pi-link',
    capabilityTag: 'Single link',
    primaryBenefit: 'Recipient opens the link and decrypts instantly.',
    tradeoff: 'Anyone with the full link can decrypt. Treat it like a secret.',
    usageHint: 'Use only for trusted private channels and non-shared devices.',
    value: 'link_fragment',
  },
]

export const HOME_MAX_QR_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024

export const HOME_SHARE_EXPIRY_TAG_PT = {
  root: {
    class: 'share-expiry-tag-pill',
    style:
      'height: 2.75rem !important; min-height: 2.75rem !important; max-height: 2.75rem !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; box-sizing: border-box !important; padding: 0 0.62rem !important; line-height: 1 !important;',
  },
  label: {
    class: 'share-expiry-tag-pill-label',
    style:
      'display: inline-flex !important; align-items: center !important; height: 100% !important; line-height: 1 !important;',
  },
} as const
