import type { UploadQuiltFile } from "./walrus"

/**
 * Cost model assumptions (demo / illustrative only):
 *   - Each solo blob = 1 storage unit.
 *   - Quilting N blobs = N/5 storage units (5× compression ratio assumed for the
 *     Walrus quilt format based on shared header + cross-blob deduplication).
 *   - Real costs depend on blob sizes and the Walrus epoch pricing at submission
 *     time. Replace the QUILT_COMPRESSION_FACTOR constant with a live estimate
 *     once the SDK exposes cost pre-flight queries.
 */
const QUILT_COMPRESSION_FACTOR = 5

/** Minimum pending responses before quilt batching activates. */
export const QUILT_THRESHOLD = 5

export interface QuiltSavingsEstimate {
  /** Cost in storage units when uploading each response as a solo blob. */
  soloBlobs: number
  /** Cost in storage units when batching all responses into a quilt. */
  quilted: number
  /** Percentage saved by quilting, rounded to one decimal place. */
  savingsPct: number
}

/**
 * Estimate the storage-unit cost difference between solo uploads and a quilt.
 * Both values are in abstract "storage units" — useful for relative comparison.
 */
export function estimateQuiltSavings(responseCount: number): QuiltSavingsEstimate {
  if (responseCount <= 0) {
    return { soloBlobs: 0, quilted: 0, savingsPct: 0 }
  }

  const soloBlobs = responseCount
  const quilted = responseCount / QUILT_COMPRESSION_FACTOR
  const savingsPct = Math.round(((soloBlobs - quilted) / soloBlobs) * 1000) / 10

  return { soloBlobs, quilted, savingsPct }
}

/**
 * Returns true when there are enough pending responses to justify quilt batching.
 * Below the threshold, per-blob uploads have lower overhead.
 */
export function shouldUseQuilt(pendingCount: number): boolean {
  return pendingCount >= QUILT_THRESHOLD
}

/**
 * Map an array of already-uploaded submission records into the UploadQuiltFile
 * shape expected by walrus.ts `uploadQuilt`. The blob ID becomes the identifier
 * so the quilt index can be cross-referenced back to the original submission.
 */
export function buildQuiltFiles(
  submissions: Array<{ blobId: string; payload: Uint8Array }>,
): UploadQuiltFile[] {
  return submissions.map(({ blobId, payload }) => ({
    identifier: blobId,
    contents: payload,
  }))
}
