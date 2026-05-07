/**
 * IndexedDB-backed draft autosave for offline form submissions.
 * Stores in-progress answers per form so users can resume after going offline.
 *
 * Drafts are encrypted at rest using an ephemeral AES-GCM key stored in
 * sessionStorage (cleared when the tab closes).
 */

const DB_NAME = "walform-drafts"
const DB_VERSION = 1
const STORE_NAME = "drafts"
const KEY_PREFIX = "walform:draft-key:"

export interface DraftRecord {
  formId: string
  answers: Record<string, unknown>
  severity: string
  updatedAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "formId" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Save a draft. Call this on field blur or debounced field change.
 * Non-blocking — errors are logged, not thrown.
 */
export async function saveDraft(record: DraftRecord): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)

    const encrypted = await encryptDraft(record)
    store.put(encrypted)

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.warn("[Walform] Draft save failed:", error)
  }
}

/**
 * Load a draft for a given form. Returns null if none exists.
 */
export async function loadDraft(formId: string): Promise<DraftRecord | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(formId)

    const encrypted = await new Promise<EncryptedDraft | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    if (!encrypted) return null
    return await decryptDraft(encrypted)
  } catch (error) {
    console.warn("[Walform] Draft load failed:", error)
    return null
  }
}

/**
 * Delete a draft after successful submission.
 */
export async function deleteDraft(formId: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).delete(formId)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.warn("[Walform] Draft delete failed:", error)
  }
}

// --- Encryption at rest ---

interface EncryptedDraft {
  formId: string
  data: string // base64
  iv: string // base64
  updatedAt: number
}

async function getOrCreateDraftKey(formId: string): Promise<CryptoKey> {
  const storageKey = `${KEY_PREFIX}${formId}`
  const stored = sessionStorage.getItem(storageKey)

  if (stored) {
    const raw = base64ToBytes(stored)
    return crypto.subtle.importKey("raw", toArrayBuffer(raw), "AES-GCM", false, ["encrypt", "decrypt"])
  }

  const keyBytes = crypto.getRandomValues(new Uint8Array(32))
  sessionStorage.setItem(storageKey, bytesToBase64(keyBytes))
  return crypto.subtle.importKey("raw", toArrayBuffer(keyBytes), "AES-GCM", false, ["encrypt", "decrypt"])
}

async function encryptDraft(record: DraftRecord): Promise<EncryptedDraft> {
  const key = await getOrCreateDraftKey(record.formId)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(record))
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(plaintext))

  return {
    formId: record.formId,
    data: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
    updatedAt: record.updatedAt,
  }
}

async function decryptDraft(encrypted: EncryptedDraft): Promise<DraftRecord> {
  const key = await getOrCreateDraftKey(encrypted.formId)
  const ciphertext = base64ToBytes(encrypted.data)
  const iv = base64ToBytes(encrypted.iv)
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(ciphertext))
  return JSON.parse(new TextDecoder().decode(plaintext))
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}
