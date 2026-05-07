"use client"

import { Icon } from "@iconify/react"
import type { FieldType, PolicyConfig, WalformSchema } from "@walform/shared"
import { useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { CostBadge } from "@/components/CostBadge"
import { Button } from "@/components/ui/button"

import {
  buildWalformSchema,
  createBuilderFieldsFromSchema,
  createBuilderField,
  createBuilderValuesFromSchema,
  createInitialFields,
  createSharePath,
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

  const formValues = useMemo<BuilderFormValues>(
    () => ({ ...defaultValues, ...values }),
    [defaultValues, values],
  )
  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? fields[0]
  const draftSchema = useMemo(() => {
    try {
      const schema = buildWalformSchema({ ...formValues, policyType: policyConfig.type }, fields)
      return { ...schema, policy: policyConfig }
    } catch {
      return null
    }
  }, [fields, formValues, policyConfig])
  const sharePath = draftSchema ? createSharePath(draftSchema) : "/f/draft"

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

  function saveSchema() {
    try {
      const schema = buildWalformSchema({ ...formValues, policyType: policyConfig.type }, fields)
      setSavedJson(JSON.stringify({ ...schema, policy: policyConfig }, null, 2))
      setSaveError("")
    } catch (error) {
      setSavedJson("")
      setSaveError(error instanceof Error ? error.message : "Schema validation failed.")
    }
  }

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
                ? "Template loaded. Adjust the fields, preview it, and export the exact JSON that gets stored on Walrus."
                : "Compose a wallet-aware schema, reorder fields, preview it, and export the exact JSON that gets stored on Walrus."}
            </p>
            <div className="mt-3">
              <CostBadge responseCount={fields.length} />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={saveSchema} type="button" variant="accent">
              <Icon aria-hidden icon="solar:diskette-linear" />
              Save JSON
            </Button>
            <Button asChild type="button" variant="outline">
              <a href={sharePath}>
                <Icon aria-hidden icon="solar:link-linear" />
                Share draft
              </a>
            </Button>
          </div>
        </section>

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

        {/*
          Layout:
            < lg  — single column stack (palette → list/preview → inspector)
            lg    — 2-col: [1fr 320px]. Left = palette+list+preview. Right = sticky inspector.
            xl    — 3-col: [280px 1fr 360px]. Palette | list/preview | inspector.
        */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          {/* FieldPalette — own column at xl; stacks inside left col at lg */}
          <FieldPalette onAddField={addField} />

          {/* Center content — spans both lg columns minus the inspector at xl */}
          <div className="grid gap-5 lg:order-first xl:order-none">
            <FieldList
              draggedFieldId={draggedFieldId}
              fields={fields}
              onDragStart={setDraggedFieldId}
              onDrop={handleDrop}
              onSelect={setSelectedFieldId}
              selectedFieldId={selectedFieldId}
            />
            <FormPreview
              description={formValues.description}
              fields={fields}
              mode={previewMode}
              title={formValues.title}
            />
          </div>

          {/* Inspector — sticky right rail on lg+, full-width on mobile */}
          <div className="grid content-start gap-5 lg:sticky lg:top-24 lg:row-span-2 xl:row-span-1">
            {selectedField ? (
              <FieldEditor
                field={selectedField}
                onRemoveField={removeField}
                onUpdateField={updateField}
              />
            ) : null}
            <section className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--color-ink)]">Preview size</h2>
                <span className="font-mono text-xs text-[var(--color-slate)]">{sharePath}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["desktop", "mobile"] as const).map((mode) => (
                  <button
                    className={`h-10 rounded-[var(--radius-button)] border text-sm font-semibold ${
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
            </section>
          </div>
        </div>

        {saveError ? (
          <div className="mt-6 rounded-[var(--radius-button)] border border-[var(--color-error)]/20 bg-[var(--color-error)]/5 p-4 text-sm text-[var(--color-error)] dark:border-[var(--color-error)]/40 dark:bg-[var(--color-error)]/10">
            {saveError}
          </div>
        ) : null}

        {savedJson ? (
          <section className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[#10201E] p-4 shadow-[var(--shadow-card)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Schema JSON</h2>
              <span className="rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-3 py-1 text-xs font-semibold text-[var(--color-on-accent)]">
                Valid
              </span>
            </div>
            <pre className="max-h-[520px] overflow-auto rounded-[var(--radius-button)] bg-[#081412] p-4 text-xs leading-5 text-teal-50">
              {savedJson}
            </pre>
          </section>
        ) : null}
      </div>
    </main>
  )
}
