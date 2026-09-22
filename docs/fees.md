# Fees

The following describes the reviewed application configuration on 22 September 2026. Always inspect the actual wallet transaction before approving.

| Action | Protocol charge | Other costs |
| --- | --- | --- |
| NFT claim through the current mining flow | 0 ZEC | Zcash network fee and the protocol anchor output |
| ZECS mint | 0 ZEC | Zcash network fee and the protocol anchor output |
| NFT transfer | No percentage trading fee | Zcash network fee and the mailbox anchor output |
| Native ZEC marketplace purchase | 0% | Item price and Zcash network fee |
| Base USDC marketplace purchase | 3% of sale price to protocol; 97% to seller | Base gas for required transactions |
| Enable NFT address receiving | No payment | Two wallet message signatures |
| Check or recover a pending broadcast | No new payment from the recovery check | An already submitted transaction can still have incurred its original cost |

An anchor of **one zatoshi is 0.00000001 ZEC**. It is distinct from the network fee. “Free mint” means no protocol mint price, not a zero-cost Zcash transaction.

Older pages described a first-500-free schedule followed by a 0.0013 ZEC claim fee. The current mining source has `claimProtocolFeeEnabled=false`; do not present that older schedule or a fixed number of remaining free NFTs as current policy. Unused legacy constants and older release notes are not sufficient evidence of an active charge.

Similarly, the old statement that every marketplace trade has a 3% fee is too broad: the active native ZEC path uses 0%, while Base USDC uses 3%.
