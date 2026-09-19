ZEC BLOCKS MAIN V9.2 — PORTFOLIO OWNERSHIP RECOVERY FIX

BUG FIXED
A ZEC BLOCK purchased through the working V9 marketplace could show SALE FINAL in
Buyer Atomic Checkout, yet disappear from the buyer Portfolio after an update /
refresh. The old seller could also see the original claimed NFT again.

ROOT CAUSE
The old portfolio renderer was claim-centric:
- it only iterated CLAIM records when deciding what NFTs to display;
- the buyer does not have the seller's old shielded CLAIM memo in Noir history;
- if public relay discovery did not return that historical CLAIM on a refresh,
  the buyer had a verified settlement but no CLAIM row to render;
- the seller's wallet-history fallback could still render its old CLAIM without
  considering that a later verified marketplace settlement changed ownership.

V9.2 FIX
1. Ownership reconstruction now uses:
   - discovered CLAIM,
   - validated connected-wallet CLAIM history,
   - chain-verified marketplace settlements as ownership checkpoints.
2. Portfolio token IDs are the union of claims, wallet-history claims, and
   verified settlements.
3. The old seller is shown the NFT only when currentOwner(tokenId) still resolves
   to that seller. An old claim alone is no longer enough.
4. A buyer with a verified settlement can display/list/transfer the purchased NFT
   even if the original seller's historical CLAIM is temporarily missing from
   relay discovery.
5. If source artwork metadata is missing on the buyer side, V9.2 reconstructs the
   source height from Genesis - Token ID and fetches the exact source block hash.
6. New V9.2 seller locks carry sourceHeight/sourceHash/claimTxid provenance hints,
   and finalized settlement events carry them forward for future recovery.
7. V9.1 two-step payment remains unchanged:
   - 3% treasury
   - 97% seller
   - both final before ownership moves
8. V9.1 Activity fix remains included.

IMPORTANT
The ownership checkpoint used here is S.verifiedAtomic: it is created only after
the official client verifies the chain-anchored seller lock and the required
payment transaction(s). Raw relay NOIR_SETTLED events are not blindly inserted
into S.verifiedAtomic.

LEGACY V9 SALE RECOVERY
Completed V9 single-payment sales remain supported. This specifically covers
already-completed purchases such as a token that showed SALE FINAL but vanished
from the buyer's Portfolio after upgrading to V9.1.

DEPLOY
Upload every file in this ZIP to the www.zecblocks.xyz Vercel project.
Then reconnect the buyer Noir Wallet and click Recover & Sync Portfolio once.
