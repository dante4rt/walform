import { responseRefSchema, walformResponseSchema, type ResponseRef, type WalformResponse } from "@walform/shared"

import { createDemoTxDigest, createReceiptMintDraft, createSubmitResponseMoveDraft } from "./sui"

const STORAGE_PREFIX = "walform:demo"
const PACKAGE_ID = "0xwalform_demo"

export interface StoredSubmission {
  ref: ResponseRef
  encryptedPayload: string
  encryption: {
    algorithm: "AES-GCM"
    iv: string
    keyName: string
  }
  tx: {
    digest: string
    submit: ReturnType<typeof createSubmitResponseMoveDraft>
    receipt: ReturnType<typeof createReceiptMintDraft> | null
  }
}

export interface SubmitFormInput {
  formId: string
  answers: Record<string, unknown>
  severity: WalformResponse["severity"]
  submissionMode: WalformResponse["client_meta"]["submission_mode"]
  submitter: string | null
  rating: number | null
}

export async function submitFormResponse(input: SubmitFormInput): Promise<StoredSubmission> {
  const response = walformResponseSchema.parse({
    form_id: input.formId,
    submitted_at_ms: Date.now(),
    submitter: input.submissionMode === "wallet" ? input.submitter : null,
    answers: input.answers,
    severity: input.severity,
    client_meta: {
      submission_mode: input.submissionMode,
    },
  })
  const payload = encodeJson(response)
  const encrypted = await encryptPayload(input.formId, payload)
  const blobId = createBlobId(input.formId, response.submitted_at_ms)
  const rootHash = await digestHex(encrypted.bytes)
  const responseIndex = getStoredSubmissions(input.formId).length
  const ref = responseRefSchema.parse({
    blob_id: blobId,
    root_hash: rootHash,
    submitter: response.submitter,
    timestamp_ms: response.submitted_at_ms,
    severity: response.severity ?? "none",
    status: "new",
    notes_blob_id: null,
  })
  const digest = createDemoTxDigest({
    formId: input.formId,
    blobId,
    timestampMs: response.submitted_at_ms,
  })
  const submit = createSubmitResponseMoveDraft({
    packageId: PACKAGE_ID,
    formId: input.formId,
    blobId,
    rootHash,
    response,
    rating: input.rating,
  })
  const receipt =
    response.submitter ?
      createReceiptMintDraft({
        packageId: PACKAGE_ID,
        formId: input.formId,
        responseIndex,
        issuedTo: response.submitter,
        issuedAtMs: response.submitted_at_ms,
      })
    : null
  const stored = {
    ref,
    encryptedPayload: bytesToBase64(encrypted.bytes),
    encryption: {
      algorithm: "AES-GCM" as const,
      iv: bytesToBase64(encrypted.iv),
      keyName: encrypted.keyName,
    },
    tx: {
      digest,
      submit,
      receipt,
    },
  }

  appendStoredSubmission(input.formId, stored)
  return stored
}

export function getStoredSubmissions(formId: string): StoredSubmission[] {
  if (typeof window === "undefined") {
    return []
  }

  const rawValue = window.localStorage.getItem(submissionsKey(formId))
  if (!rawValue) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredSubmission[]
    return parsed.map((submission) => ({
      ...submission,
      ref: responseRefSchema.parse(submission.ref),
    }))
  } catch {
    return []
  }
}

export function updateStoredSubmission(formId: string, updated: StoredSubmission): void {
  const submissions = getStoredSubmissions(formId).map((submission) =>
    submission.ref.blob_id === updated.ref.blob_id ? updated : submission,
  )
  window.localStorage.setItem(submissionsKey(formId), JSON.stringify(submissions))
}

export async function decryptStoredSubmission(
  _formId: string,
  submission: StoredSubmission,
): Promise<WalformResponse> {
  const key = await getOrCreateKey(submission.encryption.keyName)
  const payload = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(base64ToBytes(submission.encryption.iv)),
    },
    key,
    toArrayBuffer(base64ToBytes(submission.encryptedPayload)),
  )

  return walformResponseSchema.parse(decodeJson(new Uint8Array(payload)))
}

export function createNotesBlobId(formId: string, responseBlobId: string): string {
  return createBlobId(`${formId}-notes-${responseBlobId}`, Date.now())
}

function appendStoredSubmission(formId: string, submission: StoredSubmission): void {
  const submissions = getStoredSubmissions(formId)
  window.localStorage.setItem(submissionsKey(formId), JSON.stringify([...submissions, submission]))
}

async function encryptPayload(formId: string, payload: Uint8Array) {
  const keyName = keyNameForForm(formId)
  const key = await getOrCreateKey(keyName)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(payload),
  )

  return {
    bytes: new Uint8Array(encrypted),
    iv,
    keyName,
  }
}

async function getOrCreateKey(keyName: string): Promise<CryptoKey> {
  const storedKey = window.localStorage.getItem(keyName)

  if (storedKey) {
    return crypto.subtle.importKey(
      "raw",
      toArrayBuffer(base64ToBytes(storedKey)),
      "AES-GCM",
      false,
      ["encrypt", "decrypt"],
    )
  }

  const keyBytes = crypto.getRandomValues(new Uint8Array(32))
  window.localStorage.setItem(keyName, bytesToBase64(keyBytes))
  return crypto.subtle.importKey("raw", toArrayBuffer(keyBytes), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ])
}

async function digestHex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function submissionsKey(formId: string): string {
  return `${STORAGE_PREFIX}:submissions:${formId}`
}

function keyNameForForm(formId: string): string {
  return `${STORAGE_PREFIX}:seal-key:${formId}`
}

function createBlobId(formId: string, timestampMs: number): string {
  return `blob-${formId}-${timestampMs}-${Math.random().toString(36).slice(2, 8)}`
}

function encodeJson(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value))
}

function decodeJson(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder().decode(bytes))
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return window.btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = window.atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}
