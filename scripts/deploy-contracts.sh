#!/usr/bin/env bash
# Deploy Walform Move contracts to Sui.
# Usage: ./scripts/deploy-contracts.sh [--network testnet|mainnet]
#
# Prerequisites:
#   - sui CLI installed (via suiup)
#   - Wallet funded with SUI for gas (~0.5 SUI)
#   - Correct active address: `sui client active-address`
#
# Output: package ID printed to stdout. Record it in DEPLOYMENT.md.

set -euo pipefail

NETWORK="${1:-testnet}"

if [[ "$NETWORK" != "testnet" && "$NETWORK" != "mainnet" ]]; then
  echo "Usage: $0 [--network testnet|mainnet]"
  exit 1
fi

echo "==> Switching to $NETWORK ..."
sui client switch --env "$NETWORK"

echo "==> Active address:"
sui client active-address

echo "==> Active gas coins:"
sui client gas

echo ""
read -rp "Continue with deploy? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

echo "==> Building Move package ..."
sui move build --path packages/contracts

echo "==> Publishing to $NETWORK ..."
PUBLISH_OUTPUT=$(sui client publish \
  --path packages/contracts \
  --gas-budget 500000000 \
  --json 2>&1)

echo "$PUBLISH_OUTPUT"

# Extract package ID from JSON output.
PACKAGE_ID=$(echo "$PUBLISH_OUTPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for change in data.get('objectChanges', []):
    if change.get('type') == 'published':
        print(change['packageId'])
        break
" 2>/dev/null || echo "")

if [[ -z "$PACKAGE_ID" ]]; then
  echo ""
  echo "ERROR: Could not extract package ID from publish output."
  echo "Check the output above and record manually in DEPLOYMENT.md"
  exit 1
fi

TX_DIGEST=$(echo "$PUBLISH_OUTPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('digest', 'unknown'))
" 2>/dev/null || echo "unknown")

echo ""
echo "============================================"
echo "  Package deployed successfully!"
echo "============================================"
echo "  Network:     $NETWORK"
echo "  Package ID:  $PACKAGE_ID"
echo "  Tx digest:   $TX_DIGEST"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Update .env.local:"
echo "     NEXT_PUBLIC_SUI_NETWORK=$NETWORK"
echo "     NEXT_PUBLIC_WALFORM_PACKAGE_ID=$PACKAGE_ID"
echo "  2. Update packages/shared/src/constants.ts"
echo "  3. Record in DEPLOYMENT.md"
