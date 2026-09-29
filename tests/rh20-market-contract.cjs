'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Contract, ContractFactory, id, parseEther, ZeroAddress, MaxUint256, keccak256 } = require('ethers');
const solc = require('solc');
const { startMarket } = require('./helpers/rh20-market-chain.cjs');
const config = require('../rh20/mainnet.json');
const MINT = '{"p":"rh-20","op":"mint","tick":"RHSC","amt":"500"}';
let chain, market, core, seller, buyer, other;
before(async () => { chain = await startMarket(); ({ market, core } = chain); [seller, buyer, other] = chain.signers; });
after(async () => { await chain?.close(); });
const tx = async p => (await p).wait();
let request = 0;
async function listing(signer = seller, amount = 500n, price = parseEther('0.01')) {
  if (await core.balanceOf('RHSC', signer.address) < amount) await tx(core.connect(signer).inscribe(MINT));
  await tx(core.connect(signer).approve('RHSC', await market.getAddress(), amount));
  const requestId = id('listing-' + ++request);
  await tx(market.connect(signer).createListing('RHSC', amount, price, requestId));
  return market.listingByRequest(signer.address, requestId);
}
test('fixed production binding, bytecode and treasury are exact', async () => {
  assert.equal(await market.CORE(), config.coreAddress); assert.equal(await market.TREASURY(), config.treasury); assert.equal(await market.FEE_BPS(), 300n);
  assert.equal(keccak256(await chain.provider.getCode(await market.getAddress())), chain.marketArtifact.runtimeCodeHash);
  assert.equal((await core.getToken('RHSC')).maxSupply, 21000000n);
});
test('listing needs allowance, escrows exact amount and request cannot be reused', async () => {
  await tx(core.inscribe(MINT));
  const rid = id('dedupe');
  await assert.rejects(market.createListing('RHSC', 500, 1000, rid));
  await tx(core.approve('RHSC', await market.getAddress(), 500));
  const before = await core.balanceOf('RHSC', seller.address);
  await tx(market.createListing('RHSC', 500, 1000, rid));
  assert.equal(await core.balanceOf('RHSC', seller.address), before - 500n);
  assert.equal(await core.allowance('RHSC', seller.address, await market.getAddress()), 0n);
  assert.equal(await core.balanceOf('RHSC', await market.getAddress()), 500n);
  await assert.rejects(market.createListing('RHSC', 500, 1000, rid));
  await tx(market.cancelListing(await market.listingByRequest(seller.address, rid)));
});
test('Buy Now atomically transfers RHSC and splits native ETH 97/3', async () => {
  const price = parseEther('0.01'), lot = await listing(seller, 500n, price);
  const before = await Promise.all([chain.provider.getBalance(seller.address), chain.provider.getBalance(config.treasury), core.balanceOf('RHSC', buyer.address), core.mintCount('RHSC', seller.address)]);
  const receipt = await tx(market.connect(buyer).buy(lot, { value: price }));
  assert.equal(await chain.provider.getBalance(seller.address), before[0] + price * 97n / 100n);
  assert.equal(await chain.provider.getBalance(config.treasury), before[1] + price * 3n / 100n);
  assert.equal(await core.balanceOf('RHSC', buyer.address), before[2] + 500n);
  assert.equal(await core.mintCount('RHSC', seller.address), before[3]);
  assert.equal((await market.listings(lot)).state, 2n);
  const event = receipt.logs.map(l => { try { return market.interface.parseLog(l); } catch (_) {} }).find(l => l?.name === 'Bought');
  assert.equal(event.args.fee, price * 3n / 100n);
  assert.equal(await chain.provider.getBalance(await market.getAddress()), 0n);
});
test('wrong price, self-buy and competing second buyer cannot settle', async () => {
  const price = 10000n, lot = await listing(seller, 500n, price);
  await assert.rejects(market.buy(lot, { value: price }));
  await assert.rejects(market.connect(buyer).buy(lot, { value: price - 1n }));
  await assert.rejects(market.connect(buyer).buy(lot, { value: price + 1n }));
  await tx(market.connect(buyer).buy(lot, { value: price }));
  await assert.rejects(tx(market.connect(other).buy(lot, { value: price, gasLimit: 350000 }))); // mined revert, not only simulation
  await assert.rejects(market.cancelListing(lot));
});
test('only seller can cancel, full escrow returns and old purchase cannot execute', async () => {
  const lot = await listing(); const before = await core.balanceOf('RHSC', seller.address);
  await assert.rejects(market.connect(buyer).cancelListing(lot));
  await tx(market.cancelListing(lot));
  assert.equal(await core.balanceOf('RHSC', seller.address), before + 500n);
  assert.equal((await market.listings(lot)).state, 3n);
  await assert.rejects(market.connect(buyer).buy(lot, { value: parseEther('0.01') }));
  await assert.rejects(market.cancelListing(lot));
});
test('bounded active and seller pages remain consistent after middle removals', async () => {
  const ids = [await listing(), await listing(), await listing()];
  const before = await market.stats('RHSC');
  await tx(market.cancelListing(ids[1]));
  const [publicPage, publicCount] = await market.getListings('RHSC', ZeroAddress, 0, 50);
  const [ownPage, ownCount] = await market.getListings('RHSC', seller.address, 0, 50);
  assert.equal(publicCount, before.active - 1n); assert.equal(publicPage.length, Number(publicCount));
  assert.equal(new Set(publicPage.map(l => String(l.id))).size, publicPage.length);
  assert(!publicPage.some(l => l.id === ids[1])); assert(ownPage.every(l => l.seller === seller.address)); assert.equal(ownCount, BigInt(ownPage.length));
  assert.equal((await market.getListings('RHSC', ZeroAddress, MaxUint256, 12))[0].length, 0);
  await assert.rejects(market.getListings('RHSC', ZeroAddress, 0, 51));
  await tx(market.cancelListing(ids[0])); await tx(market.cancelListing(ids[2]));
  assert.equal((await market.stats('RHSC')).listedAmount, 0n);
});
test('other RH-20 tickers keep independent inventory and sale statistics', async () => {
  await tx(core.inscribe('{"p":"rh-20","op":"deploy","tick":"NEXT","max":"1000","lim":"100"}'));
  await tx(core.inscribe('{"p":"rh-20","op":"mint","tick":"NEXT","amt":"100"}'));
  await tx(core.approve('NEXT', await market.getAddress(), 100));
  await tx(market.createListing('NEXT', 100, 1000, id('next')));
  const lot = await market.listingByRequest(seller.address, id('next'));
  assert.equal((await market.getListings('RHSC', ZeroAddress, 0, 50))[0].length, 0);
  await tx(market.connect(buyer).buy(lot, { value: 1000 }));
  assert.equal(await core.balanceOf('NEXT', buyer.address), 100n);
  assert.equal((await market.stats('NEXT')).sales, 1n);
});
test('fee rounding is exact without multiplication overflow', async () => {
  for (const price of [100n, 101n, 9999n, parseEther('1'), MaxUint256]) assert.equal(await market.feeFor(price), price * 300n / 10000n);
  await assert.rejects(market.createListing('RHSC', 1, 99, id('dust')));
});
test('rejecting seller cannot block trade and only beneficiary can recover ETH', async () => {
  const source = `pragma solidity 0.8.26;
  interface C { function inscribe(string calldata) external; function approve(string calldata,address,uint256) external returns(bool); }
  interface M { function createListing(string calldata,uint256,uint256,bytes32) external returns(uint256); function withdraw(address payable) external; function cancelListing(uint256) external; }
  contract Recipient { bool public reject = true; bool public blocked; M public m; uint256 public lot;
  function list(address core,address market) external { m=M(market); C(core).inscribe('{"p":"rh-20","op":"mint","tick":"RHSC","amt":"500"}'); C(core).approve("RHSC",market,500); lot=m.createListing("RHSC",500,10000,keccak256("recipient")); }
  function take(address payable to) external { m.withdraw(to); }
  function accept() external { reject = false; }
  receive() external payable { if(reject) revert(); try m.withdraw(payable(address(this))) { revert("reentered"); } catch(bytes memory reason) { blocked = bytes4(reason) == bytes4(keccak256("ReentrantCall()")); } }
  }`;
  const output = JSON.parse(solc.compile(JSON.stringify({ language:'Solidity',sources:{'Recipient.sol':{content:source}},settings:{evmVersion:'paris',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}} })));
  const a = output.contracts['Recipient.sol'].Recipient;
  const recipient = await new ContractFactory(a.abi, '0x'+a.evm.bytecode.object, seller).deploy(); await recipient.waitForDeployment();
  await tx(recipient.list(config.coreAddress, await market.getAddress()));
  await tx(market.connect(buyer).buy(await recipient.lot(), { value:10000 }));
  assert.equal(await market.claimable(await recipient.getAddress()), 9700n);
  await assert.rejects(market.connect(other).withdraw(other.address));
  await assert.rejects(recipient.take(await recipient.getAddress()));
  assert.equal(await market.claimable(await recipient.getAddress()), 9700n);
  const before = await chain.provider.getBalance(await recipient.getAddress());
  await tx(recipient.accept());
  await tx(recipient.take(await recipient.getAddress()));
  assert.equal(await chain.provider.getBalance(await recipient.getAddress()), before+9700n);
  assert.equal(await recipient.blocked(), true);
  assert.equal(await market.claimable(await recipient.getAddress()), 0n);
});
test('treasury rejection preserves full fee credit and a second withdrawal cannot spend it again', async () => {
  await chain.provider.send('anvil_setCode', [config.treasury, '0x60006000fd']);
  const lot = await listing(seller, 500n, 10000n);
  await tx(market.connect(buyer).buy(lot,{value:10000}));
  assert.equal(await market.claimable(config.treasury),300n);
  await chain.provider.send('anvil_setCode',[config.treasury,'0x']);
  await chain.provider.send('anvil_impersonateAccount',[config.treasury]);
  await chain.provider.send('anvil_setBalance',[config.treasury,'0x100000000000000000']);
  const treasury = await chain.provider.getSigner(config.treasury);
  await tx(market.connect(treasury).withdraw(config.treasury));
  assert.equal(await market.claimable(config.treasury),0n);
  await assert.rejects(market.connect(treasury).withdraw(config.treasury));
});
test('read proxy rejects transaction sends, wrong targets and unbounded batches', () => {
  const api = require('../api/rh20'); const req = (method,params) => ({jsonrpc:'2.0',id:1,method,params});
  assert(api.allowed(req('eth_getCode',[config.coreAddress,'latest'])));
  assert(!api.allowed(req('eth_sendTransaction',[{}]))); assert(!api.allowed(req('eth_sendRawTransaction',['0x00'])));
  assert(!api.allowed(req('eth_call',[{to:buyer.address,data:'0x12345678'},'latest'])));
  assert(!api.allowed([req('eth_blockNumber',[])]));
});
test('deployment verifier accepts exact receipt, uses RPC height and rejects replacement', async()=>{
  const {verifyDeployment}=require('../scripts/publish-rh20-market.cjs');
  const verified=await verifyDeployment(chain.provider,chain.marketReceipt.hash);
  assert.equal(verified.contractAddress,await market.getAddress());assert.equal(verified.deploymentBlock,chain.marketReceipt.blockNumber);
  await assert.rejects(verifyDeployment(chain.provider,chain.receipt.hash));
  await assert.rejects(verifyDeployment(chain.provider,chain.marketReceipt.hash,{...verified,deploymentTxHash:id('different')}));
});
