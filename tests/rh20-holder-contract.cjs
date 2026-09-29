'use strict';
const {test,before,after,beforeEach,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const {id,ContractFactory,keccak256,MaxUint256}=require('ethers');
const solc=require('solc');
const {startHolderMarket}=require('./helpers/rh20-holder-chain.cjs');
const config=require('../rh20/holder-market.json');
const {verifyDeployment}=require('../scripts/publish-rh20-holder-market.cjs');
const MINT='{"p":"rh-20","op":"mint","tick":"RHSC","amt":"500"}';
const NFT='{"p":"rh-ordinal","op":"mint","tick":"RHO"}';
let c,m,nft,seller,buyer,other,snap,counter=0;
const tx=async p=>(await p).wait();
const rid=()=>id('holder-test-'+ ++counter);
const deadline=()=>Math.floor(Date.now()/1000)+600;
async function mintNFT(who=seller){await tx(nft.connect(who).inscribe(NFT,rid(),{value:190000000000000n}));return nft.totalSupply();}
async function list(who=seller,price=10000n){await tx(c.core.connect(who).inscribe(MINT));await tx(c.core.connect(who).approve('RHSC',m.target,500));const request=rid();await tx(m.connect(who).createListing('RHSC',500,price,request));return m.listingByRequest(who.address,request);}
const bought=r=>r.logs.map(l=>{try{return m.interface.parseLog(l);}catch{}}).filter(l=>l?.name==='Bought');
before(async()=>{c=await startHolderMarket();m=c.holderMarket;nft=c.nft;[seller,buyer,other]=c.signers;});
after(async()=>{await c?.close();});
beforeEach(async()=>{snap=await c.provider.send('evm_snapshot',[]);});
afterEach(async()=>{await c.provider.send('evm_revert',[snap]);});
test('exact deployment binds the existing NFT/core and canonical verification rejects impostors',async()=>{
 assert.equal(await m.COLLECTION(),config.collectionAddress);assert.equal(await m.CORE(),config.coreAddress);assert.equal(await m.TREASURY(),config.treasury);assert.equal(await m.MAX_LOTS(),20n);
 const unpinned={...config,contractAddress:null,deploymentTxHash:null,deploymentBlock:null};
 assert.equal((await verifyDeployment(c.provider,c.holderReceipt.hash,unpinned)).contractAddress,m.target);
 await assert.rejects(verifyDeployment(c.provider,c.marketReceipt.hash,unpinned));
 const fake=new Proxy(c.provider,{get:(t,k)=>k==='getBlock'?async()=>({hash:rid()}):typeof t[k]==='function'?t[k].bind(t):t[k]});
 await assert.rejects(verifyDeployment(fake,c.holderReceipt.hash,unpinned),/canonical/);
 await c.provider.send('anvil_setCode',[config.collectionAddress,'0x00']);
 await assert.rejects(new ContractFactory(c.holderArtifact.abi,c.holderArtifact.bytecode,seller).deploy());
});
test('holder seller receives the full price and buyer ownership never waives a non-holder seller fee',async()=>{
 await mintNFT(seller);const a=await list();const before=await c.provider.getBalance(seller.address),treasury=await c.provider.getBalance(config.treasury);
 const r=await tx(m.connect(buyer).buy(a,{value:10000}));assert.equal(bought(r)[0].args.fee,0n);assert.equal(await c.provider.getBalance(seller.address),before+10000n);assert.equal(await c.provider.getBalance(config.treasury),treasury);
 const b=await list(other);const r2=await tx(m.connect(seller).buy(b,{value:10000}));assert.equal(bought(r2)[0].args.fee,300n);
});
test('eligibility follows ownership at settlement, not listing time, with one remaining NFT sufficient',async()=>{
 const a=await list(),token=await mintNFT();await tx(nft.transferFrom(seller.address,other.address,token));
 assert.equal(bought(await tx(m.connect(buyer).buy(a,{value:10000})))[0].args.fee,300n);
 const b=await list();await mintNFT();await mintNFT();await tx(nft.transferFrom(seller.address,other.address,2));
 assert.equal(await nft.balanceOf(seller.address),1n);assert.equal(bought(await tx(m.connect(buyer).buy(b,{value:10000})))[0].args.fee,0n);
 const d=await list(c.signers[4]);await mintNFT(c.signers[4]);assert.equal(bought(await tx(m.connect(buyer).buy(d,{value:10000})))[0].args.fee,0n);
});
test('native Sweep settles mixed seller fees in one transaction and rejects repeated intent',async()=>{
 await mintNFT();const ids=[await list(),await list(other,10001n)];const request=rid();
 const sellerBefore=await c.provider.getBalance(seller.address),otherBefore=await c.provider.getBalance(other.address);
 const receipt=await tx(m.connect(buyer).sweep(ids,1000,deadline(),request,{value:20001}));
 assert.deepEqual(bought(receipt).map(x=>x.args.fee),[0n,300n]);assert.equal(await c.core.balanceOf('RHSC',buyer.address),1000n);
 assert.equal(await c.provider.getBalance(seller.address),sellerBefore+10000n);assert.equal(await c.provider.getBalance(other.address),otherBefore+9701n);
 assert.equal(await m.usedRequests(buyer.address,request),true);assert.equal(await c.provider.getBalance(m.target),0n);
 await assert.rejects(m.connect(buyer).sweep(ids,1000,deadline(),request,{value:20001}));
});
test('stale lots, wrong sums, duplicates, expiry and own listings revert the entire Sweep',async()=>{
 const ids=[await list(),await list(other)];const request=rid();
 for(const [lots,amount,until,value] of [[[],0,deadline(),0],[[ids[0],ids[0]],1000,deadline(),20000],[ids,999,deadline(),20000],[ids,1000,1,20000],[ids,1000,deadline(),19999],[ids,1000,deadline(),20001]])await assert.rejects(m.connect(buyer).sweep(lots,amount,until,request,{value}));
 await assert.rejects(m.connect(seller).sweep(ids,1000,deadline(),request,{value:20000}));
 await tx(m.connect(other).cancelListing(ids[1]));await assert.rejects(tx(m.connect(buyer).sweep(ids,1000,deadline(),request,{value:20000,gasLimit:1000000})));
 assert.equal((await m.listings(ids[0])).state,1n);assert.equal(await m.usedRequests(buyer.address,request),false);assert.equal(await c.core.balanceOf('RHSC',buyer.address),0n);
});
test('twenty whole lots fit one atomic transaction, with no wallet mint-limit change',async()=>{
 const ids=[];for(let i=0;i<20;i++)ids.push(await list());
 await assert.rejects(m.connect(buyer).sweep([...ids,ids[0]],10500,deadline(),rid(),{value:210000}));
 const r=await tx(m.connect(buyer).sweep(ids,10000,deadline(),rid(),{value:200000}));
 assert.equal(bought(r).length,20);assert.equal(await c.core.balanceOf('RHSC',buyer.address),10000n);assert.equal(await c.core.mintCount('RHSC',seller.address),20n);console.log('holder marketplace 20-lot gas',r.gasUsed.toString());
});
test('fee rounding handles uint256 bounds and cancellation returns the complete escrow',async()=>{
 for(const price of [100n,101n,9999n,MaxUint256])assert.equal(await m.feeForSeller(seller.address,price),price*300n/10000n);
 await mintNFT();assert.equal(await m.feeForSeller(seller.address,MaxUint256),0n);
 const lot=await list();await assert.rejects(m.connect(buyer).cancelListing(lot));await tx(m.cancelListing(lot));assert.equal(await c.core.balanceOf('RHSC',seller.address),500n);
});
test('old listings retain 3%; cancel, approve and relist activates the holder benefit',async()=>{
 await mintNFT();await tx(c.core.inscribe(MINT));await tx(c.core.approve('RHSC',c.market.target,500));await tx(c.market.createListing('RHSC',500,10000,rid()));
 assert.equal(await c.market.feeFor(10000),300n);await tx(c.market.cancelListing(1));await tx(c.core.approve('RHSC',m.target,500));await tx(m.createListing('RHSC',500,10000,rid()));
 assert.equal(bought(await tx(m.connect(buyer).buy(1,{value:10000})))[0].args.fee,0n);
});
test('fee snapshots resist NFT movement in an earlier seller payout and rejecting wallets retain full credit',async()=>{
 const source=`pragma solidity 0.8.26;
 interface N { function inscribe(string calldata,bytes32) external payable returns(uint256); function transferFrom(address,address,uint256) external; }
 interface C { function inscribe(string calldata) external; function approve(string calldata,address,uint256) external returns(bool); }
 interface M { function createListing(string calldata,uint256,uint256,bytes32) external returns(uint256); function withdraw(address payable) external; }
 contract Receiver { N n; M m; address public next; uint256 public token; bool public reject; bool public blocked;
 function onERC721Received(address,address,uint256,bytes calldata) external pure returns(bytes4){return 0x150b7a02;}
 function setup(address core,address market,address nft,address to) external payable {n=N(nft);m=M(market);next=to;token=n.inscribe{value:msg.value}('{"p":"rh-ordinal","op":"mint","tick":"RHO"}',keccak256('nft')); C(core).inscribe('{"p":"rh-20","op":"mint","tick":"RHSC","amt":"500"}');C(core).approve('RHSC',market,500);m.createListing('RHSC',500,10000,keccak256('list'));}
 function rejecting() external {reject=true;}
 function take(address payable to) external {m.withdraw(to);}
 receive() external payable {if(reject)revert(); n.transferFrom(address(this),next,token);try m.withdraw(payable(address(this))){revert('reentered');}catch{blocked=true;}}
 }`;
 const out=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{'R.sol':{content:source}},settings:{evmVersion:'paris',optimizer:{enabled:true,runs:200},outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}})));
 const a=out.contracts['R.sol'].Receiver;
 const rec=await new ContractFactory(a.abi,'0x'+a.evm.bytecode.object,seller).deploy();await rec.waitForDeployment();
 await tx(rec.setup(config.coreAddress,m.target,config.collectionAddress,other.address,{value:190000000000000n}));const second=await list(other);
 // Both fees are fixed before any seller receives ETH, even if a callback moves the NFT.
 const r=await tx(m.connect(buyer).sweep([1,second],1000,deadline(),rid(),{value:20000}));assert.deepEqual(bought(r).map(x=>x.args.fee),[0n,300n]);
 // Bounded callback may exhaust its stipend. Either successful transfer or deferred
 // payment is safe; in neither case can a later lot inherit a callback-only waiver.
 const rec2=await new ContractFactory(a.abi,'0x'+a.evm.bytecode.object,seller).deploy();await rec2.waitForDeployment();
 await tx(rec2.setup(config.coreAddress,m.target,config.collectionAddress,other.address,{value:190000000000000n}));await tx(rec2.rejecting());const last=(await m.nextListingId())-1n;
 await tx(m.connect(buyer).buy(last,{value:10000}));assert.equal(await m.claimable(rec2.target),10000n);await assert.rejects(m.connect(other).withdraw(other.address));
 await tx(rec2.take(other.address));assert.equal(await m.claimable(rec2.target),0n);await assert.rejects(rec2.take(other.address));
});
