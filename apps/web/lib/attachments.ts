export interface AttachmentAnswer {
  kind: "attachment"
  name: string
  mimeType: string
  size: number
  previewDataUrl?: string
  storageKey?: string
}

const MAX_INLINE_PREVIEW_BYTES = 2 * 1024 * 1024
const ATTACHMENT_DB_NAME = "walform-attachments"
const ATTACHMENT_DB_VERSION = 1
const ATTACHMENT_STORE_NAME = "files"

export async function createAttachmentAnswer(
  file: File,
  fieldType: "screenshot" | "video",
): Promise<AttachmentAnswer> {
  const shouldInlinePreview =
    fieldType === "screenshot" &&
    file.type.startsWith("image/") &&
    file.size <= MAX_INLINE_PREVIEW_BYTES
  const storageKey = createAttachmentStorageKey()
  const persistedStorageKey = await saveAttachmentFile(storageKey, file)
    .then(() => storageKey)
    .catch(() => undefined)

  return {
    kind: "attachment",
    name: file.name,
    mimeType: file.type || (fieldType === "screenshot" ? "image/*" : "video/*"),
    size: file.size,
    previewDataUrl: shouldInlinePreview ? await readFileAsDataUrl(file) : undefined,
    storageKey: persistedStorageKey,
  }
}

export function isAttachmentAnswer(value: unknown): value is AttachmentAnswer {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "attachment" &&
    "name" in value &&
    typeof value.name === "string" &&
    "size" in value &&
    typeof value.size === "number"
  )
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Unknown size"
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 102.4) / 10} KB`
  }

  return `${Math.round(bytes / (1024 * 102.4)) / 10} MB`
}

export async function loadAttachmentPreviewUrl(
  attachment: AttachmentAnswer,
): Promise<string | null> {
  if (attachment.storageKey) {
    const blob = await loadAttachmentFile(attachment.storageKey)

    if (blob) {
      return URL.createObjectURL(blob)
    }
  }

  return attachment.previewDataUrl ?? null
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("File preview could not be read."))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error("File preview could not be read."))
    reader.readAsDataURL(file)
  })
}

function createAttachmentStorageKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `attachment:${crypto.randomUUID()}`
  }

  return `attachment:${Date.now()}:${Math.random().toString(36).slice(2)}`
}

function saveAttachmentFile(storageKey: string, file: File): Promise<void> {
  return withAttachmentStore("readwrite", (store) => store.put(file, storageKey)).then(
    () => undefined,
  )
}

function loadAttachmentFile(storageKey: string): Promise<Blob | null> {
  return withAttachmentStore("readonly", (store) => store.get(storageKey)).then((value) =>
    value instanceof Blob ? value : null,
  )
}

function withAttachmentStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Browser attachment storage is unavailable."))
      return
    }

    const openRequest = indexedDB.open(ATTACHMENT_DB_NAME, ATTACHMENT_DB_VERSION)

    openRequest.onupgradeneeded = () => {
      const db = openRequest.result

      if (!db.objectStoreNames.contains(ATTACHMENT_STORE_NAME)) {
        db.createObjectStore(ATTACHMENT_STORE_NAME)
      }
    }

    openRequest.onerror = () => reject(openRequest.error ?? new Error("Attachment storage failed."))
    openRequest.onsuccess = () => {
      const db = openRequest.result
      const transaction = db.transaction(ATTACHMENT_STORE_NAME, mode)
      const store = transaction.objectStore(ATTACHMENT_STORE_NAME)
      let request: IDBRequest<T> | void
      let result: T | undefined

      try {
        request = run(store)
      } catch (error) {
        db.close()
        reject(error)
        return
      }

      if (request) {
        request.onsuccess = () => {
          result = request.result
        }
        request.onerror = () => reject(request.error ?? new Error("Attachment storage failed."))
      }

      transaction.oncomplete = () => {
        db.close()
        resolve(result as T)
      }
      transaction.onerror = () => {
        db.close()
        reject(transaction.error ?? new Error("Attachment storage failed."))
      }
      transaction.onabort = () => {
        db.close()
        reject(transaction.error ?? new Error("Attachment storage failed."))
      }
    }
  })
}
