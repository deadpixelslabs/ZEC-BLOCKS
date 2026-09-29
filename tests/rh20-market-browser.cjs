'use strict';
const {test,before,after,beforeEach,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {id,parseEther}=require('ethers');
const {startMarket}=require('./helpers/rh20-market-chain.cjs');
const {serve}=require('./helpers/rh20-server.cjs');
let chain,server,browser,snapshot;
const artifacts=path.resolve(__dirname,'../test-results/rh20');
const MINT='{"p":"rh-20","op":"mint","tick":"RHSC","amt":"500"}';
before(async()=>{fs.mkdirSync(artifacts,{recursive:true});chain=await startMarket();server=await serve(chain);browser=await chromium.launch({headless:true});});
beforeEach(async()=>{snapshot=await chain.provider.send('evm_snapshot',[]);server.setPublished(true);server.setAddress(null);});
afterEach(async()=>{await chain.provider.send('evm_revert',[snapshot]);});
after(async()=>{await browser?.close();await server?.close();await chain?.close();});
const tx=async p=>(await p).wait();
async function seedLot(amount=500,price=parseEther('0.01')){
  await tx(chain.core.inscribe(MINT));await tx(chain.core.approve('RHSC',await chain.market.getAddress(),amount));
  await tx(chain.market.createListing('RHSC',amount,price,id('browser-lot-'+await chain.market.nextListingId())));
  return await chain.market.nextListingId()-1n;
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

test('unpublished market is honest and disables trading; mobile theme has no overflow',async()=>{
  server.setPublished(false);const{page,context,errors}=await pageFixture({mobile:true});
  try {await page.waitForFunction(()=>document.querySelector('#badge').textContent.includes('pending'));
    await page.locator('[data-tab="sell"]').click();assert.equal(await page.locator('#sellAction').isDisabled(),true);
    assert.equal(await page.evaluate(()=>window.__sendCount),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.locator('#theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
    await page.screenshot({path:path.join(artifacts,'market-mobile-light.png'),fullPage:true});assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('seller approves, lists and cancels through real contract; balances recover',async()=>{
  await tx(chain.core.connect(chain.signers[1]).inscribe(MINT));const{page,context,errors}=await pageFixture();
  try{await connected(page);await page.locator('[data-tab="sell"]').click();await page.locator('#price').fill('0.01');
    await page.locator('#sellAction').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Approval confirmed'));
    await page.waitForFunction(()=>document.querySelector('#sellAction').textContent==='Create listing');await page.locator('#sellAction').click();
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Listing confirmed'));
    assert.equal(await chain.core.balanceOf('RHSC',chain.signers[1].address),0n);assert.equal(await page.evaluate(()=>window.__sendCount),2);
    await page.locator('[data-tab="owned"]').click();await page.locator('#ownedLots button').click();
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Listing cancelled'));
    assert.equal(await chain.core.balanceOf('RHSC',chain.signers[1].address),500n);assert.equal(await chain.core.mintCount('RHSC',chain.signers[1].address),1n);
    assert.equal(await page.evaluate(()=>window.__sendCount),3);assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('Buy Now shows the exact price, settles once and hides participant identities',async()=>{
  await seedLot();const{page,context,errors}=await pageFixture();
  try{await connected(page);await page.locator('#lots button').click();assert.equal(await page.locator('#buyPrice').innerText(),'0.01 ETH');
    assert.equal(await page.locator('#buyFee').innerText(),'0.0003 ETH');await page.locator('#confirmBuy').click();
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Purchase confirmed'));
    assert.equal(await chain.core.balanceOf('RHSC',chain.signers[1].address),500n);assert.equal(await page.evaluate(()=>window.__sendCount),1);
    await page.locator('[data-tab="activity"]').click();await page.locator('#sales .sale').waitFor();
    const markup=await page.locator('#sales').innerHTML();assert(!markup.includes(chain.signers[0].address));assert(!markup.includes(chain.signers[1].address));
    await page.screenshot({path:path.join(artifacts,'market-sale-confirmed.png'),fullPage:true});assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('ambiguous buy broadcast survives reload and recovers without another purchase',async()=>{
  await seedLot();const{page,context,errors}=await pageFixture();
  try{await connected(page);await page.evaluate(()=>{window.__walletMode='unresolved';});await page.locator('#lots button').click();await page.locator('#confirmBuy').click();
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('retained'));const hash=await page.evaluate(()=>window.__lastHash);
    assert.equal(await chain.core.balanceOf('RHSC',chain.signers[1].address),500n);
    await page.reload();await page.locator('#connect').click();await page.locator('#recovery').waitFor({state:'visible'});
    await page.locator('#recoveryHash').fill(hash);await page.locator('#recover').click();
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Purchase confirmed'));
    assert.equal(await page.evaluate(()=>window.__sendCount),0);assert.equal((await chain.market.stats('RHSC')).sales,1n);assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('wallet rejection clears the request and an account switch cannot use another sellers listing',async()=>{
  await seedLot();const{page,context}=await pageFixture();
  try{await connected(page);await page.evaluate(()=>{window.__walletMode='reject';});await page.locator('#lots button').click();await page.locator('#confirmBuy').click();
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('cancelled'));assert.equal(await page.locator('#recovery').isVisible(),false);
    assert.equal((await chain.market.stats('RHSC')).active,1n);
    await page.evaluate(address=>window.__setWalletAccount(address),chain.signers[0].address);
    await page.waitForFunction(()=>document.querySelector('#lots button').textContent==='Cancel listing');
    await page.evaluate(address=>window.__setWalletAccount(address),chain.signers[2].address);
    await page.waitForFunction(()=>document.querySelector('#lots button').textContent==='Buy Now');
  }finally{await context.close();}
});
test('wrong marketplace runtime prevents wallet transactions',async()=>{
  server.setAddress(chain.signers[5].address);const{page,context}=await pageFixture();
  try{await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('verification failed'));assert.equal(await page.locator('#sellAction').isDisabled(),true);assert.equal(await page.evaluate(()=>window.__sendCount),0);}finally{await context.close();}
});
test('deployment produces exact marketplace, keeps receipt and prevents another deployment',async()=>{
  server.setPublished(false);const{page,context,errors}=await pageFixture({route:'/rh20-deploy.html',wallet:0});
  try{await page.locator('#deploy').click();await page.locator('#receipt').waitFor({state:'visible',timeout:20000});
    const address=await page.locator('#deployedAddress').innerText();assert.match(address,/^0x[0-9a-fA-F]{40}$/);
    assert.equal(await chain.market.attach(address).TREASURY(),require('../rh20/mainnet.json').treasury);
    assert.equal(await page.evaluate(()=>window.__sendCount),1);await page.screenshot({path:path.join(artifacts,'market-deployment.png'),fullPage:true});
    await page.reload();await page.locator('#connect').click();await page.locator('#receipt').waitFor({state:'visible'});
    assert.equal(await page.locator('#deployedAddress').innerText(),address);assert.equal(await page.locator('#deploy').isDisabled(),true);assert.equal(await page.evaluate(()=>window.__sendCount),0);assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('desktop available lots render verified inventory without public seller addresses',async()=>{
  await seedLot(100,parseEther('0.002'));await seedLot(500,parseEther('0.009'));await seedLot(250,parseEther('0.0045'));
  const{page,context,errors}=await pageFixture();try{await page.locator('#lots .lot').first().waitFor();
    assert.equal(await page.locator('#lots .lot').count(),3);assert(!(await page.locator('#lots').innerHTML()).toLowerCase().includes(chain.signers[0].address.toLowerCase()));
    await page.screenshot({path:path.join(artifacts,'market-desktop.png'),fullPage:true});assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
test('rapid clicks and a second tab cannot duplicate a wallet purchase',async()=>{
  await seedLot();const{page,context}=await pageFixture();
  try{await connected(page);await page.evaluate(()=>{window.__walletMode='hold';});await page.locator('#lots button').click();
    await page.evaluate(()=>{document.querySelector('#confirmBuy').click();document.querySelector('#confirmBuy').click();});
    await page.waitForFunction(()=>typeof window.__releaseWallet==='function');
    const other=await context.newPage();await other.goto(server.url+'/rh20.html');await other.locator('#connect').click();
    await other.locator('#recovery').waitFor({state:'visible'});assert.equal(await other.locator('#lots button').isDisabled(),true);
    assert.equal(await other.evaluate(()=>window.__sendCount),0);
    await page.evaluate(()=>window.__releaseWallet());await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Purchase confirmed'));
    assert.equal(await page.evaluate(()=>window.__sendCount),1);assert.equal((await chain.market.stats('RHSC')).sales,1n);
    await other.locator('#recovery').waitFor({state:'hidden'});
  }finally{await context.close();}
});
test('wallet changes during preflight stop signing and storage failure stops broadcasting',async()=>{
  await seedLot();const{page,context}=await pageFixture();
  try{await connected(page);await page.evaluate(address=>{window.__nextAccount=address;window.__walletMode='switch-during-estimate';},chain.signers[2].address);
    await page.locator('#lots button').click();await page.locator('#confirmBuy').click();
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('changed'));
    assert.equal(await page.evaluate(()=>window.__sendCount),0);
    await page.evaluate(()=>{window.__walletMode='normal';const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('rh20-market:'))throw new Error('Storage unavailable');return original.call(this,key,value);};});
    await page.locator('#lots button').click();await page.locator('#confirmBuy').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Storage unavailable'));
    assert.equal(await page.evaluate(()=>window.__sendCount),0);assert.equal((await chain.market.stats('RHSC')).sales,0n);
  }finally{await context.close();}
});
test('holder snapshots refresh and an outage preserves the last count without disabling trading',async()=>{
  server.setHolders({holders:2,status:'ready'});const{page,context,errors}=await pageFixture();
  try{await page.waitForFunction(()=>document.querySelector('#holderCount').textContent==='2');
    server.setHolders({holders:3,status:'ready'});await page.locator('#refresh').click();await page.waitForFunction(()=>document.querySelector('#holderCount').textContent==='3');
    server.setHolders({error:true});await page.locator('#refresh').click();await page.waitForFunction(()=>document.querySelector('#holderHint').textContent==='Update delayed');
    assert.equal(await page.locator('#holderCount').innerText(),'3');assert.equal(await page.locator('#sellAction').isDisabled(),false);assert.deepEqual(errors,[]);
  }finally{server.setHolders({holders:2,status:'ready'});await context.close();}
});
test('global cheapest-per-RHSC order survives pagination and USD estimates never alter the ETH payment',async()=>{
  for(let i=0;i<12;i++)await seedLot(100,parseEther('0.001'));
  const cheapest=await seedLot(500,parseEther('0.002'));server.setPrice({usd:'3000',status:'ready'});
  const{page,context,errors}=await pageFixture({mobile:true});
  try{
    await page.waitForFunction(()=>document.querySelector('#lots .unit-usd')?.textContent.includes('$0.012'));
    assert.match(await page.locator('#lots .lot-top').first().innerText(),new RegExp('Lot #'+cheapest+'$'));
    assert.match(await page.locator('#lots .unit-price').first().innerText(),/0.000004 ETH/);
    await page.locator('#next').click();await page.waitForFunction(()=>document.querySelector('#pageNumber').textContent==='Page 2'&&document.querySelectorAll('#lots .lot').length===1);assert.equal(await page.locator('#lots .lot').count(),1);
    await page.locator('#prev').click();await page.waitForFunction(()=>document.querySelector('#lots .unit-usd')?.textContent.includes('$0.012'));
    await page.locator('#lots button').first().click();assert.equal(await page.locator('#buyPrice').innerText(),'0.002 ETH');assert.match(await page.locator('#buyUsd').innerText(),/\$6\.00 total/);
    server.setPrice({error:true});await page.locator('#closeDialog').click();await page.locator('#refresh').click();await page.waitForFunction(()=>document.querySelector('#priceSource').textContent.includes('delayed'));
    assert.equal(await page.locator('#lots button').first().isDisabled(),false);assert.match(await page.locator('#lots .unit-usd').first().innerText(),/delayed rate/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(artifacts,'market-unit-price-usd-mobile.png'),fullPage:true});assert.deepEqual(errors,[]);
  }finally{server.setPrice({usd:'3000',status:'ready'});await context.close();}
});
