'use strict';
const { startChain } = require('./rh20-chain.cjs');
const { ContractFactory, Contract, keccak256, concat, zeroPadValue, toBeHex } = require('ethers');
const artifact = require('../../rh20/RH20Marketplace.json');
const config = require('../../rh20/mainnet.json');
async function startMarket() {
  const chain = await startChain();
  // Install the exact deployed core runtime and constructor state at its fixed
  // production address on this isolated EVM. No production RPC writes occur.
  const original = await chain.core.getAddress();
  await chain.provider.send('anvil_setCode', [config.coreAddress, chain.artifact.deployedBytecode]);
  const tokenId = await chain.core.RHSC_ID();
  const base = BigInt(keccak256(concat([tokenId, zeroPadValue('0x02', 32)])));
  for (const slot of [0n, 1n, ...Array.from({ length: 7 }, (_, i) => base + BigInt(i))]) {
    const value = await chain.provider.getStorage(original, slot);
    await chain.provider.send('anvil_setStorageAt', [config.coreAddress, toBeHex(slot, 32), value]);
  }
  chain.core = new Contract(config.coreAddress, chain.artifact.abi, chain.signers[0]);
  if ((await chain.core.getToken('RHSC')).maxMintsPerWallet !== 20n) throw new Error('Invalid isolated core constructor state.');
  chain.market = await new ContractFactory(artifact.abi, artifact.bytecode, chain.signers[0]).deploy();
  chain.marketReceipt = await chain.market.deploymentTransaction().wait();
  chain.marketArtifact = artifact;
  return chain;
}
module.exports = { startMarket };
