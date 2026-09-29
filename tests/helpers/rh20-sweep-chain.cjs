'use strict';
const { startMarket } = require('./rh20-market-chain.cjs');
const { ContractFactory, Contract, toBeHex } = require('ethers');
const config = require('../../rh20/mainnet.json');
const artifact = require('../../rh20/RH20Sweep.json');
async function startSweep() {
  const chain = await startMarket();
  // Fixed-address production dependencies, exclusively on the isolated EVM.
  await chain.provider.send('anvil_setCode', [config.contractAddress, chain.marketArtifact.deployedBytecode]);
  await chain.provider.send('anvil_setStorageAt', [config.contractAddress, toBeHex(0,32), toBeHex(1,32)]);
  chain.market = new Contract(config.contractAddress, chain.marketArtifact.abi, chain.signers[0]);
  chain.sweep = await new ContractFactory(artifact.abi, artifact.bytecode, chain.signers[0]).deploy();
  chain.sweepReceipt = await chain.sweep.deploymentTransaction().wait();
  return chain;
}
module.exports = { startSweep };
