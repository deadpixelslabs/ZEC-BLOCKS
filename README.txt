ZEC BLOCKS — MAIN MARKETPLACE

Deploy this folder to the main ZEC BLOCKS Vercel project.
Recommended domains:
- https://www.zecblocks.xyz
- https://zecblocks.xyz -> redirect to www

Mining is intentionally separated and linked to:
https://mine.zecblocks.xyz

Keep api/zcash.js and vercel.json. The marketplace/portfolio still use the same public Zcash data proxy.


ZEC BLOCKS MAIN MARKETPLACE V2 — PERSISTENT DISCOVERY
- Multi-relay marketplace mirroring (4 relays)
- Per-relay read recovery; one unavailable relay does not blank the marketplace
- Automatic reconstruction after website redeploy
- Local signed-event cache survives ordinary site updates on the same origin
- Automatic repair of locally-created events missing from relays (rate-limited)
- Cancel Listing creates a signed SALE_CANCEL event instead of deleting database state
- Only newest valid active listing per token is shown
- Ownership still comes from ZB-1 CLAIM/TRANSFER state, not relay availability

Deploy the whole folder to the www.zecblocks.xyz Vercel project.ZEC BLOCKS MAIN MARKETPLACE V3 — ACTIVITY
- Marketplace stats: floor, total completed-sale volume, sales count, listed count
- Activity feed: SALE, LIST, OFFER, CANCEL, TRANSFER
- Activity filter for sales/listings/offers/transfers
- Volume is intentionally calculated ONLY from SALE_SETTLED events
- Listings/offers are never counted as volume
- Existing multi-relay persistence/recovery remains enabled
- Ready for future settlement flow without faking historical volume

IMPORTANT:
The current P2P marketplace does not have an atomic ZEC-for-NFT settlement primitive.
Until the protocol emits explicit SALE_SETTLED events, Sales and Total Volume correctly remain 0.
