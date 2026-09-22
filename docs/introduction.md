# Introduction

ZEC BLOCKS connects a fixed collection of 5,000 NFT IDs to Zcash source blocks. The browser searches for a SHA-256 proof for a selected ID, and the wallet approves a claim transaction. Verification checks the signed event, proof, source block and transaction before ownership is reflected in the application.

The system has three distinct parts:

| Name | Role |
| --- | --- |
| ZB-1 | Application rules for NFT claims, identity and ownership transitions |
| ZEC BLOCKS | The 5,000-item collection using those rules |
| ZB-20 / ZECS | A token layer and its first project token, respectively |

Mining an NFT does not mine ZEC or contribute to Zcash consensus mining. Finding a proof does not by itself create ownership. ZECS minting is a separate holder-gated process; it does not run the NFT proof search.

The artwork is generated deterministically from collection inputs by the application renderer. An image preview is a representation of an NFT, not its ownership proof. A hosted image or cache can be unavailable without erasing a historical transaction, but independent recovery still requires the relevant event data and rules.

The project currently operates frontends, APIs and indexers. Those services affect discovery, availability and the state users see. Read [architecture](architecture.md) for these responsibilities and [code examples](reference-implementation.md) for selected implementation details.
