/**
 * Walrus storage cost estimates for Walform response storage.
 *
 * PRICE NOTE: WALRUS_STORAGE_PRICE_PER_KIB_EPOCH_MIST is a testnet estimate
 * derived from `walrus info` CLI output. In production this value should be
 * read from the Walrus system object on-chain (the `storage_price_per_unit_size`
 * field in the StakingInnerV1 shared object) so the UI always reflects the
 * live network price rather than a hardcoded constant.
 *
 * 1 WAL = 1_000_000_000 MIST (same denomination as SUI/MIST)
 * Walrus charges per KiB per epoch.
 */

/** Default storage duration shown in the UI. */
export const EPOCHS_DEFAULT = 26

/**
 * Testnet price per KiB per epoch in MIST.
 * Source: `walrus info` on Walrus testnet — replace with on-chain read in prod.
 */
export const WALRUS_STORAGE_PRICE_PER_KIB_EPOCH_MIST = 10_000n

/** Average size of one encrypted form response payload, in KiB. */
export const RESPONSE_SIZE_KIB = 2

/** MIST per WAL. */
const MIST_PER_WAL = 1_000_000_000n

/**
 * Returns the total storage cost in MIST for storing `responseCount` responses
 * over `epochs` epochs, where each response is `responseSizeKib` KiB.
 */
export function estimateCostMist({
  responseCount,
  epochs,
  responseSizeKib = RESPONSE_SIZE_KIB,
}: {
  responseCount: number
  epochs: number
  responseSizeKib?: number
}): bigint {
  const count = BigInt(Math.max(0, Math.floor(responseCount)))
  const ep = BigInt(Math.max(1, Math.floor(epochs)))
  const kib = BigInt(Math.max(1, Math.floor(responseSizeKib)))
  return count * kib * ep * WALRUS_STORAGE_PRICE_PER_KIB_EPOCH_MIST
}

/**
 * Formats a MIST amount as a human-readable WAL string with two decimal places.
 * Example: 520_000_000n → "0.52 WAL"
 */
export function formatCostWal(mist: bigint): string {
  const whole = mist / MIST_PER_WAL
  // Compute fractional part as two decimal digits (floor, not round).
  const remainder = mist % MIST_PER_WAL
  const cents = (remainder * 100n) / MIST_PER_WAL
  return `${whole}.${String(cents).padStart(2, "0")} WAL`
}

/**
 * Returns a formatted cost string for 1,000 responses at the given epoch count.
 * Example return: "0.52 WAL"
 */
export function costPerThousandResponses(epochs: number = EPOCHS_DEFAULT): string {
  const mist = estimateCostMist({ responseCount: 1_000, epochs })
  return formatCostWal(mist)
}
