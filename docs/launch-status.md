# Implementation status

Checked against the implementation described in this documentation on 22 September 2026. “Implemented” identifies code in the applications; it is not a guarantee that every external service is available at every moment.

| Component | Current scope |
| --- | --- |
| NFT mining and claims | Implemented in the mining application, with availability checks, reservations and pending-claim recovery |
| Claims seen / confirmed claims | Separate counters with different meanings; see [claims](claims.md) |
| ZECS minting | Holder-gated mint flow, 210 ZECS per valid event, with registration and recovery |
| ZEC marketplace | Direct seller payment with server verification and canonical ownership settlement |
| Base USDC marketplace | Contract payment plus indexed ownership settlement |
| NFT receiving by address | Opt-in, verified mainnet `t1` addresses; unsupported address types are rejected |
| Technical documentation | Architecture, protocol rules and selected code examples are available in this documentation |
| Complete independent production replay | Not established; legacy data, settlement adapters and source/deployment completeness remain open |
| Public-evidence protocol candidate | **Not activated**; activation gates remain unmet |
| Independent security audit | No independent audit report is supplied with this documentation |

## Known limits are part of the status

The [claim investigation](validation-security.md) records an availability pagination bug, repairs and unresolved historical evidence. A repaired finder does not make every historical claim valid. Disputed evidence requires review; it must not be resolved by silently inventing ownership or sending another transaction.

A complete independently reproducible package of all production database definitions, deployed workers and historical events is not provided here. [Licensing](license.md) also needs a project-level license file. These gaps must remain visible when describing openness.

Candidate activation requirements are recorded in the [roadmap](roadmap.md). Publishing documentation or changing code does not activate that candidate.
