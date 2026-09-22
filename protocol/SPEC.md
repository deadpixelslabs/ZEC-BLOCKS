# ZB-1 public evidence candidate

This specification defines an opt-in evidence format. It is not activated by publishing this repository. Existing mining, NFT ownership, ZEC/USDC settlements and ZECS events continue under their existing rules. Legacy data must not be re-labelled publicly bound or reassigned by this toolkit.

## Collection and reproducible art

Network: Zcash mainnet. Genesis transaction: `ecf6fc3a79885f573d79de70a2de85c34667fc1a4fefe034d3a4015269379f0f`, height 3488573. Exactly 5,000 token IDs, 1 through 5000. The source block for ID T is height `3488573 - T` on the canonical chain.

`renderer-v1.js` renders SVG from the lower-case source-block hash, its height and token ID. Its output does not need a hosted image, mutable metadata URL, timestamp or random number. Tests compare it with the production marketplace renderer. Manifest hashes freeze the exact specification, renderer and identity profile documents; replacing any of those files changes the manifest commitment.

## Encoding and signatures

`canonical` in core.mjs encodes JSON with lexically sorted object keys, JSON string escaping, no whitespace, arrays in order, and only safe integer numbers. Floats, undefined and non-JSON objects are rejected. Hashes and SEC public keys are lower-case hex without 0x. Nonces are canonical decimal strings in the unsigned 64-bit range. Unknown event fields are rejected.

Event signatures use the Zcash Signed Message double-SHA256 digest with CompactSize-prefixed UTF-8 prefix and message. Signatures are 65-byte compact hex: one recovery header then 32-byte R and S. The candidate accepts recovery IDs 0 and 1, enforces low-S, and requires the header's compression flag to match the public-key serialization. Wallets producing other encodings must explicitly convert before adoption; do not silently reinterpret legacy signatures.

Owner commitment remains SHA256 of the **exact public-key bytes**. Compressed and uncompressed encodings have different commitments, even for the same elliptic-curve point. The current Noir identity must not be replaced during an upgrade.

## Signed event bodies

Every event has: type, version, network=`mainnet`, genesis, manifestHash, tokenId, publicKey and signature. `eventBody` removes signature; the message is `ZB1:PUBLIC_EVENT:v1|` followed by canonical(body).

CLAIM version 4 additionally has nonce, sourceHeight, sourceHash, proofHash, ownerCommitment. Its proof is SHA256 of UTF-8 `ZB1:MINE:v1`, genesis bytes, tokenId uint32 little-endian, sourceHash bytes, ownerCommitment bytes, nonce uint64 little-endian. It must have at least 26 leading zero bits. The source hash must match the node's canonical source block.

TRANSFER version 2 additionally has fromCommitment, toCommitment, previousTxid, previousEventHash and sequence. The signer must own the current state. Both previous references must match that state and sequence must increase by exactly one. Self transfers are rejected. This prevents an old transfer signature from becoming valid again after A → B → A ownership changes.

The signed-event hash is SHA256 of UTF-8 `ZB1:SIGNED_EVENT:v1|` plus canonical(body including publicKey and signature). The signature is included in the public commitment, not merely supplied later by an indexer.

## Public anchor and exact transaction binding

For domain EVENT, SPEC or CHECKPOINT and a 32-byte hash H:

1. D = first 20 bytes of SHA256(UTF-8 `ZB1:PUBLIC_ANCHOR:v1|` + domain + `|` + lower-case H).
2. Expected transparent P2PKH script is hex `76a914` + D + `88ac`.
3. Mainnet address is Base58Check of bytes 0x1c 0xb8 followed by D.
4. Candidate output amount is exactly **1 zatoshi**, separate from network fees. There must be exactly one matching output in the decoded transaction.

The 20-byte P2PKH projection has a 160-bit output space; it is not a full 256-bit on-chain digest. No spend key is known for this address. Wallet policy/relay acceptance of the one-zatoshi transparent output is an activation gate. Do not increase the amount or claim it works merely because a shielded one-zatoshi memo transaction works. A changed carrier or amount requires a separately reviewed manifest.

The event cannot include its own future TXID in a pre-transaction signature without a circular dependency. Therefore, after broadcast, the same owner signs:

`ZB1:TX_RECEIPT:v1|M=<manifestHash>|E=<signedEventHash>|X=<txid>`

The complete envelope has exactly event, txid, receiptSignature. Verification requires both owner signatures, the exact anchor script and amount, node-confirmed block membership and canonical chain order. Copying a TXID or swapping the signature, event, manifest or transaction fails. A failed receipt request must be recovered by signing for the saved TXID, never by sending again.

## Independent verification and replay

Use an operator-selected validating archival Zcash node with historical getrawtransaction support. The node must return mainnet, the pinned genesis transaction in the pinned block, current getblockhash results, complete block transaction lists and decoded transparent outputs. The toolkit uses read-only RPC methods and never signs or broadcasts wallet transactions.

Order verified records by canonical height, transaction index, then TXID. One event per transaction. If the supplied bundle contains multiple distinct verified signed events for a transaction, reject all of that transaction's events as ambiguous, independent of input order. Deduplicate identical signed events. First accepted claim for a token wins within the supplied history; transfers need exact ancestry. Return rejected and unresolved records explicitly. Recheck the snapshot block hash at completion; a reorg requires a rerun from the supplied event set.

**Coverage is supplied-records-only.** Hash commitments do not reveal event bodies or signatures. Community mirrors must preserve the complete public envelopes. Missing discovery history can hide an earlier valid claim; neither a Merkle root nor a confirming TXID proves discovery completeness. This implementation does not claim reconstruction from Zcash alone, or validation of legacy ZEC/USDC sale semantics. Activating new transfers for existing NFTs requires an explicit, reviewed legacy-state migration; no such migration is enabled here.

## Checkpoints

All 5,000 leaf positions are fixed by token ID. Each leaf is the canonical array `["ZB1:STATE_LEAF:v1", tokenId, status, ownerCommitment, lastEventTxid, lastEventHash, sequence]`, hashed with SHA256. Status is bound, legacy, or unresolved. Missing history yields unresolved with null ownership fields, never an invented unclaimed/owned assertion. Legacy leaves, if an operator supplies them, retain their trust distinction.

Parent = SHA256(UTF-8 `ZB1:STATE_NODE:v1|` + left hash bytes + right hash bytes). Duplicate the final node at odd levels. The checkpoint commits root, count=5000 and context (network, genesis, manifestHash, cutoff height/hash, eventSetHash, coverage). Its hash is SHA256(`ZB1:CHECKPOINT:v1|` + canonical({context,root,count})). The CHECKPOINT-domain output anchors that hash. An unbroadcast file must say anchored=false.

An inclusion proof shows membership in that particular snapshot. It does not establish the correctness or completeness of legacy data. Anchor verification also requires the selected manifest, a currently canonical cutoff block, and an anchor transaction in a later block. Periodic checkpoints use explicit cutoff blocks and immutable output filenames; the operator reviews each anchor before wallet approval. A root never grants an admin the right to mint, delete or reassign an NFT.

## Activation gates

All gates must be reviewed before the mining frontend emits these events: candidate artifacts reproducible; real wallet signature/header conformance; one-zatoshi transparent output accepted by wallet/node; confirmed SPEC anchor TXID pinned by clients; end-to-end claim/receipt recovery tested; server ingestion understands the envelope; full legacy ownership and cross-rail settlement migration policy reviewed; public event mirrors available. Until then, status is candidate and the existing production event format remains active.
