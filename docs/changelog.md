# Documentation changes

## 22 September 2026 — Public documentation refresh

This entry describes the documentation source change. Publication to the GitBook domain is a separate step.

- Added public repository links, a source inventory, reproducible test commands and contribution routes.
- Replaced outdated pre-launch descriptions with a scoped implementation-status table.
- Corrected the wallet identity description to the current Noir derived Zcash signing integration.
- Explained Claims seen, confirmed claims, availability classifications and pending recovery separately.
- Documented current fee behavior: zero NFT/ZECS protocol mint price, native ZEC trading at 0%, and Base USDC trading at 3%, with applicable chain costs.
- Added practical receiving-address, transfer, checkout and ZECS guides.
- Described hosted indexers, database projections, off-chain evidence and the ZECS market verifier dependency.
- Labelled the public-evidence verifier inactive and documented its activation gates and replay limitations.
- Recorded source-completeness and licensing gaps instead of implying they are already resolved.

Reviewed source: marketplace [`95648a4`](https://github.com/deadpixelslabs/ZEC-BLOCKS/tree/95648a4d7948dfb8c2466ed941718f405827621c), mining [`c5fc203`](https://github.com/deadpixelslabs/test-zecblocks/tree/c5fc203dcf0557500f13530f49471788b1436a01).

For code history, see [marketplace commits](https://github.com/deadpixelslabs/ZEC-BLOCKS/commits/main/) and [mining commits](https://github.com/deadpixelslabs/test-zecblocks/commits/main/). For the mining incident, read the [dated investigation](https://github.com/deadpixelslabs/test-zecblocks/blob/c5fc203dcf0557500f13530f49471788b1436a01/docs/claim-verification-2026-09-22.md); its measurements describe that investigation, not continuously current totals.
