# FAQ

## Is ZEC BLOCKS part of Zcash consensus?

No. ZB-1 is an application layer using Zcash transactions. Zcash consensus does not implement the collection's NFT ownership rules. See [architecture](architecture.md).

## Does NFT mining earn ZEC?

No. It searches for a proof used to claim a selected ZEC BLOCKS NFT. ZECS minting is a separate process, and ZECS is not ZEC.

## Is ZECS an inscription or ERC-20?

No. It is the project's first ZB-20 token, interpreted from valid application events anchored by Zcash transactions. A Base payment path does not make it an ERC-20 token. See [ZECS](zecs.md).

## Why did Claims seen stay the same after a claim?

It counts historical unique NFT IDs, including invalid attempts. A later valid claim for an already-seen ID may increase Confirmed claims without increasing Claims seen. Check the claim transaction and Portfolio, not just the historical counter. See [claims](claims.md).

## Does paying the network fee guarantee an NFT?

No. The transaction must also satisfy the protocol and canonical claim rules. Proof search, broadcast, chain confirmation and ownership are separate stages.

## Should I claim again when the wallet or site times out?

Use pending recovery first. A missing response does not prove that nothing was broadcast. The recovery flow checks the existing operation and does not send a second payment.

## Can I transfer by entering an address?

Yes, for a supported mainnet `t1` address after the recipient enables verified address receiving once. Shielded `u1`, `t3` and Base recipient addresses are not supported. A receiving link is available without publishing an address binding. See [transfers](transfers.md).

## Do I need to enter IDs to buy?

Normal checkout takes the identifiers from the selected listing. You select Buy and complete the wallet prompts. Manual transaction entry is an advanced recovery option, not the ordinary purchase flow.

## Is every NFT's complete evidence publicly on-chain?

That is not established for the current production system. A transaction exists on-chain, but shielded memo contents and separately registered evidence are not automatically available to everyone. A one-zatoshi payment alone does not prove that the full signed event was publicly committed. See [state reconstruction](state-reconstruction.md).

## Can the backend create or delete NFTs?

It can alter a hosted database projection or what the website shows. That cannot rewrite a confirmed transaction or forge a user's valid signature. Independently detecting an incorrect projection requires complete evidence and correct verification rules; complete production replay remains an open gap.

## Would the assets remain usable if the project server disappeared?

Chain transactions would remain subject to their chains' continued availability. Reconstructing usable NFT ownership and ZECS balances would additionally require the relevant event history, rules, wallet identity and settlement evidence. The reviewed release does not guarantee a complete independent replacement for all production services.

## Is the project independently audited or fully open source?

No independent audit report is supplied with this documentation. Code examples make selected logic inspectable; they do not establish a complete, licensed open-source distribution. See [implementation examples](reference-implementation.md), [open gaps](roadmap.md) and [licensing](license.md).

## Where can I inspect or improve the project?

Start with the [code examples](reference-implementation.md), [protocol rules](protocol-rules.md) and [contribution guide](contributing.md). No wallet connection is required to read them.
