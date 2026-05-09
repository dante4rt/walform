"use client"

import { Icon } from "@iconify/react"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit"
import type { Severity } from "@walform/shared"
import { useRef, useState } from "react"

import { Button } from "@/components/ui"
import {
  createApproveResponseTransaction,
  createDepositBountyTransaction,
  getConfiguredSuiChain,
  isSuiObjectId,
} from "@/lib/sui"

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

export interface BountyPanelProps {
  formId: string
  records: AdminResponseRecord[]
  packageId: string | null
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
  return (status === "new" || status === "triaged") && submitter !== null && severity !== "none"
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

const ON_CHAIN_BOUNTY_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ONCHAIN_BOUNTY === "true"

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-4 ${className}`}
    >
      {children}
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-slate)]">
        {label}
      </span>
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
      <span className="shrink-0 font-mono text-xs font-semibold text-[var(--color-primary)]">
        WAL
      </span>
    </div>
  )
}

function TxDraftPanel({
  label,
  state,
  error,
  onClose,
}: {
  label: string
  state: "signing" | "success" | "error"
  error: string | null
  onClose: () => void
}) {
  return (
    <div
      className="t-panel-slide rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-card)] overflow-hidden"
      data-open="true"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-hairline-soft)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon
            icon={
              state === "signing"
                ? "solar:refresh-circle-linear"
                : state === "success"
                  ? "solar:check-circle-linear"
                  : "solar:danger-circle-linear"
            }
            className={`h-4 w-4 ${state === "success" ? "text-[var(--color-success)]" : state === "error" ? "text-[var(--color-error)]" : "text-[var(--color-primary)]"}`}
          />
          <span className="text-sm font-semibold text-[var(--color-ink)]">{label}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              state === "signing"
                ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                : state === "success"
                  ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                  : "bg-[var(--color-error)]/10 text-[var(--color-error)]"
            }`}
          >
            {state === "signing"
              ? "Awaiting signature..."
              : state === "success"
                ? "Confirmed"
                : "Failed"}
          </span>
        </div>
        {state !== "signing" && (
          <button
            onClick={onClose}
            aria-label="Dismiss"
            className="rounded p-1 text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors"
          >
            <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && <div className="px-4 py-3 text-xs text-[var(--color-error)]">{error}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BountyPanel
// ---------------------------------------------------------------------------

export function BountyPanel({ formId, records, packageId }: BountyPanelProps) {
  const currentAccount = useCurrentAccount()
  const suiClient = useSuiClient()
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: { showEffects: true, showObjectChanges: true },
      }),
  })

  const [poolBalance, setPoolBalance] = useState<bigint>(BigInt(0))

  // Deposit form state
  const [depositAmount, setDepositAmount] = useState("")
  const [depositState, setDepositState] = useState<"idle" | "signing" | "success" | "error">("idle")
  const [depositError, setDepositError] = useState<string | null>(null)

  // Tier config state
  const [tiers, setTiers] = useState<BountyTiers>({
    low: "0.05",
    medium: "0.1",
    high: "0.25",
    critical: "1",
  })

  // Per-response approval states
  const [approvalStates, setApprovalStates] = useState<
    Record<number, "idle" | "signing" | "success" | "error">
  >({})
  const [approvalErrors, setApprovalErrors] = useState<Record<number, string | null>>({})

  // Text-swap animation refs for button labels
  const depositLabelRef = useRef<HTMLSpanElement>(null)

  const anonMode = isAnonMode(records)
  const approvableRecords = records.filter(isApprovable)
  const canExecuteOnChainBounty =
    ON_CHAIN_BOUNTY_ENABLED &&
    Boolean(currentAccount) &&
    isSuiObjectId(packageId) &&
    isSuiObjectId(formId)
  const bountyModeLabel = ON_CHAIN_BOUNTY_ENABLED ? "On-chain bounty" : "Demo escrow"

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleDeposit() {
    const mist = walToMist(depositAmount)
    if (mist === BigInt(0)) return

    setDepositState("signing")
    setDepositError(null)

    try {
      if (ON_CHAIN_BOUNTY_ENABLED) {
        if (!currentAccount || !isSuiObjectId(packageId) || !isSuiObjectId(formId)) {
          throw new Error("On-chain bounty requires a connected wallet and deployed Sui form.")
        }

        const tx = createDepositBountyTransaction({ packageId, formId, amountMist: mist })
        await signAndExecuteTransaction({
          transaction: tx,
          account: currentAccount,
          chain: getConfiguredSuiChain(),
        })
      }

      setPoolBalance((prev) => prev + mist)
      setDepositState("success")
      setDepositAmount("")
      animateTextSwap(depositLabelRef.current, ON_CHAIN_BOUNTY_ENABLED ? "Deposited" : "Added")
      setTimeout(() => setDepositState("idle"), 3000)
    } catch (err) {
      setDepositState("error")
      setDepositError(getBountyErrorMessage(err))
    }
  }

  async function handleApprove(record: AdminResponseRecord) {
    if (!record.ref.submitter) return

    setApprovalStates((prev) => ({ ...prev, [record.index]: "signing" }))
    setApprovalErrors((prev) => ({ ...prev, [record.index]: null }))

    try {
      const tierMist = walToMist(tiers[record.ref.severity as keyof BountyTiers] ?? "0")

      if (!ON_CHAIN_BOUNTY_ENABLED && poolBalance < tierMist) {
        throw new Error("Deposit enough WAL before approving this response.")
      }

      if (ON_CHAIN_BOUNTY_ENABLED) {
        if (!currentAccount || !isSuiObjectId(packageId) || !isSuiObjectId(formId)) {
          throw new Error("On-chain bounty requires a connected wallet and deployed Sui form.")
        }

        const tx = createApproveResponseTransaction({
          packageId,
          formId,
          responseIndex: record.index,
          submitter: record.ref.submitter,
        })
        await signAndExecuteTransaction({
          transaction: tx,
          account: currentAccount,
          chain: getConfiguredSuiChain(),
        })
      }

      setPoolBalance((prev) => (prev > tierMist ? prev - tierMist : BigInt(0)))
      setApprovalStates((prev) => ({ ...prev, [record.index]: "success" }))
    } catch (err) {
      setApprovalStates((prev) => ({ ...prev, [record.index]: "error" }))
      setApprovalErrors((prev) => ({
        ...prev,
        [record.index]: getBountyErrorMessage(err),
      }))
    }
  }

  function dismissApprovalState(index: number) {
    setApprovalStates((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
    setApprovalErrors((prev) => {
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
          <Icon
            icon="solar:danger-triangle-linear"
            className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]"
          />
          <div className="text-sm text-[var(--color-charcoal)]">
            <span className="font-semibold">Bounty unavailable in anonymous mode.</span> All
            submissions were collected without wallet addresses. Bounty payouts require a submitter
            address on-chain. Switch the form to{" "}
            <span className="font-mono text-[var(--color-warning)]">wallet</span> submission mode to
            enable bounties.
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
              <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] text-[var(--color-primary)]">
                {bountyModeLabel}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-[var(--color-ink)]">
                {mistToWal(poolBalance)}
              </span>
              <span className="font-mono text-sm font-semibold text-[var(--color-primary)]">
                WAL
              </span>
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
            disabled={
              anonMode ||
              !depositAmount ||
              walToMist(depositAmount) === BigInt(0) ||
              (ON_CHAIN_BOUNTY_ENABLED && !canExecuteOnChainBounty)
            }
          >
            <Icon icon="solar:transfer-horizontal-linear" className="h-4 w-4" />
            <span ref={depositLabelRef} className="t-text-swap">
              Deposit
            </span>
          </Button>
        </div>

        {depositState === "success" && (
          <p className="mt-3 text-xs font-medium text-[var(--color-success)]">
            {ON_CHAIN_BOUNTY_ENABLED
              ? "Deposit confirmed on-chain."
              : "Deposit added to the demo escrow."}
          </p>
        )}
        {depositState === "error" && depositError && (
          <div className="mt-3">
            <TxDraftPanel
              label={`Deposit ${depositAmount} WAL`}
              state="error"
              error={depositError}
              onClose={() => {
                setDepositState("idle")
                setDepositError(null)
              }}
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
            <Icon
              icon="solar:user-cross-linear"
              className="mx-auto h-8 w-8 text-[var(--color-stone)]"
            />
            <p className="mt-2 text-sm text-[var(--color-slate)]">
              No wallet addresses — bounty disabled.
            </p>
          </div>
        ) : approvableRecords.length === 0 ? (
          <div className="rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-6 text-center">
            <Icon
              icon="solar:inbox-line-linear"
              className="mx-auto h-8 w-8 text-[var(--color-stone)]"
            />
            <p className="mt-2 text-sm text-[var(--color-slate)]">
              No eligible responses right now.
            </p>
            <p className="mt-1 text-xs text-[var(--color-stone)]">
              Responses must be new/triaged with a severity and a wallet submitter.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {approvableRecords.map((record) => {
              const tierAmount =
                record.ref.severity !== "none"
                  ? (tiers[record.ref.severity as keyof BountyTiers] ?? "—")
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
                        disabled={
                          approvalStates[record.index] === "signing" ||
                          (ON_CHAIN_BOUNTY_ENABLED && !canExecuteOnChainBounty)
                        }
                      >
                        <Icon icon="solar:medal-ribbons-star-linear" className="h-3.5 w-3.5" />
                        {approvalStates[record.index] === "signing"
                          ? "Signing..."
                          : approvalStates[record.index] === "success"
                            ? "Paid"
                            : "Approve & Pay"}
                      </Button>
                    </div>
                  </div>

                  {approvalStates[record.index] && approvalStates[record.index] !== "idle" ? (
                    <TxDraftPanel
                      label={`Approve #${record.index} — ${record.ref.submitter?.slice(0, 8)}...`}
                      state={approvalStates[record.index] as "signing" | "success" | "error"}
                      error={approvalErrors[record.index] ?? null}
                      onClose={() => dismissApprovalState(record.index)}
                    />
                  ) : null}
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
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--text-swap-dur")) ||
    200

  el.classList.add("is-exit")
  setTimeout(() => {
    el.textContent = next
    el.classList.remove("is-exit")
    el.classList.add("is-enter-start")
    void el.offsetHeight
    el.classList.remove("is-enter-start")
  }, dur)
}

function getBountyErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Transaction failed"

  if (message.includes("Expected Object but received Object")) {
    return "The bounty transaction shape is not supported by the current wallet/contract setup. Demo escrow mode is enabled by default for this build."
  }

  return message
}
