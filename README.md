# ⚡️ PSBTHub

**PSBTHub is an end-to-end encrypted PSBT relay for Bitcoin signers.** Built for secure, minimalist multisig handoffs. Your PSBT is encrypted exclusively on the client side — the server stores ciphertext only and never sees the transaction.

---

## 🚀 Quick Overview

- **Import a PSBT.**
- **Encrypt locally** and generate a share link.
- **Send it** to the next signer (optionally with a separate password).
- **Done.**

**No accounts. No custody. No private keys. No signing. No broadcasting.**

---

## 📖 About the Project

PSBTHub is a minimalist service designed for securely sharing **Partially Signed Bitcoin Transactions (PSBTs)** between signers.

The goal is to eliminate the need to send PSBTs via Telegram, email, or random file-hosting services and replace that process with a simple, encrypted link. The service operates purely as a coordination layer.

---

## ⚙️ How It Works (Current MVP)

1. 📥 **Upload:** The user uploads a PSBT.
2. 📦 **Wrap:** The client wraps the PSBT in a JSON payload (`data` + random `decoy`) to mask the exact size.
3. 🔒 **Encrypt:** The payload is encrypted entirely on the client side using AES-GCM.
4. ☁️ **Store:** The server stores *only* the encrypted content.
5. 🔗 **Share:** A sharing link is generated:
   - **One-link mode:** Decryption key is in the URL fragment (`#k=...`), never sent to the server.
   - **Password mode:** URL contains only the share ID; key derived locally via PBKDF2 from a separate password.
6. 🔓 **Decrypt:** The recipient opens the link and decrypts the PSBT locally in their browser.
7. 📤 **Export:** The recipient exports the PSBT (copy, file, or QR) to verify/sign in their own wallet.

---

## 🎯 MVP Scope

### ✅ In Scope
- Import PSBT (base64 or hex) with format validation and size limits.
- Import via paste, file (`.psbt` / `.txt`), or QR scan (camera or image).
- AES-GCM encryption on the client with a fresh random IV per share.
- Encrypted plaintext uses a JSON wrapper with random decoy padding.
- Storage of ciphertext payload and minimal metadata only.
- Sharing link in the form `/p/:id` (short alphanumeric high-entropy token).
- One-link fragment key delivery (`/p/:id#k=...`).
- Split-channel password delivery (PBKDF2 salt + iterations stored with the envelope).
- Automatic expiration enforcement (max 31 days) and server-side purge.
- Optional manual deletion by share ID.
- Export: copy, download `.psbt`, download `.txt`, single-image QR export.

### ❌ Out of Scope
- User accounts / auth onboarding.
- Transaction broadcast.
- Custody functionality or handling of private keys.
- Real-time notifications and collaborative workflows.

---

## 🛡️ Security Model

- **Client-Side Only:** Encryption happens exclusively on the client side.
- **Blind Server:** The server *never* sees the decryption key and cannot read, modify, or sign the transaction.
- **No Keys:** PSBTHub has absolutely no access to private keys.

---

## 🧠 Philosophy

**Minimum trust. Minimum features. Maximum simplicity.**

The first version has no accounts and no fees. The goal is to build a clean tool that solves a specific problem without unnecessary complexity.

---

## 🛠️ Technology Stack

Built primarily on the modern Vue ecosystem:
- **Frontend:** Vue.js, TypeScript, Pinia, Vue Router, Tailwind CSS v4, PrimeVue.
- **Bitcoin Layer:** Native libraries for PSBT/transaction handling.
- **Cryptography:** WebCrypto API for secure client-side operations.
- **Backend:** Supabase (database, API layer).

---

## 🧪 Testing & Automation

Robust automated testing ensures stability:
- `npm run test:unit` - Vitest unit suite with coverage.
- `npm run test:e2e` - Playwright browser click tests (Chromium).
- `npm run typecheck` - Strict TypeScript validation.

CI workflows run all checks on pull requests and pushes to `main`.

---

## 🙏 Acknowledgments

Built with respect for the Bitcoin ecosystem and inspired by:

- Satoshi Nakamoto and the Bitcoin protocol
- The cypherpunk movement
- Open-source cryptography researchers
- The Bitcoin developer community

<br>

<div align="center">
  <b>Made with ❤️ by Asylion21 (David Zita)</b><br>
  <i>Building tools for Bitcoin's next century</i>
</div>

<br>

---

## ₿ Support This Project

If you find this work valuable, consider supporting development. Every satoshi helps fund continued research and development of Bitcoin security tools.

**Bitcoin Address (Taproot):**
```text
bc1pram4xzetxjuskgawwfp70esdhu4atmdpwp5c07fvk2357n0lyrhstkygfm
```

[Follow on GitHub](https://github.com/Asylian21)
