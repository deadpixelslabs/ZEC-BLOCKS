# Marketplace V13

`index.html` loads `styles.css`, `market-runtime.js`, `script.js` and `navigation.js`. The active application now lives in `script.js`; there is no second inline copy to drift out of sync. Ethers 6.13.5 is self-hosted and loads only when wallet/chain operations require it.

## Data and performance

NFT inventory uses the existing canonical Supabase RPCs through the same-origin API. The USDC board and statistics update atomically. Invalid/failed responses preserve the last verified snapshot and show a delayed-connection status. Portfolio and ZECS account responses are scoped to the requesting wallet.

Both public ZECS boards read the existing `zecblocks_zb20_market_snapshot` and `zecblocks_zecs_zec_market_snapshot` RPCs. Their existing anonymous EXECUTE grants are preserved. Public order rendering does not wait for the transaction-authorizer edge function or its status response. Signed challenges, reservations and transaction verification still use their original edge-function endpoints.

Polling runs every 20 seconds after the previous job completes, pauses in hidden tabs, and refreshes the active view. Claims refresh once a minute. Manual Refresh updates both rails and activity. Snapshot reads are coalesced and have deadlines. Browsing does not require relay connections or browser `eth_getLogs` scans; existing server workers continue ingestion and settlement.

Grids show 24 NFTs per page. Artwork uses indexed source hashes and the unchanged deterministic algorithm, rendered as cached lazy images. Missing metadata displays a placeholder. Optimized WebP copies preserve the original collection banner and logo.

## Transactions

A browser/Web Lock is acquired before wallet prompts. The current Noir/Base identities are checked before signing or submitting. Pending payment metadata is saved before submission and immediately updated with the returned transaction hash. If storage fails, submission stops. No private keys or seeds enter the application.

Native ZEC reserves an item and verifies one Noir payment. An ambiguous wallet response remains pending even if its reservation expires; expiry is not proof that no payment was sent. Base list/cancel/approval/buy actions have durable journals. Receipt failures never trigger another payment. NFT purchases are complete only after canonical ownership resolves to the original buyer. ZECS completion requires acknowledged contract events.

The Pending transactions panel checks progress automatically and keeps manual transaction entry under Advanced recovery. Before a ZEC send, the browser saves the original wallet, seller, exact amount, request time and wallet-history baseline. Recovery requires one new history transaction with matching on-chain destination and outputs; missing or ambiguous evidence remains pending. Base recovery finds the block consuming the original account nonce, then checks sender, contract, zero native value and exact calldata. ZEC settlement still uses the existing server payment verifier. Recovery checks/indexes an existing transaction and never sends money. Browser storage is scoped to the current origin/profile; clearing it removes local recovery metadata. Wallet history and backend reservations remain available.

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

Apply `supabase/migrations/20260922130516_verified_nft_address_directory.sql`, then deploy `zecblocks-nft-address` with JWT verification enabled. Include root `address-identity.js` at its relative import path. The API proxy already passes the public anon JWT; proof verification authenticates registrations. Readiness checks must reject unsigned registration and return no binding for an unregistered valid t1 address. No real user registration or mainnet payment is needed for these checks.
