export type CsvValue = string | number | boolean | null | undefined | Date | Record<string, unknown> | unknown[]

export interface CsvColumn<T> {
  key: string
  header: string
  getValue: (row: T) => CsvValue
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]) {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(",")
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvCell(formatCsvValue(column.getValue(row)))).join(","),
  )

  return [header, ...body].join("\n")
}

export function parseCsv(csv: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index]
    const next = csv[index + 1]

    if (quoted) {
      if (char === "\"" && next === "\"") {
        cell += "\""
        index += 1
      } else if (char === "\"") {
        quoted = false
      } else {
        cell += char
      }
      continue
    }

    if (char === "\"") {
      quoted = true
    } else if (char === ",") {
      row.push(cell)
      cell = ""
    } else if (char === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else if (char !== "\r") {
      cell += char
    }
  }

  row.push(cell)
  rows.push(row)

  return rows
}

function formatCsvValue(value: CsvValue) {
  if (value === null || value === undefined) {
    return ""
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value)
  }

  return String(value)
}

function escapeCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) {
    return value
  }

  return `"${value.replaceAll("\"", "\"\"")}"`
}
