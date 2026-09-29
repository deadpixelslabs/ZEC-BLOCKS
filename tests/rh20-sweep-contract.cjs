'use strict';
const {test,before,after,beforeEach,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const {ContractFactory,id,keccak256,AbiCoder,ZeroHash}=require('ethers');
const solc=require('solc');
const {startSweep}=require('./helpers/rh20-sweep-chain.cjs');
const config=require('../rh20/mainnet.json');
const artifact=require('../rh20/RH20Sweep.json');
const {verifyDeployment}=require('../scripts/publish-rh20-sweep.cjs');
let chain,core,market,sweep,seller,buyer,snapshot;
const tx=async p=>(await p).wait();
const mint='{"p":"rh-20","op":"mint","tick":"RHSC","amt":"500"}';
before(async()=>{chain=await startSweep();({core,market,sweep}=chain);[seller,buyer]=chain.signers;});
beforeEach(async()=>{snapshot=await chain.provider.send('evm_snapshot',[]);});
afterEach(async()=>{await chain.provider.send('evm_revert',[snapshot]);});
after(async()=>{await chain?.close();});
async function lot(signer=seller,amount=500n,price=10001n){await tx(core.connect(signer).inscribe(mint));await tx(core.connect(signer).approve('RHSC',config.contractAddress,amount));const rid=id('lot'+await market.nextListingId());await tx(market.connect(signer).createListing('RHSC',amount,price,rid));return await market.nextListingId()-1n;}
const deadline=()=>Math.floor(Date.now()/1000)+600;
function buy(ids,amount,price,rid=id('sweep'),signer=buyer){return sweep.connect(signer).sweep(ids,amount,deadline(),rid,{value:price});}
test('exact deployment binds existing contracts and verifier rejects wrong receipts or reorgs',async()=>{
 assert.equal(await sweep.MARKETPLACE(),config.contractAddress);assert.equal(await sweep.MAX_LOTS(),20n);
 assert.equal(keccak256(await chain.provider.getCode(await sweep.getAddress())),artifact.runtimeCodeHash);
 const result=await verifyDeployment(chain.provider,chain.sweepReceipt.hash);assert.equal(result.contractAddress,await sweep.getAddress());
 await assert.rejects(verifyDeployment(chain.provider,chain.marketReceipt.hash));
 await assert.rejects(verifyDeployment(chain.provider,chain.sweepReceipt.hash,{...result,deploymentTxHash:id('other')}));
 const proxy=new Proxy(chain.provider,{get:(target,key)=>key==='getBlock'?async()=>({hash:id('orphan')}):typeof target[key]==='function'?target[key].bind(target):target[key]});
 await assert.rejects(verifyDeployment(proxy,chain.sweepReceipt.hash),/canonical/);
 await chain.provider.send('anvil_setCode',[config.contractAddress,'0x00']);
 await assert.rejects(new ContractFactory(artifact.abi,artifact.bytecode,seller).deploy());
});
test('one purchase settles multiple sellers, exact per-lot fees, final recipient and no custody residue',async()=>{
 const a=await lot(seller,500n,10001n),b=await lot(chain.signers[2],200n,10099n),ids=[a,b];
 const before=await Promise.all([chain.provider.getBalance(seller.address),chain.provider.getBalance(chain.signers[2].address),chain.provider.getBalance(config.treasury)]);
 const receipt=await tx(buy(ids,700n,20100n));
 assert.equal(await core.balanceOf('RHSC',buyer.address),700n);assert.equal(await core.balanceOf('RHSC',await sweep.getAddress()),0n);assert.equal(await chain.provider.getBalance(await sweep.getAddress()),0n);
 assert.equal(await chain.provider.getBalance(seller.address),before[0]+9701n);assert.equal(await chain.provider.getBalance(chain.signers[2].address),before[1]+9797n);assert.equal(await chain.provider.getBalance(config.treasury),before[2]+602n);
 assert.equal((await market.stats('RHSC')).sales,2n);assert.equal((await market.stats('RHSC')).volume,20100n);
 const event=receipt.logs.map(l=>{try{return sweep.interface.parseLog(l);}catch(_){}}).find(l=>l?.name==='Swept');
 assert.equal(event.args.buyer,buyer.address);assert.equal(event.args.selectionHash,keccak256(AbiCoder.defaultAbiCoder().encode(['uint256[]'],[ids])));assert.equal(event.args.amount,700n);
 await assert.rejects(buy(ids,700n,20100n));
});
test('bad value, amount, empty, duplicate, oversize, zero request, expiry and self-buy cannot settle',async()=>{
 const a=await lot();
 for(const [ids,amount,price,rid] of [[[],500n,10001n,id('empty')],[[a,a],1000n,20002n,id('dupe')],[Array(21).fill(a),10500n,210021n,id('max')],[[a],501n,10001n,id('amount')],[[a],500n,10000n,id('under')],[[a],500n,10002n,id('over')],[[a],500n,10001n,ZeroHash]])await assert.rejects(buy(ids,amount,price,rid));
 await assert.rejects(buy([a],500n,10001n,id('self'),seller));
 await assert.rejects(sweep.connect(buyer).sweep([a],500,1,id('expired'),{value:10001}));
 assert.equal((await market.listings(a)).state,1n);assert.equal(await core.balanceOf('RHSC',buyer.address),0n);
});
test('a competing purchase reverts the whole sweep without consuming request or changing other lots',async()=>{
 const a=await lot(),b=await lot();await tx(market.connect(chain.signers[2]).buy(b,{value:10001}));
 const before=await chain.provider.getBalance(config.treasury);
 await assert.rejects(tx(sweep.connect(buyer).sweep([a,b],1000,deadline(),id('race'),{value:20002,gasLimit:1500000})));
 assert.equal((await market.listings(a)).state,1n);assert.equal(await core.balanceOf('RHSC',buyer.address),0n);assert.equal(await chain.provider.getBalance(config.treasury),before);assert.equal(await sweep.usedRequests(buyer.address,id('race')),false);
});
test('request cannot be reused for different lots, and another ticker cannot enter RHSC checkout',async()=>{
 const a=await lot();await tx(buy([a],500n,10001n));const b=await lot();await assert.rejects(buy([b],500n,10001n));
 await tx(core.inscribe('{"p":"rh-20","op":"deploy","tick":"NEXT","max":"1000","lim":"100"}'));await tx(core.inscribe('{"p":"rh-20","op":"mint","tick":"NEXT","amt":"100"}'));await tx(core.approve('NEXT',config.contractAddress,100));await tx(market.createListing('NEXT',100,10001,id('next')));const c=await market.nextListingId()-1n;
 await assert.rejects(buy([b,c],600n,20002n,id('tick')));assert.equal((await market.listings(b)).state,1n);
});
test('20 lots settle in one transaction and gas fits the bounded checkout',async()=>{
 const ids=[];for(let i=0;i<20;i++)ids.push(await lot());const receipt=await tx(buy(ids,10000n,200020n));assert.equal(await core.balanceOf('RHSC',buyer.address),10000n);assert(receipt.gasUsed<6000000n);console.log('20-lot Sweep gas:',receipt.gasUsed.toString());
});
test('seller payment callback cannot reenter Sweep',async()=>{
 const source=`pragma solidity 0.8.26; interface C{function inscribe(string calldata)external;function approve(string calldata,address,uint)external returns(bool);} interface M{function createListing(string calldata,uint,uint,bytes32)external returns(uint);function cancelListing(uint)external;} interface S{function sweep(uint[] calldata,uint,uint,bytes32)external payable;} contract Seller{address c;M m;S s;uint public second;uint public first;bool public blocked;bool public cancel; constructor(address core,address market,address helper){c=core;m=M(market);s=S(helper);}function setup(bool cancelNext)external{cancel=cancelNext;C(c).inscribe('{"p":"rh-20","op":"mint","tick":"RHSC","amt":"500"}');C(c).approve("RHSC",address(m),500);first=m.createListing("RHSC",250,10001,keccak256("a"));second=m.createListing("RHSC",250,10001,keccak256("b"));} receive()external payable{uint[] memory ids=new uint[](1);ids[0]=second;try s.sweep(ids,250,block.timestamp+600,keccak256("reenter")){revert();}catch(bytes memory reason){blocked=bytes4(reason)==bytes4(keccak256("ReentrantCall()"));}if(cancel){try m.cancelListing(second){}catch{}}}}`;
 const output=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{'Seller.sol':{content:source}},settings:{evmVersion:'paris',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}})));const art=output.contracts['Seller.sol'].Seller;
 const attacker=await new ContractFactory(art.abi,'0x'+art.evm.bytecode.object,seller).deploy(config.coreAddress,config.contractAddress,await sweep.getAddress());await attacker.waitForDeployment();await tx(attacker.setup(false));await tx(buy([await attacker.first(),await attacker.second()],500n,20002n));assert.equal(await attacker.blocked(),true);
 // Marketplace itself rejects cancellation while its buy callback is active.
 assert.equal(await core.balanceOf('RHSC',buyer.address),500n);
});
