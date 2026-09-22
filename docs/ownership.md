# Ownership and wallet identity

The current Noir integration requests a **derived Zcash signing identity**. The owner commitment is:

```text
SHA256(exact public-key bytes returned for the derived identity)
```

It is a 32-byte value, usually shown as 64 hexadecimal characters. This is an identifier, not a spending address and not proof that a caller controls the wallet. Signed messages establish control for the relevant operation.

The implementation uses Noir's Zcash/secp256k1 message-signing interface. Earlier documentation describing Ed25519 ownership does not describe the current implementation. Preserve exact public-key serialization: changing its byte encoding changes its SHA-256 commitment.

## Which wallet owns an NFT?

The current application projects ownership from accepted claims, transfers and finalized marketplace settlements. A claim establishes the initial owner; it does not override every later sale. Portfolio should be checked using the same Noir account and derived identity that participated in the operation.

A wallet's Zcash receiving address, its NFT owner commitment and a connected Base account serve different purposes. The application links them only through the specific signed proofs required by the relevant flow. It must not invent an NFT identity by hashing a payment address.

## Recovery and privacy

Restore wallets only through their own recovery interface. The website never needs the mnemonic, spending private key or viewing key. Check that the restored account returns the same derived public identity before assuming it controls an existing holding.

The repository's public-profile tool can compare returned identities. It does not establish arbitrary cross-wallet seed compatibility. Generating different shielded `u1` addresses does not require those addresses to be publicly linkable.

Opting into [address receiving](transfers.md) deliberately publishes a binding between a transparent address and the NFT identity. Receiving links remain an alternative to that address binding, but the identity and related public protocol activity can still be linkable.

Sources: [wallet integration](https://github.com/deadpixelslabs/ZEC-BLOCKS/blob/95648a4d7948dfb8c2466ed941718f405827621c/script.js), [identity contract and limits](https://github.com/deadpixelslabs/ZEC-BLOCKS/blob/95648a4d7948dfb8c2466ed941718f405827621c/protocol/IDENTITY.md), [Noir provider documentation](https://docs.zknoir.com/developers/provider-api/).
