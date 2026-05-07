/**
 * Submit a test response to the Walform demo form on mainnet.
 * This satisfies the M9 requirement: "I confirm that I have submitted at least one feedback entry."
 *
 * Usage:
 *   pnpm --filter @walform/scripts tsx src/submit-test-response.ts
 *
 * Prerequisites:
 *   - Sui CLI configured for mainnet
 *   - Active address has ≥0.5 SUI for gas
 *   - Contracts deployed (run pnpm deploy:contracts first)
 *   - Demo form seeded (run pnpm seed:demo first)
 *
 * What it does:
 *   1. Uploads a dummy response blob to Walrus
 *   2. Calls submit_response on the form NFT
 *   3. Records the tx digest
 */

import { execSync } from "node:child_process"
import { readFileSync, appendFileSync } from "node:fs"
import { resolve } from "node:path"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { writeFileSync } from "node:fs"

const ROOT_DIR = resolve(import.meta.dirname, "../..")
const CONSTANTS_TS = resolve(ROOT_DIR, "packages/shared/src/constants.ts")
const DEPLOYMENT_MD = resolve(ROOT_DIR, "DEPLOYMENT.md")
const FORM_OBJECT_ID = "0x2b8583bf5963f00cc8fc3e7feec2fa482ac89db495160e5efb487b71c6a5eb70"

function run(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
}

function fail(msg: string): never {
  console.error(`\n❌ ${msg}\n`)
  process.exit(1)
}

// ---- Read package ID ----

console.log("🔍 Reading mainnet package ID...\n")

let packageId: string
try {
  const constants = readFileSync(CONSTANTS_TS, "utf-8")
  const match = constants.match(/mainnet:\s*\{\s*walform:\s*"([^"]+)"/)
  if (!match || match[1] === "0x0") {
    fail("Mainnet package ID is 0x0. Run pnpm deploy:contracts first.")
  }
  packageId = match[1]
  console.log(`  Package ID: ${packageId}`)
} catch {
  fail("Could not read constants.ts")
}

// ---- Pre-flight ----

console.log("\n🔍 Checking environment...\n")

try {
  const env = run("sui client active-env")
  if (!env.toLowerCase().includes("mainnet")) {
    fail(`Active env is "${env}", not mainnet.`)
  }
  const addr = run("sui client active-address")
  console.log(`  env: ${env}`)
  console.log(`  address: ${addr}`)
} catch {
  fail("Sui CLI not configured for mainnet.")
}

// ---- Build test response ----

console.log("\n📋 Building test response...\n")

const testResponse = {
  form_id: FORM_OBJECT_ID,
  submitted_at_ms: Date.now(),
  submitter: null,
  answers: {
    project_name: "Walform",
    session: "Session 2 — Tools Builder Activation",
    team_lead: "Muhammad Ramadhani",
    description:
      "Walrus-native feedback protocol with Seal encryption, Sui NFTs, and Walrus quilts.",
    demo_url: "https://github.com/dante4rt/walform",
    repo_url: "https://github.com/dante4rt/walform",
    rating: 5,
    uses_walrus: ["Walrus", "Seal", "Sui", "Move 2024"],
    needs_help: true,
  },
  severity: null,
  client_meta: {
    submission_mode: "signed_anon",
  },
}

console.log(`  Response: ${Object.keys(testResponse.answers).length} answers`)

// ---- Upload response to Walrus ----

console.log("\n📤 Uploading response to Walrus...\n")

const tmpFile = join(tmpdir(), "walform-test-response.json")
writeFileSync(tmpFile, JSON.stringify(testResponse, null, 2), "utf-8")

let responseBlobId: string
try {
  const output = run(`walrus write ${tmpFile} --epochs 26 --context mainnet --json`)
  const parsed = JSON.parse(output)
  const storeResult = Array.isArray(parsed) ? parsed[0]?.blobStoreResult : parsed
  responseBlobId =
    storeResult?.newlyCreated?.blobObject?.blobId ??
    storeResult?.alreadyCertified?.blobId ??
    parsed?.blobId
  if (!responseBlobId) {
    fail(`Could not extract blob ID from walrus output:\n${output.slice(0, 500)}`)
  }
  console.log(`  Response blob ID: ${responseBlobId}`)
} catch (e: unknown) {
  const err = e as { stderr?: string; message?: string }
  fail(`Walrus upload failed: ${err.stderr || err.message}`)
}

// ---- Submit response on chain ----

console.log("\n🏗️  Submitting response on Sui mainnet...\n")

const timestampMs = Date.now()
const severity = 0 // none

// Get active address for submitter (wallet mode)
const activeAddr = run("sui client active-address")
console.log(`  Submitter (wallet mode): ${activeAddr}`)

try {
  // Use PTB with move-call for option::none — the CLI can't handle None inline
  const cmd = [
    `sui client ptb`,
    `--move-call '0x1::option::none<address>'`,
    `--assign sub`,
    `--move-call '0x1::option::none<u64>'`,
    `--assign rating`,
    `--assign form_id '@${FORM_OBJECT_ID}'`,
    `--assign blob_id '"${responseBlobId}"'`,
    `--assign root_hash '"root_hash_placeholder"'`,
    `--assign ts '${timestampMs}u64'`,
    `--assign sev '${severity}u8'`,
    `--move-call '${packageId}::form::submit_response' form_id blob_id root_hash sub ts sev rating`,
    `--gas-budget 50000000`,
    `--json`,
  ].join(" ")

  const output = run(cmd)
  const parsed = JSON.parse(output) as {
    effects?: { status?: { status?: string } }
    digest?: string
  }

  if (parsed.effects?.status?.status === "success") {
    console.log(`  ✅ Response submitted!`)
    console.log(`  Tx digest: ${parsed.digest}`)

    const entry = `
### Test Response — ${new Date().toISOString()}

- **Response blob ID:** \`${responseBlobId}\`
- **Tx digest:** \`${parsed.digest}\`
- **Form:** \`${FORM_OBJECT_ID}\`
- **Submitter:** anonymous (signed_anon mode)
`

    try {
      appendFileSync(DEPLOYMENT_MD, entry, "utf-8")
      console.log(`\n📝 Appended to DEPLOYMENT.md`)
    } catch {
      console.warn("  ⚠️  Could not update DEPLOYMENT.md")
    }
  } else {
    fail(`submit_response failed: ${parsed.effects?.status?.status}`)
  }
} catch (e: unknown) {
  const err = e as { stderr?: string; message?: string }
  fail(`submit_response transaction failed: ${err.stderr || err.message}`)
}

console.log(`\n🎉 Done! Test response submitted on Sui mainnet.`)
console.log(`   M9 requirement satisfied.\n`)
