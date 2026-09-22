# State reconstruction

Independent reconstruction means deriving a result from the necessary signed events, chain history and explicit rules, rather than accepting the project API's current answer.

**The reviewed release does not establish complete independent replay of every production holding.** Public code, transaction IDs and a database snapshot are useful evidence, but each is insufficient on its own.

## Production today

The hosted system discovers events, verifies available signatures and chain evidence, and builds claim, ownership and balance projections. Nostr discovery and wallet history are additional inputs. Existing shielded memos are not automatically public, and some registration evidence is held separately from transaction memos.

An independent implementation needs all relevant historical data, including earlier events and market settlements. Missing data can hide an earlier claim or a later ownership change. Historical conflicts documented in the [claim investigation](https://github.com/deadpixelslabs/test-zecblocks/blob/c5fc203dcf0557500f13530f49471788b1436a01/docs/claim-verification-2026-09-22.md) cannot be repaired merely by labeling a current database row “canonical.”

## Published candidate tools

The separate [`protocol/`](https://github.com/deadpixelslabs/ZEC-BLOCKS/tree/95648a4d7948dfb8c2466ed941718f405827621c/protocol) package supplies a read-only verifier, explicit event envelopes, manifest checks and Merkle checkpoint tools. It is **not activated on mainnet** and does not modify production ownership.

Its proposed anchor commits the full signed event digest in a domain-separated `OP_RETURN` output of one zatoshi. A post-broadcast receipt signature binds the envelope to its transaction ID. This differs from an ordinary one-zatoshi payment to a mailbox: sending a tiny amount does not by itself publicly commit every event field.

The candidate also needs independent availability of the complete envelope `{event, txid, receiptSignature}`. A digest on-chain protects integrity; it does not make the original data retrievable.

## Run read-only checks

From a checkout of the marketplace repository, with Node.js 22 or newer:

```sh
node --test protocol/tests/*.test.mjs
node protocol/cli.mjs manifest
node protocol/cli.mjs prepare-spec spec-anchor-request.json
```

These commands do not send a transaction. `prepare-spec` creates a request for review; it does not activate the specification.

Chain verification requires a suitable validating archival Zcash node. Configure `ZCASH_RPC_URL`, and `ZCASH_RPC_AUTH` only if needed, in the private environment. Never commit RPC credentials. With a complete candidate envelope bundle:

```sh
node protocol/cli.mjs verify events.json verification-report.json
node protocol/cli.mjs checkpoint events.json checkpoint.json
node protocol/cli.mjs proof checkpoint.json 1131 proof-1131.json
node protocol/cli.mjs verify-proof checkpoint.json proof-1131.json
```

See the [tool README](https://github.com/deadpixelslabs/ZEC-BLOCKS/blob/95648a4d7948dfb8c2466ed941718f405827621c/protocol/README.md) for the envelope format, permitted node reads and anchor-verification commands. No tool needs a wallet seed or spending key.

## Interpret results carefully

A report can verify supplied events while lacking an earlier event. A Merkle proof proves membership in a particular snapshot, not that its inputs are complete or that all disputed history has been resolved. The candidate can report legacy records as unresolved without declaring an existing production holding invalid.

Independent mirrors, complete settlement adapters, wallet conformance and a reviewed legacy migration remain [activation requirements](roadmap.md). Do not describe candidate test success as complete production independence.
