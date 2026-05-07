"use client"

import { Icon } from "@iconify/react"
import type { Severity } from "@walform/shared"
import { useRef, useState } from "react"

import { Button } from "@/components/ui"
import { approveBountyResponse, depositBounty } from "@walform/sdk"

import type { AdminResponseRecord } from "./admin-adapter"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BountyTiers {
  low: string
  medium: string
  high: string
  critical: string
}

interface TxDraft {
  label: string
  payload: unknown
}

export interface BountyPanelProps {
  formId: string
  records: AdminResponseRecord[]
  packageId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WAL_DECIMALS = 9

function walToMist(wal: string): bigint {
  const n = parseFloat(wal)
  if (!Number.isFinite(n) || n < 0) return BigInt(0)
  return BigInt(Math.round(n * 10 ** WAL_DECIMALS))
}

function mistToWal(mist: bigint): string {
  return (Number(mist) / 10 ** WAL_DECIMALS).toLocaleString("en", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })
}

function isApprovable(record: AdminResponseRecord): boolean {
  const { status, severity, submitter } = record.ref
  return (
    (status === "new" || status === "triaged") &&
    submitter !== null &&
    severity !== "none"
  )
}

// Detect if the form is running in anon mode: no single response has a
// submitter address (wallet mode would always populate it).
function isAnonMode(records: AdminResponseRecord[]): boolean {
  return records.length > 0 && records.every((r) => r.ref.submitter === null)
}

const SEVERITY_COLORS: Record<Severity, string> = {
  none: "text-[var(--color-stone)]",
  low: "text-[var(--color-success)]",
  medium: "text-[var(--color-warning)]",
  high: "text-[var(--color-warning)]",
  critical: "text-[var(--color-error)]",
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-4 ${className}`}>
      {children}
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-slate)]">{label}</span>
      {children}
    </label>
  )
}

function WalInput({
  value,
  onChange,
  placeholder = "0",
  disabled = false,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-2 focus-within:border-[var(--color-primary)]">
      <input
        type="number"
        min="0"
        step="0.001"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-transparent text-sm text-[var(--color-ink)] placeholder-[var(--color-stone)] outline-none disabled:opacity-50"
      />
      <span className="shrink-0 font-mono text-xs font-semibold text-[var(--color-primary)]">WAL</span>
    </div>
  )
}

function TxDraftPanel({ draft, onClose }: { draft: TxDraft; onClose: () => void }) {
  return (
    <div
      className="t-panel-slide rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-card)] overflow-hidden"
      data-open="true"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-hairline-soft)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon icon="solar:code-square-linear" className="h-4 w-4 text-[var(--color-primary)]" />
          <span className="text-sm font-semibold text-[var(--color-ink)]">{draft.label}</span>
          <span className="rounded-full bg-[var(--color-warning)]/15 px-2 py-0.5 text-xs font-medium text-[var(--color-warning)]">
            draft — not signed
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Dismiss draft"
          className="rounded p-1 text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors"
        >
          <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-[var(--color-charcoal)]">
        {JSON.stringify(draft.payload, null, 2)}
      </pre>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BountyPanel
// ---------------------------------------------------------------------------

export function BountyPanel({ formId, records, packageId }: BountyPanelProps) {
  // Simulated on-chain pool balance (MIST)
  const [poolBalance] = useState<bigint>(BigInt(12_500_000_000)) // 12.5 WAL demo value

  // Deposit form state
  const [depositAmount, setDepositAmount] = useState("")
  const [depositDraft, setDepositDraft] = useState<TxDraft | null>(null)

  // Tier config state
  const [tiers, setTiers] = useState<BountyTiers>({
    low: "5",
    medium: "25",
    high: "100",
    critical: "500",
  })

  // Per-response approval drafts
  const [approvalDrafts, setApprovalDrafts] = useState<Record<number, TxDraft>>({})

  // Text-swap animation refs for button labels
  const depositLabelRef = useRef<HTMLSpanElement>(null)

  const anonMode = isAnonMode(records)
  const approvableRecords = records.filter(isApprovable)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleDeposit() {
    const mist = walToMist(depositAmount)
    if (mist === BigInt(0)) return

    const payload = depositBounty({
      packageId,
      formId,
      amountMist: mist,
    })

    setDepositDraft({
      label: `deposit_bounty(${depositAmount} WAL)`,
      payload,
    })

    animateTextSwap(depositLabelRef.current, "Draft ready")
  }

  function handleApprove(record: AdminResponseRecord) {
    const payload = approveBountyResponse({
      packageId,
      formId,
      responseIndex: record.index,
    })

    setApprovalDrafts((prev) => ({
      ...prev,
      [record.index]: {
        label: `approve_response(#${record.index}, ${record.ref.submitter?.slice(0, 8)}…)`,
        payload,
      },
    }))
  }

  function dismissApprovalDraft(index: number) {
    setApprovalDrafts((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6">
      {/* Anon mode warning */}
      {anonMode && (
        <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-4 py-3">
          <Icon icon="solar:danger-triangle-linear" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]" />
          <div className="text-sm text-[var(--color-charcoal)]">
            <span className="font-semibold">Bounty unavailable in anonymous mode.</span>{" "}
            All submissions were collected without wallet addresses. Bounty payouts require a
            submitter address on-chain. Switch the form to{" "}
            <span className="font-mono text-[var(--color-warning)]">wallet</span> submission mode to enable
            bounties.
          </div>
        </div>
      )}

      {/* Pool balance */}
      <SectionCard>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-slate)]">
              <Icon icon="solar:wallet-linear" className="h-4 w-4 text-[var(--color-primary)]" />
              Bounty pool
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-[var(--color-ink)]">
                {mistToWal(poolBalance)}
              </span>
              <span className="font-mono text-sm font-semibold text-[var(--color-primary)]">WAL</span>
            </div>
            <p className="mt-1 font-mono text-xs text-[var(--color-stone)]">
              {poolBalance.toLocaleString()} MIST
            </p>
          </div>
          <Icon icon="solar:safe-2-linear" className="h-10 w-10 text-[var(--color-stone)]" />
        </div>
      </SectionCard>

      {/* Deposit form */}
      <SectionCard>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
          <Icon icon="solar:add-circle-linear" className="h-4 w-4 text-[var(--color-primary)]" />
          Deposit WAL
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <FieldRow label="Amount">
              <WalInput
                value={depositAmount}
                onChange={setDepositAmount}
                placeholder="e.g. 100"
                disabled={anonMode}
              />
            </FieldRow>
          </div>
          <Button
            variant="default"
            className="h-10 rounded-lg px-4 text-sm"
            onClick={handleDeposit}
            disabled={anonMode || !depositAmount || walToMist(depositAmount) === BigInt(0)}
          >
            <Icon icon="solar:transfer-horizontal-linear" className="h-4 w-4" />
            <span ref={depositLabelRef} className="t-text-swap">
              Deposit
            </span>
          </Button>
        </div>

        {depositDraft && (
          <div className="mt-4">
            <TxDraftPanel
              draft={depositDraft}
              onClose={() => setDepositDraft(null)}
            />
          </div>
        )}
      </SectionCard>

      {/* Tier config */}
      <SectionCard>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
          <Icon icon="solar:chart-2-linear" className="h-4 w-4 text-[var(--color-primary)]" />
          Bounty tiers
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["low", "medium", "high", "critical"] as const).map((tier) => (
            <FieldRow key={tier} label={tier}>
              <WalInput
                value={tiers[tier]}
                onChange={(v) => setTiers((prev) => ({ ...prev, [tier]: v }))}
                disabled={anonMode}
              />
            </FieldRow>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--color-stone)]">
          Tier values are read from the on-chain form object. These inputs show a draft view —
          update the form object via <span className="font-mono">set_bounty_tiers</span> to apply.
        </p>
      </SectionCard>

      {/* Response list — approvable only */}
      <SectionCard>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
          <Icon icon="solar:check-circle-linear" className="h-4 w-4 text-[var(--color-primary)]" />
          Approve &amp; pay
        </h3>
        <p className="mb-4 text-xs text-[var(--color-stone)]">
          Responses eligible for bounty: status is <span className="font-mono">new</span> or{" "}
          <span className="font-mono">triaged</span>, severity is not{" "}
          <span className="font-mono">none</span>, and submitter address is present.
        </p>

        {anonMode ? (
          <div className="rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-6 text-center">
            <Icon icon="solar:user-cross-linear" className="mx-auto h-8 w-8 text-[var(--color-stone)]" />
            <p className="mt-2 text-sm text-[var(--color-slate)]">No wallet addresses — bounty disabled.</p>
          </div>
        ) : approvableRecords.length === 0 ? (
          <div className="rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-6 text-center">
            <Icon icon="solar:inbox-line-linear" className="mx-auto h-8 w-8 text-[var(--color-stone)]" />
            <p className="mt-2 text-sm text-[var(--color-slate)]">No eligible responses right now.</p>
            <p className="mt-1 text-xs text-[var(--color-stone)]">
              Responses must be new/triaged with a severity and a wallet submitter.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {approvableRecords.map((record) => {
              const draft = approvalDrafts[record.index]
              const tierAmount = record.ref.severity !== "none"
                ? tiers[record.ref.severity as keyof BountyTiers] ?? "—"
                : "—"

              return (
                <div
                  key={record.index}
                  className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-[var(--color-stone)] shrink-0">
                        #{record.index}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize border-current ${SEVERITY_COLORS[record.ref.severity]}`}
                      >
                        {record.ref.severity}
                      </span>
                      <span className="truncate font-mono text-xs text-[var(--color-slate)]">
                        {record.ref.submitter}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-sm font-semibold text-[var(--color-primary)]">
                        {tierAmount} WAL
                      </span>
                      <Button
                        variant="default"
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={() => handleApprove(record)}
                      >
                        <Icon icon="solar:medal-ribbons-star-linear" className="h-3.5 w-3.5" />
                        Approve &amp; Pay
                      </Button>
                    </div>
                  </div>

                  {draft && (
                    <TxDraftPanel
                      draft={draft}
                      onClose={() => dismissApprovalDraft(record.index)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Text-swap animation helper (vanilla — no DOM dep in SSR path)
// ---------------------------------------------------------------------------

function animateTextSwap(el: HTMLElement | null, next: string) {
  if (!el) return

  const dur =
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--text-swap-dur"),
    ) || 200

  el.classList.add("is-exit")
  setTimeout(() => {
    el.textContent = next
    el.classList.remove("is-exit")
    el.classList.add("is-enter-start")
    void el.offsetHeight
    el.classList.remove("is-enter-start")
  }, dur)
}
