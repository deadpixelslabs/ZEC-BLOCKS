ZEC BLOCKS MAIN V9.3 — LIVE DISCOVERY + FINAL OWNERSHIP FIX

TWO PRODUCTION BUGS FIXED

1) PURCHASED NFT APPEARED, THEN DISAPPEARED
V9.2 could correctly derive a completed marketplace settlement and show the NFT
to the buyer. On the next atomic watcher pass, however, the watcher could prune
the old seller lock because currentOwner() had already changed to the buyer.
tokenState() still required that old lock to remain present in order to apply the
verified settlement. Result: the NFT appeared briefly, then ownership reverted to
the original claimant/seller in the UI.

V9.3 rule:
- S.verifiedAtomic contains only settlements derived after chain verification.
- A verified settlement is itself the permanent ZB-1 ownership transition.
- It no longer depends on the old lock remaining in confirmedLocks.
- Settled locks are also retained as historical verification evidence.
This means a completed sale cannot visually revert to the old seller merely
because the lock watcher ran again.

2) "CLAIMS SEEN" WAS FAR BEHIND
The main website fetched relays on load / manual actions, but its 20-second
background watcher only reconciled marketplace settlement. It did NOT fetch new
relay events. Therefore newly mined claims could remain invisible until a reload
or another action.

V9.3:
- refreshes discovery every 10 seconds while the page is open;
- listens to the same 6 public relay endpoints as the mining client;
- reads both ZB-1 kind 30078 and the miner's kind-1 fallback events;
- prevents overlapping relay scans;
- refreshes immediately when the browser tab becomes active again.

Expected behavior:
A successfully published mining claim should normally appear in "Claims Seen"
within roughly one discovery cycle, subject to relay/network availability.

2-STEP PAYMENT CONFIG HARDENING
V9.1/V9.2 referenced several two-step constants that were accidentally absent
from CFG. V9.3 explicitly defines:
- protocol-fee step confirmation: 1
- final settlement confirmation: 6
- original pay cutoff: 15 minutes before lock expiry
- funded completion grace: 1 hour
- post-payment finality grace: 2 hours

The existing marketplace split remains:
- 3% -> ZEC BLOCKS treasury
- 97% -> seller
- ownership moves only after both required transactions reach finality.

IMPORTANT
"Claims Seen" is a discovery count, not a claim of global shielded-chain
enumeration. Public relays are the fast discovery layer. Canonical ZB-1 validity
still depends on the Zcash transaction and protocol validation.

DEPLOY
Upload every file in this ZIP to the www.zecblocks.xyz Vercel project.
After deployment, reconnect the buyer wallet and use Recover & Sync Portfolio once.
