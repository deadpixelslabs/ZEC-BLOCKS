ZEC BLOCKS MARKETPLACE V10.0 — SUPABASE PERSISTENT INDEX

GOAL
Stop treating every visitor's browser as the main indexer.
The marketplace now renders persistent server snapshots first, then performs
normal relay / Base / Zcash verification in the background.

WHAT IS LIVE
- Supabase tables use the zecblocks_* prefix and do not modify legacy project tables.
- Base USDC production contract indexer is deployed as Supabase Edge Function:
  zecblocks-index-usdc
- Noir/ZB-1 verified claim cache is deployed as Supabase Edge Function:
  zecblocks-cache-claims
- Production USDC contract:
  0x7674a240004fa434bb1082de28e591abb1dc645d

REFRESH FLOW
1. Browser local cache renders immediately.
2. Supabase USDC snapshot is fetched immediately.
3. When Noir connects, Supabase portfolio snapshot is loaded first.
4. Relay / Zcash / Base verification continues in the background.
5. Newly reconstructed valid Noir claims are re-verified server-side and cached.
6. USDC List / Cancel / Buy Now triggers the server Base indexer in the background.

SECURITY
- Browser has only the normal public Supabase anon credential.
- RLS allows public SELECT on marketplace/token snapshots only.
- Browser cannot directly write zecblocks index tables.
- Base writes come from chain logs processed by the Edge Function service role.
- Claim-cache writes are accepted only after server-side PoW, compact-signature,
  source-block and confirmed-transaction checks.
- Buy Now still performs the existing client/on-chain verification path.

USDC MARKET
- Listings remain sorted lowest price first.
- Total USDC volume/sales/listed/floor can be recovered from persistent DB state.
- Refresh no longer needs to rebuild USDC market history from zero.

PORTFOLIO
- First wallet recovery still verifies Noir history.
- Valid claim ownership is then cached in Supabase.
- Subsequent reconnect/refresh can restore known holdings from the server snapshot
  before the slower wallet-history repair finishes.
- Base USDC purchases update zecblocks_tokens from the settlement contract indexer.

DEPLOY
Upload the whole folder/ZIP to the existing ZEC BLOCKS Vercel project.
No additional Supabase setup is required for the schema/functions already deployed.
On the first V10 visit, the Base indexer bootstraps a recent ~50k-block window;
after that it is incremental.

IMPORTANT
Keep api/zcash.js and all existing files. V10 is additive; it does not remove the
old ZEC/Noir market, relay discovery, direct chain verification, local cache,
portfolio recovery, or USDC Buy Now flow.
