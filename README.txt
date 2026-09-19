ZEC BLOCKS MAIN V9.1 — NOIR 2-STEP PROTOCOL FEE + ACTIVITY FIX

WHAT CHANGED
V9's seller-lock / buyer-payment flow was working, but marketplace protocol fee
was 0% and completed sales could fail to appear immediately in Activity.

V9.1 keeps the working lock model and adds the locked 3% marketplace fee.

NEW BUYER FLOW
1. Buyer makes an offer. No ZEC moves.
2. Seller accepts ONE buyer and chain-locks the NFT.
3. After the seller lock confirms, only the selected buyer can pay.
4. STEP 1 — buyer pays exactly 3% of the accepted price to:
   t1b9PCdoCncgoc13CWwWz8tzZZLDYfMaTyz
5. V9.1 verifies the protocol-fee transaction on Zcash.
6. After Step 1 gets 1 confirmation, STEP 2 unlocks.
7. STEP 2 — buyer pays the remaining 97% directly to the seller.
8. V9.1 verifies the seller-payment transaction.
9. When BOTH transactions reach 6 confirmations, ownership resolves
   automatically to the selected buyer. Seller has no second approval step.
10. The completed sale is inserted into Activity immediately and mirrored to
    the public discovery relays.

PRICE MATH
The 3% fee is calculated in integer zatoshi and rounded to the nearest zatoshi.
Seller receives the exact remainder, so:
  protocol fee + seller payout = accepted NFT price
The buyer also pays the normal Zcash network fee for each of the two transactions.

EXAMPLE — 0.003 ZEC NFT
  Step 1 protocol fee: 0.00009 ZEC
  Step 2 seller payout: 0.00291 ZEC
  Total NFT payment:    0.00300 ZEC
  Plus two normal Zcash network fees.

RECOVERY / DOUBLE-PAY PROTECTION
Each payment produces a signed ZB-1 payment notice bound to:
- lock ID
- token ID
- transaction ID
- exact amount
- selected buyer commitment

Once a Step 1 or Step 2 notice exists, the corresponding Pay button is disabled
so refreshes do not ask the buyer to pay the same step again.

FUNDED-LOCK GRACE
A buyer cannot start Step 1 in the final 15 minutes of the original lock.
Once the protocol-fee transaction confirms, the completion window extends by
1 hour so the buyer has time to finish Step 2. Once seller payment confirms,
the lock remains protected long enough to reach finality.

ACTIVITY FIX
Root cause in V9: chain-derived NOIR_SETTLED was saved to local storage but
renderActivity() only read the in-memory S.events list until a later relay refresh.
V9.1:
- injects newly derived settlements into runtime state immediately;
- merges S.verifiedAtomic into Activity rendering;
- shows the seller-payment TX as the sale TX;
- mirrors NOIR_SETTLED to relays.

BACKWARD COMPATIBILITY
Existing V9 lock v3 sales remain supported and can finish using the old
single-payment flow. New locks created by V9.1 are NOIR_LOCK v4 and require the
3% + 97% two-step settlement.

IMPORTANT
ZB-1 is application-layer state on Zcash, not a native Zcash smart contract.
Compatible ZB-1 clients/indexers need the same v4 lock and two-step settlement rules.

DEPLOY
Upload every file in this ZIP to the www.zecblocks.xyz Vercel project.
