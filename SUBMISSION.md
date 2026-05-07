# Walform — Submission Copy

> Airtable submission answers. Fill in `TODO` fields after mainnet deploy.

---

**PROJECT NAME**
Walform

**PLEASE SELECT THE SESSION**
Walrus Session 2 — Tools Builder Activation

**TEAM LEADER NAME**
Muhammad Ramadhani

**TEAM LEADER EMAIL**
rxmxdhxni@gmail.com

**OPEN TO NEWSLETTER**
Yes

**TEAM LEADER TELEGRAM HANDLE**
TODO

**DISCORD HANDLE**
TODO

**COUNTRY**
Indonesia

**DEEPSURGE PROJECT LINK**
TODO

**FORM LINK**
https://TODO.wal.app/f/TODO

**I CONFIRM I HAVE SUBMITTED AT LEAST ONE FEEDBACK ENTRY THROUGH THE FORM TOOL I BUILT — AND ADMIN 0xc4d6ee019649edba41d5a5ed1081fe3c86afc41fea413195dd6ecdd0f6090e54 IS ADDED**
Yes

**PLEASE DESCRIBE THE WORKFLOW AND FUNCTIONALITIES OF YOUR FORMS**

Admin flow:
1. Connect wallet, click Create. Pick a template (bug report, NPS, feature request, hackathon, DAO survey) or start blank.
2. Add fields. Each supports rich text, dropdown, checkbox, star rating, screenshot, video, URL, or confirmation. Toggle required per field.
3. Pick a gating policy: open, token-gated, allowlist, or time-locked decrypt. Optionally fund a bounty pool in WAL with severity tiers.
4. Save. The form publishes as a Sui NFT. The schema is stored on Walrus. A shareable link is generated.
5. Add admins by Sui address. They can decrypt responses via Seal threshold.
6. In the admin dashboard, review responses, decrypt, add encrypted internal notes, tag severity, mark status (new → triaged → approved → resolved), export CSV or JSON, approve responses to release bounty payouts.

User flow:
1. Open the form link. If gated, the form checks token ownership or allowlist.
2. Fill the form. Drafts autosave offline.
3. On submit, the response encrypts client-side via Seal, uploads to Walrus, and registers a ResponseRef on the Form NFT. If bounty is enabled and wallet-mode is active, a soulbound receipt is minted to the submitter.
4. The submitter sees a confirmation with the response blob ID and Sui transaction digest — both verifiable by anyone.

**SHARE ANY VISUALS OF YOUR FORM**
TODO: attach builder screenshot, admin dashboard, mobile PWA, bounty flow, cost panel

**DEMO VIDEO (sub 3 minutes)**
TODO: attach walrus_demo.mp4 — also stored on Walrus, blob ID: TODO

**WHICH FEATURES SET YOUR SOLUTION APART FROM THE REST?**

1. Composable Move primitive. Forms aren't a SaaS endpoint — they're Sui NFTs. Any dApp can call `count_responses` or `aggregate_rating` to read public stats without decrypting individual responses. Existing web3 form tools (Formo, BlockSurvey, Deform) are SaaS apps; Walform is a protocol.

2. Walrus quilts for cost. Responses batch into a single storage unit, cutting cost by ~99% vs individual blobs. No monthly response cap. No upgrade tier.

3. Four Seal access policies, not one. Open, token-gated, allowlist, and time-locked decrypt are separate Move modules, picked per form. The owner can prove via on-chain audit which admin authorized which decryption.

4. Soulbound response receipts. Submitters get an SBT they can use across other Sui dApps to prove they gave verified feedback. Cross-form reputation, no double-spend.

5. Bounty escrow with severity tiers. The form NFT holds WAL. The admin marks a response approved at low/medium/high/critical severity. Auto-payout to the submitter, on-chain.

6. Walrus Sites delivery. The entire app ships from walform.wal.app, served from Walrus itself. No traditional web server, no centralized fallback.

**FEEDBACK (about building on Walrus)**

What worked well:
- The TypeScript SDK is straightforward. `writeBlob` + `writeFiles` + retry on `RetryableWalrusClientError` was enough to ship.
- Quilts cut storage cost dramatically for small JSON payloads. Module 11 of the onboarding repo explained the mechanics clearly.
- Seal docs at seal-docs.wal.app cover the common patterns (allowlist, owner-only, time-locked) with copy-paste examples.
- Walrus Sites + site-builder made deploy a one-line command.

Challenges:
- Browser-context uploads require the upload relay. The first run failed silently until I switched to relay mode. The error message could surface this earlier.
- Faucet rate limits on Sui testnet during peak hours blocked one of my dev sessions. A clear retry budget or per-IP queue would help.
- The mainnet `walrus get-wal` flow needs a non-CLI option for users coming from a wallet UI. Some sort of in-browser swap or Slush integration would smooth onboarding.
- Seal session keys + threshold decryption have a learning curve. A "Hello, Seal" quickstart that ships a minimal end-to-end demo (not just snippets) would help newcomers.

Missing features I would like to see:
- Built-in availability proof per blob, surfaced at the SDK layer (today I have to read root hash and verify manually).
- Native event indexer — querying ResponseRef[] from a Form via dynamic fields works but is slow at 100+ responses. A subscribe-style API would be ideal.
- WAL/SUI swap inside dapp-kit so users don't bounce to CLI.

Issues with access / setup / onboarding:
- suiup install was clean on macOS but the path setup for fish shell needed manual fix.
- Testnet wipe risk wasn't loud enough in docs — I almost lost a Day 6 demo to it.

Suggestions for improving the developer experience:
- Ship a `create-walrus-app` CLI (like create-next-app) that scaffolds Next.js + dapp-kit + walrus-lib + seal-lib with the testnet config baked in.
- A unified "first-30-minutes" guide that bridges Sui → Walrus → Seal as one continuous flow, not three siloed docs.
- Public sandbox forms on Walrus Sites that devs can fork as a starter.

**X ACCOUNT**
TODO

**SHARE LINK TO X TWEET**
TODO

**SUI ADDRESS**
TODO (your mainnet Sui address)

**GITHUB**
https://github.com/dante4rt/walform
Profile: https://github.com/dante4rt

**SESSION FEEDBACK**
The 14-module onboarding curriculum is the strongest part of the program. Module 11 (quilts) and Module 14 (use cases) directly informed Walform's architecture. The hands-on Docker setup made the SDK module reproducible. What could improve: a live office-hours channel during the build window. Discord works but is async. A weekly synchronous AMA with a Walrus engineer would unblock teams faster.

**DEEPSURGE FEEDBACK**
The hackathon listing page is clean but the page initially renders as "Loading hackathon..." for a second too long — small thing but the first impression matters. Adding a fallback static summary block that loads before the JS finishes would help. Submission flow via Airtable is clear; embedding the Airtable inside DeepSurge instead of a separate link would tighten the loop.

---

## X Tweet Draft

```
Just shipped Walform on @WalrusProtocol — a feedback protocol where forms are Sui NFTs and responses are private, verifiable Walrus blobs.

Built for @WalrusSessions Tools Builder Activation.

→ walform.wal.app
→ demo: TODO
→ repo: github.com/dante4rt/walform

#Walrus
```

## Discord Intro Draft

```
gm — submitting Walform for Tools Builder Activation. Sui-native form protocol w/ Seal encryption + Walrus quilts + bounty escrow + SBT receipts. All 4 Seal policies + composable Move view fns. App ships from walform.wal.app (Walrus Site).

Repo: github.com/dante4rt/walform
Demo: https://TODO.wal.app/f/TODO

Happy to take questions or feedback.
```
