# State reconstruction

Independent reconstruction means deriving a result from the necessary signed events, chain history and explicit rules, rather than accepting the project API's current answer.

**Complete independent replay of every production holding has not been established by this documentation.** A transaction ID, a code example or a database snapshot is useful evidence, but each is insufficient on its own.

## Production today

The hosted system discovers events, verifies available signatures and chain evidence, and builds claim, ownership and balance projections. Relay discovery and wallet history are additional inputs. Existing shielded memos are not automatically public, and some registration evidence is held separately from transaction memos.

An independent implementation needs all relevant history, including earlier claims and later transfers or market settlements. Missing data can hide a competing claim or an ownership change. Historical conflicts described in [validation](validation-security.md) cannot be repaired merely by labeling a database row “canonical.”

## Check chain evidence

A read-only verifier needs a suitable validating archival Zcash node. For example, this JSON-RPC request asks the node for a verbose transaction record:

```json
{
  "jsonrpc": "1.0",
  "id": "check-transaction",
  "method": "getrawtransaction",
  "params": ["<transaction_id>", 1]
}
```

Replace `<transaction_id>` with the actual 64-character transaction hash. Send the request through your own node connection; keep any RPC authentication private. This request does not send a payment.

Check the transaction's block membership and confirmation using canonical node data. Verify that the source block is the block at the required height. Chain inclusion alone still does not validate a wallet signature, reveal a shielded memo to everyone, establish holder eligibility or resolve earlier protocol history.

## Proposed public evidence

A separate verifier design introduces complete signed event envelopes and Merkle checkpoints. It is **a candidate, not activated on mainnet**, and does not replace production ownership.

Its proposed anchor commits a full signed event digest in a domain-separated `OP_RETURN` output of one zatoshi. A post-broadcast receipt signature binds the envelope to its transaction ID. This differs from an ordinary one-zatoshi mailbox payment: sending a tiny amount does not by itself publicly commit every event field.

An envelope has this structural shape; placeholders below are illustrative, not a valid transaction or event:

```json
{
  "event": {
    "type": "CLAIM",
    "signature": "<signed-event-signature>",
    "additional_fields": "<complete fields required by the candidate schema>"
  },
  "txid": "<anchor-transaction-id>",
  "receiptSignature": "<signature binding the signed event to that transaction>"
}
```

The full event, its exact encoding and all required signatures must be available to verifiers. A digest on-chain protects integrity; it does not make the original data retrievable. The illustrative object above intentionally omits the full schema and must not be submitted to a validator.

## Interpret results carefully

A report can verify supplied events while lacking an earlier event. A Merkle proof proves membership in a particular snapshot, not that its inputs are complete or that disputed history has been resolved. Candidate validation can report legacy records as unresolved without declaring an existing production holding invalid.

Independent mirrors, complete settlement adapters, wallet conformance and reviewed handling of historical claims remain [activation requirements](roadmap.md). Do not describe local test success as complete production independence.
