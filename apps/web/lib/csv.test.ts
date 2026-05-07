import { describe, expect, it } from "vitest"

import { parseCsv, toCsv } from "./csv"

describe("csv lib", () => {
  it("exports and parses rows with commas, quotes, dates, and objects", () => {
    const rows = [
      {
        id: "response-1",
        submittedAt: new Date("2026-05-07T03:20:00.000Z"),
        severity: "critical",
        answer: "Payment breaks, then says \"retry\"",
        meta: { browser: "Chrome", tags: ["checkout", "wallet"] },
      },
    ]

    const csv = toCsv(rows, [
      { key: "id", header: "ID", getValue: (row) => row.id },
      { key: "submittedAt", header: "Submitted At", getValue: (row) => row.submittedAt },
      { key: "severity", header: "Severity", getValue: (row) => row.severity },
      { key: "answer", header: "Answer", getValue: (row) => row.answer },
      { key: "meta", header: "Meta", getValue: (row) => row.meta },
    ])

    expect(parseCsv(csv)).toEqual([
      ["ID", "Submitted At", "Severity", "Answer", "Meta"],
      [
        "response-1",
        "2026-05-07T03:20:00.000Z",
        "critical",
        "Payment breaks, then says \"retry\"",
        "{\"browser\":\"Chrome\",\"tags\":[\"checkout\",\"wallet\"]}",
      ],
    ])
  })
})
