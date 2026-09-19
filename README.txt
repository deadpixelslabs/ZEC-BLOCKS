ZEC BLOCKS MAIN V6 — LIVE SELLER-APPROVED MARKETPLACE SETTLEMENT

WHAT IS LIVE
1. Seller lists a ZEC BLOCK.
2. Buyer makes a signed offer.
3. Seller Inbox shows Accept Offer / Reject.
4. Seller accepts one offer and publishes a shielded payment address.
5. Buyer sees the accepted trade in My Purchases and pays the exact offer price.
6. Buyer payment carries a private ZB1PAY memo to the seller.
7. Seller clicks Verify Payment & Complete Sale.
8. The site verifies the exact incoming TXID + amount + memo in the connected seller Noir Wallet
   and requires Zcash confirmation.
9. Seller pays the 3% marketplace fee to the locked treasury address.
10. Seller approves the ZB-1 NFT transfer to the buyer.
11. A SALE_SETTLED event is published. Sales/volume only count after the transfer TX confirms.

MARKETPLACE FEE
- 3% (300 bps)
- Treasury: t1b9PCdoCncgoc13CWwWz8tzZZLDYfMaTyz
- Buyer pays the agreed price to seller.
- Seller pays the 3% fee from received proceeds before NFT transfer.
- Seller net is therefore approximately 97% before normal Zcash network fees.

IMPORTANT NON-ATOMIC LIMITATION
Noir Wallet's current dApp API sends to one destination per transaction and does not expose PCZT
signing to dApps. Therefore buyer ZEC payment + marketplace fee + NFT transfer cannot be one
atomic transaction from this browser app. This V6 is non-custodial and seller-approved, not escrow:
a malicious seller could receive buyer payment and refuse to complete the transfer. The UI makes
that limitation explicit and verifies seller-side receipt before enabling the normal finalization flow.

COMPATIBILITY
- Existing V5 listings and offers remain readable.
- Seller acceptance adds the payment address only when an offer is accepted.
- Existing ZB-1 CLAIM / TRANSFER rules, Genesis, supply and 26-bit mining are unchanged.
- Public relays remain discovery/cache; Zcash remains the ownership anchor.
- api/zcash.js and vercel.json are included. Deploy the entire ZIP to www.zecblocks.xyz.

SAFETY LOCKS ADDED
- Accepted listings cannot be cancelled through the normal UI.
- NFTs in an accepted trade cannot be manually transferred through the generic Transfer button.
- The settlement authorization is signed before the irreversible NFT transfer is broadcast.
- SALE_SETTLED uses its own event ID instead of reusing the TRANSFER TXID, preventing relay/local de-dup collisions.
