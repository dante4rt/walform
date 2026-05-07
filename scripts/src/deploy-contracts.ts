/**
 * Deploy Walform Move contracts to Sui mainnet.
 *
 * Usage:
 *   pnpm deploy:contracts
 *
 * Prerequisites:
 *   - Sui CLI installed and configured for mainnet
 *   - Active address has ≥5 SUI for gas
 *   - `sui client active-env` returns "mainnet"
 *
 * What it does:
 *   1. Validates environment (sui CLI, mainnet active)
 *   2. Builds contracts
 *   3. Publishes to mainnet
 *   4. Extracts package ID from tx output
 *   5. Appends to DEPLOYMENT.md
 */

import { execSync } from "node:child_process"
import { readFileSync, writeFileSync, appendFileSync } from "node:fs"
import { resolve } from "node:path"

const CONTRACTS_DIR = resolve(import.meta.dirname, "../../packages/contracts")
const ROOT_DIR = resolve(import.meta.dirname, "../..")
const DEPLOYMENT_MD = resolve(ROOT_DIR, "DEPLOYMENT.md")
const CONSTANTS_TS = resolve(ROOT_DIR, "packages/shared/src/constants.ts")

function run(cmd: string, cwd?: string): string {
  return execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
}

function fail(msg: string): never {
  console.error(`\n❌ ${msg}\n`)
  process.exit(1)
}

// ---- Pre-flight checks ----

console.log("🔍 Checking environment...\n")

try {
  const version = run("sui --version")
  console.log(`  sui CLI: ${version}`)
} catch {
  fail(
    "sui CLI not found. Install via: cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui",
  )
}

try {
  const env = run("sui client active-env")
  console.log(`  active env: ${env}`)
  if (!env.toLowerCase().includes("mainnet")) {
    fail(`Active env is "${env}", not mainnet. Run: sui client switch --env mainnet`)
  }
} catch {
  fail("Could not read active env. Run: sui client switch --env mainnet")
}

try {
  const addr = run("sui client active-address")
  console.log(`  active address: ${addr}`)
} catch {
  fail("No active address. Run: sui client new-address ed25519")
}

const gasBudget = "200000000" // 0.2 SUI

console.log(`\n📦 Building contracts in ${CONTRACTS_DIR}...\n`)

try {
  const buildOut = run("sui move build", CONTRACTS_DIR)
  console.log(buildOut || "  (build ok)")
} catch (e: unknown) {
  const err = e as { stderr?: string; message?: string }
  fail(`Build failed:\n${err.stderr || err.message}`)
}

console.log(`\n🚀 Publishing to mainnet (gas budget: ${gasBudget} MIST)...\n`)

let publishOutput: string
try {
  publishOutput = run(`sui client publish --gas-budget ${gasBudget} --json`, CONTRACTS_DIR)
} catch (e: unknown) {
  // sui client publish may write to stdout even on success.
  // If JSON is in stdout, use that; otherwise fail.
  const err = e as { stdout?: string; stderr?: string; message?: string }
  const stdout = err.stdout ?? ""
  if (stdout.includes('"packageId"')) {
    publishOutput = stdout.trim()
  } else {
    fail(`Publish failed:\n${err.stderr || err.message}`)
  }
}

// ---- Parse tx result ----

interface PublishResult {
  effects?: {
    status?: { status?: string }
    created?: Array<{ owner?: string; reference?: { objectId?: string } }>
  }
  objectChanges?: Array<{
    type?: string
    packageId?: string
    digest?: string
  }>
  digest?: string
}

let result: PublishResult
try {
  result = JSON.parse(publishOutput)
} catch {
  fail(`Could not parse publish output as JSON:\n${publishOutput.slice(0, 500)}`)
}

const txDigest = result.digest ?? "unknown"
const status = result.effects?.status?.status ?? "unknown"

if (status !== "success") {
  fail(`Transaction failed with status: ${status}\nDigest: ${txDigest}`)
}

// Extract package ID from objectChanges
const pkgChange = result.objectChanges?.find((c) => c.type === "published")
const packageId = pkgChange?.packageId

if (!packageId) {
  fail("Could not extract package ID from publish output.")
}

console.log(`✅ Published!`)
console.log(`   Package ID: ${packageId}`)
console.log(`   Tx digest:  ${txDigest}`)

// ---- Record in DEPLOYMENT.md ----

const timestamp = new Date().toISOString()
const entry = `
### Mainnet Deploy — ${timestamp}

- **Package ID:** \`${packageId}\`
- **Tx digest:** \`${txDigest}\`
- **Gas budget:** ${gasBudget} MIST
- **Published at:** ${timestamp}
`

try {
  appendFileSync(DEPLOYMENT_MD, entry, "utf-8")
  console.log(`\n📝 Appended to DEPLOYMENT.md`)
} catch {
  console.warn("  ⚠️  Could not update DEPLOYMENT.md — record manually.")
}

// ---- Update shared/constants.ts ----

try {
  let constants = readFileSync(CONSTANTS_TS, "utf-8")
  constants = constants.replace(
    /mainnet:\s*\{\s*walform:\s*"0x0",?\s*\}/,
    `mainnet: {\n    walform: "${packageId}",\n  }`,
  )
  writeFileSync(CONSTANTS_TS, constants, "utf-8")
  console.log(`📝 Updated packages/shared/src/constants.ts`)
} catch {
  console.warn("  ⚠️  Could not update constants.ts — update manually.")
}

// ---- Update Published.toml ----

const publishedToml = resolve(CONTRACTS_DIR, "Published.toml")
try {
  let toml = readFileSync(publishedToml, "utf-8")
  if (!toml.includes("[published.mainnet]")) {
    const mainnetBlock = `\n[published.mainnet]\nchain-id = "35834a8a"\npublished-at = "${packageId}"\noriginal-id = "${packageId}"\nversion = 1\ntoolchain-version = "1.71.1"\nbuild-config = { flavor = "sui", edition = "2024" }\n`
    toml += mainnetBlock
    writeFileSync(publishedToml, toml, "utf-8")
    console.log(`📝 Updated Published.toml with mainnet entry`)
  }
} catch {
  console.warn("  ⚠️  Could not update Published.toml — update manually.")
}

console.log(`\n🎉 Done! Package live on Sui mainnet.`)
console.log(`   View on explorer: https://suiscan.xyz/mainnet/object/${packageId}\n`)
