# ZEC BLOCKS documentation

Understand the protocol, use the applications, and read the implementation examples behind ZEC BLOCKS.

ZEC BLOCKS is a collection of **5,000 digital collectibles** associated with Zcash blocks. **ZB-1** defines the application's NFT rules. **ZB-20** is its token layer, and **ZECS** is the project's first ZB-20 token. These are application-layer systems; Zcash consensus validates the underlying transactions, not the project's NFT ownership or token balances.

## Get started

| Your goal | Start here |
| --- | --- |
| Mine and claim an NFT | [Mining guide](mining.md) |
| Understand a pending claim or an unchanged counter | [Claims and recovery](claims.md) |
| Transfer to someone else | [Transfer and receive](transfers.md) |
| Buy or list an NFT | [Marketplace guide](marketplace.md) |
| Mint ZECS | [ZECS guide](zecs.md) |
| Understand the implementation | [Code examples](reference-implementation.md) |
| Evaluate what requires trust | [Architecture](architecture.md) and [verification limits](state-reconstruction.md) |

[Open mining](https://mine.zecblocks.xyz/) · [Open marketplace](https://www.zecblocks.xyz/)

## What this documentation covers

The current applications use Noir Wallet signatures, Zcash transactions, relay discovery and hosted indexers. The marketplace also supports USDC settlement on Base. The explanations and code examples here describe these components without removing their operational dependencies.

A separate public-evidence verifier is under development. It is **a candidate, not activated on mainnet**. Its presence does not mean every existing NFT can already be reconstructed independently from public chain data. See [implementation status](launch-status.md).

The documentation was checked against the mining and marketplace implementations on **22 September 2026**. That review is not a continuous uptime check or an independent security audit. Live balances, availability and counts belong in the applications, not in a static documentation snapshot.
