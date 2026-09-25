# Buy and sell

Open the [marketplace](https://www.zecblocks.xyz/#market), connect Noir, choose a listing and select **Buy**. The listing supplies its own identifiers; normal checkout does not require manually typing an NFT ID, listing ID or transaction ID.

| Payment option | Required wallets | Settlement and fee |
| --- | --- | --- |
| ZEC on Zcash | Noir | One payment to the seller; 0% protocol trading fee |
| USDC on Base | Noir identity and a Base wallet | Contract settlement; 3% protocol fee, 97% seller proceeds |

Each new NFT or ZECS listing for ZEC costs **0.0002 ZEC**, paid to treasury `t1b9PCdoCncgoc13CWwWz8tzZZLDYfMaTyz`. The sale protocol fee remains **0%**. Existing listings keep their original terms; a new listing after cancellation or expiry requires a new fee. Listing fees are not refunded on cancellation.

Noir pays the listing fee from its **transparent balance**. This publicly links the selected inputs and payment address. Keep enough transparent ZEC for the listing fee and the network fee. The listing becomes active after payment verification and confirmation. If Noir or the network is delayed, **Listing payments** keeps the request for recovery without sending another payment.

Network fees apply. A Base wallet may request a network switch, permit signature or allowance transaction before the purchase. The interface guides these steps; “Buy” does not remove wallet approval or chain confirmation.

## Buy

Checkout rechecks the listing, current ownership and relevant purchase guard before payment. After approval, the application saves the transaction and checks settlement. An NFT purchase is complete only when canonical ownership resolves to the original buyer, not merely when a payment hash appears.

For an interrupted response, open **Pending transactions** with the original wallet. Recovery tries to identify and verify the existing payment. Ambiguous results remain pending instead of triggering another payment. Manual transaction entry is reserved for advanced recovery when automatic evidence is insufficient.

## Sell

Select an owned NFT in Portfolio, choose **List for ZEC** or **List for USDC**, enter the price and approve the relevant wallet actions. The active flow checks ownership and prevents simultaneous public listings of the same NFT across both payment options. Cancel the current listing before changing payment options or transferring the item.

An item can become unavailable between browsing and checkout. A stale listing, disconnected wallet or delayed indexer must not be displayed as a completed purchase.

## Activity and privacy

The public Activity table hides participants' Zcash/ZB-1 owner commitments for both ZEC and USDC events, including ZEC BLOCKS and ZECS trades. Two-party events display **Hidden → Hidden**; listings and cancellations display one hidden participant. No participant commitment is inserted into the table's text, tooltips or HTML attributes.

Public NFT and ZECS listing cards also omit seller identities for both ZEC and USDC: neither Zcash owner commitments nor Base seller addresses are shown. NFT search matches item numbers only. Render cache keys stay in memory rather than HTML attributes; seller data is still used internally to verify ownership and route payments.

This reduces casual tracking through the marketplace interface. It is not cryptographic shielding: protocol data, API responses and on-chain records can still expose or link identities. NFT IDs, prices, times and transaction references remain visible. Existing published records are not erased. Base USDC settlement remains public, and a shield icon here indicates a hidden participant ID, not proof of a shielded payment.

## Contracts and trust

The configured Base mainnet NFT marketplace contract is `0x7674a240004fa434bb1082de28e591abb1dc645d`; Base chain ID is `8453`. The configured USDC address is `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`. These are source configuration references, not an assertion of an independent contract audit or bytecode verification.

Cross-chain ownership depends on verification and indexing beyond a single payment transaction. Read [architecture](architecture.md), especially the separate ZECS market authorization dependency. “Direct payment” does not mean all protocol settlement is enforced by Zcash consensus.
