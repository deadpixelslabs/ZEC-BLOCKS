ZEC BLOCKS MAIN V9.4 — STABLE OWNERSHIP + LIVE MARKET + LAST 30 ACTIVITY

FIX 1 — PURCHASED NFT APPEARS THEN DISAPPEARS
Root cause:
V9.3 still preferred an old CLAIM whenever that CLAIM arrived from a relay.
A completed SALE could be visible first, then a delayed seller CLAIM arrived and
the UI started ownership reconstruction from the old seller again.

V9.4:
- the latest S.verifiedAtomic settlement ALWAYS supersedes the original CLAIM;
- delayed historical CLAIM discovery cannot move ownership back to the seller;
- only events after the latest verified settlement can change ownership.

This applies to already-completed V9/V9.1/V9.2/V9.3 marketplace sales once the
settlement has been chain-verified by the client.

FIX 2 — ACTIVITY TOO LONG
Activity is now a rolling window of the latest 30 matching events only.
It still updates automatically.

FIX 3 — LISTINGS / CLAIMS WERE LATE
V9.4 adds a live Nostr subscription to all ZB-1 discovery relays:
- damus
- nos.lol
- primal
- nostr.band
- snort
- nostr.mom

It listens to both kind 30078 and miner fallback kind 1.
New claims, listings, offers, cancellations and settlement events are merged into
runtime state immediately (debounced ~250ms).

A 20-second incremental backfill still runs to catch anything missed by the live
subscription. After the first full sync, backfills query only a short overlap
window instead of downloading the entire event history again.

FIX 4 — ONLY A FEW MARKET LISTINGS SHOWED
Previously renderMarket() used activeListings(), which hides a listing when the
token's old CLAIM/ownership record has not arrived yet.

V9.4 has a separate visibleMarketListings() layer:
- fresh listings appear as soon as they are discovered;
- if ownership has not synced yet, the card says OWNER SYNCING;
- Make Offer stays disabled until current ZB-1 ownership resolves to the seller;
- if a known owner contradicts the listing seller, the stale listing is hidden.

This improves marketplace freshness without allowing an unresolved listing to
be traded.

SECURITY
Raw relay NOIR_SETTLED events are still NOT blindly trusted as ownership.
Permanent marketplace ownership uses S.verifiedAtomic, which is produced only
after the client verifies the seller lock and the required Zcash payment(s).

2-STEP PAYMENT
V9.4 retains:
- 3% protocol fee to treasury
- 97% seller payout
- ownership final only after both required payments reach finality

DEPLOY
Upload every file in this ZIP to the www.zecblocks.xyz Vercel project.
For the already-purchased NFT, connect the buyer Noir wallet and click
Recover & Sync Portfolio once after deployment.
