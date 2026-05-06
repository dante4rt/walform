import type { WalformSchema } from "@walform/shared"
import { walformSchema } from "@walform/shared"

export interface CreateFormInput {
  packageId: string
  schema: WalformSchema
}

export interface CreateFormDraft {
  packageId: string
  schemaBytes: Uint8Array
  schemaJson: string
}

export function createForm(input: CreateFormInput): CreateFormDraft {
  const schema = walformSchema.parse(input.schema)
  const schemaJson = JSON.stringify(schema)

  return {
    packageId: input.packageId,
    schemaBytes: new TextEncoder().encode(schemaJson),
    schemaJson,
  }
}

export interface GetFormInput {
  formId: string
}

export function getForm(input: GetFormInput) {
  return {
    formId: input.formId,
  }
}

export function listForms(owner: string) {
  return {
    owner,
  }
}
