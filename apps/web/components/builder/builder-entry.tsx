"use client"

import { useSearchParams } from "next/navigation"

import { parseTemplateSchema } from "./builder-schema"
import { WalformBuilder } from "./walform-builder"

export function BuilderEntry() {
  const searchParams = useSearchParams()
  const encodedSchema = searchParams.get("templateSchema")
  const templateSchema = parseTemplateSchema(encodedSchema ?? undefined)

  return <WalformBuilder key={encodedSchema ?? "blank"} templateSchema={templateSchema} />
}
