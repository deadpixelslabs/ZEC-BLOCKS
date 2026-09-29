 'use strict';
const {test,before,after,beforeEach,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {id,parseEther}=require('ethers');
const {startSweep}=require('./helpers/rh20-sweep-chain.cjs');
const {serve}=require('./helpers/rh20-server.cjs');
let chain,server,browser,snapshot;
const artifacts=path.resolve(__dirname,'../test-results/rh20');
const MINT='{"p":"rh-20","op":"mint","tick":"RHSC","amt":"500"}';
before(async()=>{fs.mkdirSync(artifacts,{recursive:true});chain=await startSweep();server=await serve(chain);browser=await chromium.launch({headless:true});});
beforeEach(async()=>{snapshot=await chain.provider.send('evm_snapshot',[]);server.setSweepPublished(true);server.setSweepAddress(null);});
afterEach(async()=>{await chain.provider.send('evm_revert',[snapshot]);});
after(async()=>{await browser?.close();await server?.close();await chain?.close();});
const tx=async p=>(await p).wait();
async function seedLot(amount=500,price=parseEther('0.01'),wallet=0){
 const seller=chain.signers[wallet];await tx(chain.core.connect(seller).inscribe(MINT));await tx(chain.core.connect(seller).approve('RHSC',await chain.market.getAddress(),amount));
 await tx(chain.market.connect(seller).createListing('RHSC',amount,price,id('sweep-browser-'+await chain.market.nextListingId())));return await chain.market.nextListingId()-1n;
}
async function connected(page){await page.locator('#connect').click();await page.waitForFunction(()=>!document.querySelector('#sellAction')?.disabled);}
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

async function preview(page,count=5){await page.locator('#openSweep').click();await page.locator('#sweepCount').fill(String(count));await page.locator('#sweepCount').blur();await page.locator('#previewSweep').click();await page.waitForFunction(()=>!document.querySelector('#confirmSweep').disabled);}
test('Sweep buys the cheapest eligible lots across pages, exact ETH/USD review and one wallet request',async()=>{
 for(let i=0;i<12;i++)await seedLot(100,parseEther('0.01'));
 const cheapest=await seedLot(500,parseEther('0.02'));await seedLot(500,100,1);
 const{page,context,errors}=await pageFixture();
 try{await connected(page);await preview(page,2);
  assert.match(await page.locator('#sweepLots .sweep-lot').first().innerText(),new RegExp('Lot #'+cheapest));
  assert.equal(await page.locator('#sweepAmount').innerText(),'600 RHSC');assert.equal(await page.locator('#sweepPrice').innerText(),'0.03 ETH');assert.equal(await page.locator('#sweepFee').innerText(),'0.0009 ETH');assert.match(await page.locator('#sweepUsd').innerText(),/90.00/);
  const markup=await page.locator('#sweepLots').innerHTML();assert(!/0x[a-fA-F0-9]{40}/.test(markup));
  await page.screenshot({path:path.join(artifacts,'sweep-desktop-review.png'),fullPage:true});await page.locator('#confirmSweep').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Sweep confirmed'));
  assert.equal(await page.evaluate(()=>window.__sendCount),1);assert.equal(await chain.core.balanceOf('RHSC',chain.signers[1].address),600n);assert.equal((await chain.market.stats('RHSC')).sales,2n);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('mobile 10-lot review fits screen, light theme works and no participant addresses are exposed',async()=>{
 for(let i=0;i<10;i++)await seedLot();const{page,context,errors}=await pageFixture({mobile:true});
 try{await connected(page);await page.locator('#theme').click();await preview(page,10);
  assert.equal(await page.locator('#sweepLots .sweep-lot').count(),10);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('#sweepDialog').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await page.screenshot({path:path.join(artifacts,'sweep-mobile-review.png'),fullPage:true});assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('unknown broadcast is retained across reload and recovered without paying again',async()=>{
 await seedLot();await seedLot();const{page,context,errors}=await pageFixture();
 try{await connected(page);await preview(page,2);await page.evaluate(()=>{window.__walletMode='unresolved';});await page.locator('#confirmSweep').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('retained'));const hash=await page.evaluate(()=>window.__lastHash);
  assert.equal(await chain.core.balanceOf('RHSC',chain.signers[1].address),1000n);await page.reload();await connected(page).catch(()=>{});
  await page.locator('#recovery').waitFor({state:'visible'});await page.locator('#recoveryHash').fill(hash);await page.locator('#recover').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Sweep confirmed'));assert.equal(await page.evaluate(()=>window.__sendCount),0);assert.equal((await chain.market.stats('RHSC')).sales,2n);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('sold lot is caught before wallet submission; wrong helper runtime fails closed',async()=>{
 const a=await seedLot();await seedLot();const{page,context,errors}=await pageFixture();
 try{await connected(page);await preview(page,2);await tx(chain.market.connect(chain.signers[2]).buy(a,{value:parseEther('0.01')}));await page.locator('#confirmSweep').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('no longer available'));assert.equal(await page.evaluate(()=>window.__sendCount),0);
  await preview(page,1);await chain.provider.send('anvil_setCode',[await chain.sweep.getAddress(),'0x00']);await page.locator('#confirmSweep').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Sweep contract verification failed'));assert.equal(await page.evaluate(()=>window.__sendCount),0);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('Sweep and Buy Now share a cross-tab wallet lock',async()=>{
 await seedLot();await seedLot();const{page,context,errors}=await pageFixture();
 try{await connected(page);await preview(page,1);const other=await context.newPage();await other.goto(server.url+'/rh20.html');await connected(other);await other.locator('#lots button').first().click();
  await page.evaluate(()=>{window.__walletMode='hold';});await page.locator('#confirmSweep').click();await page.waitForFunction(()=>!!window.__releaseWallet);
  // The storage event disables checkout in the other tab before another send.
  await other.waitForFunction(()=>document.querySelector('#confirmBuy').disabled);assert.equal(await other.evaluate(()=>window.__sendCount),0);
  await page.evaluate(()=>window.__releaseWallet());await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Sweep confirmed'));
  assert.equal((await chain.market.stats('RHSC')).sales,1n);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('rejection permits a new selection; wallet switch during estimate never broadcasts',async()=>{
 await seedLot();const{page,context,errors}=await pageFixture();
 try{await connected(page);await preview(page,1);await page.evaluate(()=>{window.__walletMode='reject';});await page.locator('#confirmSweep').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('cancelled'));
  assert.equal(await page.locator('#recovery').isHidden(),true);await preview(page,1);
  await page.evaluate(account=>{window.__nextAccount=account;window.__walletMode='switch-during-estimate';},chain.signers[2].address);await page.locator('#confirmSweep').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('changed'));
  assert.equal(await page.evaluate(()=>window.__sendCount),1);assert.equal((await chain.market.stats('RHSC')).sales,0n);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('stale index cannot supply a Sweep quote, and an unpublished helper leaves Buy Now active',async()=>{
 await seedLot();server.setSweepPublished(false);const{page,context,errors}=await pageFixture();
 try{await connected(page);assert.equal(await page.locator('#lots button').isDisabled(),false);await page.locator('#openSweep').click();assert.equal(await page.locator('#confirmSweep').isDisabled(),true);assert.match(await page.locator('#confirmSweep').innerText(),/activation pending/);
  await page.route('**/index-api/functions/v1/zecblocks-rh20-holders?view=market*',async route=>{const response=await route.fetch();const body=await response.json();body.status='delayed';await route.fulfill({response,json:body});});
  await page.locator('#sweepCount').fill('1');await page.locator('#sweepCount').blur();await page.locator('#previewSweep').click();await page.waitForFunction(()=>document.querySelector('#sweepMessage').textContent.includes('syncing'));
  assert.equal(await page.locator('#confirmSweep').isDisabled(),true);assert.equal(await page.evaluate(()=>window.__sendCount),0);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('helper deployment has one wallet transaction and confirmed receipt survives reload',async()=>{
 server.setSweepPublished(false);const{page,context,errors}=await pageFixture({route:'/rh20-sweep-deploy.html'});
 try{await page.locator('#deploy').click();await page.locator('#receipt').waitFor({state:'visible'});const address=await page.locator('#deployedAddress').innerText();
  assert.match(address,/^0x[0-9a-fA-F]{40}$/);assert.equal(await page.evaluate(()=>window.__sendCount),1);assert.equal(await page.locator('#deploy').isDisabled(),true);
  await page.screenshot({path:path.join(artifacts,'sweep-helper-deployed.png'),fullPage:true});await page.reload();await page.locator('#connect').click();await page.locator('#receipt').waitFor({state:'visible'});
  assert.equal(await page.locator('#deployedAddress').innerText(),address);assert.equal(await page.locator('#deploy').isDisabled(),true);assert.equal(await page.evaluate(()=>window.__sendCount),0);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
