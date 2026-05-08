export const FIELD_TYPES = [
  "rich_text",
  "dropdown",
  "checkbox_group",
  "star_rating",
  "screenshot",
  "video",
  "url",
  "confirmation",
] as const

export type FieldType = (typeof FIELD_TYPES)[number]

export const POLICY_TYPES = ["open", "token_gated", "allowlist", "time_locked"] as const

export type PolicyType = (typeof POLICY_TYPES)[number]

export const SEVERITIES = ["none", "low", "medium", "high", "critical"] as const

export type Severity = (typeof SEVERITIES)[number]

export const RESPONSE_STATUSES = ["new", "triaged", "approved", "resolved", "rejected"] as const

export type ResponseStatus = (typeof RESPONSE_STATUSES)[number]

export type SubmissionMode = "wallet" | "signed_anon"

export interface BaseField {
  id: string
  type: FieldType
  label: string
  required?: boolean
}

export interface OptionField extends BaseField {
  type: "dropdown" | "checkbox_group"
  options: string[]
}

export interface StarRatingField extends BaseField {
  type: "star_rating"
  max: number
}

export type FormField = BaseField | OptionField | StarRatingField

export interface PolicyConfig {
  type: PolicyType
  config: Record<string, unknown>
}

export interface EncryptionConfig {
  mode: "seal"
  threshold: number
  policy_module: string
}

export interface BountyConfig {
  enabled: boolean
  tiers: {
    low: string
    medium: string
    high: string
    critical?: string
  }
}

export interface WalformSchema {
  version: number
  title: string
  description: string
  vibe: "fun" | "formal" | "neutral"
  fields: FormField[]
  policy: PolicyConfig
  encryption: EncryptionConfig
  bounty: BountyConfig
  submission_mode: SubmissionMode
  webhook_url?: string
}

export interface WalformResponse {
  form_id: string
  submitted_at_ms: number
  submitter: string | null
  answers: Record<string, unknown>
  severity: Severity | null
  client_meta: {
    submission_mode: SubmissionMode
  }
}

export interface ResponseRef {
  blob_id: string
  root_hash: string
  submitter: string | null
  timestamp_ms: number
  severity: Severity
  status: ResponseStatus
  notes_blob_id: string | null
}

export interface Receipt {
  form_id: string
  response_index: number
  issued_to: string
  issued_at_ms: number
}
