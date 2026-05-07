"use client"

import { Icon } from "@iconify/react"
import type { FieldType, WalformSchema } from "@walform/shared"
import { useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"

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
  const [savedJson, setSavedJson] = useState("")
  const [saveError, setSaveError] = useState("")

  const formValues = useMemo<BuilderFormValues>(
    () => ({ ...defaultValues, ...values }),
    [defaultValues, values],
  )
  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? fields[0]
  const draftSchema = useMemo(() => {
    try {
      return buildWalformSchema(formValues, fields)
    } catch {
      return null
    }
  }, [fields, formValues])
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
      const schema = buildWalformSchema(formValues, fields)
      setSavedJson(JSON.stringify(schema, null, 2))
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
              className="h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 text-sm outline-none focus:border-[var(--color-primary)] dark:bg-white/5"
              {...register("title")}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--color-ink)]">Policy</span>
            <select
              className="h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 text-sm outline-none focus:border-[var(--color-primary)] dark:bg-white/5"
              {...register("policyType")}
            >
              <option value="open">Open</option>
              <option value="token_gated">Token gated</option>
              <option value="allowlist">Allowlist</option>
              <option value="time_locked">Time locked</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--color-ink)]">Mode</span>
            <select
              className="h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 text-sm outline-none focus:border-[var(--color-primary)] dark:bg-white/5"
              {...register("submissionMode")}
            >
              <option value="wallet">Wallet</option>
              <option value="signed_anon">Signed anon</option>
            </select>
          </label>
          <label className="grid gap-2 md:col-span-2 lg:col-span-4">
            <span className="text-sm font-semibold text-[var(--color-ink)]">Description</span>
            <textarea
              className="min-h-20 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--color-primary)] dark:bg-white/5"
              {...register("description")}
            />
          </label>
        </section>

        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <FieldPalette onAddField={addField} />
          <div className="grid gap-5">
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
          <div className="grid content-start gap-5">
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
          <div className="mt-6 rounded-[var(--radius-button)] border border-red-200 bg-red-50 p-4 text-sm text-[var(--color-error)]">
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
