import { DEFAULT_POLICY_MODULES } from "@walform/shared"
import { walformSchema, type WalformSchema } from "@walform/shared"

export const DEMO_FORM_SCHEMA = walformSchema.parse({
  version: 1,
  title: "Walrus Sessions Feedback",
  description: "Share the feedback, proof, and context the team needs to prioritize the next fix.",
  vibe: "fun",
  fields: [
    {
      id: "f1",
      type: "rich_text",
      label: "What worked well?",
      required: true,
    },
    {
      id: "f2",
      type: "dropdown",
      label: "Session",
      options: ["Builder demo", "Submit flow", "Admin review", "Templates"],
      required: true,
    },
    {
      id: "f3",
      type: "checkbox_group",
      label: "Areas touched",
      options: ["UX", "Storage", "Encryption", "Contracts"],
      required: true,
    },
    {
      id: "f4",
      type: "star_rating",
      label: "Overall rating",
      max: 5,
      required: true,
    },
    {
      id: "f5",
      type: "screenshot",
      label: "Screenshot proof",
    },
    {
      id: "f6",
      type: "video",
      label: "Walkthrough video",
    },
    {
      id: "f7",
      type: "url",
      label: "Project or issue link",
    },
    {
      id: "f8",
      type: "confirmation",
      label: "I confirm this response is accurate",
      required: true,
    },
  ],
  policy: {
    type: "open",
    config: {},
  },
  encryption: {
    mode: "seal",
    threshold: 2,
    policy_module: DEFAULT_POLICY_MODULES.open,
  },
  bounty: {
    enabled: false,
    tiers: {
      low: "100000000",
      medium: "500000000",
      high: "2000000000",
      critical: "5000000000",
    },
  },
  submission_mode: "wallet",
} satisfies WalformSchema)

export function getDemoFormSchema(): WalformSchema {
  return DEMO_FORM_SCHEMA
}
