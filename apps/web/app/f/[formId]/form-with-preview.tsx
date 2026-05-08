"use client"

import type { WalformSchema } from "@walform/shared"
import { walformSchema } from "@walform/shared"
import { useMemo, useSyncExternalStore } from "react"

import { PublicForm } from "@/components/form/public-form"

interface FormWithPreviewProps {
  formId: string
  fallbackSchema: WalformSchema
}

function getStoredSchemaJson(formId: string): string | null {
  if (typeof window === "undefined") return null

  return (
    localStorage.getItem(`walform:schema:${formId}`) ??
    localStorage.getItem("walform:builder-preview")
  )
}

function parseStoredSchema(value: string | null): WalformSchema | null {
  if (!value) return null

  try {
    return walformSchema.parse(JSON.parse(value))
  } catch {
    return null
  }
}

function subscribeToStoredSchema(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  return () => window.removeEventListener("storage", onStoreChange)
}

/**
 * Client wrapper that checks localStorage for a builder-exported schema.
 * If found, uses it instead of the fallback (demo) schema.
 */
export function FormWithPreview({ formId, fallbackSchema }: FormWithPreviewProps) {
  const storedSchemaJson = useSyncExternalStore(
    subscribeToStoredSchema,
    () => getStoredSchemaJson(formId),
    () => null,
  )
  const schema = useMemo(
    () => parseStoredSchema(storedSchemaJson) ?? fallbackSchema,
    [fallbackSchema, storedSchemaJson],
  )

  return <PublicForm formId={formId} schema={schema} />
}
