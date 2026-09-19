ZEC BLOCKS MAIN V9.6 — HISTORICAL SETTLEMENT RECOVERY

BUG FIXED
A purchased NFT could be correct immediately after the sale, but disappear again
after reload/update. Total Volume and Sales could also fall back to 0.

ROOT CAUSE
S.verifiedAtomic is intentionally the only marketplace state trusted for:
- final buyer ownership
- Total Volume
- Sales

That map is in-memory. After a browser reload it starts empty.

The old reconciliation path could rebuild a settlement only from an ACTIVE seller
lock. Once an already-completed sale's lock had expired, the client skipped it.
Therefore:
- the historical NOIR_SETTLED event was still discoverable;
- the old lock and payment transaction were still on Zcash;
- but the client never promoted that historical sale back into S.verifiedAtomic.

Result: buyer ownership vanished and volume returned to 0 after reload.

V9.6 SOLUTION
V9.6 performs HISTORICAL SETTLEMENT RE-VERIFICATION before active-lock pruning.

For every historical settlement hint:
1. Find the original seller lock.
2. Re-verify the seller's compact signature.
3. Recompute and verify the deterministic lock-anchor address.
4. Verify the lock-anchor transaction on Zcash.
5. Verify token / buyer / seller exactly match the signed lock.
6. For V9.1+ two-step sales:
   - verify exact 3% treasury transaction;
   - verify exact 97% seller transaction;
   - verify transaction order;
   - require final confirmation threshold.
7. For legacy V9 sales:
   - verify the exact seller-payment transaction;
   - require final confirmation threshold.
8. Only then restore the settlement to S.verifiedAtomic.

RAW RELAY SETTLEMENTS ARE STILL NOT TRUSTED
NOIR_SETTLED from a relay is used only as a TXID / lock-ID discovery hint.
It does not become ownership by itself.

DURABLE VERIFIED JOURNAL
When this client successfully chain-verifies a settlement it writes a separate
local journal. On reload the journal is only a discovery hint and is independently
re-verified against Zcash before ownership / volume is restored.

EXPECTED RESULT FOR THE EXISTING #55 TEST SALE
After deploy:
- connect the buyer Noir wallet;
- click Recover & Sync Portfolio once;
- V9.6 finds the old sale hint + seller lock;
- independently verifies its Zcash payment;
- restores #55 to the buyer;
- restores Sales = 1 and Total Volume = 0.003 ZEC.

The NFT must remain with the buyer even though the original sale lock expired.

RETAINED FROM V9.5
- stable marketplace listing history across incremental refreshes;
- live listing discovery;
- Activity latest 30 only;
- Activity reliability refresh every 20 seconds;
- 3% protocol fee / 97% seller two-step settlement.

DEPLOY
Upload every file in this ZIP to the www.zecblocks.xyz Vercel project.
