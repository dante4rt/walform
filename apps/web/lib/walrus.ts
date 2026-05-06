import { RetryableWalrusClientError, type WriteBlobStep } from "@mysten/walrus"

export type WalrusUploadStep = WriteBlobStep

export interface UploadBlobInput {
  client: WalrusClientLike
  blob: Uint8Array
  signer: unknown
  epochs: number
  deletable?: boolean
  resume?: unknown
  onStep?: (step: WalrusUploadStep) => void
}

export interface UploadQuiltFile {
  identifier: string
  contents: Uint8Array
  tags?: Record<string, string>
}

export interface UploadQuiltInput {
  client: WalrusClientLike
  files: UploadQuiltFile[]
  signer: unknown
  epochs: number
  deletable?: boolean
  onStep?: (step: unknown) => void
}

export interface WalrusClientLike {
  walrus?: WalrusApiLike
  writeBlob?: WalrusApiLike["writeBlob"]
  writeFiles?: WalrusApiLike["writeFiles"]
  readBlob?: WalrusApiLike["readBlob"]
  reset?: WalrusApiLike["reset"]
}

interface WalrusApiLike {
  writeBlob(input: {
    blob: Uint8Array
    signer: unknown
    epochs: number
    deletable: boolean
    resume?: unknown
    onStep?: (step: WriteBlobStep) => void
  }): Promise<{ blobId: string }>
  writeFiles(input: {
    files: UploadQuiltFile[]
    signer: unknown
    epochs: number
    deletable: boolean
    onStep?: (step: unknown) => void
  }): Promise<Array<{ blobId: string; identifier?: string }>>
  readBlob(input: { blobId: string }): Promise<Uint8Array>
  reset?(): void
}

export class WalformWalrusError extends Error {
  constructor(
    message: string,
    readonly cause: unknown,
    readonly retryable: boolean,
  ) {
    super(message)
    this.name = "WalformWalrusError"
  }
}

export async function uploadBlob(input: UploadBlobInput): Promise<string> {
  const api = resolveWalrusApi(input.client)

  try {
    const result = await api.writeBlob({
      blob: input.blob,
      signer: input.signer,
      epochs: input.epochs,
      deletable: input.deletable ?? false,
      resume: input.resume,
      onStep: input.onStep,
    })

    return result.blobId
  } catch (error) {
    if (error instanceof RetryableWalrusClientError) {
      api.reset?.()
      throw new WalformWalrusError("Walrus upload can be retried after client reset.", error, true)
    }

    throw new WalformWalrusError("Walrus upload failed.", error, false)
  }
}

export async function uploadQuilt(input: UploadQuiltInput) {
  const api = resolveWalrusApi(input.client)

  try {
    return await api.writeFiles({
      files: input.files,
      signer: input.signer,
      epochs: input.epochs,
      deletable: input.deletable ?? false,
      onStep: input.onStep,
    })
  } catch (error) {
    if (error instanceof RetryableWalrusClientError) {
      api.reset?.()
      throw new WalformWalrusError("Walrus quilt upload can be retried after client reset.", error, true)
    }

    throw new WalformWalrusError("Walrus quilt upload failed.", error, false)
  }
}

export async function readBlob(client: WalrusClientLike, blobId: string) {
  const api = resolveWalrusApi(client)
  return api.readBlob({ blobId })
}

function resolveWalrusApi(client: WalrusClientLike): WalrusApiLike {
  const api = client.walrus ?? client

  if (!api.writeBlob || !api.writeFiles || !api.readBlob) {
    throw new WalformWalrusError("Walrus client is missing required methods.", null, false)
  }

  return api as WalrusApiLike
}
