ZEC BLOCKS MAIN V8 — CHAIN-VERIFIED ATOMIC SETTLEMENT

WHAT V8 FIXES
V7 still relied on the buyer submitting a payment TXID after paying.
V8 removes that dependency. A valid payment is discovered directly from
Zcash transparent address history and finalizes ownership automatically.

PRODUCTION FLOW
1. Seller lists an owned ZEC BLOCK.
2. Buyer makes an offer.
3. Seller clicks Accept & Chain-Lock.
4. Seller signs a canonical ZB-1 ATOMIC_LOCK v2 message with the same derived
   Noir identity used by ZB-1 ownership.
5. V8 derives a unique transparent P2PKH lock-anchor address from the exact
   signed lock package.
6. Seller broadcasts 0.0001 ZEC to that anchor. The lock is NOT active until:
   - Noir signature recovers to the declared public key;
   - SHA256(pubkey) equals the current seller owner commitment;
   - the anchor address recomputes exactly;
   - the anchor output exists on Zcash;
   - the lock reaches 3 confirmations.
7. Buyer checkout opens only after that chain-verified lock.
8. Checkout generates one ZIP-321 request containing THREE transparent outputs:
   - exactly 97% of the accepted price -> seller payout address
   - exactly 3% -> protocol treasury
   - exactly 0.0001 ZEC -> a lock-specific deterministic settlement marker
9. Those three outputs MUST appear in the SAME Zcash transaction.
10. V8 watches the seller transparent address on Zcash automatically.
11. When a transaction matching all three outputs is found, V8 waits for
    10 confirmations before final ownership.
12. At finality, ZB-1 ownership resolves deterministically to the buyer commitment.
    Seller has no final approve/reject action.

WHY THE THIRD MARKER EXISTS
The lock-specific marker makes the payment transaction cryptographically tied to
one particular atomic lock instead of merely matching a common seller + price.
The marker amount is 0.0001 ZEC and is sent to a deterministic effectively
unspendable P2PKH commitment address. It is separate from the 3% protocol fee.

NO COUNTERPARTY "RUN AWAY" STEP
After a valid one-transaction payment reaches finality:
- seller cannot decide whether to transfer;
- buyer does not need to submit a TXID;
- relay availability does not determine payment validity;
- V8 derives settlement from Zcash chain data.

LOCK EXPIRY
- Lock window: 24 hours.
- Checkout is disabled during the final 60 minutes.
- If no valid payment confirms by expiry, ownership remains with seller.
- Direct transfer and listing cancellation are rejected by V8 while a valid lock is active.

WALLET LIMITATION
The currently published Noir Wallet dApp API supports one `to` destination per
zcash_sendTransaction call and does not expose PCZT signing. V8 therefore NEVER
simulates atomic settlement using multiple Noir sends.
The buyer needs a wallet that supports ZIP-321 multi-payment requests in ONE
Zcash transaction. If the wallet cannot create all three outputs in one TX,
DO NOT PAY.

IMPORTANT PROTOCOL NOTE
ZB-1 v2 atomic locking is an application-layer consensus rule. Every independent
ZB-1 validator/indexer must implement the same lock/settlement rules. The official
site enforces them now; update the public ZB-1 docs before calling third-party
implementations compatible.

SECURITY NOTE
No software can honestly be described as literally 100% bug-free. V8 is designed
to remove the seller-can-take-payment-and-refuse-transfer counterparty step.
Use small-value mainnet tests first, then audit the implementation before large trades.

Locked treasury:
t1b9PCdoCncgoc13CWwWz8tzZZLDYfMaTyz
Protocol marketplace fee: 3% / 300 bps.
