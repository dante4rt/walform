import Link from "next/link"

import { createTemplateBuilderHref, WALFORM_TEMPLATES } from "@/lib/templates"

const TEMPLATE_TONES = [
  "bg-[#CCFBF1] text-[#134E4A]",
  "bg-[#E0F2FE] text-[#075985]",
  "bg-[#FED7AA] text-[#9A3412]",
  "bg-[#FEF3C7] text-[#92400E]",
  "bg-white text-[var(--color-ink)]",
] as const

export default function TemplatesPage() {
  return (
    <main className="min-h-[100dvh] bg-[var(--color-canvas)] px-5 py-8 text-[var(--color-charcoal)] md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid gap-8 rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] md:grid-cols-[1fr_0.75fr] md:p-8">
          <div>
            <p className="text-sm font-semibold text-[var(--color-primary)]">Templates</p>
            <h1 className="mt-2 max-w-3xl text-4xl font-bold leading-tight text-[var(--color-ink)] md:text-5xl">
              Start from a form that already matches the Walform schema.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-slate)]">
              Pick a template for product, support, events, or governance. Each one is validated
              against the shared schema and opens the builder with a template payload in the URL.
            </p>
          </div>

          <div className="grid content-end gap-3 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-3xl font-bold text-[var(--color-ink)]">
                  {WALFORM_TEMPLATES.length}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-normal text-[var(--color-slate)]">
                  Templates
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[var(--color-ink)]">8</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-normal text-[var(--color-slate)]">
                  Field types
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[var(--color-ink)]">1</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-normal text-[var(--color-slate)]">
                  Schema
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {WALFORM_TEMPLATES.map((template, index) => (
            <article
              className="group rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]"
              key={template.slug}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-[var(--radius-pill)] px-3 py-1 text-xs font-bold ${
                        TEMPLATE_TONES[index % TEMPLATE_TONES.length]
                      }`}
                    >
                      {template.category}
                    </span>
                    <span className="font-mono text-xs text-[var(--color-slate)]">
                      {template.estimatedMinutes} min setup
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-[var(--color-ink)]">
                    {template.schema.title}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-slate)]">
                    {template.schema.description}
                  </p>
                </div>

                <Link
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-pressed)]"
                  href={createTemplateBuilderHref(template)}
                >
                  Use template
                </Link>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {template.schema.fields.slice(0, 4).map((field) => (
                  <div
                    className="rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-3"
                    key={field.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                        {field.label}
                      </p>
                      <span className="shrink-0 rounded-[var(--radius-pill)] bg-white px-2 py-1 font-mono text-[10px] text-[var(--color-slate)]">
                        {field.type.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--color-slate)]">
                <span>{template.schema.fields.length} fields</span>
                <span>Policy: {template.schema.policy.type.replace("_", " ")}</span>
                <span>Mode: {template.schema.submission_mode.replace("_", " ")}</span>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
