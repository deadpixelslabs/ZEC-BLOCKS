# Code examples and integration

This page makes selected protocol logic readable directly in the documentation. The examples calculate public values locally. They do not request private keys, send payments, establish NFT ownership or replace full protocol validation.

## Components to integrate

| Component | Input | Result |
| --- | --- | --- |
| Wallet identity | Exact Noir derived public-key bytes | Owner commitment |
| NFT proof checker | Genesis, NFT ID, source block hash, owner commitment, nonce | SHA-256 digest and target check |
| Claim verifier | Signed claim, reservation evidence and chain transaction | Accepted, rejected or unresolved evidence |
| Ownership projection | Valid claims, transfers and finalized settlements | Current indexed owner |
| ZECS mint verifier | Fixed mint payload, transaction-bound registration and holder evidence | Accepted mint or pending/rejected result |

The following Node.js example uses only the built-in crypto library. Save it as `zb1-example.mjs` and run `node zb1-example.mjs` with Node.js 22 or newer.

## Exact identity bytes and NFT proof

```javascript
import { createHash } from 'node:crypto';

const GENESIS =
  'ecf6fc3a79885f573d79de70a2de85c34667fc1a4fefe034d3a4015269379f0f';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function hex32(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error('Expected 32 bytes in lowercase hexadecimal');
  }
  return Buffer.from(value, 'hex');
}

function ownerCommitment(publicKeyHex) {
  // This checks serialization only, not curve validity or a signature.
  if (typeof publicKeyHex !== 'string' ||
      !/^(?:(?:02|03)[0-9a-f]{64}|04[0-9a-f]{128})$/.test(publicKeyHex)) {
    throw new Error('Unsupported public-key serialization');
  }
  // Preserve the exact encoding returned by the derived wallet identity.
  return sha256(Buffer.from(publicKeyHex, 'hex'));
}

function proofHash({ tokenId, sourceHash, owner, nonce }) {
  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 5000) {
    throw new Error('Token ID must be between 1 and 5000');
  }
  if (typeof nonce !== 'string' || !/^(0|[1-9][0-9]{0,19})$/.test(nonce)) {
    throw new Error('Nonce must be a canonical decimal string');
  }
  const n = BigInt(nonce);
  if (n >= 2n ** 64n) throw new Error('Nonce exceeds uint64');
  const idBytes = Buffer.alloc(4);
  const nonceBytes = Buffer.alloc(8);
  idBytes.writeUInt32LE(tokenId);
  nonceBytes.writeBigUInt64LE(n);
  return sha256(Buffer.concat([
    Buffer.from('ZB1:MINE:v1', 'utf8'),
    hex32(GENESIS), idBytes, hex32(sourceHash), hex32(owner), nonceBytes
  ]));
}

function meetsTarget(hash) {
  const bytes = hex32(hash);
  // 24 zero bits followed by two zero high bits in the fourth byte.
  return bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 0 &&
    (bytes[3] & 0xc0) === 0;
}

// Synthetic test data. It is not evidence of a mainnet claim.
const publicKey =
  '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798' +
  '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8';
const owner = ownerCommitment(publicKey);
const proof = proofHash({
  tokenId: 1, sourceHash: '11'.repeat(32), owner, nonce: '591614715'
});
console.log({ owner, proof, meetsTarget: meetsTarget(proof) });
```

Expected output values:

```json
{
  "owner": "50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0",
  "proof": "000000019715296376af01a726f5d9d3e88ce7270d838a0675fe335d154d1263",
  "meetsTarget": true
}
```

A digest meeting the target is only one validation condition. This example does not verify the supplied public key is a valid curve point, a wallet signature, the real source block, a reservation, a chain anchor or a competing claim. Do not use its `true` result as an ownership decision.

## ZECS registration message

The current mint memo contains exactly:

```json
{"p":"zb-20","op":"mint","tick":"ZECS","amt":"210"}
```

After broadcast, the derived identity signs a separate message bound to the existing transaction:

```text
ZB20:MINT_ANCHOR:v1|T=ZECS|X=<mint_txid>|M={"p":"zb-20","op":"mint","tick":"ZECS","amt":"210"}
```

`<mint_txid>` is the actual returned transaction ID, not a new payment request. This registration signature is not appended to the mint memo. Full validation also checks deployment, holder eligibility, confirmation, supply and duplicates. See [ZECS](zecs.md).

## Integrate without duplicate payments

Treat the following as flow pseudocode, not an executable wallet integration:

```text
validate the connected identity and selected operation
save the original identity, exact request and recovery metadata
request one wallet submission
if a transaction ID is returned:
    persist it immediately and verify that same transaction
if the outcome is unknown:
    keep the pending record and search for exact matching evidence
if evidence is missing or ambiguous:
    remain pending; do not automatically submit another payment
complete only after the required protocol and ownership checks pass
```

Test with isolated wallet/provider fixtures. Cover account changes, repeated clicks, storage failures, missing responses, delayed confirmation and conflicting transactions. A browser test does not establish live wallet compatibility or mainnet settlement.

## Scope

These examples explain selected logic. They are not a complete deployment package, SDK, security audit or license grant for the entire project. A complete independent replay also needs historical events, signatures, chain data and settlement rules. See [state reconstruction](state-reconstruction.md), [authentication](authentication.md), [open gaps](roadmap.md) and [licensing](license.md).
