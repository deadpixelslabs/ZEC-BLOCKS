# ZEC BLOCKS documentation

Understand the protocol, use the applications, and inspect the code behind ZEC BLOCKS.

ZEC BLOCKS is a collection of **5,000 digital collectibles** associated with Zcash blocks. **ZB-1** defines the application's NFT rules. **ZB-20** is its token layer, and **ZECS** is the project's first ZB-20 token. These are application-layer systems; Zcash consensus validates the underlying transactions, not the project's NFT ownership or token balances.

## Get started

| Your goal | Start here |
| --- | --- |
| Mine and claim an NFT | [Mining guide](mining.md) |
| Understand a pending claim or an unchanged counter | [Claims and recovery](claims.md) |
| Transfer to someone else | [Transfer and receive](transfers.md) |
| Buy or list an NFT | [Marketplace guide](marketplace.md) |
| Mint ZECS | [ZECS guide](zecs.md) |
| Inspect or contribute to the implementation | [Source code and setup](reference-implementation.md) |
| Evaluate what requires trust | [Architecture](architecture.md) and [verification limits](state-reconstruction.md) |

[Open mining](https://mine.zecblocks.xyz/) · [Open marketplace](https://www.zecblocks.xyz/) · [Marketplace source](https://github.com/deadpixelslabs/ZEC-BLOCKS) · [Mining source](https://github.com/deadpixelslabs/test-zecblocks)

## What this documentation covers

The current applications use Noir Wallet signatures, Zcash transactions, relay discovery and hosted indexers. The marketplace also supports USDC settlement on Base. Public source allows readers to inspect these components; it does not remove their operational dependencies.

A separate public-evidence verifier is published in `protocol/`. It is **a candidate, not activated on mainnet**. Its presence does not mean every existing NFT can already be reconstructed independently from public chain data. See [implementation status](launch-status.md).

The documentation was checked on **22 September 2026**, against marketplace commit [`95648a4`](https://github.com/deadpixelslabs/ZEC-BLOCKS/tree/95648a4d7948dfb8c2466ed941718f405827621c) and mining commit [`c5fc203`](https://github.com/deadpixelslabs/test-zecblocks/tree/c5fc203dcf0557500f13530f49471788b1436a01). Source review is not a continuous uptime check or an independent security audit. Live balances, availability and counts belong in the applications, not in a static documentation snapshot.
