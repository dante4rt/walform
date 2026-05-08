import {
  DEFAULT_POLICY_MODULES,
  FIELD_TYPES,
  walformSchema,
  type FieldType,
  type FormField,
  type PolicyType,
  type SubmissionMode,
  type WalformSchema,
} from "@walform/shared"

export interface BuilderFormValues {
  title: string
  description: string
  vibe: WalformSchema["vibe"]
  policyType: PolicyType
  submissionMode: SubmissionMode
}

export interface BuilderField {
  id: string
  type: FieldType
  label: string
  required: boolean
  options: string[]
  max: number
}

export interface FieldBlueprint {
  type: FieldType
  label: string
  help: string
}

export const FIELD_BLUEPRINTS: FieldBlueprint[] = [
  { type: "rich_text", label: "Rich text", help: "Long-form written feedback." },
  { type: "dropdown", label: "Dropdown", help: "Single choice from fixed options." },
  { type: "checkbox_group", label: "Checkbox", help: "Multiple categories or tags." },
  { type: "star_rating", label: "Star rating", help: "Clear public aggregate signal." },
  { type: "screenshot", label: "Screenshot", help: "Image evidence for bug reports." },
  { type: "video", label: "Video", help: "Short walkthrough upload." },
  { type: "url", label: "URL", help: "Project, issue, or proof link." },
  { type: "confirmation", label: "Confirmation", help: "Explicit consent or attestation." },
]

export const DEFAULT_BUILDER_VALUES: BuilderFormValues = {
  title: "Walrus Sessions Feedback",
  description: "Tell us what worked, what broke, and what would make Walform useful.",
  vibe: "fun",
  policyType: "open",
  submissionMode: "wallet",
}

const DEFAULT_LABELS: Record<FieldType, string> = {
  rich_text: "What worked well?",
  dropdown: "How did you find us?",
  checkbox_group: "Which areas does this touch?",
  star_rating: "Overall rating",
  screenshot: "Attach a screenshot",
  video: "Optional walkthrough video",
  url: "Project or issue link",
  confirmation: "I confirm this feedback is genuine",
}

const DEFAULT_OPTIONS: Partial<Record<FieldType, string[]>> = {
  dropdown: ["Discord", "X", "Friend", "Other"],
  checkbox_group: ["Bug", "Idea", "Praise"],
}

export function createBuilderField(type: FieldType, index: number): BuilderField {
  return {
    id: `f${index}`,
    type,
    label: DEFAULT_LABELS[type],
    required: type === "rich_text" || type === "star_rating" || type === "confirmation",
    options: DEFAULT_OPTIONS[type] ?? [],
    max: 5,
  }
}

export function createInitialFields(): BuilderField[] {
  return FIELD_TYPES.map((type, index) => createBuilderField(type, index + 1))
}

export function createBuilderValuesFromSchema(schema: WalformSchema): BuilderFormValues {
  return {
    title: schema.title,
    description: schema.description,
    vibe: schema.vibe,
    policyType: schema.policy.type,
    submissionMode: schema.submission_mode,
  }
}

export function createBuilderFieldsFromSchema(schema: WalformSchema): BuilderField[] {
  return schema.fields.map((field, index) => ({
    id: field.id || `f${index + 1}`,
    type: field.type,
    label: field.label,
    required: field.required ?? false,
    options: "options" in field ? field.options : [],
    max: "max" in field ? field.max : 5,
  }))
}

export function getNextFieldIndex(fields: BuilderField[]): number {
  const usedIndexes = fields
    .map((field) => Number.parseInt(field.id.replace(/^f/, ""), 10))
    .filter(Number.isFinite)

  return usedIndexes.length === 0 ? 1 : Math.max(...usedIndexes) + 1
}

export function moveField(
  fields: BuilderField[],
  activeId: string,
  targetId: string,
): BuilderField[] {
  const activeIndex = fields.findIndex((field) => field.id === activeId)
  const targetIndex = fields.findIndex((field) => field.id === targetId)

  if (activeIndex < 0 || targetIndex < 0 || activeIndex === targetIndex) {
    return fields
  }

  const nextFields = fields.slice()
  const [activeField] = nextFields.splice(activeIndex, 1)
  nextFields.splice(targetIndex, 0, activeField)
  return nextFields
}

export function normalizeField(field: BuilderField): FormField {
  const baseField = {
    id: field.id,
    type: field.type,
    label: field.label.trim(),
    required: field.required,
  }

  if (field.type === "dropdown" || field.type === "checkbox_group") {
    return {
      ...baseField,
      type: field.type,
      options: field.options.map((option) => option.trim()).filter(Boolean),
    }
  }

  if (field.type === "star_rating") {
    return {
      ...baseField,
      type: field.type,
      max: field.max,
    }
  }

  return baseField
}

export function buildWalformSchema(
  values: BuilderFormValues,
  fields: BuilderField[],
): WalformSchema {
  const schema = {
    version: 1,
    title: values.title.trim(),
    description: values.description.trim(),
    vibe: values.vibe,
    fields: fields.map(normalizeField),
    policy: {
      type: values.policyType,
      config: {},
    },
    encryption: {
      mode: "seal",
      threshold: 2,
      policy_module: DEFAULT_POLICY_MODULES[values.policyType],
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
    submission_mode: values.submissionMode,
  } satisfies WalformSchema

  return walformSchema.parse(schema)
}

export function parseTemplateSchema(value: string | string[] | undefined): WalformSchema | null {
  if (typeof value !== "string" || !value) {
    return null
  }

  try {
    return walformSchema.parse(JSON.parse(value))
  } catch {
    return null
  }
}
