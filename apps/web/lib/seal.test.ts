import { NoAccessError, TooManyFailedFetchKeyRequestsError } from "@mysten/seal"
import { describe, expect, it, vi } from "vitest"

import {
  decryptForForm,
  encryptForForm,
  WalformSealPolicyDeniedError,
  WalformSealRateLimitError,
  type SealClientLike,
} from "./seal"

const sealMocks = vi.hoisted(() => ({
  NoAccessError: class NoAccessError extends Error {},
  TooManyFailedFetchKeyRequestsError: class TooManyFailedFetchKeyRequestsError extends Error {},
}))

vi.mock("@mysten/seal", () => sealMocks)

function createSealClient(overrides: Partial<SealClientLike> = {}): SealClientLike {
  return {
    encrypt: vi.fn(async () => ({ encryptedObject: new Uint8Array([9, 8, 7]) })),
    decrypt: vi.fn(async () => new Uint8Array([1, 2, 3])),
    ...overrides,
  } as SealClientLike
}

describe("seal lib", () => {
  it("encrypts with the provided Seal options and returns ciphertext bytes", async () => {
    const client = createSealClient()
    const options = {
      id: "0xform",
      data: new Uint8Array([1]),
    } as Parameters<typeof encryptForForm>[1]

    await expect(encryptForForm(client, options)).resolves.toEqual(new Uint8Array([9, 8, 7]))
    expect(client.encrypt).toHaveBeenCalledWith(options)
  })

  it("decrypts through nested Seal client instances", async () => {
    const seal = createSealClient()
    const client = { seal } as unknown as SealClientLike
    const options = {
      data: new Uint8Array([9, 8, 7]),
    } as Parameters<typeof decryptForForm>[1]

    await expect(decryptForForm(client, options)).resolves.toEqual(new Uint8Array([1, 2, 3]))
    expect(seal.decrypt).toHaveBeenCalledWith(options)
  })

  it("maps Seal policy denial errors", async () => {
    const policyError = new NoAccessError("no matching policy")
    const client = createSealClient({
      decrypt: vi.fn(async () => {
        throw policyError
      }),
    })
    const options = { data: new Uint8Array([1]) } as Parameters<typeof decryptForForm>[1]

    await expect(decryptForForm(client, options)).rejects.toBeInstanceOf(
      WalformSealPolicyDeniedError,
    )
    await expect(decryptForForm(client, options)).rejects.toMatchObject({
      cause: policyError,
    })
  })

  it("maps Seal key-server rate limit errors", async () => {
    const rateLimitError = new TooManyFailedFetchKeyRequestsError("slow down")
    const client = createSealClient({
      decrypt: vi.fn(async () => {
        throw rateLimitError
      }),
    })
    const options = { data: new Uint8Array([1]) } as Parameters<typeof decryptForForm>[1]

    await expect(decryptForForm(client, options)).rejects.toBeInstanceOf(
      WalformSealRateLimitError,
    )
    await expect(decryptForForm(client, options)).rejects.toMatchObject({
      cause: rateLimitError,
    })
  })

  it("passes through unknown decrypt errors", async () => {
    const unknownError = new Error("unexpected decrypt failure")
    const client = createSealClient({
      decrypt: vi.fn(async () => {
        throw unknownError
      }),
    })
    const options = { data: new Uint8Array([1]) } as Parameters<typeof decryptForForm>[1]

    await expect(decryptForForm(client, options)).rejects.toBe(unknownError)
  })

  it("fails early when required Seal methods are missing", async () => {
    const client = {} as SealClientLike
    const options = { data: new Uint8Array([1]) } as Parameters<typeof decryptForForm>[1]

    await expect(decryptForForm(client, options)).rejects.toThrow(
      "Seal client is missing required methods.",
    )
  })
})
