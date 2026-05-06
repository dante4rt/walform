export function verifyReceipt(input: { formId: string; responseIndex: number; owner: string }) {
  return input.formId.length > 0 && input.responseIndex >= 0 && input.owner.length > 0
}
