"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

import { AdminDashboard } from "@/components/admin/admin-dashboard"

function AdminPageContent() {
  const searchParams = useSearchParams()
  const formId = searchParams.get("formId") || "demo"

  if (!formId.trim()) {
    return (
      <main className="min-h-[100dvh] bg-[var(--color-canvas)] px-5 py-10 text-[var(--color-charcoal)] md:px-8">
        <section className="mx-auto max-w-2xl rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-bold text-[var(--color-ink)]">Missing form ID</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-slate)]">
            Open an admin dashboard with a form ID in the URL.
          </p>
          <Link
            className="mt-5 inline-flex h-10 items-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)]"
            href="/admin/?formId=demo"
          >
            Open demo admin
          </Link>
        </section>
      </main>
    )
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
