import Link from "next/link"

import { createTemplateBuilderHref, WALFORM_TEMPLATES } from "@/lib/templates"

const TEMPLATE_TONES = [
  "bg-[var(--color-tint-mint)] text-[var(--color-primary-deep)]",
  "bg-[var(--color-tint-sky)] text-[var(--color-primary)]",
  "bg-[var(--color-tint-peach)] text-[var(--color-accent-deep)]",
  "bg-[var(--color-tint-cream)] text-[var(--color-accent)]",
  "bg-[var(--color-card)] text-[var(--color-ink)]",
] as const

export default function TemplatesPage() {
  return (
    <main className="min-h-[100dvh] bg-[var(--color-canvas)] px-5 py-8 text-[var(--color-charcoal)] md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid gap-8 rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] md:grid-cols-[1fr_0.75fr] md:p-8">
          <div>
            <p className="text-sm font-semibold text-[var(--color-primary)]">Templates</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight text-[var(--color-ink)] md:text-5xl">
              Start from a form that already matches the Walform schema.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-slate)]">
              Pick a template for product, support, events, or governance. Each one is validated
              against the shared schema and opens the builder with a template payload in the URL.
            </p>
          </div>

          <div className="grid content-end gap-4 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                {
                  value: String(WALFORM_TEMPLATES.length),
                  label: "Templates",
                  icon: "solar:widget-5-linear",
                },
                { value: "8", label: "Field types", icon: "solar:list-check-linear" },
                { value: "1", label: "Schema", icon: "solar:shield-check-linear" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-tint-mint)] text-[var(--color-primary)]">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {stat.label === "Templates" && (
                        <>
                          <rect x="3" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="3" width="7" height="7" rx="1" />
                          <rect x="3" y="14" width="7" height="7" rx="1" />
                          <rect x="14" y="14" width="7" height="7" rx="1" />
                        </>
                      )}
                      {stat.label === "Field types" && (
                        <>
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <line x1="3" y1="12" x2="21" y2="12" />
                          <line x1="3" y1="18" x2="21" y2="18" />
                          <circle cx="7" cy="6" r="1.5" fill="currentColor" />
                          <rect x="7" y="12" width="4" height="3" rx="0.5" fill="currentColor" />
                          <path d="M7 18l2-3 2 3 2-3 2 3" />
                        </>
                      )}
                      {stat.label === "Schema" && (
                        <>
                          <path d="M12 2l8 4v6c0 5.5-3.8 10.7-8 12-4.2-1.3-8-6.5-8-12V6l8-4z" />
                          <path d="M9 12l2 2 4-4" />
                        </>
                      )}
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--color-ink)] tabular-nums">
                      {stat.value}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-slate)]">
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-[var(--radius-button)] border border-dashed border-[var(--color-hairline)] bg-[var(--color-card)] px-3 py-2 text-xs text-[var(--color-slate)]">
              <span className="inline-block size-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
              All templates use the Walform v1 schema
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {WALFORM_TEMPLATES.map((template, index) => {
            const isLast = index === WALFORM_TEMPLATES.length - 1
            const tone = TEMPLATE_TONES[index % TEMPLATE_TONES.length]

            if (isLast) {
              return (
                <article
                  className="group overflow-hidden sm:col-span-2 rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] sm:p-5"
                  key={template.slug}
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-[var(--radius-pill)] px-3 py-1 text-xs font-bold ${tone}`}
                        >
                          {template.category}
                        </span>
                        <span className="font-mono text-xs text-[var(--color-slate)]">
                          {template.estimatedMinutes} min setup
                        </span>
                        <span className="rounded-[var(--radius-pill)] border border-[var(--color-hairline-soft)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-slate)]">
                          Featured
                        </span>
                      </div>
                      <h2 className="mt-3 text-xl font-bold text-[var(--color-ink)] sm:text-2xl">
                        {template.schema.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">
                        {template.schema.description}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--color-slate)]">
                        <span>{template.schema.fields.length} fields</span>
                        <span>·</span>
                        <span>Policy: {template.schema.policy.type.replace("_", " ")}</span>
                        <span>·</span>
                        <span>Mode: {template.schema.submission_mode.replace("_", " ")}</span>
                      </div>
                      <Link
                        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-pressed)] sm:w-auto"
                        href={createTemplateBuilderHref(template)}
                      >
                        Use template
                      </Link>
                    </div>

                    <div className="grid w-full shrink-0 grid-cols-1 gap-2 sm:w-64 sm:grid-cols-2">
                      {template.schema.fields.slice(0, 4).map((field) => (
                        <div
                          className="overflow-hidden rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-3"
                          key={field.id}
                        >
                          <p className="truncate text-xs font-semibold text-[var(--color-ink)]">
                            {field.label}
                          </p>
                          <span className="mt-1 inline-block rounded-[var(--radius-pill)] bg-[var(--color-card)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-slate)]">
                            {field.type.replace("_", " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              )
            }

            return (
              <article
                className="group overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] sm:p-5"
                key={template.slug}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-[var(--radius-pill)] px-3 py-1 text-xs font-bold ${tone}`}
                      >
                        {template.category}
                      </span>
                      <span className="font-mono text-xs text-[var(--color-slate)]">
                        {template.estimatedMinutes} min
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-bold text-[var(--color-ink)]">
                      {template.schema.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-slate)] hidden sm:block">
                      {template.schema.description}
                    </p>
                  </div>

                  <Link
                    className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-pressed)] sm:w-auto sm:shrink-0"
                    href={createTemplateBuilderHref(template)}
                  >
                    Use template
                  </Link>
                </div>

                <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2">
                  {template.schema.fields.slice(0, 2).map((field) => (
                    <div
                      className="overflow-hidden rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-3"
                      key={field.id}
                    >
                      <p className="truncate text-xs font-semibold text-[var(--color-ink)]">
                        {field.label}
                      </p>
                      <span className="mt-1 inline-block rounded-[var(--radius-pill)] bg-[var(--color-card)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--color-slate)]">
                        {field.type.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[var(--color-slate)] sm:mt-4">
                  <span>{template.schema.fields.length} fields</span>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline">
                    Policy: {template.schema.policy.type.replace("_", " ")}
                  </span>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline">
                    Mode: {template.schema.submission_mode.replace("_", " ")}
                  </span>
                </div>
              </article>
            )
          })}
        </section>
      </div>
    </main>
  )
}
