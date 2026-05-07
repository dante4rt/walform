# Walform — Forms with proof. Responses with privacy.

**A Walrus-native feedback protocol where every form is a Sui NFT and every response is a private, verifiable Walrus blob.**

## What it is

A drag-and-drop form builder for web3 founders, with three things web2 tools can't offer:

1. **Composable.** Forms are Sui objects. Any dApp can read response counts and aggregate ratings without decrypting individual responses.
2. **Private by default.** Responses encrypt client-side via Seal. Only the form owner and chosen admins can read them — not Walform, not us, not anyone.
3. **Pay per byte, not per response.** Walrus quilts batch small responses into one storage unit. 100 responses cost about as much as one. No monthly cap, no surprise upgrade prompts.

## Who it's for

Web3 product founders who need real feedback from real users, can prove the count to a grant committee, and don't want a centralized vendor reading every word.

## What ships in v1

- Form builder with all 8 field types from the brief (rich text, dropdowns, checkboxes, star rating, screenshots, video, URLs, confirmation)
- Four gating policies: open, token-gated, allowlist, time-locked decrypt
- Bounty escrow — fund a form with WAL, approve responses, auto-payout to submitter
- Soulbound response receipts — submitters get an SBT they can use to prove participation across other dApps
- Admin dashboard with filter, internal notes, severity tagging, CSV + JSON export
- Public Move view functions for `count_responses` and `aggregate_rating` — embeddable in any Sui dApp
- Cost calculator that shows live $-per-response before you spend a cent

## Why now

Existing web3 form tools (Formo, BlockSurvey, Deform, EngageHQ) live on EVM chains with IPFS or centralized backends. None use Walrus quilts or Seal threshold encryption. Walform is the first form protocol that's native to the Walrus stack — and the entire app ships from `walform.wal.app`, served from Walrus itself.

## Built on

Sui · Walrus · Seal · Walrus Sites · Move 2024 · @mysten/walrus · @mysten/seal · @mysten/dapp-kit · Next.js · TypeScript · Plus Jakarta Sans

## Links

- App: https://walform.wal.app
- Demo form: https://walform.wal.app/f/0x<DEMO_FORM_OBJECT_ID>
- GitHub: https://github.com/dante4rt/walform
