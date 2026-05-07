# Walform — Mainnet Deploy Guide

Step-by-step. Follow in order.

## Prerequisites

```bash
# 1. Sui CLI (if not installed)
cargo install --git https://github.com/MystenLabs/sui.git --branch mainnet sui

# 2. Walrus CLI
# See: https://docs.wal.app/docs/walrus/installation

# 3. site-builder
cargo install --git https://github.com/MystenLabs/walrus walrus-sites --bin site-builder
```

## Step 1 — Fund your wallet

You need:
- **~0.5 SUI** for gas (contract publish + demo txs)
- **~2 WAL** for Walrus storage (site deploy + demo responses + demo video)

Buy SUI on an exchange, withdraw to your Sui mainnet address.
Convert SUI → WAL: `walrus get-wal` or via Slush wallet.

Check balances:
```bash
sui client active-address
sui client gas
walrus balance
```

## Step 2 — Deploy Move contracts

```bash
cd /root/walform
./scripts/deploy-contracts.sh mainnet
```

This prints a **package ID** (e.g. `0xabc...`). Record it.

Update the env:
```bash
# apps/web/.env.local
NEXT_PUBLIC_SUI_NETWORK=mainnet
NEXT_PUBLIC_WALFORM_PACKAGE_ID=<your-package-id>
```

Update shared constants:
```typescript
// packages/shared/src/constants.ts
export const NETWORK_PACKAGE_IDS = {
  testnet: { walform: "0x74254b034b8cdfc6cb5da2551ed4db8d5eae202cf858b741a7736f85bf9836f1" },
  mainnet: { walform: "<your-package-id>" },
} as const
```

## Step 3 — Rebuild the web app

```bash
pnpm --filter @walform/web build
```

## Step 4 — Deploy Walrus Site

```bash
./scripts/deploy-site.sh --epochs 26 --network mainnet
```

This gives you a URL like `https://<hash>.wal.app`. Record it.

## Step 5 — Verify

1. Open the site URL in a browser
2. Connect wallet on mainnet
3. Create a test form (use the builder)
4. Submit a response
5. Check admin dashboard shows the response

## Step 6 — Create demo form

After the site is live:

1. Open the deployed URL
2. Create a form with: project name, session, feedback text, star rating, screenshot upload
3. Add admin `0xc4d6ee019649edba41d5a5ed1081fe3c86afc41fea413195dd6ecdd0f6090e54`
4. Submit at least 1 response yourself
5. Record the form object ID

Update:
```bash
NEXT_PUBLIC_WALFORM_DEMO_FORM_ID=<form-object-id>
```

## Step 7 — Record everything

Fill in `DEPLOYMENT.md` with all tx digests, object IDs, and URLs.
