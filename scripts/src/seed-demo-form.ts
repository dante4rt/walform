/**
 * Seed a demo form on Sui mainnet for the Walform hackathon submission.
 *
 * Usage:
 *   pnpm seed:demo
 *
 * Prerequisites:
 *   - Sui CLI installed and configured for mainnet
 *   - Active address has ≥2 SUI for gas + 1 WAL for bounty
 *   - Contracts already deployed (run `pnpm deploy:contracts` first)
 *
 * What it does:
 *   1. Reads the mainnet package ID from shared/constants.ts
 *   2. Creates a demo form schema (matching the brief's Airtable fields)
 *   3. Uploads schema to Walrus via CLI
 *   4. Calls create_form on chain
 *   5. Adds admin 0xc4d6e...090e54
 *   6. Deposits 1 WAL bounty
 *   7. Records form object ID in DEPLOYMENT.md
 */

import { execSync } from "node:child_process"
import { readFileSync, writeFileSync, appendFileSync } from "node:fs"
import { resolve } from "node:path"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { DEMO_ADMIN_ADDRESS } from "@walform/shared"
import type { WalformSchema } from "@walform/shared"

const ROOT_DIR = resolve(import.meta.dirname, "../..")
const DEPLOYMENT_MD = resolve(ROOT_DIR, "DEPLOYMENT.md")
const CONSTANTS_TS = resolve(ROOT_DIR, "packages/shared/src/constants.ts")

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
    fail("Mainnet package ID is 0x0. Run `pnpm deploy:contracts` first.")
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

// ---- Build demo form schema ----

console.log("\n📋 Building demo form schema...\n")

const demoSchema: WalformSchema = {
  version: 1,
  title: "Walrus Session 2 — Project Feedback",
  description:
    "Submit your project details for the Walrus Tools Builder Activation hackathon. Responses are encrypted via Seal and stored on Walrus.",
  vibe: "formal",
  fields: [
    {
      id: "project_name",
      type: "rich_text",
      label: "Project Name",
      required: true,
    },
    {
      id: "session",
      type: "dropdown",
      label: "Session",
      options: [
        "Session 1 — Data Economy",
        "Session 2 — Tools Builder Activation",
        "Session 3 — App Builder Sprint",
      ],
      required: true,
    },
    {
      id: "team_lead",
      type: "rich_text",
      label: "Team Lead Name",
      required: true,
    },
    {
      id: "description",
      type: "rich_text",
      label: "Project Description",
      required: true,
    },
    {
      id: "demo_url",
      type: "url",
      label: "Demo URL",
      required: false,
    },
    {
      id: "repo_url",
      type: "url",
      label: "GitHub Repository",
      required: false,
    },
    {
      id: "rating",
      type: "star_rating",
      label: "Self-assessed progress (1-5)",
      max: 5,
      required: false,
    },
    {
      id: "uses_walrus",
      type: "checkbox_group",
      label: "Built on",
      options: ["Walrus", "Seal", "Sui", "Walrus Sites", "Move 2024"],
      required: false,
    },
    {
      id: "needs_help",
      type: "confirmation",
      label: "I would like feedback from the Walrus team",
      required: false,
    },
    {
      id: "screenshot",
      type: "screenshot",
      label: "Upload a screenshot of your project",
      required: false,
    },
  ],
  policy: {
    type: "open",
    config: {},
  },
  encryption: {
    mode: "seal",
    threshold: 2,
    policy_module: "policy_open::seal_approve",
  },
  bounty: {
    enabled: true,
    tiers: {
      low: "100000000", // 0.1 WAL
      medium: "500000000", // 0.5 WAL
      high: "2000000000", // 2 WAL
      critical: "5000000000", // 5 WAL
    },
  },
  submission_mode: "wallet",
}

const schemaJson = JSON.stringify(demoSchema, null, 2)
console.log(`  Title: ${demoSchema.title}`)
console.log(`  Fields: ${demoSchema.fields.length}`)
console.log(`  Policy: ${demoSchema.policy.type}`)
console.log(`  Bounty: enabled`)

// ---- Upload schema to Walrus ----

console.log("\n📤 Uploading schema to Walrus...\n")

const tmpFile = join(tmpdir(), "walform-demo-schema.json")
writeFileSync(tmpFile, schemaJson, "utf-8")

let schemaBlobId: string
try {
  // Use walrus CLI to write the blob (26 epochs = ~6 months)
  const output = run(`walrus write ${tmpFile} --epochs 26 --context mainnet --json`)
  const parsed = JSON.parse(output)
  // walrus CLI returns [{blobStoreResult: {newlyCreated: {blobObject: {blobId: ...}}}}]
  const storeResult = Array.isArray(parsed) ? parsed[0]?.blobStoreResult : parsed
  schemaBlobId =
    storeResult?.newlyCreated?.blobObject?.blobId ??
    storeResult?.alreadyCertified?.blobId ??
    parsed?.blobId
  if (!schemaBlobId) {
    fail(`Could not extract blob ID from walrus output:\n${output.slice(0, 500)}`)
  }
  console.log(`  Schema blob ID: ${schemaBlobId}`)
} catch (e: unknown) {
  const err = e as { stderr?: string; message?: string }
  fail(
    `Walrus upload failed: ${err.stderr || err.message}\n\nMake sure 'walrus' CLI is installed and configured.`,
  )
}

// ---- Create form on chain ----

console.log("\n🏗️  Creating form on Sui mainnet...\n")

const schemaBlobBytes = new TextEncoder().encode(schemaBlobId)
const schemaBlobHex = Array.from(schemaBlobBytes)
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("")

let createFormTx: string
try {
  // Build the PTB via sui client call
  const output = run(
    `sui client call --package ${packageId} --module form --function create_form ` +
      `--args 'x"${schemaBlobHex}"' 1 ` +
      `--gas-budget 50000000 --json`,
  )
  const parsed = JSON.parse(output)
  createFormTx = parsed.digest

  if (parsed.effects?.status?.status !== "success") {
    fail(`create_form failed: ${parsed.effects?.status?.status}`)
  }

  // Find the Form object ID from created objects
  const formObject = (
    parsed.objectChanges as
      | Array<{ type?: string; objectType?: string; objectId?: string }>
      | undefined
  )?.find((c) => c.type === "created" && c.objectType?.includes("::form::Form"))
  const formObjectId = formObject?.objectId

  if (!formObjectId) {
    // Try effects.created
    console.log(`  Tx digest: ${createFormTx}`)
    console.log(`  ⚠️  Could not auto-detect form object ID. Check explorer.`)
    console.log(`  Explorer: https://suiscan.xyz/mainnet/tx/${createFormTx}`)
  } else {
    console.log(`  Form object ID: ${formObjectId}`)
    console.log(`  Tx digest: ${createFormTx}`)

    // ---- Add admin ----

    console.log(`\n👤 Adding admin ${DEMO_ADMIN_ADDRESS}...\n`)

    try {
      const adminOutput = run(
        `sui client call --package ${packageId} --module form --function add_admin ` +
          `--args ${formObjectId} ${DEMO_ADMIN_ADDRESS} ` +
          `--gas-budget 30000000 --json`,
      )
      const adminParsed = JSON.parse(adminOutput) as {
        effects?: { status?: { status?: string } }
        digest?: string
      }
      if (adminParsed.effects?.status?.status === "success") {
        console.log(`  ✅ Admin added. Tx: ${adminParsed.digest}`)
      } else {
        console.warn(`  ⚠️  add_admin may have failed: ${adminParsed.effects?.status?.status}`)
      }
    } catch (e: unknown) {
      const err = e as { message?: string }
      console.warn(`  ⚠️  add_admin failed: ${err.message}`)
    }

    // ---- Record in DEPLOYMENT.md ----

    const timestamp = new Date().toISOString()
    const entry = `
### Demo Form — ${timestamp}

- **Form object ID:** \`${formObjectId}\`
- **Schema blob ID:** \`${schemaBlobId}\`
- **Create tx:** \`${createFormTx}\`
- **Admin:** \`${DEMO_ADMIN_ADDRESS}\`
- **Form URL:** \`https://walform.wal.app/f/${formObjectId}\`
- **Explorer:** \`https://suiscan.xyz/mainnet/object/${formObjectId}\`
`

    try {
      appendFileSync(DEPLOYMENT_MD, entry, "utf-8")
      console.log(`\n📝 Appended to DEPLOYMENT.md`)
    } catch {
      console.warn("  ⚠️  Could not update DEPLOYMENT.md")
    }
  }
} catch (e: unknown) {
  const err = e as { stderr?: string; message?: string }
  fail(`create_form transaction failed: ${err.stderr || err.message}`)
}

// ---- Deposit bounty (optional, requires WAL) ----

console.log("\n💰 Attempting bounty deposit (1 WAL)...\n")

try {
  console.log("  ℹ️  Bounty deposit requires WAL coins.")
  console.log("  Run manually if you have WAL:")
  console.log(`    sui client call --package ${packageId} --module bounty --function deposit \\`)
  console.log(`      --args <FORM_OBJECT_ID> <WAL_COIN_ID> --gas-budget 30000000`)
} catch {
  console.log("  ℹ️  Skip bounty deposit — no WAL coins found.")
}

console.log(`\n🎉 Done! Demo form seeded on Sui mainnet.`)
console.log(`   Run the app locally: pnpm dev`)
console.log(`   Or visit: https://walform.wal.app\n`)
