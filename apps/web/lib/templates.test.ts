import { walformSchema } from "@walform/shared"
import { describe, expect, it } from "vitest"

import { createTemplateBuilderHref, getTemplateBySlug, WALFORM_TEMPLATES } from "./templates"

describe("templates lib", () => {
  it("ships the accepted Wave 2 templates", () => {
    expect(WALFORM_TEMPLATES.map((template) => template.slug)).toEqual([
      "bug-report",
      "nps",
      "feature-request",
      "hackathon-submission",
      "dao-survey",
    ])
  })

  it("keeps every template compatible with the shared Walform schema", () => {
    for (const template of WALFORM_TEMPLATES) {
      expect(() => walformSchema.parse(template.schema)).not.toThrow()
      expect(template.schema.fields.length).toBeGreaterThanOrEqual(3)
    }
  })

  it("creates builder links with a template slug", () => {
    const template = getTemplateBySlug("bug-report")

    expect(template).toBeDefined()

    const href = createTemplateBuilderHref(template!)
    const url = new URL(href, "https://walform.local")

    expect(url.pathname).toBe("/builder/")
    expect(url.searchParams.get("template")).toBe("bug-report")
  })
})
