import Link from "next/link"

import { CostBadge } from "@/components/CostBadge"
import { ThemeToggle } from "@/components/theme-toggle"

const featureTiles = [
  {
    title: "Form builder",
    copy: "Eight field types, required toggles, reusable templates, and schema JSON that matches the protocol.",
    tone: "bg-[#CCFBF1]",
  },
  {
    title: "Walrus storage",
    copy: "Schemas, encrypted responses, screenshots, and demo video assets live as verifiable Walrus blobs.",
    tone: "bg-[#E0F2FE]",
  },
  {
    title: "Seal privacy",
    copy: "Responses encrypt client-side. Owners and approved admins decrypt through policy-gated sessions.",
    tone: "bg-[#FED7AA]",
  },
]

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-[var(--color-canvas)] text-[var(--color-charcoal)]">
      <section className="bg-[var(--color-primary-deep)] text-[var(--color-on-dark)]">
        <div className="mx-auto flex max-w-7xl items-center justify-end px-5 pt-4 md:px-8">
          <ThemeToggle />
        </div>
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 md:grid-cols-[1fr_0.85fr] md:px-8 md:py-16 lg:py-20">
          <div className="flex max-w-3xl flex-col justify-center">
            <p className="mb-5 w-fit rounded-[var(--radius-pill)] border border-white/20 px-4 py-2 text-sm font-medium text-teal-50">
              Walrus-native feedback protocol
            </p>
            <h1 className="max-w-4xl text-5xl font-bold leading-[1.05] tracking-normal text-white md:text-6xl lg:text-[64px]">
              Forms with proof. Responses with privacy.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-teal-50/85">
              Build wallet-aware forms, store encrypted responses on Walrus, and prove submission
              counts through Sui objects without exposing private feedback.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-12 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-accent)] px-5 text-base font-semibold text-[var(--color-on-accent)] shadow-sm hover:bg-[#FBBF24]"
                href="/builder/"
              >
                Create a form
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center rounded-[var(--radius-button)] border border-white/25 px-5 text-base font-semibold text-white hover:bg-white/10"
                href="/f/demo/"
              >
                See live demo
              </Link>
            </div>
            <div className="mt-4">
              <CostBadge /></div>
          </div>

          <div className="relative">
            <div className="rounded-[var(--radius-hero)] border border-white/15 bg-white p-4 text-[var(--color-charcoal)] shadow-[var(--shadow-hero)]">
              <div className="rounded-2xl border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-slate)]">
                      Builder
                    </p>
                    <h2 className="text-xl font-bold text-[var(--color-ink)]">
                      Walrus Sessions Feedback
                    </h2>
                  </div>
                  <span className="rounded-[var(--radius-pill)] bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E]">
                    Seal enabled
                  </span>
                </div>
                <div className="grid gap-3">
                  {["What worked well?", "Overall rating", "Attach screenshot"].map((label) => (
                    <div
                      className="rounded-xl border border-[var(--color-hairline-soft)] bg-white p-3"
                      key={label}
                    >
                      <div className="mb-2 h-3 w-2/5 rounded bg-[#99F6E4]" />
                      <p className="text-sm font-semibold text-[var(--color-charcoal)]">{label}</p>
                      <div className="mt-3 h-10 rounded-[var(--radius-button)] border border-dashed border-[var(--color-stone)] bg-white" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-[var(--color-ink)]">
                  <div className="rounded-lg bg-[#CCFBF1] px-2 py-3">42 responses</div>
                  <div className="rounded-lg bg-[#E0F2FE] px-2 py-3">4.7 rating</div>
                  <div className="rounded-lg bg-[#FED7AA] px-2 py-3">1 WAL pool</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-10 md:grid-cols-3 md:px-8">
        {featureTiles.map((tile) => (
          <article
            className={`${tile.tone} rounded-[var(--radius-card)] border border-white/60 p-6 shadow-[var(--shadow-card)]`}
            key={tile.title}
          >
            <h2 className="text-xl font-bold text-[var(--color-ink)]">{tile.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-charcoal)]">{tile.copy}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
