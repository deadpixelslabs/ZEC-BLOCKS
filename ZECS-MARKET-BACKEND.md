# ZECS Base USDC Market V2

Production contract: `0xbf0677cd230b7835ee7e81fbe993f0389deaead8`

Canonical verifier: `0xc6e64521c4fa7fcb86f66917e5507604e3f0dded`

The Base contract is the USDC settlement rail only. ZECS remains ZB-20 on Zcash.

## Backend

- `zecblocks-index-zb20-market`: indexes V2 Base events and applies canonical ZECS settlement deltas.
- `zecblocks-zb20-market`: issues Noir identity challenges and short-lived verifier authorizations for listing and buying.
- `zecblocks_zb20_market_orders`: canonical indexed Base order state.
- `zecblocks_zb20_market_settlements`: canonical Base settlement ledger.
- `zecblocks_zb20_market_challenges`: short-lived Noir identity challenges.
- `zecblocks_zb20_market_authorizations`: verifier authorization audit log.

The indexer is scheduled every minute and authorization requests force a fresh catch-up before balance checks.

## Balance model

`balance = confirmed ZECS mints + ZECS bought - ZECS sold`

Active market reservations are tracked separately and compared against the canonical balance before authorizations are issued.

## Required secret

Set this in Supabase Edge Function secrets:

`ZECS_MARKET_VERIFIER_PRIVATE_KEY`

The secret must correspond to verifier address:

`0xc6e64521c4fa7fcb86f66917e5507604e3f0dded`

Never put the private key in GitHub, frontend code, chat logs, or browser storage.

The verifier endpoint fails closed when the secret is absent or does not derive to the configured verifier address.
