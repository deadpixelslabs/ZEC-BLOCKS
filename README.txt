ZEC BLOCKS MAIN V9.5 — STABLE LISTINGS + LAST 30 ACTIVITY

BUG: LISTINGS DROPPED FROM ~40 TO ~14
Root cause was identified in V9.4's incremental relay sync.

After the first full relay scan, V9.4 queried only a recent overlap window every
20 seconds. But fetchRelay() rebuilt S.events from:
- local wallet events
- live events
- only that newest relay window

It did NOT include the previously discovered remote event history. Therefore old
SALE events could disappear from memory at the next 20-second refresh even
though nobody cancelled the listings.

V9.5 FIX
Every incremental refresh now MERGES:
- previous S.events
- session discovery cache
- local events
- live subscription events
- newly returned relay events

It never replaces the historical discovery set with only the newest slice.

The merged discovery set is also cached in sessionStorage (up to 8,000 normalized
events) so a normal page reload in the same browser tab does not throw away the
already-known marketplace board while relays reconnect.

LISTING VISIBILITY
A valid unexpired published SALE no longer vanishes just because ownership
discovery is temporarily behind.

Listing card states:
- Make Offer       = seller is verified current owner
- OWNER SYNCING    = ownership record has not arrived yet
- OWNER VERIFYING  = current discovery temporarily disagrees with seller
- ATOMIC LOCKED    = sale is already locked to a selected buyer

OWNER SYNCING / OWNER VERIFYING listings remain visible but cannot be traded.
This keeps the board stable without allowing an unverified seller to receive offers.

MARKET METRICS
"Listed" now counts the visible published listing board.
Floor still uses only fully verified/tradeable listings.

ACTIVITY
Activity is capped to the latest 30 events only.
Automatic Activity refresh runs on the 20-second reliability/backfill cycle.
Live relay events still update marketplace listings immediately, but no longer
make the Activity table constantly jump.

PURCHASED NFT OWNERSHIP
The V9.4 permanent verified-settlement ownership checkpoint is retained:
a delayed original CLAIM cannot move a successfully purchased NFT back to the seller.

2-STEP SETTLEMENT
Still unchanged:
- 3% protocol fee
- 97% seller payout
- ownership changes only after both required payments reach finality

DEPLOY
Upload every file in this ZIP to the www.zecblocks.xyz Vercel project.
