"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { AdminLookup } from "@/components/admin/admin-lookup"

function AdminPageContent() {
  const searchParams = useSearchParams()
  const formId = searchParams.get("formId")?.trim() ?? ""

  if (!formId) {
    return <AdminLookup />
  }

  return <AdminDashboard formId={formId} />
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] bg-[var(--color-canvas)] px-5 py-10 text-[var(--color-charcoal)] md:px-8">
          <section className="mx-auto max-w-2xl rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)]">
            <p className="text-sm font-semibold text-[var(--color-slate)]">Loading admin...</p>
          </section>
        </main>
      }
    >
      <AdminPageContent />
    </Suspense>
  )
}
