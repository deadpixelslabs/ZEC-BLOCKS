'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { JsonRpcProvider, Contract, Interface, keccak256 } = require('ethers');
const config = require('../rh20/mainnet.json');
const artifact = require('../rh20/RH20Marketplace.json');
const coreArtifact = require('../rh20/RH20.json');
const same = (a,b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
async function verifyDeployment(provider, hash, published = config) {
  if (!/^0x[0-9a-f]{64}$/i.test(hash || '')) throw new Error('Pass the confirmed deployment transaction with --tx.');
  if (BigInt(await provider.send('eth_chainId', [])) !== 4663n) throw new Error('Wrong chain.');
  if (published.contractAddress && published.deploymentTxHash !== hash) throw new Error('The official marketplace is already pinned. Refusing replacement.');
  const [tx, receipt] = await Promise.all([provider.getTransaction(hash),provider.getTransactionReceipt(hash)]);
  if (!tx || !receipt || receipt.status !== 1 || !receipt.contractAddress || tx.to !== null || tx.value !== 0n || tx.data.toLowerCase() !== artifact.bytecode.toLowerCase()) throw new Error('Transaction is not this exact marketplace deployment.');
  const address = receipt.contractAddress;
  if (published.contractAddress && !same(published.contractAddress,address)) throw new Error('Published marketplace address differs.');
  const [runtime,coreCode] = await Promise.all([provider.getCode(address),provider.getCode(published.coreAddress)]);
  if (keccak256(runtime) !== artifact.runtimeCodeHash || keccak256(coreCode) !== coreArtifact.runtimeCodeHash) throw new Error('Deployed bytecode differs from the reproducible artifacts.');
  const market = new Contract(address,artifact.abi,provider), iface = new Interface(artifact.abi);
  const [core,treasury,fee] = await Promise.all([market.CORE(),market.TREASURY(),market.FEE_BPS()]);
  if (!same(core,published.coreAddress) || !same(treasury,published.treasury) || fee !== 300n || published.feeBps !== 300) throw new Error('Marketplace settings differ.');
  const genesis = receipt.logs.filter(l=>same(l.address,address)).map(l=>{try{return iface.parseLog(l);}catch(_){return null;}}).find(l=>l?.name==='MarketplaceDeployed');
  if (!genesis || !same(genesis.args.core,core) || !same(genesis.args.treasury,treasury) || genesis.args.feeBps !== fee) throw new Error('Marketplace deployment event differs.');
  // Use the L2 RPC receipt height, never Solidity block.number on Arbitrum.
  return {...published,contractAddress:address,deploymentTxHash:hash,deploymentBlock:receipt.blockNumber};
}
if (require.main === module) (async()=>{
  const args=process.argv.slice(2),index=args.indexOf('--tx'),hash=index<0?config.deploymentTxHash:args[index+1];
  const provider=new JsonRpcProvider(process.env.RH20_RPC_URL||config.rpcUrl,4663,{staticNetwork:true,batchMaxCount:1,cacheTimeout:-1});
  try {
    const verified=await verifyDeployment(provider,hash);
    if (!args.includes('--check')) fs.writeFileSync(path.resolve(__dirname,'../rh20/mainnet.json'),JSON.stringify(verified,null,2)+'\n');
    console.log(JSON.stringify(verified,null,2));
  } finally {provider.destroy();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={verifyDeployment};
