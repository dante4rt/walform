#!/usr/bin/env bash
set -uo pipefail

# Deploy Walform as a Walrus Site.
#
# Usage: bash scripts/src/deploy-walrus-site.sh
#
# Prerequisites:
#   - site-builder installed (cargo install --git https://github.com/MystenLabs/walrus-sites site-builder)
#   - Sui CLI configured for mainnet
#   - Active address has WAL for storage
#
# Environment:
#   EPOCHS — number of Walrus epochs to store the site (default: 53 ≈ 6 months)

EPOCHS="${EPOCHS:-53}"
SITE_DIR="apps/web/out"

echo "🔍 Checking prerequisites..."

# Check site-builder
if ! command -v site-builder &> /dev/null; then
  echo "❌ site-builder not found."
  echo "   Install: cargo install --git https://github.com/MystenLabs/walrus-sites site-builder"
  exit 1
fi

# Check sui CLI
if ! command -v sui &> /dev/null; then
  echo "❌ sui CLI not found."
  exit 1
fi

# Check mainnet
ENV=$(sui client active-env 2>/dev/null || echo "unknown")
if [[ "$ENV" != *"mainnet"* ]]; then
  echo "⚠️  Active env is '$ENV', not mainnet."
  echo "   Run: sui client switch --env mainnet"
  exit 1
fi

echo "  site-builder: $(site-builder --version 2>/dev/null || echo 'unknown')"
echo "  sui env: $ENV"
echo "  epochs: $EPOCHS"
echo ""

# Build the Next.js static export
echo "📦 Building Next.js static export..."
cd "$(dirname "$0")/../.."
pnpm --filter @walform/web build
echo "  ✅ Build complete"
echo ""

# Check the output directory exists
if [ ! -d "$SITE_DIR" ]; then
  echo "❌ Output directory '$SITE_DIR' not found after build."
  echo "   Make sure next.config.ts has output: 'export'"
  exit 1
fi

# Deploy
echo "🚀 Deploying Walrus Site ($EPOCHS epochs)..."
DEPLOY_OUTPUT=$(site-builder --config scripts/sites-config.yaml deploy "$SITE_DIR" --epochs "$EPOCHS" 2>&1 || true)
echo "$DEPLOY_OUTPUT"

# Try to extract the site object ID from output
SITE_OBJECT_ID=$(echo "$DEPLOY_OUTPUT" | grep -oE 'New site object ID: 0x[a-f0-9]+' | grep -oE '0x[a-f0-9]+' | head -1 || echo "")

if [ -n "$SITE_OBJECT_ID" ]; then
  echo ""
  echo "✅ Site deployed!"
  echo "   Site Object ID: $SITE_OBJECT_ID"
  echo ""
  echo "📝 To make it accessible at walform.wal.app:"
  echo "   1. Go to https://suins.io"
  echo "   2. Set your SuiNS name to point to: $SITE_OBJECT_ID"
  echo "   3. Visit https://<name>.wal.app"

  # Append to DEPLOYMENT.md if it exists
  DEPLOYMENT_FILE="DEPLOYMENT.md"
  if [ -f "$DEPLOYMENT_FILE" ]; then
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    cat >> "$DEPLOYMENT_FILE" << EOF

### Walrus Site Deploy — $TIMESTAMP

- **Site Object ID:** \`$SITE_OBJECT_ID\`
- **Epochs:** $EPOCHS
- **Output dir:** \`$SITE_DIR\`
- **Access:** Point SuiNS name to the site object ID, then visit \`https://<name>.wal.app\`
EOF
    echo "   📝 Appended to DEPLOYMENT.md"
  fi
else
  echo ""
  echo "⚠️  Could not extract site object ID from output."
  echo "   Check the output above for the site object ID."
fi

echo ""
echo "🎉 Done!"
