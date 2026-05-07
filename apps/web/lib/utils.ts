import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Truncates a Sui object ID for display.
 * e.g. "0x06dfe154...be50" (0x + first 6 hex chars + ... + last 4 hex chars)
 */
export function formatFormId(id: string): string {
  if (!id.startsWith("0x") || id.length <= 12) return id
  const hex = id.slice(2)
  return `0x${hex.slice(0, 6)}…${hex.slice(-4)}`
}
