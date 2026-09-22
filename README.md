# ZEC BLOCKS

ZEC BLOCKS is a 5,000-item collectible application on Zcash. ZB-1 defines its NFT events; ZB-20 defines the ZECS token layer. The applications use wallet signatures, chain transactions and hosted verification services. Zcash consensus does not implement these NFT or token rules.

- [Public documentation source](docs/README.md)
- [Marketplace](https://www.zecblocks.xyz/)
- [Mining and ZECS minting](https://mine.zecblocks.xyz/)
- [GitBook](https://docs.zecblocks.xyz/)
- [Mining application source](https://github.com/deadpixelslabs/test-zecblocks)

Start with [implementation status](docs/launch-status.md), [architecture and trust boundaries](docs/architecture.md), and the [code examples](docs/reference-implementation.md). The separate `protocol/` public-evidence tools are **not activated on mainnet**. They do not replace existing production ownership.

## Development

Use Node.js 22 or newer. These checks do not send transactions:

```sh
node --test tests/runtime.test.cjs tests/address-identity.test.cjs
node --test protocol/tests/*.test.mjs
node protocol/cli.mjs manifest
```

See [MARKETPLACE-OPERATIONS.md](MARKETPLACE-OPERATIONS.md) for browser tests and operational behavior. The public [code examples](docs/reference-implementation.md) explain selected logic without exposing repository links in GitBook. See [contributing](CONTRIBUTING.md) before proposing protocol or settlement changes.

## Documentation changes

The GitBook-ready pages live in `docs/`, with navigation in `docs/SUMMARY.md`. The `.gitbook.yaml` file maps that content for a space-level Git Sync connection. Adding these files does not itself connect or publish the existing GitBook; see [publishing instructions](GITBOOK-PUBLISHING.md).

`README.txt`, release-labelled text files and deployment notes contain historical operational information. Use the dated documentation and the referenced source commits to distinguish current behavior from older releases.

## Licensing

The reviewed repository does not contain a project-level `LICENSE`. Read the [licensing status](docs/license.md) before reuse. Bundled third-party code retains its own license notices.
