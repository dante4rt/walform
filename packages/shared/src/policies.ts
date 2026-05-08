import { NETWORK_PACKAGE_IDS } from "./constants"
import type { PolicyType } from "./types"

export const POLICY_LABELS: Record<PolicyType, string> = {
  open: "Open",
  token_gated: "Token gated",
  allowlist: "Allowlist",
  time_locked: "Time locked",
}

const PKG = NETWORK_PACKAGE_IDS.testnet.walform

export const DEFAULT_POLICY_MODULES: Record<PolicyType, string> = {
  open: `${PKG}::policy_open::seal_approve`,
  token_gated: `${PKG}::policy_token_gated::seal_approve`,
  allowlist: `${PKG}::policy_allowlist::seal_approve`,
  time_locked: `${PKG}::policy_time_locked::seal_approve`,
}
