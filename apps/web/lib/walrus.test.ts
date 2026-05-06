import { RetryableWalrusClientError } from "@mysten/walrus"
import { describe, expect, it, vi } from "vitest"

import {
  readBlob,
  uploadBlob,
  uploadQuilt,
  WalformWalrusError,
  type WalrusClientLike,
} from "./walrus"

const walrusMocks = vi.hoisted(() => ({
  RetryableWalrusClientError: class RetryableWalrusClientError extends Error {},
}))

vi.mock("@mysten/walrus", () => walrusMocks)

function createWalrusClient(overrides: Partial<WalrusClientLike> = {}): WalrusClientLike {
  return {
    writeBlob: vi.fn(async () => ({ blobId: "blob-1" })),
    writeFiles: vi.fn(async () => [{ blobId: "quilt-1", identifier: "response-1" }]),
    readBlob: vi.fn(async () => new Uint8Array([1, 2, 3])),
    reset: vi.fn(),
    ...overrides,
  } as WalrusClientLike
}

describe("walrus lib", () => {
  it("uploads a blob with resumable options and returns the blob id", async () => {
    const blob = new Uint8Array([1, 2, 3])
    const signer = { address: "0x1" }
    const resume = { uploadId: "resume-1" }
    const onStep = vi.fn()
    const client = createWalrusClient()

    await expect(
      uploadBlob({
        client,
        blob,
        signer,
        epochs: 5,
        resume,
        onStep,
      }),
    ).resolves.toBe("blob-1")

    expect(client.writeBlob).toHaveBeenCalledWith({
      blob,
      signer,
      epochs: 5,
      deletable: false,
      resume,
      onStep,
    })
  })

  it("resolves nested Walrus client instances", async () => {
    const walrus = createWalrusClient()
    const client = { walrus } as unknown as WalrusClientLike

    await expect(readBlob(client, "blob-2")).resolves.toEqual(new Uint8Array([1, 2, 3]))
    expect(walrus.readBlob).toHaveBeenCalledWith({ blobId: "blob-2" })
  })

  it("uploads quilt files with explicit delete policy", async () => {
    const files = [{ identifier: "response-1", contents: new Uint8Array([4]) }]
    const signer = { address: "0x2" }
    const onStep = vi.fn()
    const client = createWalrusClient()

    await expect(
      uploadQuilt({
        client,
        files,
        signer,
        epochs: 3,
        deletable: true,
        onStep,
      }),
    ).resolves.toEqual([{ blobId: "quilt-1", identifier: "response-1" }])

    expect(client.writeFiles).toHaveBeenCalledWith({
      files,
      signer,
      epochs: 3,
      deletable: true,
      onStep,
    })
  })

  it("marks retryable Walrus errors and resets the client", async () => {
    const retryableError = new RetryableWalrusClientError("publisher retry")
    const client = createWalrusClient({
      writeBlob: vi.fn(async () => {
        throw retryableError
      }),
    })

    await expect(
      uploadBlob({
        client,
        blob: new Uint8Array([1]),
        signer: {},
        epochs: 1,
      }),
    ).rejects.toMatchObject({
      name: "WalformWalrusError",
      retryable: true,
      cause: retryableError,
    })

    expect(client.reset).toHaveBeenCalledOnce()
  })

  it("wraps non-retryable upload failures", async () => {
    const networkError = new Error("publisher unavailable")
    const client = createWalrusClient({
      writeBlob: vi.fn(async () => {
        throw networkError
      }),
    })

    await expect(
      uploadBlob({
        client,
        blob: new Uint8Array([1]),
        signer: {},
        epochs: 1,
      }),
    ).rejects.toMatchObject({
      name: "WalformWalrusError",
      retryable: false,
      cause: networkError,
    })
  })

  it("fails early when required Walrus methods are missing", async () => {
    const client = {} as WalrusClientLike

    await expect(readBlob(client, "blob-3")).rejects.toBeInstanceOf(WalformWalrusError)
    await expect(readBlob(client, "blob-3")).rejects.toMatchObject({
      retryable: false,
    })
  })
})
