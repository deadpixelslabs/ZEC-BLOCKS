# ZECS and ZB-20

**ZECS is the project's first fungible token using the ZB-20 application layer.** It is not ZEC, an ERC-20 contract on Zcash, or an inscription token. Its minting and balances are interpreted from valid ZB-20 events and their Zcash anchors under application rules.

| Parameter | Value in the implementation |
| --- | --- |
| Ticker | ZECS |
| Maximum supply | 21,000,000 |
| Amount per valid mint | 210 |
| Decimals | 0 |
| Maximum valid mint events | 100,000 |
| Mint eligibility | Current canonically verified ZEC BLOCKS holder |
| Protocol mint price | Zero; network costs and the anchor output still apply |
| Premine / team allocation / admin mint | None in the documented launch parameters |

## Mint

1. Connect the eligible Noir account at [ZECS minting](https://mine.zecblocks.xyz/#zecs).
2. Select the mint action and review the Zcash wallet transaction.
3. Complete the signed registration prompts for that transaction.
4. Wait for chain and holder verification before expecting the canonical balance to increase.

The exact mint memo is:

```json
{"p":"zb-20","op":"mint","tick":"ZECS","amt":"210"}
```

The client separately signs a registration message binding the transaction ID to the mint payload. Signature, holder evidence and duplicate checks are not extra fields in that memo. Sending the JSON or one zatoshi alone does not establish a valid mint.

Use **Recover Pending Mint** after an interrupted broadcast or registration. It resumes checks and registration for existing transactions. A missing response does not justify paying again. Keep the original wallet and browser recovery data until the mint is resolved.

## Deployment and trading

The configured canonical deployment transaction is `5bde45c224ae58a41bdd72ab0bfdfe36a23a4d3aa5335381842e19fdac02e5ed`. The published launch record identifies height `3,490,444`; independent checks should verify it with a Zcash node.

The marketplace offers ZEC and Base USDC paths for ZECS. A payment contract on Base does not turn ZECS into a Base ERC-20 token. The Base ZECS market also depends on a server-held verifier signer for authorizations and a backend balance projection. This dependency is distinct from the NFT Base contract and must be considered when evaluating trust.

Sources: [launch parameters and signature format](https://github.com/deadpixelslabs/ZEC-BLOCKS/blob/95648a4d7948dfb8c2466ed941718f405827621c/ZECS-PROTOCOL.md), [mint verifier](https://github.com/deadpixelslabs/test-zecblocks/blob/c5fc203dcf0557500f13530f49471788b1436a01/supabase/functions/zecblocks-zb20-mint/index.ts), [market backend](https://github.com/deadpixelslabs/ZEC-BLOCKS/blob/95648a4d7948dfb8c2466ed941718f405827621c/ZECS-MARKET-BACKEND.md).
