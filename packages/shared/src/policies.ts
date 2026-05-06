import type { PolicyType } from "./types"

export const POLICY_LABELS: Record<PolicyType, string> = {
  open: "Open",
  token_gated: "Token gated",
  allowlist: "Allowlist",
  time_locked: "Time locked",
}

export const DEFAULT_POLICY_MODULES: Record<PolicyType, string> = {
  open: "0x0::policy_open::seal_approve",
  token_gated: "0x0::policy_token_gated::seal_approve",
  allowlist: "0x0::policy_allowlist::seal_approve",
  time_locked: "0x0::policy_time_locked::seal_approve",
}
