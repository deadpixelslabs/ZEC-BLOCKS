ZEC BLOCKS MAIN V9 — NOIR-ONLY LOCKED SETTLEMENT

GOAL
Remove Zkool and make marketplace checkout work with Noir Wallet only.

FLOW
1. Buyer A/B/C can make offers. Offers move no ZEC.
2. Seller chooses ONE buyer.
3. Seller clicks Accept & Lock to Buyer.
4. Seller signs a ZB-1 NOIR_LOCK v3 and broadcasts a public lock anchor.
5. Lock becomes active only after chain confirmation.
6. While active:
   - seller cannot cancel that listing through V9;
   - seller cannot direct-transfer that NFT through V9;
   - other buyers do not receive a payment action.
7. Only the designated buyer sees Pay with Noir.
8. Buyer approves ONE Noir zcash_sendTransaction directly to the seller.
9. The amount is:
   listing price + a tiny lock-specific settlement tag (1–9,999 zatoshi).
   This produces a unique exact payment amount for the lock while still using
   only ONE recipient, which Noir supports today.
10. V9 records the returned TXID when available AND independently scans the
    seller transparent address for the exact lock-specific amount.
11. After the payment reaches 6 confirmations, ZB-1 ownership deterministically
    resolves to the designated buyer.
12. Seller has NO second approval step after payment.

WHY THE TINY SETTLEMENT TAG
Noir's current browser API supports a single destination per send and does not
expose PCZT signing. A lock-specific exact amount lets V9 identify the correct
payment without needing a second output, a memo to a transparent address, Zkool,
or manual TXID paste.

EXAMPLE
Listing price: 0.003 ZEC
Lock tag:      0.00001234 ZEC (example only)
Buyer sends:   0.00301234 ZEC to seller
The exact tag is different per lock and is shown before payment.

MARKETPLACE PROTOCOL FEE
V9 Noir-only mode sets marketplace protocol fee to 0%.
The previous 3% split cannot be enforced in the same one-recipient Noir payment
without multi-recipient / PCZT support. Do not fake the 3% with sequential sends.
Re-enable it only when the wallet layer can safely construct the required payment.

COUNTERPARTY SAFETY
- Buyer pays only AFTER seller lock is confirmed.
- Seller cannot choose a different buyer after the lock without waiting for expiry.
- A valid payment needs no seller approval to finalize ownership.
- Other bidders never send funds, so there are no loser refunds.
- Unpaid seller lock expires after 60 minutes.
- Payment is disabled during the final 5 minutes of the lock.
- Payment finality threshold: 6 confirmations.

IMPORTANT
ZB-1 ownership is application-layer state on Zcash, not a native Zcash smart
contract NFT. Every compatible ZB-1 validator/indexer should implement the same
NOIR_LOCK v3 and NOIR_SETTLED rules.

DEPLOY
Upload the entire ZIP to the www.zecblocks.xyz Vercel project.
