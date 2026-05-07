"use client"

import { Icon } from "@iconify/react"

import type { BuilderField } from "./builder-schema"

interface FieldEditorProps {
  field: BuilderField
  onUpdateField: (field: BuilderField) => void
  onRemoveField: (fieldId: string) => void
}

export function FieldEditor({ field, onUpdateField, onRemoveField }: FieldEditorProps) {
  const optionsText = field.options.join("\n")

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--color-primary)]">Inspector</p>
          <h2 className="mt-1 text-xl font-bold text-[var(--color-ink)]">Field settings</h2>
        </div>
        <button
          aria-label="Remove field"
          className="flex size-10 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] text-[var(--color-error)] hover:bg-red-50"
          onClick={() => onRemoveField(field.id)}
          type="button"
        >
          <Icon aria-hidden icon="solar:trash-bin-trash-linear" />
        </button>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[var(--color-ink)]">Label</span>
          <input
            className="h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 text-sm text-[var(--color-charcoal)] outline-none focus:border-[var(--color-primary)] dark:bg-white/5"
            onChange={(event) => onUpdateField({ ...field, label: event.target.value })}
            value={field.label}
          />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] px-3 py-3">
          <span>
            <span className="block text-sm font-semibold text-[var(--color-ink)]">Required</span>
            <span className="mt-1 block text-xs text-[var(--color-slate)]">
              Submitters must answer before saving.
            </span>
          </span>
          <input
            checked={field.required}
            className="size-5 accent-[var(--color-primary)]"
            onChange={(event) => onUpdateField({ ...field, required: event.target.checked })}
            type="checkbox"
          />
        </label>

        {(field.type === "dropdown" || field.type === "checkbox_group") ? (
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--color-ink)]">Options</span>
            <textarea
              className="min-h-28 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 py-2 text-sm leading-6 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-primary)] dark:bg-white/5"
              onChange={(event) =>
                onUpdateField({
                  ...field,
                  options: event.target.value.split("\n"),
                })
              }
              value={optionsText}
            />
            <span className="text-xs text-[var(--color-slate)]">One option per line.</span>
          </label>
        ) : null}

        {field.type === "star_rating" ? (
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--color-ink)]">Maximum rating</span>
            <input
              className="h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 text-sm text-[var(--color-charcoal)] outline-none focus:border-[var(--color-primary)] dark:bg-white/5"
              max={10}
              min={1}
              onChange={(event) => onUpdateField({ ...field, max: Number(event.target.value) })}
              type="number"
              value={field.max}
            />
          </label>
        ) : null}

        <div className="rounded-[var(--radius-button)] bg-[var(--color-tint-sky)] p-3 text-xs leading-5 text-[var(--color-primary-deep)]">
          Stable ID: <span className="font-mono font-semibold">{field.id}</span>
        </div>
      </div>
    </section>
  )
}
