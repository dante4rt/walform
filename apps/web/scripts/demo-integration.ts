/**
 * demo-integration.ts
 *
 * Demonstrates calling the three public view functions on a Walform Form object:
 *   - count_responses(form: &Form): u64
 *   - aggregate_rating(form: &Form, _field_id: vector<u8>): Option<u64>
 *   - verify_response(form: &Form, blob_id: vector<u8>): bool
 *
 * Uses devInspectTransactionBlock (no signing, no gas, pure read).
 *
 * Usage:
 *   PACKAGE_ID=0x... FORM_ID=0x... npx tsx scripts/demo-integration.ts
 *   # or run with defaults (testnet demo objects from .env.local)
 *   npx tsx scripts/demo-integration.ts
 */

import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

// ---------------------------------------------------------------------------
// Config — prefer env vars, fall back to known testnet demo objects
// ---------------------------------------------------------------------------
const PACKAGE_ID =
  process.env.PACKAGE_ID ??
  process.env.NEXT_PUBLIC_WALFORM_PACKAGE_ID ??
  '0x74254b034b8cdfc6cb5da2551ed4db8d5eae202cf858b741a7736f85bf9836f1';

const FORM_ID =
  process.env.FORM_ID ??
  process.env.NEXT_PUBLIC_WALFORM_DEMO_FORM_ID ??
  '0x06dfe1544f18e2709ba2717dc5ed144f95f7cc95615aeb9009700db95935be50';

// A dummy blob_id to probe verify_response with.
// Override via BLOB_ID env var if you have a real one.
const BLOB_ID_HEX = process.env.BLOB_ID ?? '00000000000000000000000000000000';

const TESTNET_URL = 'https://fullnode.testnet.sui.io:443';

// Zero address — devInspect requires a sender but it is not validated for reads.
const DUMMY_SENDER =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

// ---------------------------------------------------------------------------
// BCS helpers
// ---------------------------------------------------------------------------

/**
 * Decode a little-endian u64 from raw devInspect return bytes.
 * suiBcs.U64 parses to a decimal string (not bigint).
 */
function decodeU64(bytes: number[]): string {
  return bcs.U64.parse(new Uint8Array(bytes));
}

/** Decode a bool from a single byte. */
function decodeBool(bytes: number[]): boolean {
  return bcs.Bool.parse(new Uint8Array(bytes));
}

/**
 * Decode Option<u64> from BCS.
 * BCS encodes Option<T> as:
 *   0x00                 → None
 *   0x01 <T bytes>       → Some(T)
 */
function decodeOptionU64(bytes: number[]): string | null {
  const buf = new Uint8Array(bytes);
  if (buf[0] === 0) return null;
  // Skip the leading 0x01 tag byte; remaining bytes are the u64.
  return bcs.U64.parse(buf.slice(1));
}

/** Convert a hex string (with or without 0x prefix) to a number array. */
function hexToBytes(hex: string): number[] {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const padded = clean.length % 2 === 0 ? clean : '0' + clean;
  const result: number[] = [];
  for (let i = 0; i < padded.length; i += 2) {
    result.push(parseInt(padded.slice(i, i + 2), 16));
  }
  return result;
}

// ---------------------------------------------------------------------------
// RPC helper
// ---------------------------------------------------------------------------

/**
 * Extract the first return value bytes from a devInspect result.
 * Throws if the call failed or produced no return values.
 */
function extractReturnBytes(
  results:
    | { returnValues?: [number[], string][] }[]
    | null
    | undefined,
  callIndex: number,
  label: string,
): number[] {
  const result = results?.[callIndex];
  if (!result?.returnValues?.length) {
    throw new Error(`${label}: no return values in devInspect results`);
  }
  return result.returnValues[0][0];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const client = new SuiJsonRpcClient({
    url: TESTNET_URL,
    network: 'testnet',
  });

  console.log('=== Walform Composable Primitives Demo ===');
  console.log(`Package : ${PACKAGE_ID}`);
  console.log(`Form    : ${FORM_ID}`);
  console.log(`Network : testnet (${TESTNET_URL})`);
  console.log('');

  // --------------------------------------------------------------------------
  // 1. count_responses(form: &Form): u64
  // --------------------------------------------------------------------------
  const txCount = new Transaction();
  txCount.moveCall({
    target: `${PACKAGE_ID}::form::count_responses`,
    arguments: [txCount.object(FORM_ID)],
  });

  const resCount = await client.devInspectTransactionBlock({
    transactionBlock: txCount,
    sender: DUMMY_SENDER,
  });

  if (resCount.error) {
    throw new Error(`count_responses failed: ${resCount.error}`);
  }

  const responseCount = decodeU64(
    extractReturnBytes(resCount.results, 0, 'count_responses'),
  );
  console.log(`count_responses(form)     → ${responseCount} response(s)`);

  // --------------------------------------------------------------------------
  // 2. aggregate_rating(form: &Form, _field_id: vector<u8>): Option<u64>
  //
  // _field_id is currently unused inside the contract (single global aggregate),
  // so pass an empty vector<u8>.
  // --------------------------------------------------------------------------
  const txRating = new Transaction();
  // BCS-encode an empty vector<u8>: single 0x00 byte (ULEB128 length = 0).
  const emptyFieldId = txRating.pure(bcs.vector(bcs.U8).serialize([]));
  txRating.moveCall({
    target: `${PACKAGE_ID}::form::aggregate_rating`,
    arguments: [txRating.object(FORM_ID), emptyFieldId],
  });

  const resRating = await client.devInspectTransactionBlock({
    transactionBlock: txRating,
    sender: DUMMY_SENDER,
  });

  if (resRating.error) {
    throw new Error(`aggregate_rating failed: ${resRating.error}`);
  }

  const rating = decodeOptionU64(
    extractReturnBytes(resRating.results, 0, 'aggregate_rating'),
  );
  if (rating === null) {
    console.log(
      'aggregate_rating(form, []) → None (no rated responses yet)',
    );
  } else {
    console.log(`aggregate_rating(form, []) → Some(${rating})`);
  }

  // --------------------------------------------------------------------------
  // 3. verify_response(form: &Form, blob_id: vector<u8>): bool
  //
  // Pass BLOB_ID_HEX — set the BLOB_ID env var to probe a real stored blob_id.
  // --------------------------------------------------------------------------
  const blobBytes = hexToBytes(BLOB_ID_HEX);

  const txVerify = new Transaction();
  const blobIdArg = txVerify.pure(bcs.vector(bcs.U8).serialize(blobBytes));
  txVerify.moveCall({
    target: `${PACKAGE_ID}::form::verify_response`,
    arguments: [txVerify.object(FORM_ID), blobIdArg],
  });

  const resVerify = await client.devInspectTransactionBlock({
    transactionBlock: txVerify,
    sender: DUMMY_SENDER,
  });

  if (resVerify.error) {
    throw new Error(`verify_response failed: ${resVerify.error}`);
  }

  const verified = decodeBool(
    extractReturnBytes(resVerify.results, 0, 'verify_response'),
  );
  console.log(
    `verify_response(form, 0x${BLOB_ID_HEX}) → ${verified} ` +
      `(blob ${verified ? 'EXISTS' : 'NOT FOUND'} in form)`,
  );

  console.log('');
  console.log('All 3 composable primitives called successfully.');
  console.log('');
  console.log('Tip: set BLOB_ID=<hex> to probe a real response blob_id.');
}

main().catch((err: unknown) => {
  console.error('Error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
