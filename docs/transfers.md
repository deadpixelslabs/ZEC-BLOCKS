# Transfer and receive NFTs

The sender selects an NFT, enters a supported destination and approves the transfer in Noir. The recipient does not need to give the sender a private key or recovery phrase.

## Receive using an address

The recipient connects Noir at the [marketplace](https://www.zecblocks.xyz/#portfolio), opens **Portfolio → Receive NFT**, and selects **Enable address receiving** once. Noir requests two message signatures: one for the transparent address key and one for the derived NFT identity. This registration sends no funds.

It creates a **public, permanent binding** between that mainnet `t1` address and the NFT identity. The sender can then enter that address in the transfer form. The server and sender's browser both verify the signed binding.

Current limitations:

- Address receiving supports a registered mainnet `t1` address.
- Shielded `u1`, multisignature `t3` and Base addresses are not supported as NFT destinations.
- An unregistered address cannot be safely mapped to a derived NFT owner by guesswork.
- Existing bindings cannot be overwritten through the registration API.

## Receive without publishing an address binding

In **Receive NFT**, copy the official receiving link and share it directly with the sender. Copying this link needs no payment or signature. It carries the collection and receiving identity in the URL fragment.

Confirm the link with the intended recipient. A correctly formatted link does not authenticate the person who sent it. The full receiving ID is also accepted for compatibility; ordinary users can use the link instead of handling hexadecimal IDs.

## Send an NFT

1. In Portfolio, select **Transfer** on the owned NFT. Resolve any active listing first.
2. Paste the recipient's registered `t1` address or official receiving link.
3. Check the resolved destination and approve the wallet prompts.
4. Wait for the pending transfer to resolve to the recipient's canonical ownership.

Recovery checks the existing transaction; it does not send another one. A transaction timeout leaves the pending record intact. The current transfer uses the existing signed event and mailbox transaction; it does not activate the separate public-evidence candidate.
