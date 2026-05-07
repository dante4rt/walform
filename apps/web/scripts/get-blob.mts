import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
const c = new SuiJsonRpcClient({ url: 'https://fullnode.testnet.sui.io:443', network: 'testnet' });
const FORM = '0x06dfe1544f18e2709ba2717dc5ed144f95f7cc95615aeb9009700db95935be50';
const obj = await c.getObject({ id: FORM, options: { showContent: true } });
const content = obj.data?.content as { fields?: Record<string, unknown> } | undefined;
const responsesField = content?.fields?.responses as { fields?: { id?: { id?: string } } } | undefined;
const tableId = responsesField?.fields?.id?.id;
console.log('responses Table id:', tableId);
if (!tableId) { process.exit(0); }
const fields = await c.getDynamicFields({ parentId: tableId });
console.log('entries:', fields.data.length);
for (const f of fields.data.slice(0, 3)) {
  const dynObj = await c.getDynamicFieldObject({ parentId: tableId, name: f.name });
  const dynContent = (dynObj.data as { content?: { fields?: { value?: { fields?: unknown } } } }).content;
  const value = dynContent?.fields?.value?.fields as { blob_id?: number[] } | undefined;
  const blobBytes = value?.blob_id ?? [];
  const blobHex = blobBytes.map((b: number) => b.toString(16).padStart(2, '0')).join('');
  const blobAscii = String.fromCharCode(...blobBytes);
  console.log('index:', f.name);
  console.log('blob_id hex:', blobHex);
  console.log('blob_id ascii:', blobAscii);
  console.log('---');
}
