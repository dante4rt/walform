import { DEFAULT_POLICY_MODULES, walformSchema, type WalformSchema } from "@walform/shared"

export interface WalformTemplate {
  slug: string
  category: string
  estimatedMinutes: number
  schema: WalformSchema
}

function createTemplate(input: Omit<WalformTemplate, "schema"> & { schema: WalformSchema }) {
  return {
    ...input,
    schema: walformSchema.parse(input.schema),
  } satisfies WalformTemplate
}

function createBaseSchema(
  input: Pick<
    WalformSchema,
    "title" | "description" | "vibe" | "fields" | "policy" | "submission_mode"
  >,
): WalformSchema {
  return {
    version: 1,
    ...input,
    encryption: {
      mode: "seal",
      threshold: 2,
      policy_module: DEFAULT_POLICY_MODULES[input.policy.type],
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
  }
}

export const WALFORM_TEMPLATES = [
  createTemplate({
    slug: "bug-report",
    category: "Engineering",
    estimatedMinutes: 4,
    schema: createBaseSchema({
      title: "Bug Report",
      description:
        "Collect reproducible product defects with impact, environment details, and visual evidence.",
      vibe: "neutral",
      policy: {
        type: "open",
        config: {},
      },
      submission_mode: "wallet",
      fields: [
        {
          id: "f1",
          type: "rich_text",
          label: "What happened?",
          required: true,
        },
        {
          id: "f2",
          type: "rich_text",
          label: "Steps to reproduce",
          required: true,
        },
        {
          id: "f3",
          type: "dropdown",
          label: "Impact",
          required: true,
          options: ["Minor annoyance", "Blocks a workflow", "Data loss risk", "Security concern"],
        },
        {
          id: "f4",
          type: "screenshot",
          label: "Attach a screenshot or error state",
          required: false,
        },
        {
          id: "f5",
          type: "url",
          label: "Relevant page, issue, or transaction link",
          required: false,
        },
      ],
    }),
  }),
  createTemplate({
    slug: "nps",
    category: "Growth",
    estimatedMinutes: 2,
    schema: createBaseSchema({
      title: "NPS Survey",
      description: "Measure product sentiment and capture the reason behind each score.",
      vibe: "formal",
      policy: {
        type: "open",
        config: {},
      },
      submission_mode: "signed_anon",
      fields: [
        {
          id: "f1",
          type: "star_rating",
          label: "How likely are you to recommend Walform?",
          required: true,
          max: 10,
        },
        {
          id: "f2",
          type: "rich_text",
          label: "What is the main reason for your score?",
          required: true,
        },
        {
          id: "f3",
          type: "dropdown",
          label: "Which role best describes you?",
          required: false,
          options: ["Founder", "Developer", "DAO operator", "Community member", "Other"],
        },
      ],
    }),
  }),
  createTemplate({
    slug: "feature-request",
    category: "Product",
    estimatedMinutes: 5,
    schema: createBaseSchema({
      title: "Feature Request",
      description: "Prioritize product ideas with user context, urgency, and expected outcomes.",
      vibe: "neutral",
      policy: {
        type: "open",
        config: {},
      },
      submission_mode: "wallet",
      fields: [
        {
          id: "f1",
          type: "rich_text",
          label: "What should we build?",
          required: true,
        },
        {
          id: "f2",
          type: "rich_text",
          label: "What problem would this solve?",
          required: true,
        },
        {
          id: "f3",
          type: "dropdown",
          label: "Priority",
          required: true,
          options: ["Nice to have", "Important", "Urgent"],
        },
        {
          id: "f4",
          type: "checkbox_group",
          label: "Who benefits from this?",
          required: false,
          options: ["Form creators", "Respondents", "Admins", "Developers", "DAO members"],
        },
        {
          id: "f5",
          type: "url",
          label: "Reference link or example",
          required: false,
        },
      ],
    }),
  }),
  createTemplate({
    slug: "hackathon-submission",
    category: "Events",
    estimatedMinutes: 7,
    schema: createBaseSchema({
      title: "Hackathon Submission",
      description:
        "Review hackathon projects with demo links, team details, track selection, and attestation.",
      vibe: "fun",
      policy: {
        type: "open",
        config: {},
      },
      submission_mode: "wallet",
      fields: [
        {
          id: "f1",
          type: "rich_text",
          label: "Project summary",
          required: true,
        },
        {
          id: "f2",
          type: "url",
          label: "Repository URL",
          required: true,
        },
        {
          id: "f3",
          type: "url",
          label: "Demo or deployed app URL",
          required: true,
        },
        {
          id: "f4",
          type: "video",
          label: "Pitch video",
          required: false,
        },
        {
          id: "f5",
          type: "dropdown",
          label: "Track",
          required: true,
          options: ["Consumer app", "Developer tooling", "DAO and governance", "Infrastructure"],
        },
        {
          id: "f6",
          type: "confirmation",
          label: "I confirm this project was built during the hackathon window",
          required: true,
        },
      ],
    }),
  }),
  createTemplate({
    slug: "dao-survey",
    category: "Governance",
    estimatedMinutes: 5,
    schema: createBaseSchema({
      title: "DAO Survey",
      description:
        "Gather governance feedback from wallet-linked members before proposals move on-chain.",
      vibe: "formal",
      policy: {
        type: "token_gated",
        config: {},
      },
      submission_mode: "wallet",
      fields: [
        {
          id: "f1",
          type: "dropdown",
          label: "Proposal stance",
          required: true,
          options: ["Strong support", "Support", "Needs changes", "Oppose"],
        },
        {
          id: "f2",
          type: "rich_text",
          label: "Rationale",
          required: true,
        },
        {
          id: "f3",
          type: "checkbox_group",
          label: "Which areas does this affect?",
          required: false,
          options: ["Treasury", "Protocol", "Community", "Risk", "Operations"],
        },
        {
          id: "f4",
          type: "star_rating",
          label: "Confidence in the current proposal",
          required: true,
          max: 5,
        },
        {
          id: "f5",
          type: "confirmation",
          label: "I am submitting this feedback for my own wallet",
          required: true,
        },
      ],
    }),
  }),
] as const satisfies readonly WalformTemplate[]

export function getTemplateBySlug(slug: string): WalformTemplate | undefined {
  return WALFORM_TEMPLATES.find((template) => template.slug === slug)
}

export function createTemplateBuilderHref(template: WalformTemplate): string {
  const encodedSchema = encodeURIComponent(JSON.stringify(template.schema))

  return `/builder/?template=${encodeURIComponent(template.slug)}&templateSchema=${encodedSchema}`
}
