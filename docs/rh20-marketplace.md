# RH-20 marketplace

RH-20 inscriptions settle on Robinhood Chain using native ETH. The first public trading page is for RHSC at [ZEC BLOCKS](https://www.zecblocks.xyz/rh20.html). The public interface enables trading only after the official settlement deployment is published and its runtime bytecode is verified.

The official marketplace is `0x3E6E91232CE0895C6154b66800ee5c8B8EE83CFC`, deployed in transaction `0x1977c9e7ce769c63a43207259f92057f65070f871f5503eca816cecd310ebc18` at Robinhood Chain RPC block 75378393. Its creation bytecode, runtime bytecode, core binding, treasury and 3% fee were independently checked through mainnet RPC before activation.

## Two contracts

The existing RH-20 registry at `0x4e89Bc6A7A218B338060d428f40d8f551efc8058` controls token balances, minting and transfers. A separate `RH20Marketplace` contract handles trading. Marketplace deployment does not redeploy RHSC or change its 21,000,000 supply, 500 tokens per mint, or lifetime limit of 20 mints per wallet. Buying and selling do not reset mint counts.

The marketplace binds the core address, core runtime hash, treasury `0x81046ab56f41a78077662624ac4116465fdf00cc`, and 300-basis-point fee in its source. There is no administrator, upgrade, pause, fee setter or administrator withdrawal. The settlement contract supports registered RH-20 tickers; the current website displays RHSC.

## Sell and buy

1. The seller approves the RHSC amount in the core contract with `approve("RHSC", marketplace, amount)`.
2. `createListing("RHSC", amount, totalPriceWei, requestId)` transfers that amount into marketplace escrow. An account cannot reuse the same nonzero request ID.
3. The buyer calls `buy(listingId)` with the exact total ETH price. The entire lot transfers to the buyer. Partial fills and price edits are not supported.
4. Before sale, the seller can call `cancelListing(listingId)` to return all escrowed tokens. A cancelled or sold listing cannot be filled.

Approval and listing are separate wallet transactions. There is no marketplace listing fee. The buyer's displayed price includes the marketplace fee; network gas is additional.

## Fee and payments

The fee is `floor(priceWei × 300 / 10000)`. The seller receives the remainder. For a sale priced at 0.01 ETH, the seller receives 0.0097 ETH and the treasury receives 0.0003 ETH. Prices must be at least 100 wei. Token amounts are whole units.

The contract attempts each ETH payment with a bounded gas allowance. A rejecting or complex recipient does not prevent the RHSC sale: its amount remains in `claimable(account)`. Only that account can call `withdraw(recipient)` for its credit. The website's My listings view includes a withdrawal button to the connected account. Contract wallets that need a different recipient can call the same contract function with another nonzero address. Reentrancy is blocked across all state-changing settlement functions.

Send tokens only through the listing function. Unsolicited token transfers and forcibly sent ETH have no administrator recovery path.

## Inventory and recovery

Inventory, balances and statistics are read at a single RPC block. Contract pagination returns at most 50 records per call; the website loads 12 active lots and 12 recent sales per refresh. It does not scan chain logs in the browser. Polling waits for the previous refresh and pauses in hidden tabs. Public cards and activity omit participant addresses; on-chain transactions remain public.

Wallet actions use a cross-tab lock and save destination, value, calldata and nonce before a wallet submission. Unknown responses remain pending. Recovery verifies the transaction and its matching settlement event without sending it again. A confirmed different transaction from the same account and nonce resolves a replaced attempt. A timeout or missing transaction does not prove failure. Site storage is local to the browser profile; do not clear it while recovering a transaction.

## Deployment and verification

The deployment page creates `RH20Marketplace` with no constructor arguments. Its constructor rejects the wrong chain or core runtime. The build uses Solidity 0.8.26, optimization enabled with 200 runs, EVM Paris, and the MIT source license. The published Standard JSON contains the complete source and compiler settings.

Activation verifies the creation transaction, runtime hash, fixed settings and `MarketplaceDeployed` event before publishing the official address. Deployment height comes from the RPC receipt. Solidity `block.number` on an Arbitrum chain is not used as the L2 deployment height.

This settlement is independent of the existing native ZEC and Base USDC NFT/ZECS markets. Their rules and fees are unchanged. The hosted interface and RPC proxy remain availability dependencies; no independent security audit is claimed.

## Holder count

The Holders card counts unique addresses whose available RHSC plus active listed RHSC is greater than zero. A seller remains a holder while a lot is listed. A completed sale transfers that ownership to the buyer; a cancellation restores available balance. The settlement escrow address itself is excluded to avoid counting it as an extra owner. This measures addresses, not individual people.

A persistent index follows RH-20 `Transfer` events and official marketplace `Listed`, `Bought`, and `Cancelled` events. It advances through bounded, contiguous block ranges and publishes a count only after catching up to the chain head with a two-block margin. Canonical checkpoints support reversal of orphaned events after a chain reorganization. Failed RPC reads or incomplete backfill retain the last published count and mark it delayed.

The page refreshes every 20 seconds while visible. A scheduled backend update also runs every 20 seconds. The public endpoint returns only the aggregate count, freshness and indexed block. Balances, seller mappings, event journals, leases and database mutation functions are not granted to public client roles. The number depends on hosted indexer and RPC availability; delayed data is labelled rather than replaced with zero.

### Unit prices and USD estimates

Available lots are ordered globally by `total ETH / RHSC amount`, with listing ID
as the tie-breaker, before pagination. The private event projection records exact
uint256 prices and indexes the ratio at 30 fractional wei digits. Each displayed
ID is reread from the settlement contract, and checkout revalidates the exact
active lot and ETH price. Closed lots are removed on refresh.

Cards, the selling quote and purchase confirmation show ETH per RHSC, indicative
USD per RHSC and the complete lot's USD estimate. `/api/rh20-price` reads the public
Coinbase Exchange ETH-USD ticker and its trade timestamp, caches successful reads
for 15 seconds, and rejects old/invalid references. A retained quote is marked
as delayed and expires after five minutes. ETH settlement and the included 3%
fee never depend on the USD feed. Network gas remains separate.

Source API: https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-ticker


## Sweep RHSC

Sweep selects 1–20 complete lots by the lowest ETH price per RHSC. It excludes the connected wallet's own listings and displays each lot, the total RHSC, total ETH, average unit price and indicative USD. The current selection scans up to the first 300 globally ordered listings, using one fresh index snapshot and on-chain lot details. If there are not enough eligible lots within that range, choose fewer lots. The index chooses IDs; contract reads determine amounts and prices.

`RH20Sweep` is a new, fixed helper for the existing core and marketplace. It does not replace either contract or migrate listings. It checks every lot, exact total payment, expected token amount, deadline and buyer-scoped request ID, calls the existing `buy` function for each lot, then transfers the combined RHSC to the caller in the same transaction. Source: `contract/RH20Sweep.sol`.

Every selected lot settles, or the whole transaction reverts. A competing purchase can therefore cause a failed transaction with gas charged. There are no partial fills or automatic substitutes. Quotes expire after ten minutes. One wallet transaction still performs multiple on-chain buys; a lower gas cost is not guaranteed.

The existing 3% fee is calculated separately for each lot and included in the total. Sweep adds no fee and grants no administrator permissions. The user does not approve RHSC to buy. Completed purchases leave no purchased RHSC or payment ETH in the helper. Unsolicited transfers have no recovery function.

`rh20/sweep.js` shares the marketplace's wallet lock and durable transaction recovery. Before sending, it rereads selected lots and verifies the helper runtime. Recovery checks the original sender, destination, calldata, value and nonce, canonical receipt block and exact `Swept` event. An unresolved wallet response is never automatically resent. Holder accounting follows the final core transfer to the buyer.

The official Sweep helper is `0x2fc152Fb31D175BdD4F2b4A7CFf1434D457524Ce`, deployed in transaction `0x7574f21e786b2abde24a4261fa0c4fba5e2f6e69bbf18b9cb45965f624e69ef4` at Robinhood Chain RPC block 75523981. Exact creation/runtime bytecode, canonical receipt, fixed dependencies and the deployment event were verified before pinning `rh20/sweep.json`. Sweep checkout is enabled; the setup page `/rh20-sweep-deploy.html` now prevents another official deployment. The build uses Solidity 0.8.26, optimizer 200, EVM Paris and no constructor arguments. Existing Buy Now remains available.

## Robinhood Ordinal seller benefits

The holder-fee marketplace is prepared for deployment. The currently deployed market keeps its original 3% fee until the new contract is verified and activated.

The new settlement rules check the **seller's** Robinhood Ordinal balance when the transaction executes. Holding at least one NFT makes that seller's protocol fee 0%; otherwise it is 3%. The buyer pays the listed ETH price in either case. Moving the last NFT out of the selling wallet before settlement removes eligibility. Network gas and NFT mint fees are separate.

Buy Now and Sweep use the same rules. Sweep is built into the new marketplace, with up to 20 whole lots per transaction and no additional Sweep fee. Every seller's fee is determined before payout callbacks; if any selected lot cannot settle, the entire purchase reverts.

After activation, earlier listings stay available in **Previous listings & activity**, with their original 3% fee. A seller can cancel there, approve the current marketplace and create a new listing to use holder benefits. The previous marketplace remains available for deferred withdrawals and historical activity. The token, NFT collection, supply and treasury are unchanged.
