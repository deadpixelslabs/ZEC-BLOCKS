# Genesis

The configured ZEC BLOCKS collection identifier is the Genesis transaction:

```text
ecf6fc3a79885f573d79de70a2de85c34667fc1a4fefe034d3a4015269379f0f
```

The published reference manifest records Zcash mainnet height **3,488,573**. Applications and independent verifiers must check the actual transaction and canonical chain rather than treating a displayed height as proof.

The collection contains NFT IDs `1` through `5000`. The source-height rule is:

```text
source_height = genesis_confirmation_height - token_id
```

The source block hash at that height participates in mining and rendering. A different Genesis identifies a different collection; a recipient link or protocol event for another collection must not be accepted as this one.

Genesis identifies the collection. It does not imply that Zcash consensus enforces the collection rules, that all historical event data is public, or that a new protocol proposal has been activated.
