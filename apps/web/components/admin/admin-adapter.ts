import type { ResponseRef, ResponseStatus, Severity, WalformResponse } from "@walform/shared"

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

export interface ResponseRefWithIndex extends ResponseRef {
  index: number
}

export interface AdminDataAdapter {
  listResponseRefs(formId: string): Promise<ResponseRefWithIndex[]>
  readEncryptedResponse(blobId: string): Promise<Uint8Array>
  decryptResponse(ciphertext: Uint8Array, ref: ResponseRefWithIndex): Promise<WalformResponse>
  readNote(blobId: string | null): Promise<string>
  saveNote(input: { formId: string; responseIndex: number; ownerKeyId: string; note: string }): Promise<string>
}

export async function loadAdminRecords(formId: string): Promise<AdminResponseRecord[]> {
  const storedSubmissions = getStoredSubmissions(formId)
  const localRecords = await Promise.all(
    storedSubmissions.map(async (submission, index) => ({
      index,
      ref: submission.ref,
      response: await decryptStoredSubmission(formId, submission),
      note: await demoAdminAdapter.readNote(submission.ref.notes_blob_id),
    })),
  )

  const demoRecords = await Promise.all(
    (await demoAdminAdapter.listResponseRefs(formId)).map(async (ref) => {
      const [ciphertext, note] = await Promise.all([
        demoAdminAdapter.readEncryptedResponse(ref.blob_id),
        demoAdminAdapter.readNote(ref.notes_blob_id),
      ])
      const response = await demoAdminAdapter.decryptResponse(ciphertext, ref)
      return {
        index: ref.index + localRecords.length,
        ref,
        response,
        note,
      }
    }),
  )

  return [...localRecords, ...demoRecords]
}

export async function saveAdminNote(input: {
  formId: string
  record: AdminResponseRecord
  note: string
}): Promise<string> {
  const blobId = createNotesBlobId(input.formId, input.record.ref.blob_id)
  const ciphertext = btoa(`owner-key-demo:${input.note}`)

  localStorage.setItem(`walform-demo-note:${blobId}`, input.note)
  localStorage.setItem(`walform-demo-note-ciphertext:${blobId}`, ciphertext)

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

export const demoAdminAdapter: AdminDataAdapter = {
  async listResponseRefs(formId) {
    return demoResponses.map((record) => ({
      ...record.ref,
      blob_id: `${formId}-${record.ref.blob_id}`,
      index: record.index,
    }))
  },
  async readEncryptedResponse(blobId) {
    const index = Number(blobId.split("-").at(-1))
    const record = demoResponses.find((item) => item.index === index)
    return new TextEncoder().encode(JSON.stringify(record?.response))
  },
  async decryptResponse(ciphertext) {
    return JSON.parse(new TextDecoder().decode(ciphertext)) as WalformResponse
  },
  async readNote(blobId) {
    if (!blobId) {
      return ""
    }

    return localStorage.getItem(`walform-demo-note:${blobId}`) ?? "Needs owner review before bounty approval."
  },
  async saveNote(input) {
    const ciphertext = btoa(`${input.ownerKeyId}:${input.note}`)
    const blobId = `notes-${input.formId}-${input.responseIndex}-${Date.now()}`
    localStorage.setItem(`walform-demo-note:${blobId}`, input.note)
    localStorage.setItem(`walform-demo-note-ciphertext:${blobId}`, ciphertext)
    return blobId
  },
}

const demoResponses: AdminResponseRecord[] = [
  createDemoRecord(0, "critical", "new", 18, "0x9f2...a1c", {
    issue: "Checkout fails after wallet approval",
    reproduction: "Select Pro plan, approve wallet prompt, submit button stays disabled.",
    impact: "Blocks paid signup for Sui wallet users.",
  }),
  createDemoRecord(1, "high", "triaged", 140, "0x41b...82e", {
    issue: "Screenshot upload stalls on large files",
    browser: "Chrome 124",
    attachment: "walrus://blob-screenshot-1",
  }),
  createDemoRecord(2, "medium", "new", 310, null, {
    issue: "Confirmation copy says saved before receipt appears",
    expectation: "Show receipt pending until chain event confirms.",
  }),
  createDemoRecord(3, "low", "resolved", 830, "0xa0c...7d5", {
    issue: "Dropdown option wraps awkwardly on mobile",
    device: "iPhone 15",
  }),
  createDemoRecord(4, "critical", "triaged", 1290, "0x72d...11a", {
    issue: "Token-gated policy accepts expired allowlist proof",
    reproduction: "Reuse yesterday's signed proof against today's form.",
  }),
  createDemoRecord(5, "medium", "approved", 1800, null, {
    issue: "Video answer preview lacks duration metadata",
    request: "Add duration and blob id to the admin row.",
  }),
  createDemoRecord(6, "high", "new", 2600, "0x5ee...9ab", {
    issue: "Webhook retry sends duplicate payloads",
    count: 3,
  }),
  createDemoRecord(7, "none", "rejected", 4300, null, {
    issue: "Test submission from hackathon booth",
    note: "No product issue.",
  }),
  createDemoRecord(8, "low", "new", 6600, "0xb18...4ef", {
    issue: "Rich text field loses line break after paste",
    editor: "Tiptap",
  }),
  createDemoRecord(9, "medium", "triaged", 9200, null, {
    issue: "Anonymous receipt copy needs clearer wallet language",
    channel: "Discord beta tester",
  }),
]

function createDemoRecord(
  index: number,
  severity: Severity,
  status: ResponseStatus,
  minutesAgo: number,
  submitter: string | null,
  answers: Record<string, unknown>,
): AdminResponseRecord {
  const timestamp = Date.now() - minutesAgo * 60 * 1000

  return {
    index,
    note: index === 0 ? "Escalate to payment owner; bounty tier likely critical." : "",
    ref: {
      blob_id: `response-${index}`,
      root_hash: `0x${(index + 17).toString(16).padStart(2, "0")}walrusroot${index}`,
      submitter,
      timestamp_ms: timestamp,
      severity,
      status,
      notes_blob_id: index === 0 ? `notes-demo-${index}` : null,
    },
    response: {
      form_id: "demo",
      submitted_at_ms: timestamp,
      submitter,
      answers,
      severity,
      client_meta: {
        submission_mode: submitter ? "wallet" : "signed_anon",
      },
    },
  }
}
