ZEC BLOCKS MAIN V9.8 — FIXED-PRICE PURCHASE REQUESTS

PROBLEM FIXED
A buyer could manually enter an arbitrary offer price, including an absurdly high
price. A seller might accept it expecting that amount, chain-lock the NFT, and
then the buyer simply never pays. The NFT stays unavailable until lock expiry.

V9.8 REMOVES BUYER-CONTROLLED OFFER PRICES.

NEW RULE
A purchase request MUST equal the seller's signed listing price exactly.

EXAMPLE
Seller lists ZEC BLOCK #123 at 0.003 ZEC.
Buyer can only request purchase at 0.003 ZEC.
The buyer cannot submit 1 ZEC, 100 ZEC, 0.001 ZEC, etc.

PROTECTION EXISTS AT MULTIPLE LEVELS
1. Offer modal price field is disabled.
2. Browser ignores the price field entirely and copies price from the SALE event.
3. New purchase request is signed as ZB1:OFFER:v2.
4. Seller dashboard filters out any request whose amount differs from listing.
5. Existing manipulated / legacy wrong-price offers are not actionable.
6. Accept & Lock performs the exact-price check again.
7. Lock economics are derived from the SELLER'S SIGNED LISTING, never the buyer's
   offer event.

Therefore modifying HTML/devtools or publishing a custom relay OFFER with a fake
price cannot make the official V9.8 seller client lock at that fake amount.

ANTI-SPAM
For each listing + buyer, only the newest valid purchase request is shown to the
seller. Repeated requests from the same buyer do not fill the Seller Offers panel.

SELLER UX
The seller sees:
- FIXED PRICE REQUEST
- exact listing price
- selected buyer
- 3% protocol / 97% seller
- unpaid lock window (60 minutes)

The Accept button includes the exact fixed price.

IMPORTANT
Accepting a purchase request still means:
NFT LOCK FIRST -> BUYER PAYMENT SECOND.

A fixed-price buyer can still choose not to pay after the seller accepts. The
unpaid lock therefore expires after the existing 60-minute lock window. V9.8
prevents price-bait griefing, but it does not pretend that an unpaid buyer request
is funded.

RETAINED FROM V9.7
- payment recovery / no-double-pay protection
- 3% protocol fee + 97% seller payout
- seller lock before payment
- historical settlement recovery
- stable listing discovery
- latest 30 Activity

DEPLOY
Upload every file in this ZIP to www.zecblocks.xyz.
Old wrong-price offers will automatically disappear from the actionable Seller
Offers panel after deployment.
