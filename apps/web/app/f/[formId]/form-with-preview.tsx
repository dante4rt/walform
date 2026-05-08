"use client"

import type { WalformSchema } from "@walform/shared"
import { walformSchema } from "@walform/shared"
import { useEffect, useState } from "react"

import { PublicForm } from "@/components/form/public-form"

interface FormWithPreviewProps {
  formId: string
  fallbackSchema: WalformSchema
}

/**
 * Client wrapper that checks localStorage for a builder-exported schema.
 * If found, uses it instead of the fallback (demo) schema.
 * The localStorage entry is consumed once and cleared.
 */
export function FormWithPreview({ formId, fallbackSchema }: FormWithPreviewProps) {
  const [schema, setSchema] = useState(fallbackSchema)

  useEffect(() => {
    try {
      // 1. Check for a schema stored specifically for this form ID (from deploy).
      const byId = localStorage.getItem(`walform:schema:${formId}`)
      if (byId) {
        setSchema(walformSchema.parse(JSON.parse(byId)))
        return
      }
      // 2. Check for a one-shot builder preview (from Export JSON).
      const preview = localStorage.getItem("walform:builder-preview")
      if (preview) {
        setSchema(walformSchema.parse(JSON.parse(preview)))
        localStorage.removeItem("walform:builder-preview")
      }
    } catch {
      // Invalid JSON or schema — fall back to demo.
    }
  }, [formId])

  return <PublicForm formId={formId} schema={schema} />
}
