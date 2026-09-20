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

`ZB20:DEPLOY:v1|T=ZECS|M=21000000|L=210|D=0|G=ZB1HOLDER|P=0`

The deploy message is signed with the deployer's Noir Wallet derived Zcash identity.

## Zcash deploy memo

The deploy transaction carries a compact JSON memo with these fields:

```json
{"p":"zb-20","op":"deploy","v":1,"tick":"ZECS","max":"21000000","lim":"210","dec":0,"gate":"zb1-holder","premine":"0","admin":"none","mint":"free","parent":"zb-1","pub":"<derived pubkey>","sig":"<deploy signature>"}
```

The deployment transaction sends 0.00000001 ZEC to the existing ZB-1 protocol mailbox. This is an anchor output, not a token sale or protocol mint fee.

## Canonical deployment identity

The deployment TXID becomes the immutable ZECS deployment identifier after it is confirmed and registered by the ZB-20 indexer. A second deployment transaction does not replace the canonical ZECS deployment.

## Supply rule

Maximum successful mint events:

`21,000,000 / 210 = 100,000`

No mint operation may cause total valid supply to exceed 21,000,000 ZECS.
