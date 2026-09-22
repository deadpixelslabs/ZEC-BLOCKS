# Mine an NFT

Open [ZEC BLOCKS Mining](https://mine.zecblocks.xyz/#mining) and connect Noir Wallet.

1. Choose **Find Unclaimed NFT**, **Surprise me**, or an item from the available NFT browser. Availability is checked before a target is accepted.
2. Select **Start Mining**. Your browser searches for a proof using the selected CPU/GPU engine.
3. When the proof is ready, select **Claim NFT**. Review the wallet prompts, recipient and network cost before approving.
4. Keep the transaction record while confirmation and protocol verification finish. Check Portfolio for the resulting owner.

There is currently no NFT protocol mint fee in the mining configuration. A Zcash transaction still has a network cost and a small protocol anchor output; see [fees](fees.md).

## What happens during proof search

The proof binds the collection Genesis, NFT ID, source block, owner commitment and nonce. A valid hash has 26 leading zero bits. Search time varies with hardware and chance; the progress display is not a promise of a finishing time.

The application checks availability and a reservation before mining and again before claim submission. A reservation reduces conflicting attempts but is not on-chain ownership or a guarantee of a successful claim. Other claim evidence or a changed chain/indexer state can prevent submission or final acceptance.

**CLAIMED** IDs are unavailable. **CLEAR** means the current verifier considers an ID eligible for selection. **VERIFYING** and **UNSCANNED** IDs must not be treated as free. Source checks and history guards are described in [validation](validation-security.md).

## If a claim is pending

Use **Continue Pending Claim** with the original wallet. It checks existing records; it does not send another payment. A missing transaction ID or temporary provider error is not proof that a transaction failed. Other eligible NFT IDs can remain available while that specific ID is protected against duplicate submission.

Do not repeatedly claim the same NFT to make a counter rise. Read [claims, counters and recovery](claims.md) first.
