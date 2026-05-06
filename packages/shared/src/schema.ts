import { z } from "zod"

import { FIELD_TYPES, POLICY_TYPES, RESPONSE_STATUSES, SEVERITIES } from "./types"

export const formFieldSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("rich_text"),
    label: z.string().min(1),
    required: z.boolean().optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("dropdown"),
    label: z.string().min(1),
    options: z.array(z.string().min(1)).min(1),
    required: z.boolean().optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("checkbox_group"),
    label: z.string().min(1),
    options: z.array(z.string().min(1)).min(1),
    required: z.boolean().optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("star_rating"),
    label: z.string().min(1),
    max: z.number().int().min(1).max(10),
    required: z.boolean().optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("screenshot"),
    label: z.string().min(1),
    required: z.boolean().optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("video"),
    label: z.string().min(1),
    required: z.boolean().optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("url"),
    label: z.string().min(1),
    required: z.boolean().optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("confirmation"),
    label: z.string().min(1),
    required: z.boolean().optional(),
  }),
])

export const walformSchema = z.object({
  version: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string(),
  vibe: z.enum(["fun", "formal", "neutral"]),
  fields: z.array(formFieldSchema).min(1),
  policy: z.object({
    type: z.enum(POLICY_TYPES),
    config: z.record(z.string(), z.unknown()),
  }),
  encryption: z.object({
    mode: z.literal("seal"),
    threshold: z.number().int().min(1),
    policy_module: z.string().min(1),
  }),
  bounty: z.object({
    enabled: z.boolean(),
    tiers: z.object({
      low: z.string(),
      medium: z.string(),
      high: z.string(),
      critical: z.string().optional(),
    }),
  }),
  submission_mode: z.enum(["wallet", "signed_anon"]),
  webhook_url: z.url().optional(),
})

export const walformResponseSchema = z.object({
  form_id: z.string().min(1),
  submitted_at_ms: z.number().int().nonnegative(),
  submitter: z.string().nullable(),
  answers: z.record(z.string(), z.unknown()),
  severity: z.enum(SEVERITIES).nullable(),
  client_meta: z.object({
    submission_mode: z.enum(["wallet", "signed_anon"]),
  }),
})

export const responseRefSchema = z.object({
  blob_id: z.string().min(1),
  root_hash: z.string(),
  submitter: z.string().nullable(),
  timestamp_ms: z.number().int().nonnegative(),
  severity: z.enum(SEVERITIES),
  status: z.enum(RESPONSE_STATUSES),
  notes_blob_id: z.string().nullable(),
})

export { FIELD_TYPES, POLICY_TYPES, RESPONSE_STATUSES, SEVERITIES }
