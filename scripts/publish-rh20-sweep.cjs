'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { JsonRpcProvider, Contract, Interface, keccak256 } = require('ethers');
const config = require('../rh20/sweep.json');
const marketConfig = require('../rh20/mainnet.json');
const artifact = require('../rh20/RH20Sweep.json');
const coreArtifact = require('../rh20/RH20.json');
const marketArtifact = require('../rh20/RH20Marketplace.json');
const same = (a,b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
async function verifyDeployment(provider, hash, published = config) {
  if (!/^0x[0-9a-f]{64}$/i.test(hash || '')) throw Error('Pass the confirmed Sweep deployment transaction with --tx.');
  if (BigInt(await provider.send('eth_chainId', [])) !== 4663n) throw Error('Wrong chain.');
  if (published.contractAddress && !same(published.deploymentTxHash,hash)) throw Error('The official Sweep helper is already pinned. Refusing replacement.');
  const [tx, receipt] = await Promise.all([provider.getTransaction(hash),provider.getTransactionReceipt(hash)]);
  if (!tx || !receipt || receipt.status !== 1 || !receipt.contractAddress || tx.to !== null || tx.value !== 0n || tx.data.toLowerCase() !== artifact.bytecode.toLowerCase()) throw Error('Transaction is not this exact Sweep deployment.');
  const block = await provider.getBlock(receipt.blockNumber);
  if (!block || !same(block.hash,receipt.blockHash)) throw Error('Deployment is not on the canonical chain.');
  const address = receipt.contractAddress;
  if (published.contractAddress && !same(published.contractAddress,address)) throw Error('Published Sweep address differs.');
  const [runtime,coreCode,marketCode] = await Promise.all([provider.getCode(address),provider.getCode(marketConfig.coreAddress),provider.getCode(marketConfig.contractAddress)]);
  if (keccak256(runtime) !== artifact.runtimeCodeHash || keccak256(coreCode) !== coreArtifact.runtimeCodeHash || keccak256(marketCode) !== marketArtifact.runtimeCodeHash) throw Error('Deployed bytecode differs from the reproducible artifacts.');
  const helper = new Contract(address,artifact.abi,provider), iface = new Interface(artifact.abi);
  const [core,market,maxLots,chainId] = await Promise.all([helper.CORE(),helper.MARKETPLACE(),helper.MAX_LOTS(),helper.CHAIN_ID()]);
  if (!same(core,published.coreAddress) || !same(market,published.marketplaceAddress) || !same(market,marketConfig.contractAddress) || maxLots !== 20n || published.maxLots !== 20 || chainId !== 4663n || published.chainId !== 4663) throw Error('Sweep settings differ.');
  const genesis = receipt.logs.filter(l=>same(l.address,address)).map(l=>{try{return iface.parseLog(l);}catch(_){return null;}}).find(l=>l?.name==='SweepDeployed');
  if (!genesis || !same(genesis.args.core,core) || !same(genesis.args.marketplace,market) || genesis.args.maxLots !== maxLots) throw Error('Sweep deployment event differs.');
  return {...published,contractAddress:address,deploymentTxHash:hash,deploymentBlock:receipt.blockNumber};
}
if (require.main === module) (async()=>{
  const args=process.argv.slice(2),index=args.indexOf('--tx'),hash=index<0?config.deploymentTxHash:args[index+1];
  const addressIndex=args.indexOf('--address'),expected=addressIndex<0?null:args[addressIndex+1];
  if(addressIndex>=0 && !/^0x[0-9a-f]{40}$/i.test(expected||''))throw Error('Invalid expected address.');
  const provider=new JsonRpcProvider(process.env.RH20_RPC_URL||marketConfig.rpcUrl,4663,{staticNetwork:true,batchMaxCount:1,cacheTimeout:-1});
  try { const verified=await verifyDeployment(provider,hash);if(expected&&!same(expected,verified.contractAddress))throw Error('Receipt address differs from the owner-supplied address.');
    if(!args.includes('--check'))fs.writeFileSync(path.resolve(__dirname,'../rh20/sweep.json'),JSON.stringify(verified,null,2)+'\n');console.log(JSON.stringify(verified,null,2));
  } finally {provider.destroy();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={verifyDeployment};
