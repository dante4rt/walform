import type { ResponseRef, WalformResponse } from "@walform/shared"

import {
  createNotesBlobId,
  decryptStoredSubmission,
  getStoredSubmissions,
  updateStoredSubmission,
} from "@/lib/submissions"

export interface AdminResponseRecord {
  index: number
  ref: ResponseRef
  response: WalformResponse
  note: string
}

const NOTE_STORAGE_PREFIX = "walform-admin-note"
const LEGACY_NOTE_STORAGE_PREFIX = "walform-demo-note"

export async function loadAdminRecords(formId: string): Promise<AdminResponseRecord[]> {
  const storedSubmissions = getStoredSubmissions(formId)
  const localRecords = await Promise.all(
    storedSubmissions.map(async (submission, index) => ({
      index,
      ref: submission.ref,
      response: await decryptStoredSubmission(formId, submission),
      note: readStoredNote(submission.ref.notes_blob_id),
    })),
  )

  return localRecords
}

export async function saveAdminNote(input: {
  formId: string
  record: AdminResponseRecord
  note: string
}): Promise<string> {
  const blobId = createNotesBlobId(input.formId, input.record.ref.blob_id)
  const ciphertext = btoa(`owner-key-demo:${input.note}`)

  localStorage.setItem(noteKey(blobId), input.note)
  localStorage.setItem(noteCiphertextKey(blobId), ciphertext)

  const storedSubmission = getStoredSubmissions(input.formId).find(
    (submission) => submission.ref.blob_id === input.record.ref.blob_id,
  )

  if (storedSubmission) {
    updateStoredSubmission(input.formId, {
      ...storedSubmission,
      ref: {
        ...storedSubmission.ref,
        notes_blob_id: blobId,
      },
    })
  }

  return blobId
}

function readStoredNote(blobId: string | null): string {
  if (!blobId) {
    return ""
  }

  return localStorage.getItem(noteKey(blobId)) ?? localStorage.getItem(legacyNoteKey(blobId)) ?? ""
}

function noteKey(blobId: string): string {
  return `${NOTE_STORAGE_PREFIX}:${blobId}`
}

function noteCiphertextKey(blobId: string): string {
  return `${NOTE_STORAGE_PREFIX}-ciphertext:${blobId}`
}

function legacyNoteKey(blobId: string): string {
  return `${LEGACY_NOTE_STORAGE_PREFIX}:${blobId}`
}
