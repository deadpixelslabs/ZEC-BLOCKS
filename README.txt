ZEC BLOCKS MARKETPLACE V13.0.1

CURRENT FRONTEND
Modern charcoal/blue interface, light and dark themes, responsive item grids,
search, sorting and pagination. Canonical snapshots preserve verified data on
failed requests. Wallet actions are serialized and pending payments recover
without automatically submitting a second payment.

The active client is script.js, loaded by index.html with market-runtime.js,
navigation.js and styles.css. Ethers 6.13.5 is served from vendor/ on demand.
See MARKETPLACE-OPERATIONS.md for current architecture, recovery and test commands.
Native ZEC purchases retain 0% protocol fee and one seller payment; Base USDC
retains the existing 3% protocol fee. Production contracts and DB rules are unchanged.

PERSISTENT INDEX ARCHITECTURE (original deployment notes)

PURPOSE
Production hardening for ZEC BLOCKS marketplace and portfolio. Browsers are no
longer treated as the primary indexer. Persistent Supabase workers continuously
index Base USDC activity, relay protocol events, verified ownership transitions,
and verified ZEC settlements.

PRODUCTION CONTRACT
Base USDC marketplace:
0x7674a240004fa434bb1082de28e591abb1dc645d

SERVER-SIDE PIPELINE
1. Base contract logs -> zecblocks-index-usdc -> persistent USDC listing/sale DB.
2. ZB-1 relay events -> zecblocks-ingest-relay -> persistent event DB.
3. zecblocks-verify-events verifies CLAIM / TRANSFER / SALE / CANCEL / USDC intent
   signatures and rebuilds the current owner state.
4. zecblocks-index-zec-sales independently verifies Noir locks + Zcash payment
   settlements and writes final ownership transitions.
5. Cron invokes production workers continuously. Browser refresh is no longer the
   thing that keeps the index alive.

PERSISTENT DATA
- zecblocks_tokens: current indexed owner for each verified token
- zecblocks_ownership_events: verified ownership transitions
- zecblocks_usdc_listings: Base listing state
- zecblocks_sales: Base USDC + verified ZEC sales
- zecblocks_events: persistent relay protocol history + verification state
- zecblocks_zec_listings: verified ZEC listing lifecycle
- zecblocks_claims_seen / zecblocks_protocol_stats: global claim counter
- zecblocks_indexer_health: worker health and last successful sync

USDC MARKET
- Base index is canonical once caught up.
- Listings do not disappear just because the visitor refreshes or a relay is slow.
- Server state is merged with local state; browser recovery can no longer replace a
  complete server snapshot with an empty/partial scan.
- USDC listings stay ordered from lowest price to highest price.
- USDC floor / listed / sales / total volume come from persistent Base settlement data.
- Buy Now still does a fresh contract check before sending the buyer transaction.
- Signed ZB-1 listing intent and indexed ownership are checked before Buy Now is enabled.

PORTFOLIO / OWNERSHIP
- Connect Noir -> server portfolio snapshot is loaded first.
- Current owner is reconstructed from verified CLAIM -> TRANSFER -> ZEC SALE ->
  USDC SALE ownership events.
- Wallet history and relay discovery still run as repair/fallback layers, not the
  primary source after refresh.
- Verified server ownership is persistent and does not disappear when a browser cache
  is cleared or a relay temporarily fails.

CLAIMS SEEN
- Production counter uses the persistent protocol total.
- Initial production baseline: 2,916 claimed ZEC BLOCKS at deployment time.
- Verified newly indexed claims increase the total after the baseline.

CURRENT PRODUCTION WORKERS
- zecblocks-index-usdc        : every minute
- zecblocks-ingest-relay      : every minute
- zecblocks-verify-events     : every minute
- zecblocks-index-zec-sales   : every 2 minutes

SECURITY
- No service-role key is shipped in the frontend.
- Public frontend uses only the Supabase publishable key.
- RLS prevents public writes to index tables.
- Worker writes use Supabase Edge Function service-role environment only.
- CLAIM / TRANSFER / listing intents are cryptographically verified server-side.
- ZEC sale settlement is independently checked against Zcash chain data.
- USDC sales/volume/listing state come directly from Base contract events.

DEPLOY
Upload the entire folder/ZIP to the current ZEC BLOCKS Vercel project.
Do not delete api/zcash.js, logo/favicon, contract files, or vercel.json.

IMPORTANT INITIAL BOOTSTRAP
The Base USDC index is already caught up server-side. Global event verification can
continue processing historical ZB-1 events for several minutes after this build is
first deployed. The website can still render persistent market data immediately;
portfolio coverage improves automatically as the verification queue completes.

V10.5 STALE USDC LISTING CLEANUP
- Base USDC active listings are visible only while sellerCommitment matches the canonical current owner.
- Ownership-stale listings are removed from cards, floor, and listed count.
- Sold rows remain indexed for volume, sales history, activity, and ownership settlement history.
- Old browser cache entries are purged after the production Base index reports caught-up.
- A stale listing cannot block the new owner from creating a fresh USDC listing.
