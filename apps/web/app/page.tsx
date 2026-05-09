"use client"

import { Icon } from "@iconify/react"
import Image from "next/image"
import Link from "next/link"
import { type ReactNode, useEffect, useRef, useState } from "react"

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const els = root.querySelectorAll<HTMLElement>(".scroll-reveal, .scroll-reveal-stagger")
    if (!els.length) return

    root.dataset.revealReady = "true"

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" },
    )

    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return ref
}

const productPillars = [
  {
    icon: "solar:widget-5-linear",
    asset: "/landing/illustrations/form-builder.png",
    title: "Form builder",
    copy: "Every form is a Sui NFT with reusable fields, policies, and on-chain metadata.",
  },
  {
    icon: "solar:database-linear",
    asset: "/landing/illustrations/blob-storage.png",
    title: "Blob storage",
    copy: "Responses are stored as Walrus blobs instead of rows in a centralized database.",
  },
  {
    icon: "solar:lock-keyhole-linear",
    asset: "/landing/illustrations/seal-encryption.png",
    title: "Seal encryption",
    copy: "Threshold decryption keeps raw feedback private until authorized parties can inspect it.",
  },
  {
    icon: "solar:puzzle-linear",
    asset: "/landing/illustrations/composable-primitive.png",
    title: "Composable primitive",
    copy: "Move views expose counts and aggregate ratings for any Sui app to read.",
  },
  {
    icon: "solar:gift-linear",
    asset: "/landing/illustrations/bounty-payouts.png",
    title: "Bounty payouts",
    copy: "Escrow WAL to reward approved responses, reports, and useful feedback.",
  },
  {
    icon: "solar:shield-check-linear",
    asset: "/landing/illustrations/onchain-proof.png",
    title: "On-chain proof",
    copy: "Submitters receive non-transferable receipts without revealing private answers.",
  },
]

const painPoints = [
  "Google Forms can't prove submission counts",
  "Typeform caps break large community polls",
  "Teams need privacy without leaking PII",
  "Bots ruin airdrop signup forms",
  "On-chain users are hard to verify",
]

const differentiators = [
  {
    icon: "solar:plain-2-linear",
    title: "Walrus quilts",
    copy: "Sub-cent storage at scale for millions of responses.",
  },
  {
    icon: "solar:lock-password-linear",
    title: "Seal threshold",
    copy: "Multi-admin decrypt with policy-based access.",
  },
  {
    icon: "solar:window-frame-linear",
    title: "Walrus Sites ready",
    copy: "Deploy as a Walrus Site with one command. No central server.",
  },
  {
    icon: "solar:code-square-linear",
    title: "Move primitive",
    copy: "Form is a Sui object, not SaaS metadata.",
  },
]

const buildSteps = [
  ["01", "Build your form", "Create fields, policies, bounty, and access rules."],
  ["02", "Publish to Walrus", "Form schema is stored as a Sui-linked Walrus blob."],
  ["03", "Collect encrypted responses", "Answers encrypt with Seal and land on Walrus."],
  ["04", "Decrypt and analyse", "Admins decrypt, review entries, and export insights."],
]

const moveFunctions = [
  ["form::create", "Create a new form Sui NFT"],
  ["form::submit", "Submit encrypted response"],
  ["policy::check_access", "Check decrypt permissions"],
  ["cost::estimate", "Estimate storage cost"],
  ["bounty::claim", "Claim bounty escrow"],
]

const EXAMPLE_CODE = `import { WalrusClient } from "@mysten/walrus"
import { SealClient } from "@mysten/seal"
import { Transaction } from "@mysten/sui/transactions"

const walrus = new WalrusClient({
  network: "mainnet",
})
const seal = new SealClient({
  serverObjectIds,
})

const { encryptedObject } = await seal
  .encrypt({
    threshold: 2,
    packageId: WALFORM_PACKAGE_ID,
    identity: formId,
    data: new TextEncoder()
      .encode(JSON.stringify(response)),
  })

const blobId = await walrus
  .storeBlob(encryptedObject)

const tx = new Transaction()
tx.moveCall({
  target: WALFORM_PACKAGE_ID
    + "::form::submit_response",
  arguments: [
    tx.object(formId),
    tx.pure.vector("u8", blobId),
  ],
})`

function FieldPreview({
  label,
  meta,
  required,
}: {
  label: string
  meta: string
  required?: boolean
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--color-ink)]">{label}</p>
        <span className="font-mono text-[10px] text-[var(--color-stone)]">{meta}</span>
      </div>
      <div className="mt-2 h-7 rounded-[var(--radius-button)] border border-dashed border-[var(--color-hairline)] bg-[var(--color-canvas)]" />
      {required && (
        <span className="mt-2 inline-flex rounded-[var(--radius-pill)] bg-[var(--color-tint-mint)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary-deep)]">
          Required
        </span>
      )}
    </div>
  )
}

function useAnimatedNumber(target: number, durationMs = 900, decimals = 0) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    if (reduce) {
      const id = window.setTimeout(() => setValue(target), 0)
      return () => window.clearTimeout(id)
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])
  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString()
}

type MockupTab = "builder" | "preview" | "responses"

function BuilderPanel() {
  return (
    <div className="grid gap-2">
      <FieldPreview label="What worked well?" meta="Long text" required />
      <FieldPreview label="Overall rating" meta="Scale 1-10" required />
      <FieldPreview label="Attach screenshot" meta="File upload" />
    </div>
  )
}

function PreviewPanel() {
  const [text, setText] = useState("")
  const [rating, setRating] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const submit = () => {
    if (!text.trim() || rating === null) return
    setSubmitted(true)
  }

  return (
    <div className="grid gap-2.5">
      <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card)]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--color-ink)]">What worked well?</p>
          <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--color-tint-mint)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary-deep)]">
            <Icon icon="solar:lock-keyhole-linear" width={11} height={11} />
            Encrypted
          </span>
        </div>
        <textarea
          className="mockup-input"
          placeholder="The Move primitive felt obvious by minute three..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label="Sample feedback input"
        />
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card)]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Overall rating</p>
          <span className="font-mono text-[10px] text-[var(--color-stone)]">Scale 1-10</span>
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Sample rating">
          {Array.from({ length: 10 }, (_, idx) => idx + 1).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              data-active={rating === n}
              className="mockup-rating-chip"
              onClick={() => setRating(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={submit} className="mockup-cta" disabled={submitted}>
        <span className="mockup-icon-swap">
          <Icon
            icon="solar:lock-keyhole-linear"
            width={17}
            height={17}
            data-state={submitted ? "hidden" : "visible"}
          />
          <Icon
            icon="solar:check-circle-bold"
            width={17}
            height={17}
            data-state={submitted ? "visible" : "hidden"}
          />
        </span>
        {submitted ? "Encrypted with Seal" : "Encrypt and submit"}
      </button>
    </div>
  )
}

function ResponsesPanel() {
  const rows = [
    { id: "0x71a…f4c", rating: 9, severity: "Low", time: "2m ago" },
    { id: "0xa18…b22", rating: 10, severity: "Info", time: "11m ago" },
    { id: "0xc40…2e9", rating: 7, severity: "Med", time: "32m ago" },
  ]
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-1.5 shadow-[var(--shadow-card)]">
      <div className="grid grid-cols-[1.2fr_0.6fr_0.7fr_0.7fr] gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-stone)]">
        <span>Submitter</span>
        <span className="text-right">Rating</span>
        <span>Severity</span>
        <span className="text-right">Decrypt</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-[1.2fr_0.6fr_0.7fr_0.7fr] items-center gap-2 rounded-[var(--radius-button)] px-3 py-2.5 text-xs transition-[background-color] duration-150 hover:bg-[var(--color-canvas)]"
        >
          <span className="font-mono text-[11px] text-[var(--color-charcoal)]">{row.id}</span>
          <span className="mockup-stat-value text-right text-sm font-bold text-[var(--color-ink)]">
            {row.rating}
          </span>
          <span className="text-[11px] font-semibold text-[var(--color-charcoal)]">
            {row.severity}
          </span>
          <span className="flex items-center justify-end gap-1 text-[10px] font-semibold text-[var(--color-primary-deep)]">
            <Icon icon="solar:eye-linear" width={12} height={12} />
            {row.time}
          </span>
        </div>
      ))}
    </div>
  )
}

function AssetImage({
  src,
  alt,
  className,
  fallback,
}: {
  src: string
  alt: string
  className: string
  fallback: ReactNode
}) {
  const [failed, setFailed] = useState(false)

  if (failed) return fallback

  return (
    <Image
      src={src}
      alt={alt}
      width={256}
      height={256}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 py-2 text-center">
      <p className="mockup-stat-value font-mono text-base font-bold text-[var(--color-ink)]">
        {value}
      </p>
      <p className="text-[10px] font-medium text-[var(--color-slate)]">{label}</p>
    </div>
  )
}

function ProductMockup() {
  const [tab, setTab] = useState<MockupTab>("builder")
  const [pending, setPending] = useState<MockupTab | null>(null)

  const switchTab = (next: MockupTab) => {
    if (next === tab) return
    setPending(next)
    window.setTimeout(() => {
      setTab(next)
      setPending(null)
    }, 140)
  }

  const responses = useAnimatedNumber(42, 1100)
  const rating = useAnimatedNumber(4.7, 1100, 1)
  const receipts = useAnimatedNumber(1, 700)

  const proofChips: { icon: string; copy: string; href: string; label: string }[] = [
    {
      icon: "solar:shield-keyhole-linear",
      copy: "Response encrypted with Seal",
      href: "/f/demo/",
      label: "Try the encrypted submit flow",
    },
    {
      icon: "solar:database-linear",
      copy: "Stored as Walrus blob",
      href: "/admin/?formId=demo",
      label: "Inspect stored Walrus blobs in admin",
    },
    {
      icon: "solar:verified-check-linear",
      copy: "On-chain proof via Sui",
      href: "https://suiscan.xyz/mainnet/object/0xb90d18321d8c4652743a7c0ae0747b4723e7dedb954d5844c48b3bd44a715c4d",
      label: "View the Walform Move package on Suiscan",
    },
  ]

  return (
    <div className="relative">
      <div
        suppressHydrationWarning
        className="absolute -right-6 top-20 z-10 hidden w-52 space-y-3 lg:block"
      >
        {proofChips.map((chip, index) => {
          const external = chip.href.startsWith("http")
          const className = "mockup-chip scroll-reveal-stagger"
          const delayStyle = { transitionDelay: `${160 + index * 90}ms` }
          const inner = (
            <>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-tint-mint)] text-[var(--color-primary)]">
                <Icon icon={chip.icon} width={17} height={17} />
              </span>
              <span className="leading-tight text-pretty">{chip.copy}</span>
              <Icon
                icon="solar:arrow-right-up-linear"
                width={14}
                height={14}
                className="ml-auto text-[var(--color-stone)]"
                aria-hidden
              />
            </>
          )
          return external ? (
            <a
              key={chip.copy}
              href={chip.href}
              target="_blank"
              rel="noreferrer"
              aria-label={chip.label}
              className={className}
              style={delayStyle}
            >
              {inner}
            </a>
          ) : (
            <Link
              key={chip.copy}
              href={chip.href}
              aria-label={chip.label}
              className={className}
              style={delayStyle}
            >
              {inner}
            </Link>
          )
        })}
      </div>

      <div className="rounded-[var(--radius-hero)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-2.5 shadow-[var(--shadow-hero)]">
        <div className="rounded-[18px] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-4">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-slate)]">
                  Walform
                </p>
                <span className="rounded-full bg-[var(--color-tint-mint)] px-2 py-0.5 text-[9px] font-bold text-[var(--color-primary-deep)]">
                  LIVE
                </span>
              </div>
              <h2 className="mt-1 text-pretty text-lg font-bold text-[var(--color-ink)]">
                Walrus sessions feedback
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--color-tint-cream)] px-3 py-1 text-[10px] font-bold text-[var(--color-accent-deep)]">
              <Icon icon="solar:lock-keyhole-linear" width={11} height={11} />
              Seal enabled
            </span>
          </div>

          <div
            role="tablist"
            aria-label="Walform mockup view"
            className="mb-3 flex flex-wrap items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-1"
          >
            {(
              [
                ["builder", "solar:widget-5-linear", "Builder"],
                ["preview", "solar:pen-new-square-linear", "Live preview"],
                ["responses", "solar:chart-square-linear", "Responses"],
              ] as const
            ).map(([id, icon, label]) => (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={tab === id}
                data-active={tab === id}
                className="mockup-tab"
                onClick={() => switchTab(id)}
              >
                <Icon icon={icon} width={13} height={13} />
                {label}
              </button>
            ))}
          </div>

          <div
            className="mockup-panel mockup-scroll"
            data-state={pending ? "exit" : "enter"}
            role="tabpanel"
            aria-live="polite"
          >
            {tab === "builder" && <BuilderPanel />}
            {tab === "preview" && <PreviewPanel />}
            {tab === "responses" && <ResponsesPanel />}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <StatCard value={responses} label="responses" />
            <StatCard value={rating} label="avg rating" />
            <StatCard value={receipts} label="SBT receipts" />
          </div>

          <Link href="/f/demo/" className="mockup-cta mt-3">
            Try the live demo
            <Icon icon="solar:arrow-right-linear" width={15} height={15} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const scrollRef = useScrollReveal()

  return (
    <main
      ref={scrollRef}
      suppressHydrationWarning
      className="grain-overlay landing-bg min-h-[100dvh] bg-[var(--color-canvas)] text-[var(--color-charcoal)]"
    >
      <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-12 md:grid-cols-[0.95fr_1.05fr] md:items-center md:gap-10 md:px-8 md:pb-12 md:pt-16 md:min-h-[100dvh]">
        <div className="scroll-reveal relative z-10">
          <p className="mb-5 inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary-deep)]">
            <Icon icon="solar:verified-check-linear" width={15} height={15} />
            Walrus-native feedback and form protocol
          </p>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.02] tracking-tight text-[var(--color-ink)] md:text-7xl">
            Forms with <span className="hero-word-proof">proof.</span>
            <br />
            Responses with <span className="hero-word-privacy">privacy.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[var(--color-charcoal)] md:text-lg">
            Forms are Sui NFTs. Responses are encrypted Walrus blobs. A composable primitive any
            dApp can embed, audit, and reward without owning a private database.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="btn-primary" href="/builder/">
              Create your form
            </Link>
            <Link className="btn-secondary" href="/f/demo/">
              See live demo
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-[var(--color-slate)]">
            <span className="inline-flex items-center gap-1.5">
              <Icon
                icon="solar:lock-keyhole-linear"
                width={14}
                height={14}
                className="text-[var(--color-primary)]"
              />
              Seal encrypted
            </span>
            <span className="text-[var(--color-hairline)]">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Icon
                icon="solar:database-linear"
                width={14}
                height={14}
                className="text-[var(--color-primary)]"
              />
              Walrus blobs
            </span>
            <span className="text-[var(--color-hairline)]">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Icon
                icon="solar:verified-check-linear"
                width={14}
                height={14}
                className="text-[var(--color-primary)]"
              />
              Sui receipts
            </span>
            <span className="text-[var(--color-hairline)]">·</span>
            <span className="font-semibold text-[var(--color-charcoal)]">
              ~0.002 WAL / response
            </span>
          </div>
        </div>

        <div className="scroll-reveal relative z-10" style={{ transitionDelay: "120ms" }}>
          <ProductMockup />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 md:px-8 md:pb-24">
        <div className="scroll-reveal text-center">
          <h2 className="text-2xl font-bold text-[var(--color-ink)] md:text-3xl">
            Everything lives on Walrus
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-slate)]">
            Composable building blocks for verifiable, private feedback.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {productPillars.map((item, index) => (
            <article
              key={item.title}
              className="scroll-reveal-stagger rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-1"
              style={{ transitionDelay: `${index * 55}ms` }}
            >
              <AssetImage
                src={item.asset}
                alt=""
                className="h-12 w-12 rounded-[var(--radius-button)] object-contain"
                fallback={
                  <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-tint-mint)] text-[var(--color-primary)]">
                    <Icon icon={item.icon} width={23} height={23} />
                  </span>
                }
              />
              <h3 className="mt-4 text-sm font-bold text-[var(--color-ink)]">{item.title}</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--color-slate)]">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 md:px-8 md:pb-24">
        <div className="scroll-reveal rounded-[var(--radius-hero)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] md:p-7">
          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
            <div>
              <p className="text-sm font-semibold text-[var(--color-slate)]">
                Meet Founder Fina{" "}
                <span className="rounded-full bg-[var(--color-tint-cream)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-accent-deep)]">
                  Persona
                </span>
              </p>
              <p className="mt-1 text-xs text-[var(--color-stone)]">
                A representative persona for solo or 2-person teams shipping a Sui/Walrus dApp
              </p>
              <div className="mt-5 flex flex-col gap-5 sm:flex-row">
                <AssetImage
                  src="/landing/illustrations/fina-founder.png"
                  alt="Founder Fina"
                  className="h-[148px] w-[148px] shrink-0 rounded-[22px] object-contain"
                  fallback={
                    <div className="fina-portrait" aria-hidden="true">
                      <div className="fina-face" />
                    </div>
                  }
                />
                <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
                  {[
                    ["Role", "Web3 product founder"],
                    ["Team", "1-2 people"],
                    ["Stage", "MVP + community"],
                    ["Tech", "Sui + Walrus + Move"],
                    ["Goal", "Collect verifiable feedback, prove it is real, keep it private"],
                  ].map(([term, value]) => (
                    <div key={term} className="contents">
                      <dt className="font-bold text-[var(--color-slate)]">{term}</dt>
                      <dd className="text-[var(--color-charcoal)]">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-[var(--color-ink)]">Pain points</h3>
              <ul className="mt-4 grid gap-3">
                {painPoints.map((pain) => (
                  <li
                    key={pain}
                    className="flex items-center gap-3 text-sm text-[var(--color-charcoal)]"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-tint-peach)] text-[var(--color-error)]">
                      <Icon icon="solar:danger-circle-linear" width={16} height={16} />
                    </span>
                    {pain}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-tint-mint)] px-4 py-3 text-center text-sm font-bold text-[var(--color-primary-deep)]">
            Goal: collect verifiable feedback, prove it is real, keep it private, pay submitters
            fairly.
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 md:px-8 md:pb-24">
        <h2 className="scroll-reveal text-center text-2xl font-bold text-[var(--color-ink)]">
          What no competitor has
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {differentiators.map((item, index) => (
            <article
              key={item.title}
              className="scroll-reveal-stagger rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]"
              style={{ transitionDelay: `${index * 70}ms` }}
            >
              <Icon
                icon={item.icon}
                className="text-[var(--color-primary)]"
                width={28}
                height={28}
              />
              <h3 className="mt-4 text-sm font-bold text-[var(--color-ink)]">{item.title}</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--color-slate)]">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--color-hairline-soft)] bg-[var(--color-card)]">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <h2 className="scroll-reveal text-center text-2xl font-bold text-[var(--color-ink)]">
            How it works
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {buildSteps.map(([num, title, copy], index) => (
              <article
                key={title}
                className="scroll-reveal-stagger rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-5"
                style={{ transitionDelay: `${index * 70}ms` }}
              >
                <span className="font-mono text-3xl font-bold text-[var(--color-primary)]">
                  {num}
                </span>
                <h3 className="mt-4 text-sm font-bold text-[var(--color-ink)]">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-[var(--color-slate)]">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-24">
        <div className="scroll-reveal">
          <h2 className="text-2xl font-bold text-[var(--color-ink)]">Composable for developers</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-[var(--color-slate)]">
            Call Walform Move functions directly from your own Sui dApp. SDK available as an
            internal package.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {moveFunctions.map(([name, desc]) => (
              <div
                key={name}
                className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-4"
              >
                <code className="font-mono text-xs font-bold text-[var(--color-primary)]">
                  {name}
                </code>
                <p className="mt-2 text-xs text-[var(--color-slate)]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div
          suppressHydrationWarning
          className="scroll-reveal min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]"
        >
          <div className="mb-4 flex items-center justify-between border-b border-[var(--color-hairline-soft)] pb-3">
            <span className="font-mono text-xs font-bold text-[var(--color-primary)]">
              TypeScript
            </span>
            <span className="rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] px-2 py-1 text-[10px] font-bold text-[var(--color-slate)]">
              Example
            </span>
          </div>
          <pre
            suppressHydrationWarning
            className="overflow-x-auto font-mono text-[11px] leading-6 text-[var(--color-charcoal)]"
          >
            <code>{EXAMPLE_CODE}</code>
          </pre>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 md:px-8 md:pb-24">
        <div className="scroll-reveal grid gap-4 rounded-[var(--radius-hero)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] md:grid-cols-[1fr_1fr_1fr] md:p-7">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-ink)]">Predictable costs</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-slate)]">
              Pay for storage, not response caps. Quilts drive response storage down at scale.
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-tint-mint)] p-5">
            <p className="font-mono text-2xl font-bold text-[var(--color-primary-deep)]">
              ~0.002 WAL
            </p>
            <p className="text-xs font-semibold text-[var(--color-slate)]">per response</p>
            <p className="mt-1 text-[11px] text-[var(--color-stone)]">
              Example single-field text response
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-tint-sky)] p-5">
            <p className="font-mono text-2xl font-bold text-[var(--color-primary-deep)]">
              ~0.08 WAL
            </p>
            <p className="text-xs font-semibold text-[var(--color-slate)]">per 1,000 responses</p>
            <p className="mt-1 text-[11px] text-[var(--color-stone)]">Example mix of fields</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 md:px-8 md:pb-14">
        <div className="landing-cta scroll-reveal relative overflow-hidden rounded-[var(--radius-hero)] border border-[var(--color-hairline)] bg-[var(--color-tint-mint)] p-7 md:p-10">
          <div className="cta-background" aria-hidden="true" />
          <div className="relative z-10 max-w-xl">
            <h2 className="landing-cta-title text-3xl font-bold leading-tight text-[var(--color-ink)] md:text-5xl">
              Start collecting feedback that actually proves something
            </h2>
            <p className="landing-cta-copy mt-4 max-w-lg text-sm leading-6 text-[var(--color-charcoal)]">
              No accounts. No databases. Encrypted blobs, verifiable Sui objects, and bounty escrow
              for reputation.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link className="btn-primary" href="/builder/">
                Create your first form
              </Link>
              <Link className="btn-secondary" href="/f/demo/">
                Explore the demo
              </Link>
            </div>
          </div>
          <AssetImage
            src="/landing/illustrations/walrus-mascot.png"
            alt=""
            className="walrus-mascot object-contain"
            fallback={
              <div className="walrus-mascot" aria-hidden="true">
                <div className="walrus-body" />
              </div>
            }
          />
        </div>
      </section>

      <footer className="border-t border-[var(--color-hairline-soft)] bg-[var(--color-card)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 md:flex-row md:px-8">
          <span className="text-sm font-bold text-[var(--color-primary-deep)]">Walform</span>
          <div className="flex gap-5 text-xs font-semibold text-[var(--color-slate)]">
            <Link href="/templates/">Docs</Link>
            <Link href="/builder/">Builder</Link>
            <Link href="/f/demo/">Demo</Link>
          </div>
          <p className="text-[11px] text-[var(--color-stone)]">2026 Walform</p>
        </div>
      </footer>
    </main>
  )
}
