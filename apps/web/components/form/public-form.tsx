"use client"

import { Icon } from "@iconify/react"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit"
import type { FormField, Severity, SubmissionMode, WalformSchema } from "@walform/shared"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  createAttachmentAnswer,
  formatFileSize,
  isAttachmentAnswer,
  loadAttachmentPreviewUrl,
  type AttachmentAnswer,
} from "@/lib/attachments"
import { deleteDraft, loadDraft, saveDraft } from "@/lib/drafts"
import {
  appendPreparedSubmission,
  prepareFormResponse,
  updateStoredSubmission,
  type StoredSubmission,
} from "@/lib/submissions"
import {
  createSubmitResponseTransaction,
  getConfiguredPackageId,
  getConfiguredSuiChain,
} from "@/lib/sui"
import { dispatchWebhook } from "@/lib/webhook"

interface PublicFormProps {
  formId: string
  schema: WalformSchema
  adminReturnHref?: string
}

type AnswerValue =
  | string
  | string[]
  | number
  | boolean
  | AttachmentAnswer
  | AttachmentAnswer[]
  | null
type OptionField = Extract<FormField, { type: "dropdown" | "checkbox_group" }>
type StarRatingField = Extract<FormField, { type: "star_rating" }>

// ── Helpers ──────────────────────────────────────────────────────────────────

function FormIdChip({ formId }: { formId: string }) {
  return (
    <span
      className="inline-block max-w-full whitespace-normal break-all rounded-[var(--radius-pill)] bg-[var(--color-tint-mint)] px-2 py-0.5 font-mono text-[10px] leading-relaxed text-[var(--color-primary-deep)]"
      title={formId}
    >
      {formId}
    </span>
  )
}

const severityOptions: Array<{ value: Severity; label: string }> = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
]

export function PublicForm({ formId, schema, adminReturnHref }: PublicFormProps) {
  const currentAccount = useCurrentAccount()
  const suiClient = useSuiClient()
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showEffects: true,
          showObjectChanges: true,
          showRawEffects: true,
        },
      }),
  })
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [submissionMode, setSubmissionMode] = useState<SubmissionMode>(schema.submission_mode)
  const [severity, setSeverity] = useState<Severity>("none")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [result, setResult] = useState<StoredSubmission | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [draftRestored, setDraftRestored] = useState(false)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requiredCount = useMemo(
    () => schema.fields.filter((field) => field.required).length,
    [schema.fields],
  )

  // Load draft on mount.
  useEffect(() => {
    loadDraft(formId).then((draft) => {
      if (draft) {
        setAnswers(draft.answers as Record<string, AnswerValue>)
        if (draft.severity) setSeverity(draft.severity as Severity)
        setDraftRestored(true)
      }
    })
  }, [formId])

  // Debounced draft save on answer/severity change.
  const scheduleDraftSave = useCallback(
    (nextAnswers: Record<string, AnswerValue>, nextSeverity: Severity) => {
      if (draftTimer.current) clearTimeout(draftTimer.current)
      draftTimer.current = setTimeout(() => {
        saveDraft({
          formId,
          answers: nextAnswers as Record<string, unknown>,
          severity: nextSeverity,
          updatedAt: Date.now(),
        })
      }, 1000)
    },
    [formId],
  )

  async function handleSubmit() {
    const nextErrors = validateAnswers(schema.fields, answers)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    try {
      setStatus("submitting")
      setErrorMessage("")
      const prepared = await prepareFormResponse({
        formId,
        answers: normalizeAnswers(schema.fields, answers),
        severity: severity === "none" ? null : severity,
        submissionMode,
        submitter: submissionMode === "wallet" ? (currentAccount?.address ?? null) : null,
        rating: extractRating(schema.fields, answers),
      })
      const packageId = getConfiguredPackageId()
      let stored = prepared.stored

      const canSubmitOnChain = Boolean(packageId && currentAccount && isSuiObjectId(formId))

      if (canSubmitOnChain && packageId && currentAccount) {
        const tx = createSubmitResponseTransaction({
          packageId,
          formId,
          blobId: stored.ref.blob_id,
          rootHash: stored.ref.root_hash,
          response: prepared.response,
          rating: prepared.rating,
        })
        const result = await signAndExecuteTransaction({
          transaction: tx,
          chain: getConfiguredSuiChain(),
          account: currentAccount,
        })

        stored = {
          ...stored,
          tx: {
            ...stored.tx,
            digest: result.digest,
          },
        }
      } else if (packageId && !currentAccount && isSuiObjectId(formId)) {
        throw new Error("Connect a Sui wallet on testnet before submitting on-chain.")
      }

      appendPreparedSubmission(formId, stored)
      updateStoredSubmission(formId, stored)
      deleteDraft(formId)

      // Fire webhook (non-blocking, best-effort).
      dispatchWebhook(formId, {
        blobId: stored.ref.blob_id,
        rootHash: stored.ref.root_hash,
        txDigest: stored.tx.digest,
        timestampMs: stored.ref.timestamp_ms,
        submitter: stored.ref.submitter ?? null,
        severity: stored.ref.severity === "none" ? null : stored.ref.severity,
      })

      setResult(stored)
      setStatus("success")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      setStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Submission failed.")
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[var(--color-canvas)] px-5 py-8 text-[var(--color-charcoal)] md:px-8">
      {/* Mobile FLOW strip — visible only below lg */}
      <div className="mx-auto mb-4 max-w-7xl lg:hidden">
        <div className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
          {(["Seal encrypt", "Walrus writeBlob", "Sui submit", "Receipt"] as const).map(
            (label, index) => (
              <div className="flex flex-col items-center gap-1" key={label}>
                <span className="flex size-7 items-center justify-center rounded-full bg-[var(--color-tint-sky)] font-mono text-xs font-bold text-[var(--color-primary-deep)]">
                  {index + 1}
                </span>
                <span className="text-center text-[10px] font-medium leading-tight text-[var(--color-slate)]">
                  {label}
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
        <section className="min-w-0 rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] md:p-7">
          <div className="border-b border-[var(--color-hairline-soft)] pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold leading-tight text-[var(--color-ink)] sm:text-4xl">
                {schema.title}
              </h1>
              <span className="rounded-[var(--radius-pill)] bg-[var(--color-tint-mint)] px-3 py-1 text-xs font-semibold text-[var(--color-primary-deep)]">
                {requiredCount} required
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <FormIdChip formId={formId} />
            </div>
            {schema.description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-slate)]">
                {schema.description}
              </p>
            ) : null}
          </div>

          <div className="mt-6 grid gap-5">
            {draftRestored ? (
              <div className="flex items-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-hairline)] bg-[var(--color-tint-mint)] px-4 py-2.5 text-sm text-[var(--color-primary-deep)]">
                <Icon icon="solar:cloud-check-linear" className="h-4 w-4" />
                Draft restored from your last visit.
              </div>
            ) : null}
            {schema.fields.map((field) => (
              <FieldControl
                error={errors[field.id]}
                field={field}
                key={field.id}
                onChange={(value) => {
                  setAnswers((current) => {
                    const next = { ...current, [field.id]: value }
                    scheduleDraftSave(next, severity)
                    return next
                  })
                }}
                value={answers[field.id]}
              />
            ))}
          </div>

          <div className="mt-6 grid gap-4 rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[var(--color-ink)]">Submission mode</span>
              <select
                className="w-full h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
                onChange={(event) => setSubmissionMode(event.target.value as SubmissionMode)}
                value={submissionMode}
              >
                <option value="wallet">Wallet receipt</option>
                <option value="signed_anon">Signed anonymous</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[var(--color-ink)]">Severity</span>
              <select
                className="w-full h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
                onChange={(event) => {
                  const next = event.target.value as Severity
                  setSeverity(next)
                  scheduleDraftSave(answers, next)
                }}
                value={severity}
              >
                {severityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {status === "error" ? (
            <div className="mt-5 rounded-[var(--radius-button)] border border-red-200 bg-red-50 p-4 text-sm text-[var(--color-error)] dark:border-red-800 dark:bg-red-950">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button disabled={status === "submitting"} onClick={handleSubmit} type="button">
              <Icon aria-hidden icon="solar:shield-check-linear" />
              {status === "submitting" ? "Encrypting..." : "Submit response"}
            </Button>
            {adminReturnHref ? (
              <Button asChild variant="outline">
                <Link href={adminReturnHref}>
                  <Icon aria-hidden icon="solar:shield-user-linear" />
                  Back to admin
                </Link>
              </Button>
            ) : null}
          </div>
        </section>

        <aside className="hidden content-start gap-4 lg:grid">
          <section className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
            <p className="text-xs font-semibold uppercase text-[var(--color-primary)]">Flow</p>
            <div className="mt-4 grid gap-3">
              {["Seal encrypt", "Walrus writeBlob", "Sui submit_response", "Receipt minted"].map(
                (label, index) => (
                  <div className="flex items-center gap-3" key={label}>
                    <span className="flex size-8 items-center justify-center rounded-full bg-[var(--color-tint-sky)] font-mono text-xs font-bold text-[var(--color-primary-deep)]">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-ink)]">{label}</span>
                  </div>
                ),
              )}
            </div>
          </section>

          {result ? (
            <section className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[#10201E] p-5 text-teal-50 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold uppercase text-[var(--color-accent)]">
                Submission saved
              </p>
              <dl className="mt-4 grid gap-3 text-sm">
                <div>
                  <dt className="text-teal-50/60">Blob ID</dt>
                  <dd className="break-all font-mono">{result.ref.blob_id}</dd>
                </div>
                <div>
                  <dt className="text-teal-50/60">Tx digest</dt>
                  <dd className="break-all font-mono">
                    <a
                      className="underline decoration-teal-300/50 underline-offset-4"
                      href={`https://suiexplorer.com/txblock/${result.tx.digest}?network=${process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet" ? "mainnet" : "testnet"}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {result.tx.digest}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-teal-50/60">Root hash</dt>
                  <dd className="break-all font-mono">{result.ref.root_hash.slice(0, 32)}...</dd>
                </div>
              </dl>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  )
}

function FieldControl({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField
  value: AnswerValue | undefined
  error?: string
  onChange: (value: AnswerValue) => void
}) {
  if (field.type === "confirmation") {
    return (
      <div className="grid gap-2">
        {renderInput(field, value, onChange)}
        {error ? (
          <span className="text-xs font-medium text-[var(--color-error)]">{error}</span>
        ) : null}
      </div>
    )
  }

  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--color-ink)]">
        {field.label}
        {field.required ? <span className="text-[var(--color-error)]"> *</span> : null}
      </span>
      {renderInput(field, value, onChange)}
      {error ? (
        <span className="text-xs font-medium text-[var(--color-error)]">{error}</span>
      ) : null}
    </label>
  )
}

function renderInput(
  field: FormField,
  value: AnswerValue | undefined,
  onChange: (value: AnswerValue) => void,
) {
  if (field.type === "rich_text") {
    return (
      <textarea
        className="w-full min-h-32 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--color-primary)]"
        onChange={(event) => onChange(event.target.value)}
        value={typeof value === "string" ? value : ""}
      />
    )
  }

  if (field.type === "dropdown") {
    const options = getOptions(field)

    return (
      <select
        className="w-full h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
        onChange={(event) => onChange(event.target.value)}
        value={typeof value === "string" ? value : ""}
      >
        <option value="">Select one</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === "checkbox_group") {
    const selected = Array.isArray(value)
      ? value.filter(
          (selectedOption): selectedOption is string => typeof selectedOption === "string",
        )
      : []
    const options = getOptions(field)

    return (
      <div className="grid gap-2">
        {options.map((option) => (
          <span
            className="flex items-center gap-2 text-sm text-[var(--color-charcoal)]"
            key={option}
          >
            <input
              checked={selected.includes(option)}
              className="size-5 accent-[var(--color-primary)]"
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option]
                    : selected.filter((selectedOption) => selectedOption !== option),
                )
              }
              type="checkbox"
            />
            {option}
          </span>
        ))}
      </div>
    )
  }

  if (field.type === "star_rating") {
    const selected = typeof value === "number" ? value : 0
    const max = getMaxRating(field)

    return (
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, index) => {
          const rating = index + 1
          return (
            <button
              aria-label={`${rating} star`}
              className={`text-2xl ${rating <= selected ? "text-[var(--color-accent)]" : "text-[var(--color-stone)]"}`}
              key={rating}
              onClick={() => onChange(rating)}
              type="button"
            >
              <Icon aria-hidden icon="solar:star-bold" />
            </button>
          )
        })}
      </div>
    )
  }

  if (field.type === "screenshot" || field.type === "video") {
    const attachmentFieldType = field.type
    const selectedAttachments = getAttachmentAnswers(value)

    return (
      <div className="grid gap-2">
        <input
          accept={attachmentFieldType === "screenshot" ? "image/*" : "video/*"}
          className="w-full rounded-[var(--radius-button)] border border-dashed border-[var(--color-stone)] bg-[var(--color-card)] p-3 text-sm file:mr-3 file:rounded-[var(--radius-button)] file:border-0 file:bg-[var(--color-tint-mint)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--color-primary-deep)]"
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? [])

            if (files.length === 0) {
              onChange(null)
              return
            }

            const attachments = await Promise.all(
              files.map((file) => createAttachmentAnswer(file, attachmentFieldType)),
            )

            onChange(
              attachmentFieldType === "screenshot"
                ? [...selectedAttachments, ...attachments]
                : attachments[0],
            )
            event.target.value = ""
          }}
          multiple={attachmentFieldType === "screenshot"}
          type="file"
        />
        {selectedAttachments.length > 0 ? (
          <div className="grid gap-2">
            {selectedAttachments.map((attachment, index) => (
              <SelectedAttachmentPreview
                attachment={attachment}
                fieldType={attachmentFieldType}
                key={`${attachment.storageKey ?? attachment.name}-${index}`}
                onRemove={
                  attachmentFieldType === "screenshot"
                    ? () => {
                        const nextAttachments = selectedAttachments.filter(
                          (_, attachmentIndex) => attachmentIndex !== index,
                        )
                        onChange(nextAttachments.length > 0 ? nextAttachments : null)
                      }
                    : undefined
                }
              />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  if (field.type === "url") {
    return (
      <input
        className="w-full h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://"
        type="url"
        value={typeof value === "string" ? value : ""}
      />
    )
  }

  return (
    <label className="flex items-start gap-2 text-sm leading-6 text-[var(--color-charcoal)]">
      <input
        checked={value === true}
        className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        {field.label}
        {field.required ? <span className="text-[var(--color-error)]"> *</span> : null}
      </span>
    </label>
  )
}

function validateAnswers(fields: FormField[], answers: Record<string, AnswerValue>) {
  return fields.reduce<Record<string, string>>((currentErrors, field) => {
    if (!field.required || hasAnswer(answers[field.id])) {
      return currentErrors
    }

    return {
      ...currentErrors,
      [field.id]: "This field is required.",
    }
  }, {})
}

function hasAnswer(value: AnswerValue | undefined): boolean {
  if (Array.isArray(value)) {
    return value.length > 0
  }

  return value !== undefined && value !== null && value !== "" && value !== false
}

function getAttachmentAnswers(value: AnswerValue | undefined): AttachmentAnswer[] {
  if (Array.isArray(value)) {
    return value.filter(isAttachmentAnswer)
  }

  return isAttachmentAnswer(value) ? [value] : []
}

function normalizeAnswers(fields: FormField[], answers: Record<string, AnswerValue>) {
  return fields.reduce<Record<string, unknown>>((normalized, field) => {
    const value = answers[field.id]

    if (value !== undefined && value !== null && value !== "") {
      normalized[field.id] = value
    }

    return normalized
  }, {})
}

function extractRating(fields: FormField[], answers: Record<string, AnswerValue>): number | null {
  const ratingField = fields.find((field) => field.type === "star_rating")
  const rating = ratingField ? answers[ratingField.id] : null

  return typeof rating === "number" ? rating : null
}

function getOptions(field: FormField): string[] {
  return "options" in field ? (field as OptionField).options : []
}

function getMaxRating(field: FormField): number {
  return "max" in field ? (field as StarRatingField).max : 5
}

function SelectedAttachmentPreview({
  attachment,
  fieldType,
  onRemove,
}: {
  attachment: AttachmentAnswer
  fieldType: "screenshot" | "video"
  onRemove?: () => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(attachment.previewDataUrl ?? null)

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null

    loadAttachmentPreviewUrl(attachment).then((url) => {
      if (!url) {
        return
      }

      if (!active) {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url)
        }
        return
      }

      objectUrl = url.startsWith("blob:") ? url : null
      setPreviewUrl(url)
    })

    return () => {
      active = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [attachment])

  const canPreviewImage = fieldType === "screenshot" && previewUrl
  const canPreviewVideo = fieldType === "video" && previewUrl

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-2">
      {canPreviewImage ? (
        <span
          aria-label={`Preview of ${attachment.name}`}
          className="h-14 w-20 shrink-0 rounded border border-[var(--color-hairline-soft)] bg-cover bg-center"
          role="img"
          style={{ backgroundImage: `url("${previewUrl}")` }}
        />
      ) : canPreviewVideo ? (
        <video
          className="h-14 w-24 shrink-0 rounded border border-[var(--color-hairline-soft)] bg-black object-contain"
          controls
          preload="metadata"
          src={previewUrl}
        />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded bg-[var(--color-tint-sky)] text-[var(--color-primary)]">
          <Icon
            aria-hidden
            icon={fieldType === "screenshot" ? "solar:gallery-linear" : "solar:videocamera-linear"}
          />
        </span>
      )}
      <span className="min-w-0 text-xs text-[var(--color-slate)]">
        <span className="block truncate font-medium text-[var(--color-charcoal)]">
          {attachment.name}
        </span>
        <span>{formatFileSize(attachment.size)}</span>
      </span>
      {onRemove ? (
        <button
          aria-label={`Remove ${attachment.name}`}
          className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-button)] text-[var(--color-stone)] transition-colors hover:bg-[var(--color-card)] hover:text-[var(--color-error)]"
          onClick={onRemove}
          type="button"
        >
          <Icon aria-hidden icon="solar:trash-bin-trash-linear" />
        </button>
      ) : null}
    </div>
  )
}

function isSuiObjectId(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value)
}
