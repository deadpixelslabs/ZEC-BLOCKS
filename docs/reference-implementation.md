# Source code and developer setup

The public implementation is split between two repositories. Start from a named commit so that code, test results and documentation can be compared reproducibly.

| Repository | Role | Documentation baseline |
| --- | --- | --- |
| [deadpixelslabs/ZEC-BLOCKS](https://github.com/deadpixelslabs/ZEC-BLOCKS) | Marketplace, selected backend functions, NFT Base contract, candidate verification tools and these docs | [`95648a4`](https://github.com/deadpixelslabs/ZEC-BLOCKS/tree/95648a4d7948dfb8c2466ed941718f405827621c) |
| [deadpixelslabs/test-zecblocks](https://github.com/deadpixelslabs/test-zecblocks) | Mining, claim recovery, ZECS minting and selected verification functions | [`c5fc203`](https://github.com/deadpixelslabs/test-zecblocks/tree/c5fc203dcf0557500f13530f49471788b1436a01) |

The mining repository's name is historical; it serves the mining application. Read [licensing status](license.md) before copying or redistributing code.

## Source map

| Area | Public files |
| --- | --- |
| Marketplace interface and transaction orchestration | [`index.html`, `script.js`, `market-runtime.js`, `navigation.js`, `styles.css`](https://github.com/deadpixelslabs/ZEC-BLOCKS/tree/95648a4d7948dfb8c2466ed941718f405827621c) |
| NFT address proof verification | [`address-identity.js`](https://github.com/deadpixelslabs/ZEC-BLOCKS/blob/95648a4d7948dfb8c2466ed941718f405827621c/address-identity.js) |
| Marketplace API proxies | [`api/`](https://github.com/deadpixelslabs/ZEC-BLOCKS/tree/95648a4d7948dfb8c2466ed941718f405827621c/api) |
| Published market Edge Functions and migrations | [`supabase/`](https://github.com/deadpixelslabs/ZEC-BLOCKS/tree/95648a4d7948dfb8c2466ed941718f405827621c/supabase) |
| NFT Base USDC contract and ABI | [`contract/`](https://github.com/deadpixelslabs/ZEC-BLOCKS/tree/95648a4d7948dfb8c2466ed941718f405827621c/contract) |
| Candidate verifier, specification and renderer | [`protocol/`](https://github.com/deadpixelslabs/ZEC-BLOCKS/tree/95648a4d7948dfb8c2466ed941718f405827621c/protocol) |
| Mining UI, CPU/GPU proof search and mint flows | [`index.html`](https://github.com/deadpixelslabs/test-zecblocks/blob/c5fc203dcf0557500f13530f49471788b1436a01/index.html) |
| Mining proxies | [`api/`](https://github.com/deadpixelslabs/test-zecblocks/tree/c5fc203dcf0557500f13530f49471788b1436a01/api) |
| Claim checks, scan, audit and ZECS mint verification | [`supabase/functions/`](https://github.com/deadpixelslabs/test-zecblocks/tree/c5fc203dcf0557500f13530f49471788b1436a01/supabase/functions) |
| Mining history classification and guards | [`supabase/migrations/`](https://github.com/deadpixelslabs/test-zecblocks/tree/c5fc203dcf0557500f13530f49471788b1436a01/supabase/migrations) |

## Run checks locally

Use Node.js 22 or newer. For the reviewed marketplace code:

```sh
git clone https://github.com/deadpixelslabs/ZEC-BLOCKS.git
cd ZEC-BLOCKS
git checkout 95648a4d7948dfb8c2466ed941718f405827621c
node --test tests/runtime.test.cjs tests/address-identity.test.cjs
node --test protocol/tests/*.test.mjs
npm install --no-save --package-lock=false playwright@1.55.1
npx playwright install --with-deps chromium
node --test tests/marketplace.test.cjs
```

In a separate directory, for mining:

```sh
git clone https://github.com/deadpixelslabs/test-zecblocks.git
cd test-zecblocks
git checkout c5fc203dcf0557500f13530f49471788b1436a01
npm install --no-save --package-lock=false playwright@1.55.1
npx playwright install --with-deps chromium
node _syntax_check.js
node --test tests/mining.test.cjs
node tests/claim-chain-cache.cjs
```

The browser suites use simulated wallets and services. They do not spend real ZEC, establish external-service uptime, verify hardware GPU performance or prove a real mainnet purchase. The candidate verifier tests do not activate candidate rules.

## Local development and deployment limits

The frontends are static assets with Vercel Node API handlers and rewrite configuration. A plain file server can display assets but does not implement the API routes. Review each repository's `vercel.json`, proxy configuration and backend requirements before using a development server. Defaults can point to production services; use isolated backends and wallet fixtures for mutation testing.

The committed migrations are incremental changes, not a complete schema bootstrap. Some production workers named in deployment notes are absent from these source trees. The reviewed `contract/` directory publishes the NFT Base contract, not the ZECS market contract source. The repos also do not supply a complete historical event archive or independently verified production bytecode matching record.

Consequently, a clone is sufficient for source review and the listed isolated checks, but not a documented one-command recreation of all production services. Do not invent missing schema, bypass signature checks or reuse privileged production credentials to make a fork appear operational.

See [architecture](architecture.md), [contributing](contributing.md), [open gaps](roadmap.md) and [candidate verification](state-reconstruction.md).
