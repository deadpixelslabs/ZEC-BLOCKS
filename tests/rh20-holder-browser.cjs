'use strict';
const {test,before,after,beforeEach,afterEach}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {id,parseEther}=require('ethers');
const {startHolderMarket}=require('./helpers/rh20-holder-chain.cjs');
const {serve}=require('./helpers/rh20-server.cjs');
let chain,server,browser,snapshot;
const artifacts=path.resolve(__dirname,'../test-results/rh20');
const MINT='{"p":"rh-20","op":"mint","tick":"RHSC","amt":"500"}';
const NFT='{"p":"rh-ordinal","op":"mint","tick":"RHO"}';
const tx=async p=>(await p).wait();
before(async()=>{fs.mkdirSync(artifacts,{recursive:true});chain=await startHolderMarket();server=await serve(chain);browser=await chromium.launch({headless:true});});
beforeEach(async()=>{snapshot=await chain.provider.send('evm_snapshot',[]);server.setHolderPublished(true);});
afterEach(async()=>{await chain.provider.send('evm_revert',[snapshot]);});
after(async()=>{await browser?.close();await server?.close();await chain?.close();});
async function seedLot(wallet=0,market=chain.holderMarket){const seller=chain.signers[wallet];await tx(chain.core.connect(seller).inscribe(MINT));await tx(chain.core.connect(seller).approve('RHSC',market.target,500));await tx(market.connect(seller).createListing('RHSC',500,parseEther('0.01'),id('lot-'+await market.nextListingId())));return await market.nextListingId()-1n;}
async function mintNFT(wallet=0){await tx(chain.nft.connect(chain.signers[wallet]).inscribe(NFT,id('nft-'+await chain.nft.totalSupply()),{value:190000000000000n}));}
async function connected(page){await page.locator('#connect').click();await page.waitForFunction(()=>document.querySelector('#connect').textContent.includes('…') && !document.querySelector('#badge').textContent.includes('Checking'));}
async function preview(page,count){await page.locator('#openSweep').click();await page.locator('#sweepCount').fill(String(count));await page.locator('#sweepCount').blur();await page.locator('#previewSweep').click();await page.waitForFunction(()=>!document.querySelector('#confirmSweep').disabled);}
async function pageFixture({ route = '/rh20.html', wallet = 1, mobile = false } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1050 } });
  await context.addInitScript(({ account }) => {
    let currentAccount = account;
    const listeners = {};
    window.__sendCount = 0;
    window.__walletMode = 'normal';
    window.__setWalletAccount = value => { currentAccount = value; for (const fn of listeners.accountsChanged || []) fn([value]); };
    window.ethereum = {
      isMetaMask: true,
      on: (name, fn) => { (listeners[name] ||= []).push(fn); },
      removeListener: (name, fn) => { listeners[name] = (listeners[name] || []).filter(item => item !== fn); },
      request: async ({ method, params = [] }) => {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [currentAccount];
        if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') return null;
        if (method === 'eth_sendTransaction') {
          window.__sendCount++;
          if (window.__walletMode === 'hold') await new Promise(resolve => { window.__releaseWallet = resolve; });
          if (window.__walletMode === 'reject') throw Object.assign(new Error('User rejected the request'), { code: 4001 });
        }
        const response = await fetch('/_fixture/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 101, method, params }) });
        const json = await response.json();
        if (json.error) throw Object.assign(new Error(json.error.message), { code: json.error.code, data: json.error.data });
        if (method === 'eth_estimateGas' && window.__walletMode === 'switch-during-estimate') window.__setWalletAccount(window.__nextAccount);
        if (method === 'eth_sendTransaction') {
          window.__lastHash = json.result;
          if (window.__walletMode === 'unresolved') throw Object.assign(new Error('Wallet connection lost after broadcast'), { code: -32000 });
        }
        return json.result;
      }
    };
  }, { account: chain.signers[wallet].address });
  const page = await context.newPage(); page.setDefaultTimeout(12000); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(server.url + route);
  await page.waitForFunction(() => !document.querySelector('#status').textContent.startsWith('Loading'));
  return { page, context, errors };
}
test('current marketplace shows holder fee, wallet changes refresh eligibility and mobile layout fits',async()=>{
 await mintNFT(0);await seedLot();const{page,context,errors}=await pageFixture({wallet:0,mobile:true});
 try{await connected(page);await page.locator('[data-tab="sell"]').click();await page.locator('#price').fill('1');
  await page.waitForFunction(()=>document.querySelector('#sellerBenefit').textContent.includes('fee is 0%'));
  assert.match(await page.locator('#sellQuote').innerText(),/You receive 1.0 ETH · fee 0.0 ETH/);
  assert.equal(await page.locator('#feeRate').innerText(),'0% / 3%');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(artifacts,'holder-seller-mobile.png'),fullPage:true});
  await page.evaluate(account=>window.__setWalletAccount(account),chain.signers[2].address);
  await page.waitForFunction(()=>document.querySelector('#sellerBenefit').textContent.includes('fee is 3%'));
  assert.match(await page.locator('#sellQuote').innerText(),/You receive 0.97 ETH/);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('Buy Now checks seller fees and native Sweep quotes mixed lots with one send',async()=>{
 await mintNFT(0);await seedLot(0);await seedLot(2);const{page,context,errors}=await pageFixture();
 try{await connected(page);await page.locator('#lots button').first().click();await page.waitForFunction(()=>document.querySelector('#buyFee').textContent.includes('0.0 ETH'));
  assert.match(await page.locator('#buyFeeHint').innerText(),/0% or 3%/);await page.locator('#closeDialog').click();
  await preview(page,2);assert.equal(await page.locator('#sweepFee').innerText(),'0.0003 ETH');assert.equal(await page.locator('#sweepPrice').innerText(),'0.02 ETH');
  assert(!/0x[a-fA-F0-9]{40}/.test(await page.locator('#sweepLots').innerHTML()));
  await page.screenshot({path:path.join(artifacts,'holder-sweep-desktop.png'),fullPage:true});await page.locator('#confirmSweep').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Sweep confirmed'));
  assert.equal(await page.evaluate(()=>window.__sendCount),1);assert.equal(await chain.core.balanceOf('RHSC',chain.signers[1].address),1000n);assert.equal((await chain.market.stats('RHSC')).sales,0n);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('seller cancels a previous lot, approves current market and relists without losing NFT benefit',async()=>{
 await mintNFT(0);await seedLot(0,chain.market);const{page,context,errors}=await pageFixture({route:'/rh20.html?market=previous',wallet:0});
 try{await connected(page);assert.equal(await page.locator('[data-tab="sell"]').isVisible(),false);assert.equal(await page.locator('#feeRate').innerText(),'3%');
  await page.locator('[data-tab="owned"]').click();await page.locator('#ownedLots button').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Listing cancelled'));
  await page.goto(server.url+'/rh20.html');await connected(page);await page.locator('[data-tab="sell"]').click();await page.locator('#price').fill('0.01');
  await page.locator('#sellAction').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Approval confirmed'));
  await page.waitForFunction(()=>document.querySelector('#sellAction').textContent==='Create listing');await page.locator('#sellAction').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Listing confirmed'));
  assert.equal((await chain.market.stats('RHSC')).active,0n);assert.equal((await chain.holderMarket.stats('RHSC')).active,1n);assert.equal(await chain.holderMarket.sellerFeeBps(chain.signers[0].address),0n);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('unknown previous-market payment recovers on current view without a second purchase',async()=>{
 await seedLot(0,chain.market);const{page,context,errors}=await pageFixture({route:'/rh20.html?market=previous'});
 try{await connected(page);await page.locator('#lots button').first().click();await page.evaluate(()=>window.__walletMode='unresolved');await page.locator('#confirmBuy').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('retained'));const hash=await page.evaluate(()=>window.__lastHash);
  await page.goto(server.url+'/rh20.html');await connected(page);await page.locator('#recoveryHash').fill(hash);await page.locator('#recover').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Purchase confirmed'));
  assert.equal(await page.evaluate(()=>window.__sendCount),0);assert.equal((await chain.market.stats('RHSC')).sales,1n);assert.equal((await chain.holderMarket.stats('RHSC')).sales,0n);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('native Sweep recovery works from the previous view without another transaction',async()=>{
 await seedLot();const{page,context,errors}=await pageFixture();
 try{await connected(page);await preview(page,1);await page.evaluate(()=>window.__walletMode='unresolved');await page.locator('#confirmSweep').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('retained'));const hash=await page.evaluate(()=>window.__lastHash);
  await page.goto(server.url+'/rh20.html?market=previous');await connected(page);await page.locator('#recoveryHash').fill(hash);await page.locator('#recover').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Sweep confirmed'));
  assert.equal(await page.evaluate(()=>window.__sendCount),0);assert.equal((await chain.holderMarket.stats('RHSC')).sales,1n);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('holder deployment is one transaction, receipt persists and repeat deployment is disabled',async()=>{
 server.setHolderPublished(false);const{page,context,errors}=await pageFixture({route:'/rh20-holder-deploy.html',wallet:0});
 try{await page.locator('#deploy').click();await page.waitForFunction(()=>!document.querySelector('#receipt').hidden && document.querySelector('#deploy').textContent==='Marketplace deployed' && document.querySelector('#recovery').hidden);
  assert.equal(await page.evaluate(()=>window.__sendCount),1);assert.match(await page.locator('#deployedAddress').innerText(),/^0x[0-9a-f]{40}$/i);assert.equal(await page.locator('#deploy').isDisabled(),true);
  await page.screenshot({path:path.join(artifacts,'holder-deploy-receipt.png'),fullPage:true});
  await page.reload();await page.locator('#connect').click();await page.waitForFunction(()=>!document.querySelector('#receipt').hidden);assert.equal(await page.locator('#deploy').isDisabled(),true);assert.equal(await page.evaluate(()=>window.__sendCount),0);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
