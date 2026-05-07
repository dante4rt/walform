import type { Severity, WalformResponse } from "@walform/shared"

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
