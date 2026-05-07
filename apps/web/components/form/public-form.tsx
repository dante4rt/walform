"use client"

import { Icon } from "@iconify/react"
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit"
import type { FormField, Severity, SubmissionMode, WalformSchema } from "@walform/shared"
import Link from "next/link"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
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

interface PublicFormProps {
  formId: string
  schema: WalformSchema
}

type AnswerValue = string | string[] | number | boolean | null
type OptionField = Extract<FormField, { type: "dropdown" | "checkbox_group" }>
type StarRatingField = Extract<FormField, { type: "star_rating" }>

const severityOptions: Array<{ value: Severity; label: string }> = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
]

export function PublicForm({ formId, schema }: PublicFormProps) {
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
  const requiredCount = useMemo(
    () => schema.fields.filter((field) => field.required).length,
    [schema.fields],
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
        submitter: submissionMode === "wallet" ? currentAccount?.address ?? null : null,
        rating: extractRating(schema.fields, answers),
      })
      const packageId = getConfiguredPackageId()
      let stored = prepared.stored

      if (packageId && currentAccount) {
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
      } else if (packageId && !currentAccount) {
        throw new Error("Connect a Sui wallet on testnet before submitting on-chain.")
      }

      appendPreparedSubmission(formId, stored)
      updateStoredSubmission(formId, stored)

      setResult(stored)
      setStatus("success")
    } catch (error) {
      setStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Submission failed.")
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[var(--color-canvas)] px-5 py-8 text-[var(--color-charcoal)] md:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] md:p-7">
          <div className="flex flex-col gap-4 border-b border-[var(--color-hairline-soft)] pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold uppercase text-[var(--color-primary)]">
                /f/{formId}
              </p>
              <h1 className="mt-2 text-4xl font-bold leading-tight text-[var(--color-ink)]">
                {schema.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-slate)]">
                {schema.description}
              </p>
            </div>
            <span className="w-fit rounded-[var(--radius-pill)] bg-[var(--color-tint-mint)] px-3 py-1 text-xs font-semibold text-[var(--color-primary-deep)]">
              {requiredCount} required
            </span>
          </div>

          <div className="mt-6 grid gap-5">
            {schema.fields.map((field) => (
              <FieldControl
                error={errors[field.id]}
                field={field}
                key={field.id}
                onChange={(value) => setAnswers((current) => ({ ...current, [field.id]: value }))}
                value={answers[field.id]}
              />
            ))}
          </div>

          <div className="mt-6 grid gap-4 rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[var(--color-ink)]">Submission mode</span>
              <select
                className="h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 text-sm outline-none focus:border-[var(--color-primary)]"
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
                className="h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 text-sm outline-none focus:border-[var(--color-primary)]"
                onChange={(event) => setSeverity(event.target.value as Severity)}
                value={severity}
              >
                {severityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {submissionMode === "wallet" ? (
              <div className="grid gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-[var(--color-ink)]">Wallet</span>
                <div className="flex flex-col gap-3 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="break-all font-mono text-xs text-[var(--color-slate)]">
                    {currentAccount?.address ?? "Connect a testnet wallet to execute the Sui tx."}
                  </span>
                  <ConnectButton
                    className="h-10 rounded-[var(--radius-button)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white"
                    connectText="Connect wallet"
                  />
                </div>
              </div>
            ) : null}
          </div>

          {status === "error" ? (
            <div className="mt-5 rounded-[var(--radius-button)] border border-red-200 bg-red-50 p-4 text-sm text-[var(--color-error)]">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button disabled={status === "submitting"} onClick={handleSubmit} type="button">
              <Icon aria-hidden icon="solar:shield-check-linear" />
              {status === "submitting" ? "Encrypting..." : "Submit response"}
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/${formId}/`}>
                <Icon aria-hidden icon="solar:chart-square-linear" />
                Open admin
              </Link>
            </Button>
          </div>
        </section>

        <aside className="grid content-start gap-4">
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
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--color-ink)]">
        {field.label}
        {field.required ? <span className="text-[var(--color-error)]"> *</span> : null}
      </span>
      {renderInput(field, value, onChange)}
      {error ? <span className="text-xs font-medium text-[var(--color-error)]">{error}</span> : null}
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
        className="min-h-32 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--color-primary)]"
        onChange={(event) => onChange(event.target.value)}
        value={typeof value === "string" ? value : ""}
      />
    )
  }

  if (field.type === "dropdown") {
    const options = getOptions(field)

    return (
      <select
        className="h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 text-sm outline-none focus:border-[var(--color-primary)]"
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
    const selected = Array.isArray(value) ? value : []
    const options = getOptions(field)

    return (
      <div className="grid gap-2">
        {options.map((option) => (
          <span className="flex items-center gap-2 text-sm text-[var(--color-charcoal)]" key={option}>
            <input
              checked={selected.includes(option)}
              className="size-5 accent-[var(--color-primary)]"
              onChange={(event) =>
                onChange(
                  event.target.checked ?
                    [...selected, option]
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
    return (
      <input
        accept={field.type === "screenshot" ? "image/*" : "video/*"}
        className="rounded-[var(--radius-button)] border border-dashed border-[var(--color-stone)] bg-white p-3 text-sm file:mr-3 file:rounded-[var(--radius-button)] file:border-0 file:bg-[var(--color-tint-mint)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--color-primary-deep)]"
        onChange={(event) => onChange(event.target.files?.[0]?.name ?? null)}
        type="file"
      />
    )
  }

  if (field.type === "url") {
    return (
      <input
        className="h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 text-sm outline-none focus:border-[var(--color-primary)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://"
        type="url"
        value={typeof value === "string" ? value : ""}
      />
    )
  }

  return (
    <span className="flex items-center gap-2 text-sm text-[var(--color-charcoal)]">
      <input
        checked={value === true}
        className="size-5 accent-[var(--color-primary)]"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {field.label}
    </span>
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
