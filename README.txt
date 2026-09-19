ZEC BLOCKS MAIN V9.7 — PAYMENT RECOVERY / DOUBLE-PAY FIX

BUG OBSERVED
Buyer had already paid Step 2 (97% seller payout), but the UI still showed:
  "2. Pay Seller"

STEP 1 was already confirmed.

ROOT CAUSE
In V9.1-V9.6 the sequence was:

  send ZEC -> get TXID -> ask Noir to sign payment notice -> save event

If Noir became slow or errored AFTER the ZEC transaction was already broadcast,
the post-payment sign/save step could fail.

The money was already sent, but the website had no NOIR_SELLER_PAYMENT event.
Therefore Pay Seller remained enabled and clicking it again could double-pay.

V9.7 CHANGES

1. PRE-AUTHORIZATION BEFORE PAYMENT
Before Step 1 or Step 2 sends any ZEC, Noir signs an authorization bound to:
- lock ID
- token ID
- exact amount
- exact destination
- selected buyer commitment

Then the transaction is sent.

2. SAVE TXID IMMEDIATELY
The very first operation after Noir returns a payment TXID is:
- save event locally
- save durable payment recovery journal

No later relay/signing failure can make the website forget that payment.

3. BACKWARD COMPATIBILITY
V9.7 verifies:
- old V2 payment notices that signed the TXID after sending
- new V3 pre-authorized payment notices

4. RECOVER AN ALREADY-SENT STEP 2
For the current old V9.6-style failure:
- Click "Check Payments", NOT "Pay Seller".
- V9.7 scans the seller transparent address.
- It verifies an exact 97% payment on Zcash after the lock-specific Step 1 fee.
- It checks the payment maps unambiguously to exactly one unresolved lock.
- Connected buyer signs a non-spending V3 repair authorization.
- The recovered payment notice is saved + mirrored to relays.
- Normal confirmation/finality handling continues.

A payment TX cannot be reused by an already settled sale.

5. NO DOUBLE PAY
The checkout now explicitly warns:
If you already approved Step 2 in Noir, DO NOT click Pay Seller again.
Use Check Payments.

SECURITY NOTE
The fallback chain recovery only auto-binds a seller payment when it maps
unambiguously to one unresolved lock for that seller/amount and the connected
Noir identity is the designated buyer. If ambiguous, it does not guess.

RETAINED
- seller locks NFT before buyer payment
- Step 1 = 3% protocol fee
- Step 2 = 97% seller payout
- 6-confirmation final settlement
- historical settlement recovery
- stable listings
- latest 30 Activity

DEPLOY
Upload every file in this ZIP to www.zecblocks.xyz.

FOR THE CURRENT #22 TEST
After deploying V9.7:
1. Connect the SAME buyer Noir Wallet.
2. Do NOT click Pay Seller again.
3. Click Check Payments.
4. V9.7 will attempt to recover the already-sent seller payment from Zcash.
