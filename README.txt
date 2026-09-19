ZEC BLOCKS MAIN V9.9 — STALE PURCHASE REQUEST FIX

SYMPTOM
Many sellers saw a valid-looking purchase request and clicked:
  Accept <price> ZEC & Lock

but received:
  "Listing is no longer active."

ROOT CAUSE
The marketplace correctly treats the NEWEST valid listing for a Token ID as the
current listing.

However, the Seller Offers panel in V9.8 still displayed purchase requests that
were attached to OLDER listings for the same NFT.

Example:
1. Seller lists #123 -> Listing A.
2. Buyer requests purchase on Listing A.
3. Seller later creates/re-publishes #123 -> Listing B.
4. Marketplace correctly makes Listing B the current listing.
5. V9.8 Seller Offers still displayed the old request for Listing A.
6. Seller clicks Accept.
7. Lock validation sees Listing A is no longer current -> error.

This is why the button could be visible while Accept said the listing was inactive.

V9.9 FIX

1. CURRENT-LISTING-ONLY REQUESTS
Seller Offers only shows a request when:
- its listingId is exactly the current active listing;
- seller is still current owner;
- request price exactly equals the signed listing price;
- token is not already locked.

Old, cancelled, expired or superseded requests disappear automatically.

2. HARD ACCEPT CHECK
Accept & Lock resolves the current listing by Token ID and requires its listingId
to exactly equal the buyer's signed request.

If a listing changes during a race, the seller receives a precise message:
  "This purchase request belongs to an older listing.
   The buyer must click Request Purchase again on the current listing."

3. PREVENT DUPLICATE LISTINGS
A seller can no longer accidentally create a second active listing for the same
ZEC BLOCK.

If #123 is already listed, the website tells the seller:
  "Cancel the current listing before creating a new one."

To change price:
  Cancel Listing -> create a new listing -> buyer sends a new purchase request.

4. BUYER RACE PROTECTION
If the seller changes/cancels/re-lists while a buyer has the purchase dialog open,
the buyer cannot publish against the stale listing. They are told to use the
newest marketplace card.

5. FIXED PRICE RETAINED
Buyer still cannot choose or manipulate offer amount.
The lock price always comes from the seller's signed CURRENT listing.

RETAINED FROM V9.8 / V9.7
- fixed-price purchase requests
- payment recovery / no-double-pay protection
- seller locks first
- 3% protocol fee + 97% seller payout
- historical settlement recovery
- stable listing discovery
- Activity latest 30

DEPLOY
Upload every file in this ZIP to www.zecblocks.xyz.

After deployment, old stale purchase requests should disappear from Seller Offers.
Buyers whose requests belonged to an older listing simply need to click
"Request Purchase" once on the current marketplace listing.
