ZEC BLOCKS MAIN V7 — ATOMIC SETTLEMENT EXTENSION

PURPOSE
V7 removes the unsafe buyer-pays-then-seller-transfers flow.

ATOMIC FLOW
1. Seller lists a ZEC BLOCK.
2. Buyer publishes an offer.
3. Seller clicks "Accept & Atomic Lock".
4. Noir Wallet broadcasts an on-chain ZB-1 ATOMIC_LOCK memo to the protocol mailbox.
5. Buyer checkout remains disabled until the lock transaction is confirmed.
6. The confirmed lock binds:
   - Token ID
   - seller owner commitment
   - designated buyer owner commitment
   - exact price
   - seller transparent payout address
   - expiry
7. Buyer executes ONE multi-recipient Zcash transaction:
   - 97% output -> seller transparent payout address
   - 3% output -> ZEC BLOCKS treasury
8. Buyer pastes the ONE transaction TXID.
9. The website verifies both exact outputs are present in that same confirmed transaction.
10. If valid and within the lock window, ZB-1 Atomic Marketplace Extension resolves ownership to the designated buyer.
11. No final seller approval exists after payment.

WHY NOIR CANNOT EXECUTE THE PAYMENT YET
The currently published Noir Wallet browser adapter exposes zcash_sendTransaction with a single
`to` destination. It also explicitly does not expose PCZT signing. Therefore V7 does NOT fake
atomicity by firing two Noir transactions. Buyer checkout generates a ZIP-321 multi-payment request
instead. It must be executed by a wallet capable of creating both outputs in ONE Zcash transaction.

SECURITY RULE
DO NOT manually send 97% and 3% as two separate transactions.
Those transactions will NOT pass V7 atomic verification.

FEE
- 300 bps / 3%
- Seller output: 97% of accepted price (integer zatoshi rounding)
- Treasury output: 3% of accepted price
- Treasury: t1b9PCdoCncgoc13CWwWz8tzZZLDYfMaTyz

LOCK
- Default lock window: 24 hours
- Atomic payment button is disabled during the final 60 minutes to reduce expiry-edge risk.
- A confirmed lock prevents normal listing cancellation / manual Transfer through this V7 client.
- Expired unpaid locks resolve back to the seller in the client state machine.

IMPORTANT
This is a ZB-1 marketplace protocol extension. Every independent validator/indexer that wants to
reconstruct Atomic Marketplace ownership must implement the same ATOMIC_LOCK / ATOMIC_SETTLED
state rules. Relay events are discovery/cache; lock and payment confirmations are checked against
Zcash chain data.

Deploy the entire ZIP to the MAIN www.zecblocks.xyz Vercel project.

DEPLOYMENT NOTE
- Noir Wallet remains the identity/signature wallet and can create the on-chain ATOMIC_LOCK.
- The buyer settlement itself requires a wallet capable of ONE multi-recipient Zcash transaction.
- The generated request follows ZIP-321 multi-payment syntax.
- V7 deliberately refuses to simulate atomic settlement with two separate Noir sends.
