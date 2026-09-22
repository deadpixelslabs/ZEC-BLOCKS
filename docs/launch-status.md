# Implementation status

Checked against the [source revisions](README.md) on 22 September 2026. “Implemented” identifies code in the applications; it is not a guarantee that every external service is available at every moment.

| Component | Current scope |
| --- | --- |
| NFT mining and claims | Implemented in the mining application, with availability checks, reservations and pending-claim recovery |
| Claims seen / confirmed claims | Separate counters with different meanings; see [claims](claims.md) |
| ZECS minting | Holder-gated mint flow, 210 ZECS per valid event, with registration and recovery |
| ZEC marketplace | Direct seller payment with server verification and canonical ownership settlement |
| Base USDC marketplace | Contract payment plus indexed ownership settlement |
| NFT receiving by address | Opt-in, verified mainnet `t1` addresses; unsupported address types are rejected |
| Public source | Frontends, selected backend functions and migrations, NFT Base contract, tests and candidate verifier are published |
| Complete independent production replay | Not established; legacy data, settlement adapters and source/deployment completeness remain open |
| Public-evidence protocol candidate | **Not activated**; activation gates remain unmet |
| Independent security audit | No audit report is supplied by the reviewed repositories |

## Known limits are part of the status

The [claim investigation](https://github.com/deadpixelslabs/test-zecblocks/blob/c5fc203dcf0557500f13530f49471788b1436a01/docs/claim-verification-2026-09-22.md) records an availability pagination bug, repairs and unresolved historical evidence. A repaired finder does not make every historical claim valid. Disputed evidence requires review; it must not be resolved by silently inventing ownership or sending another transaction.

The repository does not yet include a complete reproducible snapshot of all production database definitions, every deployed worker or every historical event. [Licensing](license.md) also needs a project-level license file. These gaps must remain visible when describing openness.

Candidate activation is tracked in [`protocol/activation.json`](https://github.com/deadpixelslabs/ZEC-BLOCKS/blob/95648a4d7948dfb8c2466ed941718f405827621c/protocol/activation.json). Publishing documentation or merging a code change does not activate that candidate.
