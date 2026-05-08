import { describe, expect, it } from "vitest"

import {
  buildWalformSchema,
  createBuilderField,
  createInitialFields,
  DEFAULT_BUILDER_VALUES,
  getNextFieldIndex,
  moveField,
} from "./builder-schema"

describe("builder schema helpers", () => {
  it("creates a starter form with all supported field types and stable ids", () => {
    const fields = createInitialFields()

    expect(fields.map((field) => field.id)).toEqual([
      "f1",
      "f2",
      "f3",
      "f4",
      "f5",
      "f6",
      "f7",
      "f8",
    ])
    expect(fields.map((field) => field.type)).toEqual([
      "rich_text",
      "dropdown",
      "checkbox_group",
      "star_rating",
      "screenshot",
      "video",
      "url",
      "confirmation",
    ])
    expect(getNextFieldIndex(fields)).toBe(9)
  })

  it("reorders fields without changing their ids", () => {
    const fields = createInitialFields()
    const moved = moveField(fields, "f4", "f1")

    expect(moved.map((field) => field.id)).toEqual(["f4", "f1", "f2", "f3", "f5", "f6", "f7", "f8"])
    expect(moved.find((field) => field.id === "f4")?.type).toBe("star_rating")
  })

  it("serializes to the Walform schema expected by shared zod validation", () => {
    const schema = buildWalformSchema(DEFAULT_BUILDER_VALUES, [
      createBuilderField("rich_text", 1),
      createBuilderField("dropdown", 2),
      createBuilderField("checkbox_group", 3),
      createBuilderField("star_rating", 4),
      createBuilderField("confirmation", 5),
    ])

    expect(schema.version).toBe(1)
    expect(schema.fields).toHaveLength(5)
    expect(schema.fields[1]).toMatchObject({
      id: "f2",
      type: "dropdown",
      options: ["Discord", "X", "Friend", "Other"],
    })
  })
})
