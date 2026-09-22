# Wallet authentication and credentials

The applications use wallet identities and operation-specific signatures. Connecting a wallet is not a password login, and an owner commitment alone is not authorization to transfer or mint an asset.

## Request flow

1. The browser connects to Noir and obtains the selected derived public key. SHA-256 of its exact bytes becomes the NFT owner commitment.
2. Public reads load availability, balances or portfolio projections. The browser presents the relevant operation to the user.
3. The wallet signs the specific protocol message or authorizes the chain transaction. The application checks that the connected identity has not changed.
4. Backend verification checks the applicable signature, payload, owner/holder state, chain evidence and duplicate protections. The public API credential does not replace these checks.
5. The transaction and recovery metadata are retained until the operation is resolved. A timeout is an unknown outcome, not permission to silently resend.

Base checkout separately uses the connected EVM account for permits, allowances and contract calls. A Noir NFT identity is still needed for the application's ownership destination.

## Credential and data inventory

| Value | Location / handling | Meaning |
| --- | --- | --- |
| Wallet seed, spending private key | Wallet; not requested by the website | Spending/signing authority |
| Derived public key and owner commitment | Browser, signed events and relevant backend records | Public identity; can link protocol activity |
| Signed claim, transfer or registration | Wallet result, event transport/backend, sometimes pending local record | Authorization only under its specific signed payload and validation rules |
| Supabase anon API credential | Public client/proxy configuration | Identifies a public API role; not a user secret or wallet proof |
| Service-role credential | Backend environment only | Privileged database access; must never be shipped to a browser |
| ZECS market verifier private key | Backend environment only | Operator authorization for the ZECS Base market |
| Base account, transaction hash and receipt | Wallet, browser journal and indexer | Payment evidence; a hash alone does not prove complete NFT settlement |
| Nostr discovery signing key | Browser-local discovery identity in the existing clients | Separate from the wallet's spending keys; should not be treated as a wallet backup |

Pending local data can include signed messages, exact amounts, recipients, transaction IDs, request times and wallet-history baselines. It is not a seed store, but it can reveal activity. Do not publish a whole storage dump when reporting a bug.

## API boundary

The mining gateway permits named RPC and Edge Function operations. The marketplace proxy forwards allowed HTTP methods under the `rest/v1/` and `functions/v1/` namespaces using the public anon role. Its path restriction is not per-user authorization; backend validation, RLS and database grants remain important.

The receiving-address directory is an example of explicit proof-based authorization. A new record requires signatures from both the address key and derived NFT key. The browser verifies resolved proofs again. Its migration restricts direct public table access and prohibits overwriting bindings through the API. See [receiving addresses](transfers.md) for the user flow.

A published migration is evidence of intended permissions, not an independent audit of every deployed permission. Changes to backend grants or privileged code require separate review.
