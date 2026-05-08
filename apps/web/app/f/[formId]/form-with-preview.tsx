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
      const stored = localStorage.getItem("walform:builder-preview")
      if (stored) {
        const parsed = walformSchema.parse(JSON.parse(stored))
        setSchema(parsed)
        localStorage.removeItem("walform:builder-preview")
      }
    } catch {
      // Invalid JSON or schema — fall back to demo.
    }
  }, [])

  return <PublicForm formId={formId} schema={schema} />
}
