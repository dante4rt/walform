/**
 * Webhook dispatch for Walform.
 * Fires a POST to the admin's configured URL on new submission.
 * Payload contains the encrypted blob reference — the receiver must
 * decrypt client-side using their own Seal session key.
 */

export interface WebhookPayload {
  /** Form object ID on Sui. */
  formId: string
  /** Walrus blob ID of the encrypted response. */
  blobId: string
  /** Root hash of the blob. */
  rootHash: string
  /** Sui transaction digest (if submitted on-chain). */
  txDigest: string | null
  /** Unix timestamp (ms) of the submission. */
  timestampMs: number
  /** Submitter address (null for anonymous). */
  submitter: string | null
  /** Severity tag if set. */
  severity: string | null
}

export interface WebhookResult {
  ok: boolean
  status: number | null
  error: string | null
}

const STORAGE_PREFIX = "walform:webhook"
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000
const TIMEOUT_MS = 10000

/**
 * Get the stored webhook URL for a form.
 */
export function getWebhookUrl(formId: string): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(`${STORAGE_PREFIX}:${formId}`)
}

/**
 * Store a webhook URL for a form.
 */
export function setWebhookUrl(formId: string, url: string): void {
  if (typeof window === "undefined") return
  if (url.trim()) {
    window.localStorage.setItem(`${STORAGE_PREFIX}:${formId}`, url.trim())
  } else {
    window.localStorage.removeItem(`${STORAGE_PREFIX}:${formId}`)
  }
}

/**
 * Fire a webhook notification. Non-blocking — errors are returned, not thrown.
 * Retries up to MAX_RETRIES times on network failure.
 */
export async function fireWebhook(
  url: string,
  payload: WebhookPayload,
): Promise<WebhookResult> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Walform-Form": payload.formId,
          "X-Walform-Signature": await hmacSignature(JSON.stringify(payload)),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        keepalive: true,
      })

      clearTimeout(timeout)

      if (response.ok) {
        return { ok: true, status: response.status, error: null }
      }

      // Don't retry on client errors (4xx).
      if (response.status >= 400 && response.status < 500) {
        return {
          ok: false,
          status: response.status,
          error: `Webhook returned ${response.status}`,
        }
      }

      // Server error — retry.
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * (attempt + 1))
        continue
      }

      return {
        ok: false,
        status: response.status,
        error: `Webhook returned ${response.status} after ${MAX_RETRIES + 1} attempts`,
      }
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * (attempt + 1))
        continue
      }

      return {
        ok: false,
        status: null,
        error: error instanceof Error ? error.message : "Webhook request failed",
      }
    }
  }

  return { ok: false, status: null, error: "Unexpected webhook failure" }
}

/**
 * Dispatch a webhook if a URL is configured for the form.
 * Returns null if no webhook is set.
 */
export async function dispatchWebhook(
  formId: string,
  payload: Omit<WebhookPayload, "formId">,
): Promise<WebhookResult | null> {
  const url = getWebhookUrl(formId)
  if (!url) return null
  return fireWebhook(url, { formId, ...payload })
}

// --- Helpers ---

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate a lightweight HMAC signature for webhook verification.
 * Uses a per-form secret stored in sessionStorage.
 */
async function hmacSignature(body: string): Promise<string> {
  try {
    const secret = getOrCreateWebhookSecret()
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
    return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("")
  } catch {
    return ""
  }
}

function getOrCreateWebhookSecret(): string {
  const key = "walform:webhook-secret"
  let secret = sessionStorage.getItem(key)
  if (!secret) {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    secret = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")
    sessionStorage.setItem(key, secret)
  }
  return secret
}
