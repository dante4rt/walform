interface AdminPageProps {
  params: Promise<{ formId: string }>
}

export function generateStaticParams() {
  return [{ formId: "demo" }]
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { formId } = await params

  return (
    <main className="min-h-[100dvh] bg-[var(--color-canvas)] px-5 py-10 text-[var(--color-charcoal)]">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-sm text-[var(--color-slate)]">{formId}</p>
        <h1 className="mt-3 text-4xl font-bold text-[var(--color-ink)]">Admin dashboard</h1>
        <p className="mt-4 max-w-2xl leading-7 text-[var(--color-slate)]">
          Response decrypt, severity filters, notes, and exports are planned for the vertical slice.
        </p>
      </div>
    </main>
  )
}
