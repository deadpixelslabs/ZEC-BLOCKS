ZEC BLOCKS MARKETPLACE V9.10 — RPC RATE-LIMIT FIX

WHY
Vercel observability showed /api/zcash failures caused by CipherScan HTTP 429
Too Many Requests. The old proxy explicitly used Cache-Control: no-store, and
the browser also used fetch(..., cache:'no-store'), so repeated reads were
forwarded upstream instead of being shared/cached.

V9.10 FIXES
- removes the Vercel no-store header override;
- enables Vercel CDN caching with kind-specific short TTLs;
- adds stale-while-revalidate;
- adds warm-function memory cache;
- coalesces identical concurrent requests;
- adds provider circuit breakers after HTTP 429 / 5xx;
- honors Retry-After where supplied;
- serves recent stale chain data during a temporary provider rate limit instead
  of generating unnecessary 502 responses;
- returns HTTP 429 for an actual upstream rate limit, not a misleading 502;
- adds browser-side request coalescing / short memoization;
- removes browser cache:'no-store'.

CACHE WINDOWS
- health: ~12 sec edge
- tx: ~5 sec pending / ~15 sec mined
- block: ~30 sec
- transparent address activity: ~15 sec

Settlement finality is still independently verified; caching can delay a new
confirmation by a few seconds, but dramatically reduces upstream request load.

RETAINED
- V9.9 fixed-price / stale-offer protections
- V9.7 payment recovery
- 3% protocol + 97% seller
- historical settlement recovery
- latest 30 Activity

DEPLOY
Upload the whole ZIP to the www.zecblocks.xyz Vercel project.
Do not keep an old Vercel header rule that forces /api/* to Cache-Control:no-store.

V9.13 USDC UI patch
--------------------
This build keeps the existing ZEC/Noir marketplace intact and makes the Base USDC rail explicit in the seller portfolio and marketplace header. Sellers can choose List ZEC or List USDC. USDC buyers use Buy Now · USDC.

V9.19 SOLID PERSISTENT INDEX
---------------------------
- Public ZB-1 discovery cache is persistent across page refreshes (localStorage), not session-only.
- Noir wallet claim recovery is cached per owner commitment and restored instantly on reconnect.
- Wallet history recovery reuses already verified source block hashes instead of refetching every block on every refresh.
- Portfolio renders progressively while any missing claims are being reconstructed.
- Base USDC marketplace has a persistent contract-state cache.
- USDC listing discovery no longer depends only on relays: the client also scans ListingCreated events from the production Base contract.
- Cached active USDC listings remain visible while Zcash ownership/indexer state is still rebuilding.
- Buy Now is disabled until current ZB-1 ownership and the signed listing intent are verified, so the faster cache does not weaken settlement checks.
- USDC volume and sales are recovered from Base contract state and no longer depend on the Zcash ownership index finishing first.
- USDC cards remain sorted lowest price first; no dropdown/filter is used.

Production contract remains:
0x7674a240004fa434bb1082de28e591abb1dc645d
