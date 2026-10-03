# ZEC BLOCKS — Robinhood collection

4,444 hosted SVG artworks for a new collection deployed through OpenSea Studio on Robinhood Chain. The geometry is adapted from the original ZEC BLOCKS renderer at production commit `a9437807f35bc6fc96db334b265bc63845c97a18`. The existing Zcash collection renderer and ownership system are unchanged.

## Deployment and reveal

- Base URI: `https://www.zecblocks.xyz/robinhood-blocks/metadata/`
- IDs: 1 through 4444, decimal, no leading zeros.
- JSON: `/robinhood-blocks/metadata/1` and `/robinhood-blocks/metadata/1.json`
- SVG: `/robinhood-blocks/images/1.svg`
- Explorer: `/robinhood-blocks/`
- Metadata CSV: `/robinhood-blocks/metadata.csv`
- Collection summary: `/robinhood-blocks/summary.json`

Deploy the NFT contract in OpenSea Studio, configure its supply and mint terms, then set this Base URI (including the final slash) before the mint opens. Check the actual contract's first token ID and `tokenURI` output. The contract address, mint price, wallet limits, and royalties are not configured by this metadata service. No mint or financial transaction is submitted by this change.

Final metadata exists before minting, with no unrevealed placeholder or server-side reveal switch. OpenSea still needs to index minted items. This collection uses hosted metadata; it must not be advertised as fully onchain artwork. No database is required: the frozen manifest and deterministic renderer serve the same output for each ID.

## Traits and rarity

Seven visual categories: Material (6), Background (8), Frame (8), Core (8), Pattern (5), Ornament (6), Aura (5). There are 46 trait values. Every category changes visible artwork, not just metadata labels. Every edition has a unique seven-trait combination and seeded pattern.

Score = sum of `4444 / observed trait count` for the seven visual traits. Rank ties use the artwork seed, then ranks are assigned 1–4444. Rarity tiers are derived after ranking and excluded from score computation:

| Tier | Count | Rank range |
| --- | ---: | --- |
| Legendary | 44 | 1–44 |
| Epic | 178 | 45–222 |
| Rare | 445 | 223–667 |
| Uncommon | 1,111 | 668–1778 |
| Common | 2,666 | 1779–4444 |

These are project rarity ranks, which may differ from OpenSea's methodology. Metadata includes the seven visual attributes and rarity tier; rank, score and SVG hash are in `properties`.

## Reproduction and verification

`manifest.json` freezes the token-to-artwork mapping. Do not regenerate or edit the renderer after tokens are minted without explicit owner direction. Retain backups before any future artwork change.

```sh
node collections/robinhood-blocks/generate.cjs --check
node collections/robinhood-blocks/generate.cjs --check --export /tmp/robinhood-blocks-export
node --test tests/robinhood-blocks.test.cjs
# Optional full raster validation, requiring sharp:
VERIFY_PIXELS=1 node --test tests/robinhood-blocks.test.cjs
```

The export command creates all 4,444 SVGs, 4,444 matching JSON records and a collection summary. The Vercel function serves identical SVG and JSON content from the committed manifest. Invalid IDs return 404. GET/HEAD, CORS, content types, ETags, caching, CSV coverage, actual trait counts, ranks, reproducibility and all 4,444 rasterized artwork hashes are verified before publication.
