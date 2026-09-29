'use strict';
const fs=require('node:fs'),path=require('node:path');
const {JsonRpcProvider,Contract,Interface,keccak256}=require('ethers');
const config=require('../rh20/holder-market.json'),artifact=require('../rh20/RH20HolderMarketplace.json');
const coreArtifact=require('../rh20/RH20.json'),nftArtifact=require('../rh20/RobinhoodOrdinal.json');
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.toLowerCase()===b.toLowerCase();
async function verifyDeployment(provider,hash,published=config){
 if(!/^0x[0-9a-f]{64}$/i.test(hash||''))throw Error('Pass the confirmed deployment transaction with --tx.');
 if(BigInt(await provider.send('eth_chainId',[]))!==4663n)throw Error('Wrong chain.');
 if(published.contractAddress&&!same(published.deploymentTxHash,hash))throw Error('The holder marketplace is already pinned. Refusing replacement.');
 const [tx,receipt]=await Promise.all([provider.getTransaction(hash),provider.getTransactionReceipt(hash)]);
 if(!tx||!receipt||receipt.status!==1||!receipt.contractAddress||tx.to!==null||tx.value!==0n||!same(tx.data,artifact.bytecode))throw Error('Transaction is not this exact holder marketplace deployment.');
 const block=await provider.getBlock(receipt.blockNumber);
 if(!block||!same(block.hash,receipt.blockHash))throw Error('Deployment receipt is not canonical.');
 const address=receipt.contractAddress;
 if(published.contractAddress&&!same(published.contractAddress,address))throw Error('Published address differs.');
 for(const [target,expected] of [[address,artifact],[published.coreAddress,coreArtifact],[published.collectionAddress,nftArtifact]]){
  if(keccak256(await provider.getCode(target,receipt.blockNumber))!==expected.runtimeCodeHash||keccak256(await provider.getCode(target))!==expected.runtimeCodeHash)throw Error('Dependency or marketplace bytecode differs.');
 }
 const market=new Contract(address,artifact.abi,provider),iface=new Interface(artifact.abi);
 const [core,treasury,collection,fee,maxLots]=await Promise.all([market.CORE(),market.TREASURY(),market.COLLECTION(),market.FEE_BPS(),market.MAX_LOTS()]);
 if(!same(core,published.coreAddress)||!same(treasury,published.treasury)||!same(collection,published.collectionAddress)||fee!==300n||maxLots!==20n||published.holderFeeBps!==0||published.feeBps!==300)throw Error('Marketplace settings differ.');
 const event=receipt.logs.filter(l=>same(l.address,address)).map(l=>{try{return iface.parseLog(l);}catch(_){return null;}}).find(l=>l?.name==='HolderMarketplaceDeployed');
 if(!event||!same(event.args.core,core)||!same(event.args.treasury,treasury)||!same(event.args.collection,collection)||event.args.feeBps!==fee||event.args.maxLots!==maxLots)throw Error('Deployment event differs.');
 return {...published,contractAddress:address,deploymentTxHash:hash,deploymentBlock:receipt.blockNumber};
}
if(require.main===module)(async()=>{
 const args=process.argv.slice(2),value=flag=>args.includes(flag)?args[args.indexOf(flag)+1]:null;
 const provider=new JsonRpcProvider(process.env.RH20_RPC_URL||config.rpcUrl,4663,{staticNetwork:true,batchMaxCount:1,cacheTimeout:-1});
 try{
  const verified=await verifyDeployment(provider,value('--tx')||config.deploymentTxHash);
  if(value('--address')&&!same(value('--address'),verified.contractAddress))throw Error('Receipt differs from the owner-supplied address.');
  if(!args.includes('--check'))fs.writeFileSync(path.resolve(__dirname,'../rh20/holder-market.json'),JSON.stringify(verified,null,2)+'\n');
  console.log(JSON.stringify(verified,null,2));
  // Register only this verified address in the private index before publishing
  // the pinned manifest. This invalidates leases and safely replays if necessary.
  if(value('--index-sql'))fs.writeFileSync(value('--index-sql'),`select public.rh20_register_market('${verified.contractAddress.toLowerCase()}',${verified.deploymentBlock},'${artifact.deployedBytecode}');\n`);
 }finally{provider.destroy();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={verifyDeployment};
