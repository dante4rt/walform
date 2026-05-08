"use client"

import type { WalformSchema } from "@walform/shared"
import { walformSchema } from "@walform/shared"
import { useState } from "react"

import { PublicForm } from "@/components/form/public-form"

interface FormWithPreviewProps {
  formId: string
  fallbackSchema: WalformSchema
}

function loadSchemaFromStorage(formId: string, fallback: WalformSchema): WalformSchema {
  if (typeof window === "undefined") return fallback
  try {
    // 1. Check for a schema stored specifically for this form ID (from deploy).
    const byId = localStorage.getItem(`walform:schema:${formId}`)
    if (byId) return walformSchema.parse(JSON.parse(byId))
    // 2. Check for a one-shot builder preview (from Export JSON).
    const preview = localStorage.getItem("walform:builder-preview")
    if (preview) {
      localStorage.removeItem("walform:builder-preview")
      return walformSchema.parse(JSON.parse(preview))
    }
  } catch {
    // Invalid JSON or schema — fall back to demo.
  }
  return fallback
}

/**
 * Client wrapper that checks localStorage for a builder-exported schema.
 * If found, uses it instead of the fallback (demo) schema.
 */
export function FormWithPreview({ formId, fallbackSchema }: FormWithPreviewProps) {
  const [schema] = useState(() => loadSchemaFromStorage(formId, fallbackSchema))

  return <PublicForm formId={formId} schema={schema} />
}
