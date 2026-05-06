interface FormPageProps {
  params: Promise<{ formId: string }>
}

export function generateStaticParams() {
  return [{ formId: "demo" }]
}

export default async function FormPage({ params }: FormPageProps) {
  const { formId } = await params

  return (
    <main className="min-h-[100dvh] bg-[var(--color-canvas)] px-5 py-10 text-[var(--color-charcoal)]">
      <div className="mx-auto max-w-3xl rounded-[var(--radius-card)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)]">
        <p className="font-mono text-sm text-[var(--color-slate)]">{formId}</p>
        <h1 className="mt-3 text-3xl font-bold text-[var(--color-ink)]">Public form preview</h1>
        <p className="mt-4 leading-7 text-[var(--color-slate)]">
          Submit flow wiring starts after the Wave 1 storage and encryption libraries are verified.
        </p>
      </div>
    </main>
  )
}
