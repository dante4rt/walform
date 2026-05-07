"use client"

import { Icon } from "@iconify/react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

import type { BuilderField } from "./builder-schema"

interface FormPreviewProps {
  title: string
  description: string
  fields: BuilderField[]
  mode: "mobile" | "desktop"
}

export function FormPreview({ title, description, fields, mode }: FormPreviewProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-hairline-soft)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--color-primary)]">Preview</p>
          <h2 className="mt-1 text-lg font-bold text-[var(--color-ink)]">{mode === "mobile" ? "Mobile" : "Desktop"}</h2>
        </div>
        <span className="rounded-[var(--radius-pill)] bg-[var(--color-tint-mint)] px-3 py-1 text-xs font-semibold text-[var(--color-primary-deep)]">
          /f/draft
        </span>
      </div>

      <div className={mode === "mobile" ? "mx-auto max-w-[390px]" : ""}>
        <div className="rounded-[var(--radius-hero)] border border-[var(--color-hairline-soft)] bg-[var(--color-canvas)] p-4">
          <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)] dark:bg-white/5">
            <h3 className="text-2xl font-bold leading-tight text-[var(--color-ink)]">{title || "Untitled form"}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">{description}</p>
            <div className="mt-5 grid gap-4">
              {fields.map((field) => (
                <PreviewField field={field} key={field.id} />
              ))}
            </div>
            <button
              className="mt-5 h-11 w-full rounded-[var(--radius-button)] bg-[var(--color-primary)] text-sm font-semibold text-white"
              type="button"
            >
              Submit response
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function PreviewField({ field }: { field: BuilderField }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--color-ink)]">
        {field.label}
        {field.required ? <span className="text-[var(--color-error)]"> *</span> : null}
      </span>
      {renderControl(field)}
    </label>
  )
}

function renderControl(field: BuilderField) {
  if (field.type === "rich_text") {
    return <RichTextPreview />
  }

  if (field.type === "dropdown") {
    return (
      <select className="h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 text-sm dark:bg-white/5">
        {field.options.filter(Boolean).map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    )
  }

  if (field.type === "checkbox_group") {
    return (
      <div className="grid gap-2">
        {field.options.filter(Boolean).map((option) => (
          <span className="flex items-center gap-2 text-sm text-[var(--color-charcoal)]" key={option}>
            <span className="flex size-5 items-center justify-center rounded border border-[var(--color-hairline-soft)] bg-white" />
            {option}
          </span>
        ))}
      </div>
    )
  }

  if (field.type === "star_rating") {
    return (
      <div className="flex gap-1 text-[var(--color-accent)]">
        {Array.from({ length: field.max }, (_, index) => (
          <Icon aria-hidden icon="solar:star-bold" key={index} />
        ))}
      </div>
    )
  }

  if (field.type === "screenshot" || field.type === "video") {
    return (
      <div className="flex h-24 items-center justify-center rounded-[var(--radius-button)] border border-dashed border-[var(--color-stone)] bg-white text-sm text-[var(--color-slate)] dark:bg-white/5">
        Upload {field.type === "screenshot" ? "image" : "video"}
      </div>
    )
  }

  if (field.type === "url") {
    return (
      <input
        className="h-11 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 text-sm dark:bg-white/5"
        placeholder="https://"
        type="url"
      />
    )
  }

  return (
    <span className="flex items-center gap-2 text-sm text-[var(--color-charcoal)]">
      <span className="flex size-5 items-center justify-center rounded border border-[var(--color-hairline-soft)] bg-white" />
      {field.label}
    </span>
  )
}

function RichTextPreview() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: "<p>Type detailed feedback here...</p>",
    editable: false,
  })

  return (
    <div className="min-h-24 rounded-[var(--radius-button)] border border-[var(--color-hairline-soft)] bg-white px-3 py-2 text-sm text-[var(--color-slate)] dark:bg-white/5">
      <EditorContent editor={editor} />
    </div>
  )
}
