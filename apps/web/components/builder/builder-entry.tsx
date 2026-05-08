"use client"

import { useSearchParams } from "next/navigation"

import { getTemplateBySlug } from "@/lib/templates"

import { WalformBuilder } from "./walform-builder"

export function BuilderEntry() {
  const searchParams = useSearchParams()
  const slug = searchParams.get("template")
  const templateSchema = slug ? (getTemplateBySlug(slug)?.schema ?? null) : null

  return <WalformBuilder key={slug ?? "blank"} templateSchema={templateSchema} />
}
