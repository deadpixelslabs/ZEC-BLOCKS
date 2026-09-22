# Contributing

Public review is welcome through [issues](https://github.com/deadpixelslabs/ZEC-BLOCKS/issues) and pull requests. Mining-specific reports belong in [test-zecblocks](https://github.com/deadpixelslabs/test-zecblocks/issues).

For a bug, include the affected page, approximate time, browser/wallet version, expected behavior, actual behavior and reproducible steps. Share a transaction ID only if you are comfortable making it public. Never include seeds, private keys, wallet backups, viewing keys, service credentials or a complete browser-storage dump.

For a possible vulnerability, avoid publishing exploit instructions or sensitive data in an ordinary issue. Use GitHub's private vulnerability reporting if the repository offers it. A dedicated security contact and response SLA have not been established in this documentation; do not assume one exists.

Before changing code, read `MARKETPLACE-OPERATIONS.md`, the applicable protocol source and `docs/architecture.md`. Keep a change focused and explain what evidence verifies it. Transaction changes should cover stale identities, repeated clicks, uncertain broadcasts, recovery and canonical ownership. Use isolated wallet/network fixtures; do not spend community funds for a test.

Documentation changes belong in `docs/`. Update `docs/SUMMARY.md` when adding a page, keep existing page filenames stable, and cite the code that supports technical claims. Describe candidates as candidates. Never add a fixed live count, guaranteed transaction time, unsupported audit claim or promise of complete server independence.

Run the relevant commands in [developer setup](docs/reference-implementation.md). Describe what you tested and what remains unverified in the pull request. The maintainers review and merge changes; a public issue or proposal does not activate new protocol rules.

Check [licensing status](docs/license.md) before submitting or reusing code. Preserve third-party notices and submit only material you have the right to contribute.
