#!/usr/bin/env bash
# Deploy Walform site to Walrus.
# Usage: ./scripts/deploy-site.sh [--epochs 26] [--network testnet|mainnet]
#
# Prerequisites:
#   - site-builder CLI installed (cargo install --git https://github.com/MystenLabs/walrus walrus-sites)
#   - WAL balance for storage (~1-2 WAL for 26 epochs)
#   - apps/web already built (run `pnpm --filter @walform/web build` first)
#
# Output: site URL + object ID printed to stdout.

set -euo pipefail

EPOCHS=26
NETWORK="mainnet"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --epochs) EPOCHS="$2"; shift 2 ;;
    --network) NETWORK="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

OUT_DIR="apps/web/out"

if [[ ! -d "$OUT_DIR" ]]; then
  echo "ERROR: $OUT_DIR not found. Run build first:"
  echo "  pnpm --filter @walform/web build"
  exit 1
fi

echo "==> Deploying Walrus Site"
echo "    Directory: $OUT_DIR"
echo "    Epochs:    $EPOCHS"
echo "    Network:   $NETWORK"
echo ""

# Check WAL balance
echo "==> WAL balance:"
walrus balance 2>/dev/null || echo "(walrus CLI not found — ensure it's installed)"

echo ""
read -rp "Continue with deploy? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

echo "==> Deploying site ..."
DEPLOY_OUTPUT=$(site-builder deploy "$OUT_DIR" --epochs "$EPOCHS" 2>&1)
echo "$DEPLOY_OUTPUT"

# Try to extract the site URL
SITE_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://[a-z0-9-]+\.wal\.app' | head -1 || echo "")
OBJECT_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP '0x[a-f0-9]{64}' | head -1 || echo "")

echo ""
echo "============================================"
echo "  Site deployed!"
echo "============================================"
echo "  URL:        ${SITE_URL:-check output above}"
echo "  Object ID:  ${OBJECT_ID:-check output above}"
echo "  Epochs:     $EPOCHS"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Verify: open ${SITE_URL:-the URL above} in browser"
echo "  2. Record in DEPLOYMENT.md"
echo "  3. Create demo form on mainnet"
