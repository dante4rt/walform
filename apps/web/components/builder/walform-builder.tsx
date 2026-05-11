"use client"

import { Icon } from "@iconify/react"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit"
import type { FieldType, PolicyConfig, WalformSchema } from "@walform/shared"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { rememberKnownForm } from "@/lib/form-registry"
import {
  createFormTransaction,
  extractCreatedObjectId,
  getConfiguredPackageId,
  getConfiguredSuiChain,
} from "@/lib/sui"

import {
  buildWalformSchema,
  createBuilderFieldsFromSchema,
  createBuilderField,
  createBuilderValuesFromSchema,
  createInitialFields,
  DEFAULT_BUILDER_VALUES,
  getNextFieldIndex,
  moveField,
  type BuilderField,
  type BuilderFormValues,
} from "./builder-schema"
import { FieldEditor } from "./field-editor"
import { FieldList } from "./field-list"
import { FieldPalette } from "./field-palette"
import { FormPreview } from "./form-preview"
import { PolicyPicker } from "./PolicyPicker"

interface WalformBuilderProps {
  templateSchema?: WalformSchema | null
}

export function WalformBuilder({ templateSchema = null }: WalformBuilderProps) {
  const defaultValues = useMemo(
    () => (templateSchema ? createBuilderValuesFromSchema(templateSchema) : DEFAULT_BUILDER_VALUES),
    [templateSchema],
  )
  const { control, register } = useForm<BuilderFormValues>({
    defaultValues,
  })
  const values = useWatch({ control })
  const [fields, setFields] = useState(() =>
    templateSchema ? createBuilderFieldsFromSchema(templateSchema) : createInitialFields(),
  )
  const [selectedFieldId, setSelectedFieldId] = useState(() => fields[0]?.id ?? "f1")
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("desktop")
  const [policyConfig, setPolicyConfig] = useState<PolicyConfig>(() => ({
    type: defaultValues.policyType,
    config: {},
  }))
  const [savedJson, setSavedJson] = useState("")
  const [saveError, setSaveError] = useState("")
  const [copied, setCopied] = useState(false)
  const [centerTab, setCenterTab] = useState<"fields" | "preview">("fields")
  const [deployState, setDeployState] = useState<"idle" | "signing" | "success" | "error">("idle")
  const [deployedFormId, setDeployedFormId] = useState<string | null>(null)
  const [deployError, setDeployError] = useState("")
  const jsonSectionRef = useRef<HTMLDivElement>(null)
  const prevSavedJson = useRef("")
  const skipScrollRef = useRef(false)

  useEffect(() => {
    if (savedJson && savedJson !== prevSavedJson.current) {
      prevSavedJson.current = savedJson
      if (skipScrollRef.current) {
        skipScrollRef.current = false
        return
      }
      // Small delay so the DOM has painted the section before scrolling.
      requestAnimationFrame(() => {
        jsonSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }
  }, [savedJson])

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

  const formValues = useMemo<BuilderFormValues>(
    () => ({ ...defaultValues, ...values }),
    [defaultValues, values],
  )
  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? fields[0]

  function addField(type: FieldType) {
    const nextField = createBuilderField(type, getNextFieldIndex(fields))
    setFields((currentFields) => [...currentFields, nextField])
    setSelectedFieldId(nextField.id)
  }

  function updateField(updatedField: BuilderField) {
    setFields((currentFields) =>
      currentFields.map((field) => (field.id === updatedField.id ? updatedField : field)),
    )
  }

  function removeField(fieldId: string) {
    setFields((currentFields) => {
      if (currentFields.length === 1) {
        return currentFields
      }

      const nextFields = currentFields.filter((field) => field.id !== fieldId)
      setSelectedFieldId(nextFields[0]?.id ?? "")
      return nextFields
    })
  }

  function handleDrop(targetFieldId: string) {
    if (!draggedFieldId) {
      return
    }

    setFields((currentFields) => moveField(currentFields, draggedFieldId, targetFieldId))
    setDraggedFieldId(null)
  }

  function exportSchema() {
    try {
      const schema = buildWalformSchema({ ...formValues, policyType: policyConfig.type }, fields)
      const fullSchema = { ...schema, policy: policyConfig }
      const json = JSON.stringify(fullSchema, null, 2)
      setSavedJson(json)
      setSaveError("")
      try {
        localStorage.setItem("walform:builder-preview", JSON.stringify(fullSchema))
      } catch {
        // not critical
      }
    } catch (error) {
      setSavedJson("")
      setSaveError(error instanceof Error ? error.message : "Schema validation failed.")
    }
  }

  async function deployForm() {
    const packageId = getConfiguredPackageId()
    if (!packageId) {
      setDeployError("NEXT_PUBLIC_WALFORM_PACKAGE_ID is not configured.")
      setDeployState("error")
      return
    }
    if (!currentAccount) {
      setDeployError("Connect a wallet from the navbar first.")
      setDeployState("error")
      return
    }

    try {
      setDeployState("signing")
      setDeployError("")
      setDeployedFormId(null)

      // Build + validate schema.
      const schema = buildWalformSchema({ ...formValues, policyType: policyConfig.type }, fields)
      const fullSchema = { ...schema, policy: policyConfig }
      const schemaJson = JSON.stringify(fullSchema)

      // Generate a deterministic blob ID from the schema content.
      const schemaBytes = new TextEncoder().encode(schemaJson)
      const digest = await crypto.subtle.digest("SHA-256", schemaBytes)
      const blobId = [...new Uint8Array(digest)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")

      // Create + sign the Sui transaction.
      const tx = createFormTransaction(packageId, blobId)
      const result = await signAndExecuteTransaction({
        transaction: tx,
        chain: getConfiguredSuiChain(),
        account: currentAccount,
      })

      // Extract the new Form object ID from the transaction effects.
      const formObjectId = extractCreatedObjectId(result, "::form::Form")
      if (!formObjectId) {
        throw new Error(
          "Transaction succeeded but no Form object was created. Check the transaction on Suiscan.",
        )
      }

      // Persist schema so the form page can render it.
      try {
        localStorage.setItem(`walform:schema:${formObjectId}`, schemaJson)
      } catch {
        // not critical
      }

      rememberKnownForm({
        formId: formObjectId,
        title: fullSchema.title,
        owner: currentAccount.address,
        createdAtMs: Date.now(),
      })

      // Also persist for the /f/demo preview.
      try {
        localStorage.setItem("walform:builder-preview", schemaJson)
      } catch {
        // not critical
      }

      setDeployedFormId(formObjectId)
      setDeployState("success")

      // Update the JSON view with on-chain metadata (skip auto-scroll).
      skipScrollRef.current = true
      setSavedJson(
        JSON.stringify({ ...fullSchema, _onChainFormId: formObjectId, _blobId: blobId }, null, 2),
      )
    } catch (error) {
      setDeployState("error")
      setDeployError(error instanceof Error ? error.message : "Deployment failed.")
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const explorerBase =
    getConfiguredSuiChain() === "sui:mainnet"
      ? "https://suiscan.xyz/mainnet"
      : "https://suiscan.xyz/testnet"

  return (
    <main className="min-h-[100dvh] bg-[var(--color-canvas)] px-5 py-8 text-[var(--color-charcoal)] md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 flex flex-col justify-between gap-5 rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-[var(--color-primary)]">Builder</p>
            <h1 className="mt-2 text-4xl font-bold leading-tight text-[var(--color-ink)]">
              Create a Walform
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-slate)]">
              {templateSchema
                ? "Template loaded. Adjust the fields, preview it, and deploy the form on-chain."
                : "Compose a wallet-aware schema, reorder fields, preview it, and deploy the form on-chain."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={deployForm}
              type="button"
              variant="accent"
              disabled={deployState === "signing"}
            >
              <Icon
                aria-hidden
                icon={deployState === "signing" ? "solar:refresh-linear" : "solar:rocket-2-linear"}
                className={deployState === "signing" ? "animate-spin" : ""}
              />
              {deployState === "signing" ? "Signing…" : "Deploy form"}
            </Button>
            <Button onClick={exportSchema} type="button" variant="outline">
              <Icon aria-hidden icon="solar:code-square-linear" />
              Export JSON
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/f/demo/">
                <Icon aria-hidden icon="solar:eye-linear" />
                Preview form
              </Link>
            </Button>
          </div>
        </section>

        {/* Deploy success */}
        {deployState === "success" && deployedFormId && (
          <section className="mb-6 rounded-[var(--radius-card)] border border-[var(--color-primary)]/30 bg-[var(--color-tint-mint)] p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                <Icon icon="solar:check-circle-bold" width={18} height={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-[var(--color-ink)]">
                  Form deployed on-chain
                </h2>
                <p className="mt-1 text-xs text-[var(--color-slate)]">
                  Your form is now a Sui object. Share the form ID or open it directly.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <code className="rounded-[var(--radius-button)] bg-[var(--color-card)] px-3 py-1.5 font-mono text-xs text-[var(--color-primary-deep)]">
                    {deployedFormId}
                  </code>
                  <button
                    className="flex size-8 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] text-[var(--color-slate)] transition-colors hover:text-[var(--color-primary)]"
                    onClick={() =>
                      copyText(
                        `${window.location.origin}/f/?formId=${encodeURIComponent(deployedFormId)}`,
                      )
                    }
                    type="button"
                    title="Copy form link"
                  >
                    <Icon
                      icon={copied ? "solar:check-circle-linear" : "solar:copy-linear"}
                      width={16}
                      height={16}
                    />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-button)] bg-[var(--color-primary)] px-3 text-xs font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-deep)]"
                    href={`/f/?formId=${encodeURIComponent(deployedFormId)}`}
                  >
                    <Icon icon="solar:eye-linear" width={14} height={14} />
                    Open public form
                  </a>
                  <a
                    className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 text-xs font-semibold text-[var(--color-charcoal)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    href={`${explorerBase}/object/${deployedFormId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon icon="solar:graph-up-linear" width={14} height={14} />
                    View on Suiscan
                  </a>
                  <a
                    className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 text-xs font-semibold text-[var(--color-charcoal)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    href={`/admin/?formId=${encodeURIComponent(deployedFormId)}`}
                  >
                    <Icon icon="solar:shield-user-linear" width={14} height={14} />
                    Open admin
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Deploy error */}
        {deployState === "error" && deployError && (
          <div className="mb-6 rounded-[var(--radius-button)] border border-[var(--color-error)]/20 bg-[var(--color-error)]/5 p-4 text-sm text-[var(--color-error)] dark:border-[var(--color-error)]/40 dark:bg-[var(--color-error)]/10">
            {deployError}
          </div>
        )}

        {/* Schema validation error */}
        {saveError && (
          <div className="mb-6 rounded-[var(--radius-button)] border border-[var(--color-error)]/20 bg-[var(--color-error)]/5 p-4 text-sm text-[var(--color-error)] dark:border-[var(--color-error)]/40 dark:bg-[var(--color-error)]/10">
            {saveError}
          </div>
        )}

        <section className="mb-6 grid gap-4 rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] md:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-2 lg:col-span-2">
            <span className="text-sm font-semibold text-[var(--color-ink)]">Title</span>
            <input
              className="h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-charcoal)] outline-none placeholder-[var(--color-stone)] focus:border-[var(--color-primary)]"
              {...register("title")}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--color-ink)]">Mode</span>
            <select
              className="h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-charcoal)] outline-none focus:border-[var(--color-primary)]"
              {...register("submissionMode")}
            >
              <option value="wallet">Wallet</option>
              <option value="signed_anon">Signed anon</option>
            </select>
          </label>
          <label className="grid gap-2 md:col-span-2 lg:col-span-4">
            <span className="text-sm font-semibold text-[var(--color-ink)]">Description</span>
            <textarea
              className="min-h-20 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] px-3 py-2 text-sm leading-6 text-[var(--color-charcoal)] outline-none placeholder-[var(--color-stone)] focus:border-[var(--color-primary)]"
              {...register("description")}
            />
          </label>
        </section>

        <section className="mb-6 rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-ink)]">Access policy</h2>
          <PolicyPicker value={policyConfig} onChange={setPolicyConfig} />
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <FieldPalette onAddField={addField} />

          <div className="grid gap-5 lg:order-first xl:order-none">
            <div className="flex rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-card)]">
              <button
                className={`flex-1 rounded-[var(--radius-button)] px-4 py-2.5 text-sm font-semibold transition-colors ${
                  centerTab === "fields"
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-slate)] hover:text-[var(--color-charcoal)]"
                }`}
                onClick={() => setCenterTab("fields")}
                type="button"
              >
                <Icon
                  icon="solar:list-linear"
                  className="mr-1.5 inline-block align-[-2px]"
                  width={16}
                  height={16}
                />
                Fields
              </button>
              <button
                className={`flex-1 rounded-[var(--radius-button)] px-4 py-2.5 text-sm font-semibold transition-colors ${
                  centerTab === "preview"
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-slate)] hover:text-[var(--color-charcoal)]"
                }`}
                onClick={() => setCenterTab("preview")}
                type="button"
              >
                <Icon
                  icon="solar:eye-linear"
                  className="mr-1.5 inline-block align-[-2px]"
                  width={16}
                  height={16}
                />
                Preview
              </button>
            </div>

            {centerTab === "fields" ? (
              <FieldList
                draggedFieldId={draggedFieldId}
                fields={fields}
                onDragStart={setDraggedFieldId}
                onDrop={handleDrop}
                onSelect={setSelectedFieldId}
                selectedFieldId={selectedFieldId}
              />
            ) : (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    {(["desktop", "mobile"] as const).map((mode) => (
                      <button
                        className={`h-9 rounded-[var(--radius-button)] border px-4 text-xs font-semibold transition-colors ${
                          previewMode === mode
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                            : "border-[var(--color-hairline-soft)] text-[var(--color-ink)]"
                        }`}
                        key={mode}
                        onClick={() => setPreviewMode(mode)}
                        type="button"
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <span className="font-mono text-xs text-[var(--color-slate)]">/f/demo</span>
                </div>
                <FormPreview
                  description={formValues.description}
                  fields={fields}
                  mode={previewMode}
                  title={formValues.title}
                />
              </div>
            )}
          </div>

          <div className="grid content-start gap-5 lg:sticky lg:top-24 lg:row-span-2 xl:row-span-1">
            {selectedField ? (
              <FieldEditor
                field={selectedField}
                onRemoveField={removeField}
                onUpdateField={updateField}
              />
            ) : null}
          </div>
        </div>

        {/* Exported JSON */}
        {savedJson && (
          <section
            ref={jsonSectionRef}
            className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[#10201E] p-4 shadow-[var(--shadow-card)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Schema JSON</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-3 py-1 text-xs font-semibold text-[var(--color-on-accent)]">
                  Valid
                </span>
                <button
                  className="flex h-8 items-center gap-1.5 rounded-[var(--radius-button)] border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                  onClick={() => copyText(savedJson)}
                  type="button"
                >
                  <Icon
                    icon={copied ? "solar:check-circle-linear" : "solar:copy-linear"}
                    width={14}
                    height={14}
                  />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <pre className="max-h-[520px] overflow-auto rounded-[var(--radius-button)] bg-[#081412] p-4 text-xs leading-5 text-teal-50">
              {savedJson}
            </pre>
          </section>
        )}
      </div>
    </main>
  )
}
