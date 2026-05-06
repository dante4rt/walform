import type { WalformSchema, WalformResponse } from "@walform/shared"

import { createForm } from "./form"
import { approveBountyResponse, depositBounty } from "./bounty"
import { decryptResponse, listResponses, submitResponse } from "./response"

export interface WalformClientOptions {
  packageId: string
  formFactoryId?: string
}

export class WalformClient {
  readonly packageId: string
  readonly formFactoryId?: string

  constructor(options: WalformClientOptions) {
    this.packageId = options.packageId
    this.formFactoryId = options.formFactoryId
  }

  createForm(schema: WalformSchema) {
    return createForm({ packageId: this.packageId, schema })
  }

  submitResponse(formId: string, response: WalformResponse) {
    return submitResponse({ packageId: this.packageId, formId, response })
  }

  listResponses(formId: string) {
    return listResponses({ packageId: this.packageId, formId })
  }

  decryptResponse(encryptedResponse: Uint8Array) {
    return decryptResponse({ encryptedResponse })
  }

  depositBounty(formId: string, amountMist: bigint) {
    return depositBounty({ packageId: this.packageId, formId, amountMist })
  }

  approveBountyResponse(formId: string, responseIndex: number) {
    return approveBountyResponse({ packageId: this.packageId, formId, responseIndex })
  }
}
