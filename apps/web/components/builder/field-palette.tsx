"use client"

import { Icon } from "@iconify/react"
import type { FieldType } from "@walform/shared"

import { FIELD_BLUEPRINTS } from "./builder-schema"

interface FieldPaletteProps {
  onAddField: (type: FieldType) => void
}

export function FieldPalette({ onAddField }: FieldPaletteProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase text-[var(--color-primary)]">Fields</p>
        <h2 className="mt-1 text-lg font-bold text-[var(--color-ink)]">Add building blocks</h2>
      </div>
      <div className="grid gap-2">
        {FIELD_BLUEPRINTS.map((field) => (
          <button
            className="group grid grid-cols-[40px_1fr] gap-3 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-3 text-left transition hover:border-[var(--color-hairline)] hover:bg-[var(--color-canvas)]"
            key={field.type}
            onClick={() => onAddField(field.type)}
            type="button"
          >
            <span className="flex size-10 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-tint-mint)] text-[var(--color-primary-deep)]">
              <Icon aria-hidden icon={iconForType(field.type)} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-[var(--color-ink)]">
                {field.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--color-slate)]">
                {field.help}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function iconForType(type: FieldType): string {
  const icons: Record<FieldType, string> = {
    rich_text: "solar:text-bold-linear",
    dropdown: "solar:list-down-linear",
    checkbox_group: "solar:check-square-linear",
    star_rating: "solar:star-linear",
    screenshot: "solar:gallery-linear",
    video: "solar:videocamera-record-linear",
    url: "solar:link-linear",
    confirmation: "solar:shield-check-linear",
  }

  return icons[type]
}
