# Marketplace V13

`index.html` loads `styles.css`, `market-runtime.js`, `script.js` and `navigation.js`. The active application now lives in `script.js`; there is no second inline copy to drift out of sync. Ethers 6.13.5 is self-hosted and loads only when wallet/chain operations require it.

## Data and performance

NFT inventory uses the existing canonical Supabase RPCs through the same-origin API. The USDC board and statistics update atomically. Invalid/failed responses preserve the last verified snapshot and show a delayed-connection status. Portfolio and ZECS account responses are scoped to the requesting wallet.

Polling runs every 20 seconds after the previous job completes, pauses in hidden tabs, and refreshes the active view. Claims refresh once a minute. Manual Refresh updates both rails and activity. Snapshot reads are coalesced and have deadlines. Browsing does not require relay connections or browser `eth_getLogs` scans; existing server workers continue ingestion and settlement.

Grids show 24 NFTs per page. Artwork uses indexed source hashes and the unchanged deterministic algorithm, rendered as cached lazy images. Missing metadata displays a placeholder. Optimized WebP copies preserve the original collection banner and logo.

## Transactions

A browser/Web Lock is acquired before wallet prompts. The current Noir/Base identities are checked before signing or submitting. Pending payment metadata is saved before submission and immediately updated with the returned transaction hash. If storage fails, submission stops. No private keys or seeds enter the application.

Native ZEC reserves an item and verifies one Noir payment. An ambiguous wallet response remains pending even if its reservation expires; expiry is not proof that no payment was sent. Base list/cancel/approval/buy actions have durable journals. Receipt failures never trigger another payment. NFT purchases are complete only after canonical ownership resolves to the original buyer. ZECS completion requires acknowledged contract events.

The Pending transactions panel links submitted transactions and accepts a missing transaction ID. Base recovery checks sender, contract and exact calldata; ZEC recovery uses the existing payment verifier. Recovery checks/indexes an existing transaction and never sends money. Browser storage is scoped to the current origin/profile; clearing it removes local recovery metadata. Wallet history and backend reservations remain available.

## Preserved rules

Native NFT and ZECS ZEC purchases retain **0% protocol fee / one seller payment**. Base USDC retains **3% protocol / 97% seller proceeds**. Network fees apply. Contract addresses, signing formats, ZB-1/ZB-20 rules, database functions and RLS are unchanged. Legacy atomic recovery remains in Portfolio → Earlier purchases & advanced recovery.

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
