import type { WalformResponse } from "@walform/shared"
import { walformResponseSchema } from "@walform/shared"

export interface SubmitResponseInput {
  packageId: string
  formId: string
  response: WalformResponse
}

export function submitResponse(input: SubmitResponseInput) {
  const response = walformResponseSchema.parse(input.response)

  return {
    packageId: input.packageId,
    formId: input.formId,
    responseBytes: new TextEncoder().encode(JSON.stringify(response)),
  }
}

export function listResponses(input: { packageId: string; formId: string }) {
  return input
}

export function decryptResponse(input: { encryptedResponse: Uint8Array }) {
  return input.encryptedResponse
}
