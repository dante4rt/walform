import type { Severity, WalformResponse } from "@walform/shared"
import { Transaction } from "@mysten/sui/transactions"

export const SEVERITY_TO_MOVE_CODE: Record<Exclude<Severity, "none"> | "none", number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

export interface SubmitResponseMoveDraft {
  packageId: string
  formId: string
  target: `${string}::form::submit_response`
  arguments: {
    form: string
    blobId: string
    rootHash: string
    submitter: string | null
    timestampMs: number
    severity: number
    rating: number | null
  }
}

export interface ReceiptMintDraft {
  packageId: string
  formId: string
  target: `${string}::receipt::mint_receipt`
  arguments: {
    form: string
    responseIndex: number
    issuedTo: string
    issuedAtMs: number
  }
}

export function createSubmitResponseMoveDraft(input: {
  packageId: string
  formId: string
  blobId: string
  rootHash: string
  response: WalformResponse
  rating: number | null
}): SubmitResponseMoveDraft {
  return {
    packageId: input.packageId,
    formId: input.formId,
    target: `${input.packageId}::form::submit_response`,
    arguments: {
      form: input.formId,
      blobId: input.blobId,
      rootHash: input.rootHash,
      submitter: input.response.submitter,
      timestampMs: input.response.submitted_at_ms,
      severity: SEVERITY_TO_MOVE_CODE[input.response.severity ?? "none"],
      rating: input.rating,
    },
  }
}

export function createReceiptMintDraft(input: {
  packageId: string
  formId: string
  responseIndex: number
  issuedTo: string
  issuedAtMs: number
}): ReceiptMintDraft {
  return {
    packageId: input.packageId,
    formId: input.formId,
    target: `${input.packageId}::receipt::mint_receipt`,
    arguments: {
      form: input.formId,
      responseIndex: input.responseIndex,
      issuedTo: input.issuedTo,
      issuedAtMs: input.issuedAtMs,
    },
  }
}

export function createDemoTxDigest(input: {
  formId: string
  blobId: string
  timestampMs: number
}): string {
  return `demo-${input.formId}-${input.blobId}-${input.timestampMs}`.replace(/[^a-zA-Z0-9-]/g, "")
}

export function createSubmitResponseTransaction(input: {
  packageId: string
  formId: string
  blobId: string
  rootHash: string
  response: WalformResponse
  rating: number | null
}) {
  const tx = new Transaction()

  tx.setGasBudget(20_000_000)
  tx.moveCall({
    target: `${input.packageId}::form::submit_response`,
    arguments: [
      tx.object(input.formId),
      tx.pure.vector("u8", bytes(input.blobId)),
      tx.pure.vector("u8", bytes(input.rootHash)),
      tx.pure.option("address", input.response.submitter),
      tx.pure.u64(input.response.submitted_at_ms),
      tx.pure.u8(SEVERITY_TO_MOVE_CODE[input.response.severity ?? "none"]),
      tx.pure.option("u64", input.rating),
    ],
  })

  return tx
}

export function getConfiguredPackageId(): string | null {
  return process.env.NEXT_PUBLIC_WALFORM_PACKAGE_ID || null
}

export function getConfiguredSuiChain(): "sui:testnet" | "sui:mainnet" {
  return process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet" ? "sui:mainnet" : "sui:testnet"
}

export function isSuiObjectId(value: string | null | undefined): value is string {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value)
}

export function createFormTransaction(packageId: string, schemaBlobId: string) {
  const tx = new Transaction()
  tx.setGasBudget(20_000_000)
  tx.moveCall({
    target: `${packageId}::form::create_form`,
    arguments: [tx.pure.vector("u8", bytes(schemaBlobId)), tx.pure.u64(1)],
  })
  return tx
}

export function extractCreatedObjectId(
  result: {
    objectChanges?: Array<{ type: string; objectType?: string; objectId?: string }> | null
  },
  typeSuffix: string,
): string | null {
  for (const change of result.objectChanges ?? []) {
    if (change.type === "created" && change.objectType?.endsWith(typeSuffix) && change.objectId) {
      return change.objectId
    }
  }
  return null
}

export function createDepositBountyTransaction(input: {
  packageId: string
  formId: string
  amountMist: bigint
}) {
  const tx = new Transaction()
  tx.setGasBudget(20_000_000)
  const coin = tx.coin({
    type: `${input.packageId}::form::WAL`,
    balance: input.amountMist,
  })
  tx.moveCall({
    target: `${input.packageId}::bounty::deposit`,
    arguments: [tx.object(input.formId), coin],
  })
  return tx
}

export function createApproveResponseTransaction(input: {
  packageId: string
  formId: string
  responseIndex: number
  submitter: string
}) {
  const tx = new Transaction()
  tx.setGasBudget(20_000_000)
  const payout = tx.moveCall({
    target: `${input.packageId}::bounty::approve_response`,
    arguments: [tx.object(input.formId), tx.pure.u64(input.responseIndex)],
  })
  tx.transferObjects([payout], tx.pure.address(input.submitter))
  return tx
}

function bytes(value: string): number[] {
  return Array.from(new TextEncoder().encode(value))
}
