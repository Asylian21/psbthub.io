export const LANDING_FOOTER_GITHUB_URL = 'https://github.com/Asylian21'
export const LANDING_FOOTER_X_URL = 'https://x.com/Asylian21'
export const LANDING_SCROLL_TOP_SHOW_OFFSET = 180

export type RoadmapStatusTone = 'live' | 'in-progress' | 'planned'

export interface RoadmapPhaseContent {
  phase: string
  period: string
  title: string
  description: string
  highlights: readonly string[]
  statusLabel: string
  statusTone: RoadmapStatusTone
  icon: string
}

export const LANDING_TIMELINE_PHASES: RoadmapPhaseContent[] = [
  {
    phase: 'Phase 1',
    period: 'Live',
    title: 'Encrypted PSBT Relay',
    description:
      'A minimalist PSBT bridge for signers: encrypt locally, share safely, decrypt locally.',
    highlights: [
      'Two handoff modes: one-link fragment key or split-channel password',
      'Auto-expire and purge (UTC) with optional manual deletion',
      'Import + export: paste, file, QR scan; copy, .psbt, QR export',
    ],
    statusLabel: 'Live',
    statusTone: 'live',
    icon: 'pi-check-circle',
  },
  {
    phase: 'Phase 2',
    period: 'Building',
    title: 'PSBT Inspector',
    description:
      'Make every handoff verifiable with human-readable transaction intent before you sign.',
    highlights: [
      'Transaction summary: inputs, outputs, fee, locktime, finalize state',
      'Diff-friendly views and copy-safe export formats',
      'Clear "verify in your wallet" prompts at every step',
    ],
    statusLabel: 'In Progress',
    statusTone: 'in-progress',
    icon: 'pi-sync',
  },
  {
    phase: 'Phase 3',
    period: 'Planned',
    title: 'Device Handoff',
    description:
      'Move PSBTs between devices with less friction, built for real multisig workflows.',
    highlights: [
      'Animated / multipart QR for larger PSBTs (airgapped-friendly)',
      'Local device handoff helpers (LAN / BLE where feasible)',
      'Hardware wallets direct transports experiments for smoother signing rounds',
    ],
    statusLabel: 'Planned',
    statusTone: 'planned',
    icon: 'pi-shield',
  },
  {
    phase: 'Phase 4',
    period: 'Planned',
    title: 'Multisig Coordination Layer',
    description:
      'Optional coordination metadata for multi-round signing without accounts or custody.',
    highlights: [
      'Signer round tracking and "who has it now" clarity',
      'Optional policy guardrails to reduce footguns before signing',
      'Interoperable exports for existing coordinators and wallet tooling',
    ],
    statusLabel: 'Planned',
    statusTone: 'planned',
    icon: 'pi-sitemap',
  },
]

export interface LandingTrustItemContent {
  icon: string
  label: string
}

export const LANDING_TRUST_ITEMS: LandingTrustItemContent[] = [
  {
    icon: 'pi pi-lock',
    label: 'Client-Side Encryption',
  },
  {
    icon: 'pi pi-eye-slash',
    label: 'Ciphertext-Only Server',
  },
  {
    icon: 'pi pi-shield',
    label: 'Signer Sovereignty',
  },
]

export interface LandingHowItWorksStepContent {
  number: string
  title: string
  description: string
}

export const LANDING_HOW_IT_WORKS_STEPS: LandingHowItWorksStepContent[] = [
  {
    number: '01',
    title: 'Load the PSBT',
    description:
      'Paste base64 or hex, import a .psbt file, or scan a QR code. PSBTHub validates locally before encrypting.',
  },
  {
    number: '02',
    title: 'Encrypt and Generate Link',
    description:
      'Choose one-link mode or split-channel password mode. Encryption happens locally with AES-GCM, then a share URL is created.',
  },
  {
    number: '03',
    title: 'Share and Verify',
    description:
      'Send the share URL (and password if used) to the next signer. Each signer decrypts locally, then verifies and signs in their own wallet.',
  },
]

export interface LandingSecurityFeatureContent {
  icon: string
  title: string
  description: string
}

export const LANDING_SECURITY_FEATURES: LandingSecurityFeatureContent[] = [
  {
    icon: 'pi pi-lock',
    title: 'Client-Side Encryption',
    description:
      'AES-GCM encryption with fresh random IV per share. Your PSBT is encrypted before it ever leaves your device.',
  },
  {
    icon: 'pi pi-server',
    title: 'Ciphertext-Only Storage',
    description:
      'The server stores encrypted payload and minimal metadata only - no plaintext and no decryption material. Shares expire automatically (max 31 days) and are purged server-side.',
  },
  {
    icon: 'pi pi-link',
    title: 'Flexible Key Delivery',
    description:
      'In one-link mode, the decryption key lives in the URL fragment (#k=...) and is not sent to the server. In password mode, the URL stays clean and the secret is shared out-of-band.',
  },
  {
    icon: 'pi pi-ban',
    title: 'Signer-Owned Keys',
    description:
      'Private keys and signatures never leave signer wallets. PSBTHub transports encrypted PSBTs only - it does not sign or broadcast transactions.',
  },
]

export const LANDING_PRIMARY_QUOTE = "Don't trust. Verify."
export const LANDING_PRIMARY_QUOTE_CITE = 'Bitcoin community maxim'
export const LANDING_SECONDARY_QUOTE =
  "The root problem with conventional currency is all the trust that's required to make it work."
export const LANDING_SECONDARY_QUOTE_CITE = 'Satoshi Nakamoto'
