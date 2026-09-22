# Protocol rules

This page summarizes the current collection and points to the implementations. It is not a claim that the separate candidate specification has replaced production behavior.

| Rule | Requirement |
| --- | --- |
| Collection identity | Exact configured Genesis transaction and network |
| NFT supply | IDs 1–5000 |
| Source block | Canonical block at Genesis height minus NFT ID |
| Mining proof | SHA-256 with 26 leading zero bits, bound to the selected identity and NFT |
| Identity | SHA-256 of the exact Noir derived public-key bytes |
| Claim acceptance | Valid signed evidence, source/proof checks, applicable reservation evidence and confirmed chain anchor |
| Ownership updates | Valid transitions from the relevant current owner, including finalized market settlements |
| Duplicate handling | One canonical claim per NFT; repeated discovery of a TXID is not another mint |

## Mining preimage

The existing proof domain is `ZB1:MINE:v1`. The serialized preimage is:

```text
UTF8("ZB1:MINE:v1")
|| genesis_txid_bytes_32
|| token_id_uint32_little_endian
|| source_block_hash_bytes_32
|| owner_commitment_bytes_32
|| nonce_uint64_little_endian
```

The transaction and block hashes use their displayed hexadecimal byte order, not a silently reversed representation. Integer widths and exact bytes matter. The digest must satisfy the 26-bit target; use the published implementation and fixtures when building an encoder.

## Ordering and conflicts

Valid competing claims are resolved using canonical chain evidence rather than relay arrival time. Block height and transaction position matter. Missing or conflicting evidence must remain unresolved instead of being declared clear merely because one API response was empty.

The current production ownership projection also preserves finalized marketplace settlements. A late discovery of a historical claim must not automatically roll a sold NFT back to a prior owner. This is a production behavior to account for in any independent reconstruction, not a reason to ignore unresolved legacy conflicts.

The active fee behavior is documented separately in [fees](fees.md). Older constants or fee schedules must not be silently presented as immutable active policy.

## Candidate rules

The `protocol/` specification defines candidate CLAIM and TRANSFER formats, full-event commitments and receipt signatures. Those wire-format version identifiers are technical identifiers, not public product release badges. They are **inactive** pending the [activation gates](roadmap.md).

Sources: [mining encoder](https://github.com/deadpixelslabs/test-zecblocks/blob/c5fc203dcf0557500f13530f49471788b1436a01/index.html), [claim verifier](https://github.com/deadpixelslabs/test-zecblocks/blob/c5fc203dcf0557500f13530f49471788b1436a01/supabase/functions/zecblocks-claim-audit/index.ts), [production ownership notes](https://github.com/deadpixelslabs/ZEC-BLOCKS/blob/95648a4d7948dfb8c2466ed941718f405827621c/supabase/DEPLOYED.txt), [candidate core](https://github.com/deadpixelslabs/ZEC-BLOCKS/blob/95648a4d7948dfb8c2466ed941718f405827621c/protocol/core.mjs).
