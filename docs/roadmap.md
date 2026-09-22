# Roadmap and open gaps

This page records work needed for stronger public verification. It is not a release-date promise or a claim that these items are already complete.

## Documentation and source completeness

- Add an explicit project license with a clear scope; preserve third-party licenses and distinguish software from branding/artwork rights.
- Publish missing production worker source and a reproducible database bootstrap, with non-secret configuration examples.
- Publish the ZECS market contract source and reproducible contract/deployment verification records.
- Maintain public incident findings and explain unresolved evidence without exposing user secrets.
- Keep technical documentation linked to dated source revisions and an auditable change history.

## Public-evidence candidate activation

The machine-readable record is [`protocol/activation.json`](https://github.com/deadpixelslabs/ZEC-BLOCKS/blob/95648a4d7948dfb8c2466ed941718f405827621c/protocol/activation.json). At the reviewed revision its status is `candidate-not-active`, its specification anchor TXID is absent, and the checks below are false.

| Gate | Evidence needed |
| --- | --- |
| Wallet signature conformance | Reproducible signing and verification fixtures using the actual supported wallet |
| Wallet/node anchor support | Acceptance of the exact one-zatoshi `OP_RETURN` output, including policy and fee behavior |
| Confirmed specification anchor | A real confirmed specification commitment checked against a validating node |
| Claim and receipt recovery | End-to-end evidence binding, including interrupted signing and transaction responses |
| Production envelope ingestion | Validated public envelopes accepted by the production ingestion path |
| Legacy and marketplace migration | Reviewed handling of existing claims, conflicts, transfers and both settlement options |
| Independent event mirrors | Available complete event data across independent operators |
| Wallet seed/identity conformance | Stable identity restoration and upstream-compatible test vectors without collecting user seeds |

Legacy owners must not be reassigned automatically to make candidate verification pass. Missing events must stay visible as coverage gaps. A valid checkpoint proves a commitment to its supplied snapshot; it cannot certify missing history.

## Reporting progress

Mark a gate complete only with a public implementation, reproducible evidence and the relevant deployment/activation record. Distinguish merged source, deployed services and live public documentation. None implies the other automatically.
