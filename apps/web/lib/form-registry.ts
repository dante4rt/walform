const STORAGE_KEY = "walform:known-forms"
const SCHEMA_PREFIX = "walform:schema:"
const MAX_KNOWN_FORMS = 24

export interface KnownForm {
  formId: string
  title: string
  owner: string | null
  createdAtMs: number
}

export function rememberKnownForm(input: KnownForm): void {
  if (typeof window === "undefined") {
    return
  }

  const forms = mergeKnownForms([
    {
      ...input,
      title: input.title.trim() || "Untitled form",
      createdAtMs: input.createdAtMs || Date.now(),
    },
    ...loadKnownForms(),
  ]).slice(0, MAX_KNOWN_FORMS)

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(forms))
}

export function loadKnownForms(): KnownForm[] {
  if (typeof window === "undefined") {
    return []
  }

  return mergeKnownForms([...loadStoredRegistry(), ...loadSchemaBackfill()])
}

function loadStoredRegistry(): KnownForm[] {
  const rawValue = window.localStorage.getItem(STORAGE_KEY)
  if (!rawValue) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(rawValue)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.flatMap((item) => {
      const form = parseKnownForm(item)
      return form ? [form] : []
    })
  } catch {
    return []
  }
}

function loadSchemaBackfill(): KnownForm[] {
  const forms: KnownForm[] = []

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key?.startsWith(SCHEMA_PREFIX)) {
      continue
    }

    const formId = key.slice(SCHEMA_PREFIX.length)
    const schemaJson = window.localStorage.getItem(key)
    forms.push({
      formId,
      title: schemaJson ? (readSchemaTitle(schemaJson) ?? "Local form") : "Local form",
      owner: null,
      createdAtMs: 0,
    })
  }

  return forms
}

function mergeKnownForms(forms: KnownForm[]): KnownForm[] {
  const byId = new Map<string, KnownForm>()

  for (const form of forms) {
    const existing = byId.get(form.formId)
    byId.set(form.formId, {
      formId: form.formId,
      title: form.title || existing?.title || "Untitled form",
      owner: form.owner ?? existing?.owner ?? null,
      createdAtMs: Math.max(form.createdAtMs, existing?.createdAtMs ?? 0),
    })
  }

  return [...byId.values()].sort((first, second) => second.createdAtMs - first.createdAtMs)
}

function parseKnownForm(value: unknown): KnownForm | null {
  if (!isObject(value)) {
    return null
  }

  if (typeof value.formId !== "string" || !value.formId.trim()) {
    return null
  }

  return {
    formId: value.formId.trim(),
    title: typeof value.title === "string" && value.title.trim() ? value.title : "Untitled form",
    owner: typeof value.owner === "string" && value.owner.trim() ? value.owner : null,
    createdAtMs: typeof value.createdAtMs === "number" ? value.createdAtMs : 0,
  }
}

function readSchemaTitle(schemaJson: string): string | null {
  try {
    const parsed: unknown = JSON.parse(schemaJson)
    if (!isObject(parsed) || typeof parsed.title !== "string") {
      return null
    }

    return parsed.title.trim() || null
  } catch {
    return null
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
