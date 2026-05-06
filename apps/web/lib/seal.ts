import {
  NoAccessError,
  TooManyFailedFetchKeyRequestsError,
  type DecryptOptions,
  type EncryptOptions,
} from "@mysten/seal"

export interface SealClientLike {
  seal?: SealApiLike
  encrypt?: SealApiLike["encrypt"]
  decrypt?: SealApiLike["decrypt"]
}

interface SealApiLike {
  encrypt(input: EncryptOptions): Promise<{ encryptedObject: Uint8Array }>
  decrypt(input: DecryptOptions): Promise<Uint8Array>
}

export class WalformSealPolicyDeniedError extends Error {
  constructor(readonly cause: unknown) {
    super("Seal policy denied decryption.")
    this.name = "WalformSealPolicyDeniedError"
  }
}

export class WalformSealRateLimitError extends Error {
  constructor(readonly cause: unknown) {
    super("Seal key server rate limit reached.")
    this.name = "WalformSealRateLimitError"
  }
}

export async function encryptForForm(client: SealClientLike, input: EncryptOptions) {
  const api = resolveSealApi(client)
  const { encryptedObject } = await api.encrypt(input)
  return encryptedObject
}

export async function decryptForForm(client: SealClientLike, input: DecryptOptions) {
  const api = resolveSealApi(client)

  try {
    return await api.decrypt(input)
  } catch (error) {
    if (error instanceof NoAccessError) {
      throw new WalformSealPolicyDeniedError(error)
    }

    if (error instanceof TooManyFailedFetchKeyRequestsError) {
      throw new WalformSealRateLimitError(error)
    }

    throw error
  }
}

function resolveSealApi(client: SealClientLike): SealApiLike {
  const api = client.seal ?? client

  if (!api.encrypt || !api.decrypt) {
    throw new Error("Seal client is missing required methods.")
  }

  return api as SealApiLike
}
