# Wallet identity and recovery

The live applications ask Noir for `zcash_getPublicKey` with `signingMode: derived`. Existing ownership commitments are SHA256 of the exact returned SEC public-key bytes. This candidate preserves that rule. `wallet-identity.mjs` exports a public profile and checks that a restored wallet returns the same commitment; it never requests or stores the mnemonic, private key or viewing key.

## Recover an existing identity

1. Restore the wallet using that wallet's own recovery UI.
2. Select the same account and derived signing identity.
3. Compare its public profile with the saved profile using `check-identity` or the wallet adapter.
4. If it differs, stop the migration. Check wallet version, account and derivation settings; do not create a replacement owner record or retry a claim payment.
5. For a transaction already sent, recover the saved TXID and event. A receipt signature can be requested again without another payment.

Public profiles can link activity under that identity. Save/share them deliberately; they contain no spending credentials. A website should only collect the public result and explicit signatures, never the seed.

## Wallet conformance contract

A compatible wallet must publish the derivation algorithm, network/account parameters, exact public-key serialization, signature digest/format, and stable seed-restoration test vectors. Across restoration, account re-selection and generation of different receiving addresses, the same selected identity must produce the same profile. Sign/verify fixtures must pass before enabling transaction submission. Different accounts must remain separate.

The current repository does not contain Noir's seed-derivation implementation or a verified derivation path. Accordingly, this adapter is a reproducibility check, **not a claim of arbitrary cross-wallet mnemonic compatibility**. No new BIP32 path is invented to replace existing holders' keys. Completing this gate needs the wallet implementation/conformance vectors, not users' seeds.

Unified Addresses are receiving-address containers; their privacy design does not require publicly linking every address from one mnemonic. The project's owner identity is a separate, explicit signing identity. See [ZIP 316](https://zips.z.cash/zip-0316) and [BIP32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki) for the underlying address and deterministic-key concepts; neither specifies Noir's project-specific derivation.
