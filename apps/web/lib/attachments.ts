export interface AttachmentAnswer {
  kind: "attachment"
  name: string
  mimeType: string
  size: number
  previewDataUrl?: string
}

const MAX_INLINE_PREVIEW_BYTES = 2 * 1024 * 1024

export async function createAttachmentAnswer(
  file: File,
  fieldType: "screenshot" | "video",
): Promise<AttachmentAnswer> {
  const shouldInlinePreview =
    fieldType === "screenshot" &&
    file.type.startsWith("image/") &&
    file.size <= MAX_INLINE_PREVIEW_BYTES

  return {
    kind: "attachment",
    name: file.name,
    mimeType: file.type || (fieldType === "screenshot" ? "image/*" : "video/*"),
    size: file.size,
    previewDataUrl: shouldInlinePreview ? await readFileAsDataUrl(file) : undefined,
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
