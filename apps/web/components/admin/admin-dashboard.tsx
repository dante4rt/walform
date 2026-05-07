"use client"

import { Icon } from "@iconify/react"
import type { ResponseStatus, Severity } from "@walform/shared"
import { RESPONSE_STATUSES, SEVERITIES } from "@walform/shared"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui"
import { toCsv, type CsvColumn } from "@/lib/csv"
import { getWebhookUrl, setWebhookUrl } from "@/lib/webhook"

import { getConfiguredPackageId } from "@/lib/sui"

import { loadAdminRecords, saveAdminNote, type AdminResponseRecord } from "./admin-adapter"
import { BountyPanel } from "./BountyPanel"
import { CostPanel } from "./CostPanel"

type AdminTab = "responses" | "cost" | "bounty"

type DateFilter = "all" | "24h" | "7d"

interface AdminDashboardProps {
  formId: string
}

const severityRank: Record<Severity, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

const severityClasses: Record<Severity, string> = {
  none: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  medium: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  high: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
  critical: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
}

const statusClasses: Record<ResponseStatus, string> = {
  new: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  triaged: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  resolved: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  rejected: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
}

const responseColumns: CsvColumn<AdminResponseRecord>[] = [
  { key: "index", header: "Index", getValue: (record) => record.index },
  { key: "submitted_at", header: "Submitted At", getValue: (record) => new Date(record.ref.timestamp_ms) },
  { key: "submitter", header: "Submitter", getValue: (record) => record.ref.submitter ?? "signed anonymous" },
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
      dateFilter === "24h" ? now - 24 * 60 * 60 * 1000 : dateFilter === "7d" ? now - 7 * 24 * 60 * 60 * 1000 : 0

    return records
      .filter((record) => severity === "all" || record.ref.severity === severity)
      .filter((record) => status === "all" || record.ref.status === status)
      .filter((record) => record.ref.timestamp_ms >= minimumTimestamp)
      .sort((first, second) => {
        const severityDelta = severityRank[second.ref.severity] - severityRank[first.ref.severity]
        return severityDelta || second.ref.timestamp_ms - first.ref.timestamp_ms
      })
  }, [dateFilter, now, records, severity, status])

  const selectedRecord = filteredRecords.find((record) => record.index === selectedIndex) ?? filteredRecords[0]
  const answerEntries = selectedRecord ? Object.entries(selectedRecord.response.answers) : []
  const noteDraft = selectedRecord ? (noteDrafts[selectedRecord.index] ?? selectedRecord.note) : ""

  const metrics = useMemo(() => {
    const criticalCount = records.filter((record) => record.ref.severity === "critical").length
    const openCount = records.filter((record) => record.ref.status === "new" || record.ref.status === "triaged").length
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
    downloadText(`walform-${formId}-responses.csv`, "text/csv;charset=utf-8", toCsv(filteredRecords, responseColumns))
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
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-5 border-b border-[var(--color-hairline)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-[var(--color-slate)]">
              <Icon icon="solar:shield-keyhole-linear" className="h-4 w-4" />
              {formId}
            </div>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-[var(--color-ink)] md:text-5xl">
              Response triage
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <input
                type="url"
                placeholder="Webhook URL"
                value={webhookUrl}
                onChange={(e) => { setWebhookUrlState(e.target.value); setWebhookSaved(false) }}
                className="h-10 w-48 rounded-lg border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 text-xs text-[var(--color-charcoal)] outline-none focus:border-[var(--color-primary)]"
              />
              <Button variant="ghost" className="h-10 rounded-lg px-3 text-xs" onClick={saveWebhook}>
                <Icon icon="solar:bell-linear" className="h-4 w-4" />
                {webhookSaved ? "Saved" : "Hook"}
              </Button>
            </div>
            <Button variant="outline" className="h-10 rounded-lg px-4 text-sm" onClick={exportJson}>
              <Icon icon="solar:code-file-linear" className="h-5 w-5" />
              JSON
            </Button>
            <Button className="h-10 rounded-lg px-4 text-sm" onClick={exportCsv}>
              <Icon icon="solar:download-minimalistic-linear" className="h-5 w-5" />
              CSV
            </Button>
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
            className="rounded-lg border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)]"
          >
            <CostPanel responseCount={records.length} />
          </div>
        )}

        {/* Bounty tab */}
        {activeTab === "bounty" && (
          <div id="panel-bounty" role="tabpanel" aria-labelledby="tab-bounty">
            <BountyPanel
              formId={formId}
              records={records}
              packageId={getConfiguredPackageId() ?? "0xwalform_demo"}
            />
          </div>
        )}

        {/* Responses tab — metrics + list */}
        {activeTab === "responses" && (
          <div id="panel-responses" role="tabpanel" aria-labelledby="tab-responses" className="flex flex-col gap-6">
        <section className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Decrypted" value={records.length.toString()} icon="solar:lock-keyhole-unlocked-linear" />
          <MetricCard label="Prioritized" value={filteredRecords.length.toString()} icon="solar:sort-by-time-linear" />
          <MetricCard label="Open" value={metrics.openCount.toString()} icon="solar:inbox-line-linear" />
          <MetricCard
            label="Critical"
            value={metrics.criticalCount.toString()}
            icon="solar:danger-triangle-linear"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-lg border border-[var(--color-hairline-soft)] bg-[var(--color-card)] shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-3 border-b border-[var(--color-hairline-soft)] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-ink)]">Responses</h2>
                <p className="mt-1 text-sm text-[var(--color-slate)]">
                  Latest {formatDate(metrics.latestTimestamp)} from Sui refs and Walrus blobs
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <SelectFilter label="Severity" value={severity} onChange={(value) => setSeverity(value as Severity | "all")}>
                  <option value="all">All severities</option>
                  {SEVERITIES.map((item) => (
                    <option key={item} value={item}>
                      {titleCase(item)}
                    </option>
                  ))}
                </SelectFilter>
                <SelectFilter label="Status" value={status} onChange={(value) => setStatus(value as ResponseStatus | "all")}>
                  <option value="all">All statuses</option>
                  {RESPONSE_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {titleCase(item)}
                    </option>
                  ))}
                </SelectFilter>
                <SelectFilter label="Date" value={dateFilter} onChange={(value) => setDateFilter(value as DateFilter)}>
                  <option value="all">Any date</option>
                  <option value="24h">Last 24h</option>
                  <option value="7d">Last 7d</option>
                </SelectFilter>
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="p-10 text-center">
                <Icon icon="solar:filter-linear" className="mx-auto h-10 w-10 text-[var(--color-slate)]" />
                <h3 className="mt-3 font-semibold text-[var(--color-ink)]">No matching responses</h3>
                <p className="mt-2 text-sm text-[var(--color-slate)]">Adjust severity, status, or date filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-hairline-soft)]">
                {filteredRecords.map((record) => (
                  <button
                    key={record.index}
                    className={`grid w-full gap-3 p-4 text-left transition-colors hover:bg-teal-50/50 dark:hover:bg-teal-900/20 md:grid-cols-[84px_minmax(0,1fr)_140px_120px] ${
                      selectedRecord?.index === record.index ? "bg-teal-50 dark:bg-teal-900/30" : ""
                    }`}
                    onClick={() => setSelectedIndex(record.index)}
                  >
                    <div className="font-mono text-sm text-[var(--color-slate)]">#{record.index}</div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[var(--color-charcoal)]">
                        {summarizeAnswers(record.response.answers)}
                      </div>
                      <div className="mt-1 truncate font-mono text-xs text-[var(--color-slate)]">
                        {record.ref.blob_id}
                      </div>
                    </div>
                    <SeverityBadge severity={record.ref.severity} />
                    <div className="flex flex-col gap-1 text-sm">
                      <span className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${statusClasses[record.ref.status]}`}>
                        {titleCase(record.ref.status)}
                      </span>
                      <span className="text-xs text-[var(--color-slate)]">{formatDate(record.ref.timestamp_ms)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="rounded-lg border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
            {selectedRecord ? (
              <div className="flex flex-col gap-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-[var(--color-slate)]">Response #{selectedRecord.index}</p>
                    <h2 className="mt-1 text-xl font-semibold text-[var(--color-ink)]">Decrypted detail</h2>
                  </div>
                  <SeverityBadge severity={selectedRecord.ref.severity} />
                </div>

                <dl className="grid gap-3 text-sm">
                  <DetailRow label="Submitter" value={selectedRecord.ref.submitter ?? "Signed anonymous"} />
                  <DetailRow label="Status" value={titleCase(selectedRecord.ref.status)} />
                  <DetailRow label="Root hash" value={selectedRecord.ref.root_hash} mono />
                </dl>

                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-ink)]">Answers</h3>
                  <div className="mt-3 divide-y divide-[var(--color-hairline-soft)] rounded-lg border border-[var(--color-hairline-soft)]">
                    {answerEntries.map(([key, value]) => (
                      <div key={key} className="p-3">
                        <div className="text-xs font-semibold uppercase text-[var(--color-slate)]">{key}</div>
                        <div className="mt-1 break-words text-sm text-[var(--color-charcoal)]">{formatAnswer(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[var(--color-ink)]">Internal note</span>
                  <textarea
                    value={noteDraft}
                    onChange={(event) => {
                      setNoteState("idle")
                      setNoteDrafts((current) => ({
                        ...current,
                        [selectedRecord.index]: event.target.value,
                      }))
                    }}
                    className="min-h-36 resize-y rounded-lg border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-3 text-sm text-[var(--color-charcoal)] outline-none focus:border-[var(--color-primary)]"
                  />
                </label>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-[var(--color-slate)]">
                    Notes encrypt under the owner key and persist as Walrus blob refs.
                  </p>
                  <Button className="h-10 rounded-lg px-4 text-sm" onClick={saveNote} disabled={noteState === "saving"}>
                    <Icon icon="solar:diskette-linear" className="h-5 w-5" />
                    {noteState === "saving" ? "Saving" : "Save"}
                  </Button>
                </div>
                {noteState === "saved" ? <p className="text-sm text-[var(--color-success)]">Note blob ref updated.</p> : null}
                {noteState === "error" ? <p className="text-sm text-[var(--color-error)]">Note upload failed.</p> : null}
              </div>
            ) : null}
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
      className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "border-[var(--color-primary)] text-[var(--color-primary)]"
          : "border-transparent text-[var(--color-slate)] hover:text-[var(--color-ink)]"
      }`}
    >
      <Icon icon={icon} className="h-4 w-4" />
      {label}
    </button>
  )
}

function AdminDashboardShell({ formId, state }: { formId: string; state: "loading" | "error" }) {
  return (
    <main className="min-h-[100dvh] bg-[var(--color-canvas)] px-4 py-6 text-[var(--color-charcoal)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--color-slate)]">{formId}</p>
        <h1 className="mt-3 text-3xl font-bold text-[var(--color-ink)] md:text-5xl">Response triage</h1>
        {state === "loading" ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="h-96 animate-pulse rounded-lg bg-[var(--color-card)]" />
            <div className="h-96 animate-pulse rounded-lg bg-[var(--color-card)]" />
          </div>
        ) : (
          <div className="mt-8 rounded-lg border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-8">
            <Icon icon="solar:danger-circle-linear" className="h-10 w-10 text-[var(--color-error)]" />
            <h2 className="mt-3 text-lg font-semibold text-[var(--color-ink)]">Unable to decrypt responses</h2>
            <p className="mt-2 text-sm text-[var(--color-slate)]">
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
    <div className="rounded-lg border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--color-slate)]">{label}</span>
        <Icon icon={icon} className="h-5 w-5 text-[var(--color-primary)]" />
      </div>
      <div className="mt-3 font-mono text-3xl font-semibold text-[var(--color-ink)]">{value}</div>
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
      <span className="text-xs font-semibold text-[var(--color-slate)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-charcoal)] outline-none focus:border-[var(--color-primary)]"
      >
        {children}
      </select>
    </label>
  )
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClasses[severity]}`}>
      {titleCase(severity)}
    </span>
  )
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-semibold uppercase text-[var(--color-slate)]">{label}</dt>
      <dd className={`break-words text-[var(--color-charcoal)] ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
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

function formatAnswer(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(", ")
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
