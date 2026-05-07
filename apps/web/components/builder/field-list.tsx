"use client"

import { Icon } from "@iconify/react"

import type { BuilderField } from "./builder-schema"

interface FieldListProps {
  fields: BuilderField[]
  selectedFieldId: string
  draggedFieldId: string | null
  onDragStart: (fieldId: string) => void
  onDrop: (fieldId: string) => void
  onSelect: (fieldId: string) => void
}

export function FieldList({
  fields,
  selectedFieldId,
  draggedFieldId,
  onDragStart,
  onDrop,
  onSelect,
}: FieldListProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--color-primary)]">Canvas</p>
          <h2 className="mt-1 text-lg font-bold text-[var(--color-ink)]">Drag to reorder</h2>
        </div>
        <span className="rounded-[var(--radius-pill)] bg-[var(--color-tint-cream)] px-3 py-1 text-xs font-semibold text-[var(--color-accent-deep)]">
          {fields.length} fields
        </span>
      </div>
      <div className="grid gap-2">
        {fields.map((field, index) => {
          const isSelected = field.id === selectedFieldId
          const isDragging = field.id === draggedFieldId

          return (
            <button
              className={`grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-[var(--radius-button)] border p-3 text-left transition ${
                isSelected
                  ? "border-[var(--color-primary)] bg-[var(--color-canvas)]"
                  : "border-[var(--color-hairline-soft)] bg-[var(--color-card)] hover:border-[var(--color-hairline)]"
              } ${isDragging ? "opacity-50" : ""}`}
              draggable
              key={field.id}
              onClick={() => onSelect(field.id)}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => onDragStart(field.id)}
              onDrop={() => onDrop(field.id)}
              type="button"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--color-tint-sky)] font-mono text-xs font-bold text-[var(--color-primary-deep)]">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
                  {field.label || "Untitled field"}
                </span>
                <span className="mt-1 block text-xs text-[var(--color-slate)]">
                  {field.type.replaceAll("_", " ")} · {field.required ? "Required" : "Optional"}
                </span>
              </span>
              <Icon
                aria-hidden
                className="text-[var(--color-stone)]"
                icon="solar:hamburger-menu-linear"
              />
            </button>
          )
        })}
      </div>
    </section>
  )
}
