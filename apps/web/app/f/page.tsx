"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

import { FormWithPreview } from "@/app/f/[formId]/form-with-preview"
import { getDemoFormSchema } from "@/lib/demo-form"

function PublicFormPageContent() {
  const searchParams = useSearchParams()
  const formId = searchParams.get("formId") || "demo"
  const schema = getDemoFormSchema()

  if (!formId.trim()) {
    return (
      <main className="min-h-[100dvh] bg-[var(--color-canvas)] px-5 py-10 text-[var(--color-charcoal)] md:px-8">
        <section className="mx-auto max-w-2xl rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-bold text-[var(--color-ink)]">Missing form ID</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-slate)]">
            Open a public form with a form ID in the URL.
          </p>
          <Link
            className="mt-5 inline-flex h-10 items-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)]"
            href="/f/?formId=demo"
          >
            Open demo form
          </Link>
        </section>
      </main>
    )
  }

  return <FormWithPreview formId={formId} fallbackSchema={schema} />
}

export default function PublicFormPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] bg-[var(--color-canvas)] px-5 py-10 text-[var(--color-charcoal)] md:px-8">
          <section className="mx-auto max-w-2xl rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)]">
            <p className="text-sm font-semibold text-[var(--color-slate)]">Loading form...</p>
          </section>
        </main>
      }
    >
      <PublicFormPageContent />
    </Suspense>
  )
}
