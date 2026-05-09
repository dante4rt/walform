"use client"

import { Icon } from "@iconify/react"
import type { ResponseStatus, Severity } from "@walform/shared"
import { RESPONSE_STATUSES, SEVERITIES } from "@walform/shared"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui"
import { formatFileSize, isAttachmentAnswer, type AttachmentAnswer } from "@/lib/attachments"
import { toCsv, type CsvColumn } from "@/lib/csv"
import { getWebhookUrl, setWebhookUrl } from "@/lib/webhook"
import { formatFormId } from "@/lib/utils"

import { getConfiguredPackageId } from "@/lib/sui"

import { loadAdminRecords, saveAdminNote, type AdminResponseRecord } from "./admin-adapter"
import { BountyPanel } from "./BountyPanel"
import { CostPanel } from "./CostPanel"

type AdminTab = "responses" | "cost" | "bounty"

type DateFilter = "all" | "24h" | "7d"

interface AdminDashboardProps {
  formId: string
}

const severityClasses: Record<Severity, string> = {
  none: "border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] text-[var(--color-slate)]",
  low: "border-[var(--color-hairline-soft)] bg-[var(--color-tint-sky)] text-[var(--color-charcoal)]",
  medium:
    "border-[var(--color-accent)]/20 bg-[var(--color-tint-cream)] text-[var(--color-accent-deep)]",
  high: "border-[var(--color-accent)]/30 bg-[var(--color-tint-peach)] text-[var(--color-accent-deep)]",
  critical: "border-[var(--color-error)]/30 bg-[var(--color-error)]/5 text-[var(--color-error)]",
}

const statusClasses: Record<ResponseStatus, string> = {
  new: "bg-[var(--color-tint-sky)] text-[var(--color-charcoal)]",
  triaged: "bg-[var(--color-tint-cream)] text-[var(--color-accent-deep)]",
  approved: "bg-[var(--color-tint-mint)] text-[var(--color-charcoal)]",
  resolved: "bg-[var(--color-primary)]/8 text-[var(--color-primary)]",
  rejected: "bg-[var(--color-canvas)] text-[var(--color-slate)]",
}

const responseColumns: CsvColumn<AdminResponseRecord>[] = [
  { key: "index", header: "Index", getValue: (record) => record.index },
  {
    key: "submitted_at",
    header: "Submitted At",
    getValue: (record) => new Date(record.ref.timestamp_ms),
  },
  {
    key: "submitter",
    header: "Submitter",
    getValue: (record) => record.ref.submitter ?? "signed anonymous",
  },
  { key: "severity", header: "Severity", getValue: (record) => record.ref.severity },
  { key: "status", header: "Status", getValue: (record) => record.ref.status },
  { key: "blob_id", header: "Blob ID", getValue: (record) => record.ref.blob_id },
  { key: "root_hash", header: "Root Hash", getValue: (record) => record.ref.root_hash },
  { key: "answers", header: "Answers", getValue: (record) => record.response.answers },
  { key: "internal_note", header: "Internal Note", getValue: (record) => record.note },
]

export function AdminDashboard({ formId }: AdminDashboardProps) {
  const [records, setRecords] = useState<AdminResponseRecord[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [severity, setSeverity] = useState<Severity | "all">("all")
  const [status, setStatus] = useState<ResponseStatus | "all">("all")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({})
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading")
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [now] = useState(() => Date.now())
  const [activeTab, setActiveTab] = useState<AdminTab>("responses")
  const [webhookUrl, setWebhookUrlState] = useState(() => getWebhookUrl(formId) ?? "")
  const [webhookSaved, setWebhookSaved] = useState(false)

  useEffect(() => {
    let cancelled = false

    loadAdminRecords(formId)
      .then((items) => {
        if (cancelled) {
          return
        }
        setRecords(items)
        setSelectedIndex(items[0]?.index ?? 0)
        setLoadState("ready")
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState("error")
        }
      })

    return () => {
      cancelled = true
    }
  }, [formId])

  const filteredRecords = useMemo(() => {
    const minimumTimestamp =
      dateFilter === "24h"
        ? now - 24 * 60 * 60 * 1000
        : dateFilter === "7d"
          ? now - 7 * 24 * 60 * 60 * 1000
          : 0

    return records
      .filter((record) => severity === "all" || record.ref.severity === severity)
      .filter((record) => status === "all" || record.ref.status === status)
      .filter((record) => record.ref.timestamp_ms >= minimumTimestamp)
      .sort((first, second) => second.ref.timestamp_ms - first.ref.timestamp_ms)
  }, [dateFilter, now, records, severity, status])

  const selectedRecord =
    filteredRecords.find((record) => record.index === selectedIndex) ?? filteredRecords[0]
  const answerEntries = selectedRecord ? Object.entries(selectedRecord.response.answers) : []
  const noteDraft = selectedRecord ? (noteDrafts[selectedRecord.index] ?? selectedRecord.note) : ""

  const metrics = useMemo(() => {
    const criticalCount = records.filter((record) => record.ref.severity === "critical").length
    const openCount = records.filter(
      (record) => record.ref.status === "new" || record.ref.status === "triaged",
    ).length
    const latestTimestamp = Math.max(...records.map((record) => record.ref.timestamp_ms), 0)

    return { criticalCount, openCount, latestTimestamp }
  }, [records])

  async function saveNote() {
    if (!selectedRecord) {
      return
    }

    setNoteState("saving")

    try {
      const notesBlobId = await saveAdminNote({
        formId,
        record: selectedRecord,
        note: noteDraft,
      })

      setRecords((current) =>
        current.map((record) =>
          record.index === selectedRecord.index
            ? { ...record, note: noteDraft, ref: { ...record.ref, notes_blob_id: notesBlobId } }
            : record,
        ),
      )
      setNoteState("saved")
      setNoteDrafts((current) => {
        const next = { ...current }
        delete next[selectedRecord.index]
        return next
      })
    } catch {
      setNoteState("error")
    }
  }

  function exportCsv() {
    downloadText(
      `walform-${formId}-responses.csv`,
      "text/csv;charset=utf-8",
      toCsv(filteredRecords, responseColumns),
    )
  }

  function exportJson() {
    downloadText(
      `walform-${formId}-responses.json`,
      "application/json;charset=utf-8",
      JSON.stringify(filteredRecords, null, 2),
    )
  }

  function saveWebhook() {
    setWebhookUrl(formId, webhookUrl)
    setWebhookSaved(true)
    setTimeout(() => setWebhookSaved(false), 3000)
  }

  if (loadState === "loading") {
    return <AdminDashboardShell formId={formId} state="loading" />
  }

  if (loadState === "error") {
    return <AdminDashboardShell formId={formId} state="error" />
  }

  return (
    <main className="min-h-[100dvh] bg-[var(--color-canvas)] px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-5 border-b border-[var(--color-hairline)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Icon
                icon="solar:shield-keyhole-linear"
                className="h-4 w-4 text-[var(--color-slate)]"
              />
              <FormIdPill formId={formId} />
            </div>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-[var(--color-ink)] md:text-5xl">
              Response triage
            </h1>
          </div>
          <div className="flex flex-col gap-1.5 sm:items-end">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="grid gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-slate)]">
                  Webhook
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://"
                    value={webhookUrl}
                    onChange={(e) => {
                      setWebhookUrlState(e.target.value)
                      setWebhookSaved(false)
                    }}
                    className="h-9 min-w-0 flex-1 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 font-mono text-xs text-[var(--color-charcoal)] outline-none transition-colors focus:border-[var(--color-primary)] sm:w-48"
                  />
                  <Button
                    variant="ghost"
                    className="h-9 rounded-[var(--radius-button)] px-3 text-xs"
                    onClick={saveWebhook}
                  >
                    {webhookSaved ? "Saved" : "Hook"}
                  </Button>
                </div>
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-9 rounded-[var(--radius-button)] px-3 text-xs"
                  onClick={exportJson}
                >
                  <Icon icon="solar:code-file-linear" className="h-4 w-4" />
                  JSON
                </Button>
                <Button
                  className="h-9 rounded-[var(--radius-button)] px-3 text-xs"
                  onClick={exportCsv}
                >
                  <Icon icon="solar:download-minimalistic-linear" className="h-4 w-4" />
                  CSV
                </Button>
              </div>
            </div>
            <p className="max-w-[29rem] text-[10px] leading-tight text-[var(--color-stone)] sm:text-right">
              POSTs encrypted blob refs to your URL on each new submission. Payloads include an HMAC
              signature header for verification.
            </p>
          </div>
        </header>

        {/* Tab navigation */}
        <nav
          className="flex gap-1 border-b border-[var(--color-hairline-soft)]"
          role="tablist"
          aria-label="Dashboard sections"
        >
          <TabButton
            id="tab-responses"
            controls="panel-responses"
            active={activeTab === "responses"}
            icon="solar:inbox-line-linear"
            label="Responses"
            onClick={() => setActiveTab("responses")}
          />
          <TabButton
            id="tab-cost"
            controls="panel-cost"
            active={activeTab === "cost"}
            icon="solar:chart-2-linear"
            label="Cost"
            onClick={() => setActiveTab("cost")}
          />
          <TabButton
            id="tab-bounty"
            controls="panel-bounty"
            active={activeTab === "bounty"}
            icon="solar:medal-ribbons-star-linear"
            label="Bounty"
            onClick={() => setActiveTab("bounty")}
          />
        </nav>

        {/* Cost tab */}
        {activeTab === "cost" && (
          <div
            id="panel-cost"
            role="tabpanel"
            aria-labelledby="tab-cost"
            className="border-t border-[var(--color-hairline-soft)] pt-6"
          >
            <CostPanel responseCount={records.length} />
          </div>
        )}

        {/* Bounty tab */}
        {activeTab === "bounty" && (
          <div
            id="panel-bounty"
            role="tabpanel"
            aria-labelledby="tab-bounty"
            className="border-t border-[var(--color-hairline-soft)] pt-6"
          >
            <BountyPanel
              formId={formId}
              records={records}
              packageId={getConfiguredPackageId()}
            />
          </div>
        )}

        {/* Responses tab — metrics + list */}
        {activeTab === "responses" && (
          <div
            id="panel-responses"
            role="tabpanel"
            aria-labelledby="tab-responses"
            className="flex flex-col gap-8"
          >
            {/* Metrics strip */}
            <section className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-hairline-soft)] md:grid-cols-4">
              <MetricCard
                label="Decrypted"
                value={records.length.toString()}
                icon="solar:lock-keyhole-unlocked-linear"
              />
              <MetricCard
                label="Prioritized"
                value={filteredRecords.length.toString()}
                icon="solar:sort-by-time-linear"
              />
              <MetricCard
                label="Open"
                value={metrics.openCount.toString()}
                icon="solar:inbox-line-linear"
              />
              <MetricCard
                label="Critical"
                value={metrics.criticalCount.toString()}
                icon="solar:danger-triangle-linear"
              />
            </section>

            {/* Main content — list + detail */}
            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
              {/* Response list */}
              <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)]">
                {/* Filters bar */}
                <div className="flex flex-col gap-3 border-b border-[var(--color-hairline-soft)] p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--color-ink)]">Responses</h2>
                    <p className="mt-0.5 text-xs text-[var(--color-slate)]">
                      {metrics.latestTimestamp
                        ? `Latest ${formatDate(metrics.latestTimestamp)} from Sui refs and Walrus blobs`
                        : "No submissions have been indexed for this form yet"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <SelectFilter
                      label="Severity"
                      value={severity}
                      onChange={(value) => setSeverity(value as Severity | "all")}
                    >
                      <option value="all">All severities</option>
                      {SEVERITIES.map((item) => (
                        <option key={item} value={item}>
                          {titleCase(item)}
                        </option>
                      ))}
                    </SelectFilter>
                    <SelectFilter
                      label="Status"
                      value={status}
                      onChange={(value) => setStatus(value as ResponseStatus | "all")}
                    >
                      <option value="all">All statuses</option>
                      {RESPONSE_STATUSES.map((item) => (
                        <option key={item} value={item}>
                          {titleCase(item)}
                        </option>
                      ))}
                    </SelectFilter>
                    <SelectFilter
                      label="Date"
                      value={dateFilter}
                      onChange={(value) => setDateFilter(value as DateFilter)}
                    >
                      <option value="all">Any date</option>
                      <option value="24h">Last 24h</option>
                      <option value="7d">Last 7d</option>
                    </SelectFilter>
                  </div>
                </div>

                {/* List or empty state */}
                {filteredRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-canvas)]">
                      <Icon
                        icon="solar:filter-linear"
                        className="h-5 w-5 text-[var(--color-slate)]"
                      />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-[var(--color-ink)]">
                      {records.length === 0 ? "No responses yet" : "No matching responses"}
                    </h3>
                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-[var(--color-slate)]">
                      {records.length === 0
                        ? "Submit the public form once, then refresh this dashboard to inspect the encrypted response record."
                        : "No responses match the current severity, status, and date filters. Try broadening your criteria."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--color-hairline-soft)]">
                    {filteredRecords.map((record) => {
                      const isActive = selectedRecord?.index === record.index
                      return (
                        <button
                          key={record.index}
                          className={`group grid w-full gap-3 px-5 py-3.5 text-left transition-colors ${
                            isActive
                              ? "bg-[var(--color-tint-mint)]"
                              : "hover:bg-[var(--color-canvas)]"
                          } md:grid-cols-[56px_minmax(0,1fr)_96px_120px]`}
                          onClick={() => setSelectedIndex(record.index)}
                        >
                          <span className="font-mono text-xs tabular-nums text-[var(--color-slate)]">
                            #{record.index}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-[var(--color-charcoal)]">
                              {summarizeAnswers(record.response.answers)}
                            </div>
                            <div className="mt-0.5 truncate font-mono text-[11px] text-[var(--color-stone)]">
                              {record.ref.blob_id}
                            </div>
                          </div>
                          <SeverityBadge severity={record.ref.severity} />
                          <div className="flex flex-col items-start gap-0.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${statusClasses[record.ref.status]}`}
                            >
                              {titleCase(record.ref.status)}
                            </span>
                            <span className="font-mono text-[11px] tabular-nums text-[var(--color-stone)]">
                              {formatDate(record.ref.timestamp_ms)}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Detail panel */}
              <aside className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)]">
                {selectedRecord ? (
                  <div className="flex flex-col">
                    {/* Detail header */}
                    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-hairline-soft)] p-5">
                      <div>
                        <p className="font-mono text-[11px] tabular-nums text-[var(--color-slate)]">
                          Response #{selectedRecord.index}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-[var(--color-ink)]">
                          Decrypted detail
                        </h2>
                      </div>
                      <SeverityBadge severity={selectedRecord.ref.severity} />
                    </div>

                    {/* Meta rows */}
                    <dl className="divide-y divide-[var(--color-hairline-soft)]">
                      <DetailRow
                        label="Submitter"
                        value={selectedRecord.ref.submitter ?? "Signed anonymous"}
                      />
                      <DetailRow label="Status" value={titleCase(selectedRecord.ref.status)} />
                      <DetailRow label="Root hash" value={selectedRecord.ref.root_hash} mono />
                    </dl>

                    {/* Answers */}
                    <div className="border-t border-[var(--color-hairline-soft)]">
                      <h3 className="px-5 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-slate)]">
                        Answers
                      </h3>
                      <div className="divide-y divide-[var(--color-hairline-soft)]">
                        {answerEntries.map(([key, value]) => (
                          <div key={key} className="px-5 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-slate)]">
                              {key}
                            </div>
                            <div className="mt-1 break-words text-sm text-[var(--color-charcoal)]">
                              <AnswerValue value={value} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Note */}
                    <div className="border-t border-[var(--color-hairline-soft)] p-5">
                      <label className="grid gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-slate)]">
                          Internal note
                        </span>
                        <textarea
                          value={noteDraft}
                          onChange={(event) => {
                            setNoteState("idle")
                            setNoteDrafts((current) => ({
                              ...current,
                              [selectedRecord.index]: event.target.value,
                            }))
                          }}
                          className="min-h-28 resize-y rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-3 text-sm text-[var(--color-charcoal)] outline-none transition-colors focus:border-[var(--color-primary)]"
                        />
                      </label>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-[11px] leading-relaxed text-[var(--color-stone)]">
                          Notes encrypt under the owner key and persist as Walrus blob refs.
                        </p>
                        <Button
                          className="h-8 rounded-[var(--radius-button)] px-3 text-xs"
                          onClick={saveNote}
                          disabled={noteState === "saving"}
                        >
                          <Icon icon="solar:diskette-linear" className="h-4 w-4" />
                          {noteState === "saving" ? "Saving" : "Save"}
                        </Button>
                      </div>
                      {noteState === "saved" ? (
                        <p className="mt-2 text-xs font-medium text-[var(--color-success)]">
                          Note blob ref updated.
                        </p>
                      ) : null}
                      {noteState === "error" ? (
                        <p className="mt-2 text-xs font-medium text-[var(--color-error)]">
                          Note upload failed.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-canvas)]">
                      <Icon
                        icon="solar:cursor-linear"
                        className="h-5 w-5 text-[var(--color-slate)]"
                      />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-[var(--color-ink)]">
                      Select a response
                    </h3>
                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-[var(--color-slate)]">
                      Choose a response from the list to view its decrypted answers and add internal
                      notes.
                    </p>
                  </div>
                )}
              </aside>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}

function TabButton({
  id,
  controls,
  active,
  icon,
  label,
  onClick,
}: {
  id?: string
  controls?: string
  active: boolean
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      id={id}
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:transition-colors ${
        active
          ? "text-[var(--color-primary)] after:bg-[var(--color-primary)]"
          : "text-[var(--color-slate)] hover:text-[var(--color-charcoal)] after:bg-transparent"
      }`}
    >
      <Icon icon={icon} className="h-4 w-4" />
      {label}
    </button>
  )
}

function FormIdPill({ formId }: { formId: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    void navigator.clipboard.writeText(getAdminUrl(formId)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <span
      title={formId}
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 py-1"
    >
      <span className="font-mono text-xs text-[var(--color-slate)]">{formatFormId(formId)}</span>
      <button
        type="button"
        aria-label="Copy admin URL"
        onClick={handleCopy}
        title="Copy admin URL"
        className="flex items-center text-[var(--color-stone)] transition-colors hover:text-[var(--color-charcoal)]"
      >
        {copied ? (
          <span className="t-text-swap font-mono text-[10px] text-[var(--color-success)]">
            Copied
          </span>
        ) : (
          <Icon icon="solar:copy-linear" className="h-3 w-3" />
        )}
      </button>
    </span>
  )
}

function getAdminUrl(formId: string): string {
  const path = `/admin/?formId=${encodeURIComponent(formId)}`
  if (typeof window === "undefined") {
    return path
  }

  return new URL(path, window.location.origin).toString()
}

function AdminDashboardShell({ formId, state }: { formId: string; state: "loading" | "error" }) {
  return (
    <main className="min-h-[100dvh] bg-[var(--color-canvas)] px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-2">
          <Icon icon="solar:shield-keyhole-linear" className="h-4 w-4 text-[var(--color-slate)]" />
          <FormIdPill formId={formId} />
        </div>
        <h1 className="mt-2 text-3xl font-bold text-[var(--color-ink)] md:text-5xl">
          Response triage
        </h1>

        {state === "loading" ? (
          <div className="mt-8 space-y-6">
            {/* Metric skeletons */}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[var(--color-card)] p-5">
                  <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-canvas)]" />
                  <div className="mt-3 h-8 w-12 animate-pulse rounded bg-[var(--color-canvas)]" />
                </div>
              ))}
            </div>
            {/* List + detail skeletons */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)]">
                <div className="border-b border-[var(--color-hairline-soft)] p-5">
                  <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-canvas)]" />
                  <div className="mt-2 h-3 w-48 animate-pulse rounded bg-[var(--color-canvas)]" />
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border-b border-[var(--color-hairline-soft)] p-4 last:border-0"
                  >
                    <div className="h-4 w-10 animate-pulse rounded bg-[var(--color-canvas)]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--color-canvas)]" />
                      <div className="h-2.5 w-1/2 animate-pulse rounded bg-[var(--color-canvas)]" />
                    </div>
                    <div className="h-5 w-14 animate-pulse rounded bg-[var(--color-canvas)]" />
                    <div className="h-5 w-16 animate-pulse rounded bg-[var(--color-canvas)]" />
                  </div>
                ))}
              </div>
              <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5">
                <div className="h-4 w-20 animate-pulse rounded bg-[var(--color-canvas)]" />
                <div className="mt-2 h-5 w-32 animate-pulse rounded bg-[var(--color-canvas)]" />
                <div className="mt-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="h-2.5 w-16 animate-pulse rounded bg-[var(--color-canvas)]" />
                      <div className="h-4 w-full animate-pulse rounded bg-[var(--color-canvas)]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-error)]/8">
              <Icon
                icon="solar:danger-circle-linear"
                className="h-6 w-6 text-[var(--color-error)]"
              />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-[var(--color-ink)]">
              Unable to decrypt responses
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--color-slate)]">
              Check the owner wallet, Seal policy, and Walrus read client configuration.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-[var(--color-card)] p-5">
      <div className="flex items-center gap-2">
        <Icon icon={icon} className="h-3.5 w-3.5 text-[var(--color-slate)]" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-slate)]">
          {label}
        </span>
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[var(--color-ink)]">
        {value}
      </div>
    </div>
  )
}

function SelectFilter({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-slate)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-2.5 text-xs text-[var(--color-charcoal)] outline-none transition-colors hover:border-[var(--color-slate)] focus:border-[var(--color-primary)]"
      >
        {children}
      </select>
    </label>
  )
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-grid h-5 min-w-14 place-items-center justify-self-center self-center rounded border px-1.5 text-center text-[11px] font-semibold leading-none ${severityClasses[severity]}`}
    >
      {titleCase(severity)}
    </span>
  )
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3">
      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-slate)]">
        {label}
      </dt>
      <dd
        className={`min-w-0 break-words text-right text-sm text-[var(--color-charcoal)] ${mono ? "font-mono text-xs tabular-nums" : ""}`}
      >
        {value}
      </dd>
    </div>
  )
}

function downloadText(filename: string, type: string, content: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function AnswerValue({ value }: { value: unknown }) {
  if (isAttachmentAnswer(value)) {
    return <AttachmentPreview attachment={value} />
  }

  return <>{formatAnswer(value)}</>
}

function AttachmentPreview({ attachment }: { attachment: AttachmentAnswer }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)]">
      {attachment.previewDataUrl ? (
        <a
          className="block"
          href={attachment.previewDataUrl}
          rel="noreferrer"
          target="_blank"
          title={`Open ${attachment.name}`}
        >
          <span
            aria-label={`Preview of ${attachment.name}`}
            className="block aspect-video w-full bg-[var(--color-card)] bg-contain bg-center bg-no-repeat"
            role="img"
            style={{ backgroundImage: `url("${attachment.previewDataUrl}")` }}
          />
        </a>
      ) : null}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-hairline-soft)] px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[var(--color-ink)]">
            {attachment.name}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-slate)]">
            {attachment.mimeType || "Unknown type"} · {formatFileSize(attachment.size)}
          </p>
        </div>
        {attachment.previewDataUrl ? (
          <a
            className="shrink-0 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-tint-mint)]"
            href={attachment.previewDataUrl}
            rel="noreferrer"
            target="_blank"
          >
            View
          </a>
        ) : null}
      </div>
    </div>
  )
}

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ")
  }

  if (isAttachmentAnswer(value)) {
    return value.name
  }

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

function summarizeAnswers(answers: Record<string, unknown>) {
  const [firstKey, firstValue] = Object.entries(answers)[0] ?? ["response", "No answer"]
  return `${titleCase(firstKey)}: ${formatAnswer(firstValue)}`
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(timestamp: number) {
  if (!timestamp) {
    return "No submissions yet"
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp))
}
