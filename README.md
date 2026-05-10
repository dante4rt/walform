# Walform

**Forms with proof. Responses with privacy.**

A Walrus-native feedback protocol where every form is a Sui NFT and every response is a private, verifiable Walrus blob encrypted via Seal.

Built for the [Walrus Sessions 2 hackathon](https://www.deepsurge.xyz/hackathons/c2c48b38-33a7-405c-922b-a3be2ad25158) — Tools Builder Activation track. Deployed to **Sui mainnet** + **Walrus Sites**.

> [!TIP]
> Live demo: **[walform.vercel.app](https://walform.vercel.app)** · Submit a response: **[demo form](https://walform.vercel.app/f/0x2b8583bf5963f00cc8fc3e7feec2fa482ac89db495160e5efb487b71c6a5eb70)**

---

## Why Walform

Web2 form tools own your responses. Web3 form tools (Formo, BlockSurvey, Deform) are SaaS endpoints with crypto branding. Walform is an on-chain protocol.

| Property         | Web2 forms            | Web3 SaaS             | **Walform**                   |
| ---------------- | --------------------- | --------------------- | ----------------------------- |
| Response storage | Their database        | Their database        | Walrus blobs                  |
| Encryption       | TLS in transit        | TLS in transit        | Seal threshold, end-to-end    |
| Decryption audit | Internal admin tables | Internal admin tables | On-chain Sui events           |
| Form ownership   | Account, revocable    | Account, revocable    | Sui NFT, transferable         |
| Composable reads | None                  | None                  | Move view fns (count, rating) |
| Bounty escrow    | Off-platform          | Off-platform          | On-chain WAL escrow           |

## Features

- **8 field types** — rich text, dropdown, checkbox, star rating, screenshot, video, URL, confirmation
- **4 Seal access policies** — open, token-gated, allowlist, time-locked decrypt
- **Composable Move view fns** — `count_responses`, `aggregate_rating`, `verify_response` (no signing, no gas)
- **Walrus quilts** — batch responses into one storage unit, ~99% cheaper than individual blobs
- **Bounty escrow** — Form NFT holds WAL; severity-tiered payouts (low/medium/high/critical) on approval
- **Soulbound receipts** — submitters get an SBT for cross-dApp reputation
- **Offline-first PWA** — drafts autosave to IndexedDB, encrypted with AES-GCM
- **Admin dashboard** — triage, encrypted notes, severity tags, status workflow, CSV/JSON export

## Live Mainnet Deployment

| Resource           | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| Move package       | `0xb90d18321d8c4652743a7c0ae0747b4723e7dedb954d5844c48b3bd44a715c4d` |
| Demo form NFT      | `0x2b8583bf5963f00cc8fc3e7feec2fa482ac89db495160e5efb487b71c6a5eb70` |
| Schema blob        | `BPrNHx-qZgMWc_1Tw9v7LvNevFYDlzLV4k42LLQa1To`                        |
| Walrus Site object | `0xa9eab76b446ce4c56261fd757f41c18fb95bbcfaae511141fba425f9ceedd8bc` |
| Site URL           | https://walform.vercel.app                                           |

## Quickstart

> [!IMPORTANT]
> Requires Node 20 (`.nvmrc`), pnpm 9.12.0, and (for contract work) the [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install).

```bash
git clone https://github.com/dante4rt/walform
cd walform
pnpm install
pnpm dev
```

Open http://localhost:3000. Connect a Sui wallet (mainnet). Click **Create** to build a form, or open the [live demo](https://walform.vercel.app/f/0x2b8583bf5963f00cc8fc3e7feec2fa482ac89db495160e5efb487b71c6a5eb70).

### Common commands

```bash
pnpm dev              # Start the web app
pnpm build            # Build all packages
pnpm typecheck        # Recursive tsc --noEmit
pnpm lint             # Recursive ESLint
pnpm test             # Run web app + package tests
pnpm move:build       # Compile Move package
pnpm move:test        # Run Move test suite
pnpm deploy:contracts # Publish to mainnet (requires sui CLI on mainnet)
pnpm seed:demo        # Seed the demo form
pnpm deploy:site      # Build + publish Walrus Site
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Form Builder   │───▶│  Walrus (schema) │    │  Sui (Form NFT) │
│  (Next.js PWA)  │    └──────────────────┘    │    Move 2024    │
└────────┬────────┘                            └────────▲────────┘
         │ submit                                       │
         ▼                                              │ ResponseRef
┌─────────────────┐    ┌──────────────────┐             │
│  Seal encrypt   │───▶│  Walrus blob     │─────────────┘
│  (client-side)  │    │  (response data) │
└─────────────────┘    └──────────────────┘
```

**Write path.** Builder produces a Zod-validated `WalformSchema`. Schema uploads to Walrus → blob ID becomes `schema_blob_id` arg to `walform::form::create_form`. Submitter fills form → response encrypts via Seal threshold → uploads to Walrus → `walform::form::submit_response` registers the blob ref on the Form NFT. Optional bounty payout + soulbound receipt mint in the same tx.

**Read path.** Owner reads Form NFT via Sui RPC → traverses `Table<u64, ResponseRef>` dynamic fields → decrypts each blob via Seal (must satisfy the form's policy module). Public stats (`count_responses`, `aggregate_rating`) callable via `devInspectTransactionBlock` with no signing.

### Workspace layout

| Path                 | Purpose                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `apps/web`           | Next.js 16 + React 19 + Tailwind v4 PWA. Static-exported. All Sui/Walrus/Seal glue in `apps/web/lib/`. |
| `packages/contracts` | Move 2024 package `walform` — `form`, `form_factory`, `bounty`, `receipt`, `events`, 4 Seal policies   |
| `packages/shared`    | Zod schemas, TS types, canonical `NETWORK_PACKAGE_IDS`, `DEFAULT_POLICY_MODULES`                       |
| `packages/sdk`       | Thin TS layer re-exporting `WalformClient`                                                             |
| `scripts`            | tsx deploy/seed scripts                                                                                |

## Tech Stack

Sui · Walrus · Seal · Walrus Sites · Move 2024 · Next.js 16 · React 19 · TypeScript · Tailwind v4 · Vitest · Foundry-style Move tests

## Security

> [!CAUTION]
> Walform handles encrypted user data. The threat model and key lifecycle matter.

- **Response encryption.** Seal threshold encryption client-side. Plaintext never leaves the browser. Only the form owner + approved admins (whose Sui addresses satisfy the form's `policy_module`) can decrypt.
- **Draft encryption.** AES-GCM via Web Crypto. Key lives in `sessionStorage` and dies on tab close — orphaned drafts auto-purge on next decrypt failure.
- **Webhook auth.** HMAC-signed payloads. Admin's webhook secret never leaves the browser; verification happens at the receiver.
- **No server runtime.** The web app is statically exported. No API routes, no backend secrets, no central log of submissions.

## Contributing

The project is a hackathon submission, but issues and PRs are welcome.

```bash
pnpm install
pnpm test           # Run all tests
pnpm move:test      # Run Move test suite
pnpm typecheck      # Catch type errors
pnpm lint           # ESLint with strict no-explicit-any
```

## License

MIT.
