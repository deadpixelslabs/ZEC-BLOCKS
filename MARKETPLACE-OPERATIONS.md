# Marketplace V13

`index.html` loads `styles.css`, `market-runtime.js`, `script.js` and `navigation.js`. The active application now lives in `script.js`; there is no second inline copy to drift out of sync. Ethers 6.13.5 is self-hosted and loads only when wallet/chain operations require it.

## Data and performance

NFT inventory uses the existing canonical Supabase RPCs through the same-origin API. The USDC board and statistics update atomically. Invalid/failed responses preserve the last verified snapshot and show a delayed-connection status. Portfolio and ZECS account responses are scoped to the requesting wallet.

Both public ZECS boards read the existing `zecblocks_zb20_market_snapshot` and `zecblocks_zecs_zec_market_snapshot` RPCs. Their existing anonymous EXECUTE grants are preserved. Public order rendering does not wait for the transaction-authorizer edge function or its status response. Signed challenges, reservations and transaction verification still use their original edge-function endpoints.

Polling runs every 20 seconds after the previous job completes, pauses in hidden tabs, and refreshes the active view. Claim progress is shown on the mining website only; the marketplace displays the supply of 4,444 without fetching claim statistics. Manual Refresh updates both rails and activity. Snapshot reads are coalesced and have deadlines. Browsing does not require relay connections or browser `eth_getLogs` scans; existing server workers continue ingestion and settlement.

Grids show 24 NFTs per page. Artwork uses indexed source hashes and the unchanged deterministic algorithm, rendered as cached lazy images. Missing metadata displays a placeholder. Optimized WebP copies preserve the original collection banner and logo.

## Transactions

A browser/Web Lock is acquired before wallet prompts. The current Noir/Base identities are checked before signing or submitting. Pending payment metadata is saved before submission and immediately updated with the returned transaction hash. If storage fails, submission stops. No private keys or seeds enter the application.

Native ZEC reserves an item and verifies one Noir payment. An ambiguous wallet response remains saved even if its reservation expires; expiry is not proof that no payment was sent. Active and payment-pending reservations appear in Pending transactions. A matching server reservation marked expired, failed or cancelled moves to Portfolio → Purchases needing review, with a compact link visible from other views. The full journal and duplicate-payment block remain in place; a timeout, sold listing or ownership by someone else cannot clear it. Closed reservations are checked for settlement on each recovery pass, without repeatedly submitting an unpayable reservation. Only verified settlement removes the record. Base list/cancel/approval/buy actions have durable journals. Receipt failures never trigger another payment. NFT purchases are complete only after canonical ownership resolves to the original buyer. ZECS completion requires acknowledged contract events.

The Pending transactions panel checks progress automatically and keeps manual transaction entry under Advanced recovery. Before a ZEC send, the browser saves the original wallet, seller, exact amount, request time and wallet-history baseline. Recovery requires one new history transaction with matching on-chain destination and outputs; missing or ambiguous evidence remains saved. Reservation ID, asset, listing and buyer must match before recovery can change a record. Responses arriving after a wallet switch or after another tab removed the record are ignored. Manually supplied TXIDs for closed reservations are saved as unverified review evidence and never described as completed payments. Base recovery finds the block consuming the original account nonce, then checks sender, contract, zero native value and exact calldata. ZEC settlement still uses the existing server payment verifier. Recovery checks/indexes an existing transaction and never sends money. Browser storage is scoped to the current origin/profile; clearing it removes local recovery metadata. Wallet history and backend reservations remain available.

## NFT recipients

Portfolio → Receive NFT creates a shareable link for the currently connected Noir derived identity. The receiving ID and collection genesis are carried in the URL fragment, which is not sent in the HTTP request. Copying the link needs no signature or payment. Account changes refresh the displayed link; disconnecting clears it.

Opening a receive link selects Portfolio and retains its destination until cleared or a transfer is submitted. The sender still chooses the NFT and approves the existing wallet action. The transfer form accepts a verified transparent t1 address, official HTTPS receive link or full receiving ID. It shows the destination before submission and rejects self-transfers, zero IDs, foreign collections and unsupported links. Link format validation does not authenticate who shared a link; confirm it with the recipient.

Noir's official SDK supports `current` message signing with the main transparent address key and separate `derived` NFT signing. Portfolio → Receive NFT now offers an explicit, one-time opt-in: two signatures publicly and permanently bind the mainnet t1 address to the exact derived-key owner commitment. No funds are sent. The shared `address-identity.js` verifier checks Base58Check, compressed address-key HASH160, exact NFT-public-key SHA-256, collection/network/domain and both compact Zcash signatures. Both the Edge Function and sending browser verify these proofs; a database response alone cannot authorize a recipient. The registry only allows inserts, never overwrites. Duplicate identical registrations are idempotent.

Shielded u1 addresses, t3 multisig addresses and Base addresses are not supported as NFT recipients. The documented Noir API does not supply an independently verifiable u1-to-derived-key proof. The application does not hash payment addresses, trust an unsigned `originAddress`, or invent a recipient identity. Receive links remain available for users who do not want a public address binding.

NFT transfers save the original owner, destination, signed memo and history baseline before broadcasting. Missing responses are recovered only from a unique new exact-memo history entry, without another wallet payment. The pending record remains until the destination is the verified canonical owner. Wallet-history reads are bounded to six seconds.

Official reference: https://github.com/NoirWallet/noir-wallet-sdk/blob/8031dc96e9b3d82367ae273b7ca399ac29df9e4c/src/chains/zcash/types.ts and https://docs.zknoir.com/developers/provider-api/.

The transfer event, signatures, mailbox payment, listing/lock preflight and canonical ownership checks retain their existing production behavior. The separate public-evidence protocol candidate is not activated by receive links.

## Preserved rules

Native NFT and ZECS ZEC purchases retain **0% protocol fee / one seller payment**. Base USDC retains **3% protocol / 97% seller proceeds**. Network fees apply. Contract addresses, signing formats, ZB-1/ZB-20 rules, existing settlement database functions and RLS are unchanged. The new address-proof table has RLS enabled, no anon/authenticated grants, and service-role SELECT/INSERT only. Legacy atomic recovery remains in Portfolio → Earlier purchases & advanced recovery.

The Vercel proxy allows up to 50 seconds for edge functions within a 60-second function budget; browser mutations time out at 55 seconds. Reads have shorter deadlines. The request layer never automatically retries a mutation.

## Validation

```sh
node --test tests/runtime.test.cjs
npm install --no-save playwright@1.55.1
npx playwright install --with-deps chromium
node --test tests/marketplace.test.cjs
```

Browser tests use isolated API/wallet simulations: malformed snapshots, stale identities, duplicate submissions, unknown payments, storage errors, pending receipts, search, sort, pagination, theme persistence, mobile layout and dialogs. They do not spend funds or guarantee continuous availability of every wallet/chain provider. GitHub Actions uploads desktop and mobile screenshots.

Production smoke checks should read the canonical RPCs, check indexer health and inspect the deployed UI without sending a payment.

## Address directory deployment

Apply `supabase/migrations/20260922132144_verified_nft_address_directory.sql`, then deploy `zecblocks-nft-address` with JWT verification enabled. Include root `address-identity.js` at its relative import path. The API proxy already passes the public anon JWT; proof verification authenticates registrations. Readiness checks must reject unsigned registration and return no binding for an unregistered valid t1 address. No real user registration or mainnet payment is needed for these checks.


## Native ZEC listing fees — 25 September 2026

New NFT and ZECS listings for ZEC cost 0.0002 ZEC (20,000 zatoshi), sent to `t1b9PCdoCncgoc13CWwWz8tzZZLDYfMaTyz`. Native sale fees remain 0%, and the USDC rail stays at 3%. Existing listings retain their original terms. Cancellation does not refund the listing fee; new listings require a new payment.

The listing dialog discloses transparent funding and network costs. The seller authorizes the listing and payment address, then approves the fee in Noir. Publication follows one canonical confirmation. There is no listing-fee TXID input. A journal is saved before spending; wallet history and bounded address-history discovery recover uncertain responses without resending. The existing once-per-minute direct-market worker completes queued payments if the browser closes after submission. Clearing browser storage before an uncertain payment is registered can still remove local recovery metadata.

The private fee-intent table binds exact listing terms and current-address authorization. The verifier checks the exact treasury output and a matching transparent input. A unique confirmed transaction receipt prevents fee reuse across NFT and ZECS listings. Database triggers reject unpaid activations through legacy paths and term changes that try to inherit an existing listing's waiver. No user seed, private key, or real-fund test payment is involved.

Validation adds fee-proof unit tests, browser payment/recovery regressions and PostgreSQL 17 fee/replay/grant tests. Production changes are limited to the marketplace repository and its direct-market backend; mining/minting remains on its existing deployment.


## RH-20 marketplace — 29 September 2026

`rh20.html` is the independent RHSC/ETH trading page; `rh20-deploy.html` creates its separate settlement contract. Public navigation links the existing marketplace and live RHSC mint. The core is pinned to `0x4e89Bc6A7A218B338060d428f40d8f551efc8058`. Settlement is bound to treasury `0x81046ab56f41a78077662624ac4116465fdf00cc` and a 3% fee deducted from the lot price. Core balances, minting and existing market rails are unchanged.

The contract escrows whole-token lots, atomically transfers them on exact-price purchases, returns unsold tokens on seller cancellation, and keeps beneficiary-owned withdrawal credit for failed ETH push payments. Active inventory is paginated on-chain without browser log scans. The UI uses same-block snapshots, checks core/market runtime hashes, scopes balances to wallet generations, journals before sending, and serializes sends and recovery across tabs. Confirmed replacement nonces resolve old attempts without resubmitting them. Public cards/activity do not render participant addresses.

The owner deployed the official settlement at `0x3E6E91232CE0895C6154b66800ee5c8B8EE83CFC`, transaction `0x1977c9e7ce769c63a43207259f92057f65070f871f5503eca816cecd310ebc18`, RPC block 75378393. The creation/runtime bytecode, chain, core, treasury, 3% fee and deployment event passed independent mainnet RPC verification in CI run 36522992241 before this address was pinned in `rh20/mainnet.json`. The deployment page now prevents another official deployment. Recheck the pinned receipt with:

```sh
node scripts/publish-rh20-market.cjs --check
```

The checker verifies exact creation/runtime bytecode, chain 4663, fixed treasury/core/fee and deployment event. Use the receipt's L2 block height. Never replace a pinned marketplace or use the core address as its settlement address. Publish the updated manifest/checksums after verification. No key or signing credential belongs in this repository.

Validation uses pinned solc 0.8.26, ethers 6.13.5, Anvil 1.7.1 and Playwright 1.55.1. Run `node scripts/build-rh20-market.cjs --check`, `node --test tests/rh20-market-contract.cjs`, and `node --test tests/rh20-market-browser.cjs`. These cover escrow and payment invariants, replay/cancellation, rejected payments and reentrancy, bounded inventory, deployment verification, wallet changes, storage failure, duplicate clicks, cross-tab coordination, ambiguous broadcasts, and deployment receipt persistence. Existing marketplace and database jobs remain in CI. Main-branch CI additionally runs read-only deployment/source/RPC checks and saves public screenshots. The owner-signed marketplace deployment is pinned; subsequent verification is read-only and must never create another contract.

## RHSC holder index

`zecblocks-rh20-holders` projects the fixed RH-20 core and official marketplace into private PostgreSQL balances, seller escrow allocations, a recent reversible event journal, and canonical block checkpoints. The holder count includes liquid plus listed RHSC per address; it excludes the settlement escrow address. Transfers to existing holders, whole-balance sales, zero balances, listing cancellation and reorganization undo are covered by PostgreSQL 17 plus isolated Anvil integration tests.

The Edge Function retains JWT verification and ignores client-supplied indexing parameters. It uses only server-side service-role credentials for tightly scoped RPCs. Every projection table has RLS and no grants to anon/authenticated; every helper is SECURITY INVOKER and executable only by service_role. Public reads expose aggregates through the existing canonical API proxy. A 90-second lease serializes updates and a 15-second minimum start interval prevents duplicate scans. Each invocation reads at most 40 ranges of at most 1,000 blocks with a 40-second budget. The current head uses a two-block margin. The last 128 checkpoints/event ranges support reorganization undo; deeper reconstruction preserves the published value with an indexing label until complete.

Schedule `zecblocks-rh20-holders` every 20 seconds through the project's existing pg_cron/pg_net. Browser refreshes also request an update, with the lease sharing work across all visitors. No wallet signature, trade or mint is sent by this indexer. `rh20/market.js` refreshes the aggregate separately from trading state, so a holder service outage cannot disable purchases or erase the last known number.

The RHSC index also serves `?view=market&offset=0` with up to 12 globally sorted
listing IDs (lowest ETH per RHSC). Apply `rh20_market_price_order` and deploy the
matching event decoder before publishing its UI. The migration preserves the
published holder count and replays an older projection if existing orders lack
prices. Public output contains IDs and aggregate metadata, not seller addresses.
Displayed lots and checkout prices are still verified through the pinned contract.

USD prices are estimates from `/api/rh20-price` (Coinbase Exchange ETH-USD ticker,
15-second cache). Invalid/stale upstream prices cannot influence settlement.
The UI labels delayed rates and stops using them after five minutes. Relevant
checks cover global pagination, one-wei differences at uint256-sized prices,
escrow ownership, reference outages and exact ETH purchase confirmation.

The owner confirmed RHSC minting is complete on 29 September 2026. The marketplace displays **Total supply: 21,000,000 RHSC** immediately with **Fully minted**, without an additional supply RPC request.


## Robinhood Ordinal launch banner — 29 September 2026

The RHSC market links to the separate mint page at `https://mine.zecblocks.xyz/ordinal.html` through a banner above the market hero, using an exact SVG generated by the approved Ordinal renderer. The banner advertises 5,000 NFTs and a 0.00019 ETH protocol fee per NFT plus gas. There is no wallet mint cap. The banner is labeled Mint open after mainnet verification of owner-deployed NFT collection `0x6e049af563A804Ef834b4f6d1c8958a488571b21` and renderer `0x7840794d28Ff52f6fbd378fCee2BF7B2dD594f51`, transaction `0x05748c342ae940d34c7b22a0bf751fe02218f6b098492b0875b5ba6ee65c8f33`, RPC block 75,473,902. Exact creation/runtime bytecode, canonical receipt and genesis parameters passed read-only verification in mining CI run 36536455696 before activation.

This is navigation and artwork only. RHSC contracts, fee, prices, sorting, holders, trading actions and RPC behavior remain unchanged. The NFT contract and deployment belong to the mining/minting repository. The live check verifies the banner image and destination alongside existing RHSC state.


## RHSC Sweep — 29 September 2026

Sweep is built on the existing immutable core and marketplace. `RH20Sweep` buys up to 20 exact whole RHSC lots atomically, rejects buyer-owned listings, duplicates, wrong tickers, value/amount mismatches, expired quotes and reused request IDs, then forwards the purchased RHSC to the caller. Fee remains the existing per-lot 3%; helper fee is zero. No core/market replacement or listing migration is involved.

The public modal selects globally ordered IDs using a fresh, consistent index snapshot (up to 300 candidates), verifies their exact on-chain amounts and prices, excludes the current account and shows total ETH/RHSC/USD plus included fees. It never falls back to cached lots for a Sweep quote. Wallet actions share the existing durable journal and Web Lock. New Sweep/deployment receipts additionally verify their canonical block hash. Indexer production code and database permissions are unchanged; integration coverage follows helper transfers through the existing holder projection.

The helper manifest is initially unpinned; Buy Now stays active and Sweep checkout is labelled activation pending. The owner deploys through `/rh20-sweep-deploy.html`, then supplies the resulting address and transaction hash. Verify with `node scripts/publish-rh20-sweep.cjs --tx HASH --address ADDRESS --check`, using a read-only mainnet RPC. After verification, run without `--check`, review `rh20/sweep.json`, update checksums and publish. The verifier rejects replacement of an already pinned helper, wrong creation/runtime bytecode, noncanonical receipts, changed dependencies or a missing deployment event. Never sign a deployment or purchase with community funds for a test.

Local validation passed 7 isolated Sweep contract scenarios plus all 13 existing marketplace contract/reference-price checks. The 20-lot fixture used 3,861,307 gas; this is evidence from an isolated EVM, not a mainnet gas quote. CI additionally covers desktop/mobile review, global ordering and own-list exclusion, one-send settlement, ambiguous broadcast recovery, cross-tab serialization, stale lots/index data, wallet changes, rejecting wallets, deployment receipt persistence, holder projection and the existing marketplace regressions. Main-branch CI compares public asset bytes and reads production pages/RPC without signing.


### Sweep activation and NFT banner hold — 29 September 2026

The owner deployed the official Sweep helper at `0x2fc152Fb31D175BdD4F2b4A7CFf1434D457524Ce`, transaction `0x7574f21e786b2abde24a4261fa0c4fba5e2f6e69bbf18b9cb45965f624e69ef4`, RPC block 75,523,981. Read-only mainnet verification in CI run 36545143519 passed exact creation/runtime bytecode, canonical receipt, core/market dependency hashes, fixed limits and the `SweepDeployed` event before pinning this address. All five CI jobs passed. `rh20/sweep.json` now activates this deployment; do not replace it or deploy another helper. Main-branch checks verify an active five-lot quote without connecting a wallet or spending funds.

At the owner's request, remove the Robinhood Ordinal mint banner from `rh20.html`. Keep it absent until the owner explicitly confirms restoration. Do not schedule a reminder or automatically restore it tomorrow. The approved banner markup remains recoverable from commit `6b18a56f845e62f911cc072a4f7435899f9354fe`; the SVG and styles remain available. The mint page and NFT contracts are outside this banner change. Live checks require that the banner and Mint Now link are absent from the RHSC market.


### NFT banner restored by owner confirmation — 29 September 2026, 16:39 WIB

The owner explicitly requested the Robinhood Ordinal mint banner back on the RHSC market. This ends the earlier banner hold. Restore the approved neon-green block image, Mint Open label and Mint Now link to `https://mine.zecblocks.xyz/ordinal.html` above the RHSC hero. The markup is the exact previously approved banner; the latest active Sweep configuration and all market behavior are retained. No fee exemption or other NFT benefit is advertised by this banner. Live checks again require one banner, its loaded artwork and the correct mint-page link, alongside the active Sweep quote. The restoration is an immediate owner-requested update, with no reminder or future schedule.

## Seller NFT fee benefit — 29 September 2026

The owner approved 0% protocol fees only for sellers holding at least one Robinhood Ordinal at settlement; other sellers retain 3%. Buyer payment remains the complete lot price, gas is separate and the NFT mint fee is unchanged. `RH20HolderMarketplace` binds the existing core, NFT runtime and treasury and includes atomic 1–20-lot Sweep. One new marketplace deployment is required; do not deploy another Sweep helper. No owner, upgrades, pause or arbitrary withdrawal are introduced. Sweep snapshots all seller fees before any payout callback, then settles every lot or reverts the entire transaction. Current NFT ownership is transferable eligibility, not a permanent mint-based entitlement.

`rh20/holder-market.json` stays unpinned until the owner deploys through `/rh20-holder-deploy.html`. The live market continues using the existing pinned marketplace and Sweep until activation. The deployment page saves the wallet request before broadcast, verifies a canonical receipt/runtime and preserves uncertain requests. The owner signs the deployment; no community funds are used for tests.

After the owner supplies the address and transaction hash:

1. Verify with `node scripts/publish-rh20-holder-market.cjs --tx HASH --address ADDRESS --check --index-sql /tmp/rh20-register-market.sql`. This checks exact creation/runtime, the canonical RPC receipt height, fixed core/NFT code hashes, treasury, fee rules, Sweep limits and the deployment event. Never substitute an explorer-displayed Solidity height for the RPC receipt height.
2. Apply the tested `rh20_multi_market` migration and deploy the matching `zecblocks-rh20-holders` worker if not already installed. The private registry initially contains only the original market. Execute the verifier-generated registration SQL after reviewing its exact verified address/runtime. Registration invalidates leases and replays the canonical projection while preserving the last published holder count; wait for a fresh `ready` snapshot and both registry addresses before publishing the new pin.
3. Run the verifier without `--check` to pin `rh20/holder-market.json`, refresh checksums, run the existing gates and publish. The original `rh20/mainnet.json` and `rh20/sweep.json` remain pinned to their original contracts. Never overwrite those manifests with the new deployment.

Once pinned, `/rh20.html` uses the holder marketplace and built-in Sweep. `/rh20.html?market=previous` retains original Buy Now, cancellation, deferred withdrawals and activity at the original 3% fee. New listing creation in the previous view is disabled. Sellers cancel old listings, approve the new marketplace and relist; neither the site nor the new contract can move another seller's escrow automatically. Statistics and lowest-unit-price sorting are scoped to the selected marketplace, with prior history accessible through the previous-market link. Beneficial holder counts include escrow in both registered marketplaces. Public cards and activity continue to hide participant addresses.

Both views and deployment pages use the same wallet lock and recovery journal. Pending records retain their original target, ABI, exact calldata/value/nonce and approval spender across the transition. Recovery never resends; confirmed replacements and all successful receipts are checked against their canonical block. The new view shows seller eligibility and fee estimates, and explains that eligibility is checked again at execution. No holder benefit is advertised as active before the verified deployment is pinned.

Validation includes the original settlement/recovery checks, nine new isolated contract scenarios, six new browser flows and three multi-market database cases. The 20-lot isolated transaction used 3,365,995 gas, not a mainnet quote. CI captures desktop/mobile fee and deployment screenshots. The new source builds reproducibly with Solidity 0.8.26, optimizer 200 and EVM Paris, with no constructor arguments.

Pre-publication CI run 36559624663 passed all five jobs, including 55 RH-20 price/contract/browser cases and 16 holder/index cases. The private multi-market migration was applied and worker `zecblocks-rh20-holders` deployment 4 published before the UI release. Production retained all 1,597 existing order records and a fresh 1,582-holder snapshot at RPC block 75,609,067; these are verification observations, not fixed UI counts. The registry still contains only the original market until the owner supplies the new deployment. Public/user roles cannot read or write the registry or call its registration function; advisor notices for these tables are informational RLS-with-no-policy findings, intentional for service-role-only projections.


### Holder marketplace activation — 29 September 2026

The owner deployed `RH20HolderMarketplace` at `0x57B2C099A571DE3eC6bc53f46237A1b7848cF366`, transaction `0x32b408a844a097b7e324160abb09c6894ecb3e44ec260be64db4849ebeb12935`, RPC block 75,612,673. Read-only mainnet verification in CI run 36560760237 matched exact creation/runtime bytecode, the canonical receipt, fixed core/NFT runtime bindings, treasury, fee rules, Sweep limit and deployment event. All five CI jobs passed. This is source/bytecode verification through RPC, not a claim of an independent security audit or explorer source verification.

The verifier artifact was checked against the owner-supplied address/hash and the local reproducible artifact before registration in the private multi-market index. `rh20/holder-market.json` pins this deployment; `/rh20.html` uses the same address for Buy Now and native Sweep. Seller ownership of at least one Robinhood Ordinal at execution determines 0% versus 3%; the buyer's listed price does not change. No separate Sweep deployment is required.

Keep `rh20/mainnet.json` and `rh20/sweep.json` unchanged. Existing listings remain in the previous view at 3%; sellers must cancel, approve the current marketplace and relist to obtain holder benefits. The original contracts remain available for purchase, cancellation, deferred withdrawals and recovery. The NFT mint page, NFT fee, RHSC supply, core and treasury are unchanged. The approved NFT banner stays visible.

The production check now reads live NFT ownership and seller fee quotes at the same block, validates the current marketplace link and fee display, checks the previous view and disabled old Sell tab, and handles an empty new-market Sweep selection. All checks remain read-only and never connect a wallet or submit a transaction.

Before publication, the replay completed with both registered marketplaces and a fresh `ready` snapshot at RPC block 75,620,532 (2026-09-29 11:28:51 UTC), 1,582 beneficial holder addresses and no indexer error. The current market correctly had no listings before activation. Historical replay briefly encountered RPC HTTP 429 and then resumed without skipped ranges. These are verification observations, not fixed UI counts.
