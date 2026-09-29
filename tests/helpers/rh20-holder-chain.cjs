'use strict';
const {startMarket}=require('./rh20-market-chain.cjs');
const {Contract,ContractFactory}=require('ethers');
const config=require('../../rh20/holder-market.json');
const artifact=require('../../rh20/RH20HolderMarketplace.json');
const nftArtifact=require('../../rh20/RobinhoodOrdinal.json');
async function startHolderMarket(){
 const chain=await startMarket();
 // Exact immutable NFT runtime on a local EVM. Zeroed ERC721 storage is an empty
 // collection; inscribe/transfer/balanceOf use the real production implementation.
 await chain.provider.send('anvil_setCode',[config.collectionAddress,nftArtifact.deployedBytecode]);
 chain.nft=new Contract(config.collectionAddress,nftArtifact.abi,chain.signers[0]);
 chain.holderMarket=await new ContractFactory(artifact.abi,artifact.bytecode,chain.signers[0]).deploy();
 chain.holderReceipt=await chain.holderMarket.deploymentTransaction().wait();
 chain.holderArtifact=artifact;
 return chain;
}
module.exports={startHolderMarket};
