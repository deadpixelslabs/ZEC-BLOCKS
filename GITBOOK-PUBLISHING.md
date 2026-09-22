# Publishing the public documentation

This change prepares the public Markdown source. It does **not** establish that `docs.zecblocks.xyz` has imported or published it.

## Connect the existing space

Use the GitBook organization and existing space that serve `docs.zecblocks.xyz`. Retain the existing domain and space identity.

1. Export or otherwise preserve the current space before its first import.
2. In the existing space's Git Sync settings, select GitHub repository `deadpixelslabs/ZEC-BLOCKS`, branch `main`.
3. For space-level sync with the repository root, use the committed `.gitbook.yaml`. It sets `root: ./docs/`, `README.md` as the first page and `SUMMARY.md` as navigation.
4. For the initial sync, import **GitHub into GitBook**. Review the imported change before publishing; an initial export in the opposite direction could replace the prepared source with the old GitBook content.
5. If the site already uses site-wide Git Sync, retain its existing space key and map that space to `./docs` through GitBook's existing configuration. Do not create a new key for an existing space. Do not apply the root `./docs/` prefix a second time inside an already mapped `docs` directory.
6. Check the preview and publish through the existing site's workflow.

Configuration references: [Git Sync](https://gitbook.com/docs/docs-as-code/git-sync) and [content configuration](https://gitbook.com/docs/docs-as-code/git-sync/content-configuration). GitBook requires an administrator or creator to configure Git Sync.

## Review before publication

- Confirm all navigation pages render and the existing `/mining`, `/claims`, `/ownership`, `/transfers`, `/marketplace`, `/fees`, `/license` and other established page URLs still resolve.
- Check the home page, code blocks, tables and the architecture diagram on desktop and mobile.
- Check GitHub source links, the contribution links and both application links.
- Confirm the published site remains publicly readable without a GitBook account or wallet connection.
- Confirm candidate verification is labelled inactive and that the licensing gap is visible.
- Confirm the new content on the **public domain**, not only in an editor or preview.

## Future edits

Once the existing space is connected, propose changes in a GitHub pull request against `docs/`. Follow the configured GitBook review/publish workflow after merge. A successful GitHub commit alone is not evidence of a successful GitBook publication.

No wallet, API secret, database credential or mainnet transaction is needed to publish these pages.
