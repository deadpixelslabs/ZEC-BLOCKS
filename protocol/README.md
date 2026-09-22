# ZB-1 verification tools

Standalone, read-only tools for the public evidence candidate. Node 22 or newer is sufficient; no npm install, project API, Supabase credential or wallet seed is required. Signature recovery uses the repository's existing pinned ethers 6.13.5 bundle.

**Not activated on mainnet.** Publishing these files does not change mining or transfer transactions. Existing claims remain governed by existing production rules. See [SPEC.md](SPEC.md), [IDENTITY.md](IDENTITY.md) and [activation.json](activation.json).

From the repository root:

```sh
node --test protocol/tests/*.test.mjs
node protocol/cli.mjs manifest
node protocol/cli.mjs prepare-spec spec-anchor-request.json
node protocol/cli.mjs identity YOUR_DERIVED_PUBLIC_KEY identity.json
node protocol/cli.mjs check-identity identity.json RESTORED_DERIVED_PUBLIC_KEY
```

The prepared SPEC request contains the exact hash, OP_RETURN script and 1-zatoshi amount. It sends nothing. This requires custom output-script support, not an ordinary receiving-address payment. The one zatoshi is burned and is separate from the network fee. The earlier one-zatoshi P2PKH design was discarded because standard zcashd policy rejects it as dust. Validate wallet compatibility before approving the new script. Record the confirmed TXID after approval and verify it with your own node.

For chain verification set ZCASH_RPC_URL to your validating archival node. If authentication is needed, set ZCASH_RPC_AUTH to its HTTP Authorization value. Never commit these credentials or place them in public files. The tool does not print credentials. Only getblockchaininfo, getblockhash, getblock and getrawtransaction are allowed.

```sh
node protocol/cli.mjs verify-spec CONFIRMED_SPEC_TXID
node protocol/cli.mjs verify events.json verification-report.json
node protocol/cli.mjs checkpoint events.json checkpoint.json
node protocol/cli.mjs proof checkpoint.json 1131 proof-1131.json
node protocol/cli.mjs verify-proof checkpoint.json proof-1131.json
node protocol/cli.mjs verify-checkpoint-anchor checkpoint.json CONFIRMED_CHECKPOINT_TXID
```

`events.json` is an array of complete envelopes. Each contains event, txid and receiptSignature. Preserve public envelopes on independent mirrors. Relays/indexers are discovery sources, not substitutes for signature and chain verification. Legacy events are reported unresolved by this candidate, without altering production ownership. A report may prove supplied events while still lacking earlier events; check coverage before drawing ownership conclusions.

## Wallet integration sequence

1. Build a CLAIM/TRANSFER body per SPEC, initially with signature set to an empty string. Use signing-request to obtain the exact message.
2. Ask the selected derived wallet identity to sign; put the compact signature in the event. prepare-event validates it and returns the public anchor request.
3. Only after activation gates pass, ask the wallet to send the specified output. Save its TXID immediately.
4. receipt-request creates the post-broadcast signing message. finalize-event validates the completed envelope.
5. Persist and mirror that envelope, then verify it against a validating node. If receipt signing fails, resume step 4 for the saved TXID.

No command asks for a private key or sends a payment. The wallet retains signing and broadcast control.

## Periodic operator checkpoints

Run checkpoint on a complete mirrored event bundle at a chosen cutoff height (optional final CLI argument), e.g. once per hour under your existing task scheduler. Save to a new filename containing the cutoff height, archive the input bundle and report, and compare roots across independent operators. Checkpoint generation can be automated; wallet broadcasts are not automated by this package. A checkpoint remains anchored=false until its transaction is independently verified. The commitment proves snapshot integrity, not completeness of missing or disputed historical records.

## Limits for existing holders

The claim incident audit found legacy conflicts; this toolkit cannot turn those records into public evidence retroactively. No automatic ownership migration is enabled. Existing Base USDC and ZEC marketplace settlements need separately reviewed adapters before this candidate can reconstruct the entire production portfolio. Noir's stable seed-to-identity derivation also needs upstream conformance evidence. These are explicit activation gates, not hidden fallbacks to the project server.
