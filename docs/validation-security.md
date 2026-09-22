# Validation and security

A confirmed Zcash transaction proves that a transaction was accepted by Zcash consensus. A valid ZB-1 claim additionally needs correct collection, identity, proof, source block and protocol evidence. The same distinction applies to ZECS minting and market settlement.

## What checks protect the active flows

- **Claims:** complete historical classification, exact target checks, reservations, signed evidence, chain auditing and canonical transaction selection.
- **Transfers:** current-owner checks, listing restrictions, signed destination and recovery of the exact existing event.
- **Address receiving:** address checksum and key derivation checks, both wallet signatures, collection/network binding and independent browser verification of the result.
- **Purchases:** fresh listing and ownership checks, payment verification, durable pending records and canonical ownership confirmation before completion.
- **ZECS minting:** canonical deployment, exact amount, holder eligibility, transaction verification and duplicate rejection.

These are implementation controls, not a claim of an independent security audit. Review the referenced code, permissions and deployment configuration when assessing a specific release.

## Availability must fail closed

The claim investigation found that an unpaginated history query could omit relevant records and show a claimed ID as clear. The repair classifies the full database history in SQL and prevents certain stale availability writes. Later historical ownership guards preserve disputed evidence for review.

A provider 404, empty wallet history, timeout, missing reservation record or conflicting ownership is not positive proof that an NFT is free. Recovery should preserve evidence and explain the uncertainty, not force a valid status or automatically resend a payment.

## What remains a dependency

Hosted verifier logic and privileged database administration can affect the projection users see. Wallet/provider compatibility, relay coverage, complete historical data and chain availability remain relevant. Public code does not make these dependencies disappear. The proposed public-evidence format does not retroactively upgrade existing transactions.

## Report a problem

For a normal bug, use the appropriate repository's issue tracker with reproducible steps and non-secret evidence. For a security concern, use GitHub private vulnerability reporting if offered; do not post exploitable details or credentials publicly. A dedicated disclosure contact and response guarantee are not established by these pages.

Sources: [claim incident and remaining cases](https://github.com/deadpixelslabs/test-zecblocks/blob/c5fc203dcf0557500f13530f49471788b1436a01/docs/claim-verification-2026-09-22.md), [historical guards](https://github.com/deadpixelslabs/test-zecblocks/blob/c5fc203dcf0557500f13530f49471788b1436a01/supabase/migrations/20260922121500_claim_history_guards.sql), [marketplace controls](https://github.com/deadpixelslabs/ZEC-BLOCKS/blob/95648a4d7948dfb8c2466ed941718f405827621c/MARKETPLACE-OPERATIONS.md), [address verification tests](https://github.com/deadpixelslabs/ZEC-BLOCKS/blob/95648a4d7948dfb8c2466ed941718f405827621c/tests/address-identity.test.cjs).
