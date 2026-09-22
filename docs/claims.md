# Claims, counters and recovery

**Claims seen is not the number of successful claims.** It counts distinct NFT IDs encountered in claim history, including invalid and unconfirmed attempts. Repeating an ID already in that history does not increase this counter.

| Display | Meaning |
| --- | --- |
| Claims seen | Distinct NFT IDs observed in claim history |
| Confirmed claims / CLAIMED | NFT IDs accepted by the current canonical claim verification |
| CLEAR / verified available | IDs currently eligible under availability checks and history guards |
| VERIFYING | Evidence is unresolved or needs further verification |
| UNSCANNED | Availability has not yet been established by the current classification |
| Scan progress | Progress through a scanner pass, not collection ownership or sale progress |

The mining client refreshes statistics every 15 seconds while active and when the tab becomes visible. Backend jobs and provider latency can delay an update. A new scan pass can start at 0% without resetting claim totals. Counts should be read with their labels and timestamps; snapshots from different requests can temporarily differ.

## A claim has several stages

**Proof ready** means browser work succeeded. **Broadcast** means a transaction ID was returned or recovered. **Confirmed transaction** means it was mined. **Accepted claim** additionally requires valid protocol evidence and canonical selection. **Ownership** also considers later transfers and marketplace settlements.

These stages must not be collapsed into “success.” A valid Zcash payment alone does not prove a valid NFT claim. A canonical claim for an ID does not prove that the currently connected wallet owns it.

## Continue Pending Claim

The recovery panel checks saved claims individually. It can register a saved broadcast for auditing, recheck confirmation, or search wallet history for the exact missing transaction. Its checks never send another wallet payment.

| Result | What to do |
| --- | --- |
| Confirmed for the saved transaction | Check Portfolio for current ownership; do not pay again |
| A different transaction won the canonical claim | Review the transaction evidence; the local attempt is not the winner |
| Waiting for verification / provider unavailable | Keep the pending record and retry the check later |
| No matching TXID | Check Noir transaction history with the original account; retain the saved proof |
| Historical evidence conflicts | Keep the evidence for review; do not assume the UI can safely reassign ownership |

Do not clear browser storage while a transaction is unresolved. That removes local recovery metadata and duplicate-submission protection. Never send wallet seeds or private keys to support.

## Why a successful claim may leave Claims seen unchanged

An older invalid attempt can already have put an NFT ID into Claims seen. A later valid claim can increase Confirmed claims without adding a new historical ID. This occurred for IDs 1131 and 1285 in the investigation of 22 September 2026, summarized in [validation](validation-security.md).

That investigation also found genuinely incorrect availability caused by truncated historical queries. The repair uses complete history classification and additional ownership guards. It does not justify treating all failed or unresolved attempts as successful claims.
