# ZB-20 / ZECS — Canonical Launch Parameters

Status: deployment-ready
Network: Zcash Mainnet
Parent protocol: ZB-1
Token layer: ZB-20

## ZECS

- Ticker: ZECS
- Max supply: 21,000,000
- Mint limit: 210 ZECS per successful mint event
- Decimals: 0
- Premine: 0
- Team allocation: 0
- Admin mint: none
- Mint price: free (normal Zcash network transaction cost only)
- Eligibility gate: current ZB-1 / ZEC BLOCKS holder
- Canonical settlement anchor: Zcash transaction to the ZB-1 mailbox
- Canonical balances: deterministic reconstruction from valid ZB-20 events

## Canonical deploy message

`{"p":"zb-20","op":"deploy","tick":"ZECS","max":"21000000","lim":"210"}`

The exact JSON above is both the canonical deploy message and the Zcash memo payload.

The deployer signs that exact payload with the Noir Wallet derived Zcash identity. Signature material is registered separately with the ZB-20 deployment registry and is not added to the deploy memo.

The deployment transaction sends 0.00000001 ZEC to the existing ZB-1 protocol mailbox. This is an anchor output, not a token sale or protocol mint fee.

## Canonical mint message — LOCKED

`{"p":"zb-20","op":"mint","tick":"ZECS","amt":"210"}`

The exact JSON above is the canonical ZECS mint payload and Zcash memo. No extra fields are added to the on-chain mint memo.

Each valid mint creates exactly 210 ZECS, subject to:
- the canonical ZECS deployment being confirmed,
- the minter satisfying the ZB-1 / ZEC BLOCKS holder gate at validation time,
- the mint event being valid and unique,
- and total canonical supply not exceeding 21,000,000 ZECS.

Signature, holder-proof, indexing, and anti-duplicate verification data are maintained separately from the canonical mint memo.

### Mint registration identity — v1

After the Zcash mint transaction is broadcast, the minter signs this external registration message with the same Noir Wallet derived Zcash identity:

`ZB20:MINT_ANCHOR:v1|T=ZECS|X=<mint_txid>|M={"p":"zb-20","op":"mint","tick":"ZECS","amt":"210"}`

The registration signature is **not** added to the Zcash memo. The indexer derives the owner commitment from the signing public key, checks that commitment against current fully verified ZB-1 ownership, rejects duplicate TXIDs, and only credits supply after the Zcash anchor transaction is mined after the canonical deployment.

One canonical mint event always creates exactly **210 ZECS**. There is no batch amount or `amt=2100` shortcut.

## Canonical ZECS deployment TXID

`5bde45c224ae58a41bdd72ab0bfdfe36a23a4d3aa5335381842e19fdac02e5ed`

This TXID is locked as the one and only canonical ZECS deployment transaction. It is confirmed on Zcash at block height **3,490,444**. No later deploy transaction may replace it.

## Canonical deployment identity

The deployment TXID becomes the immutable ZECS deployment identifier after it is confirmed and registered by the ZB-20 indexer. A second deployment transaction does not replace the canonical ZECS deployment.

## Supply rule

Maximum successful mint events:

`21,000,000 / 210 = 100,000`

No mint operation may cause total valid supply to exceed 21,000,000 ZECS.
