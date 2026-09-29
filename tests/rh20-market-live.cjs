'use strict';
// Read-only public deployment checks. No wallet or signer is injected.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {chromium}=require('playwright');
const {JsonRpcProvider,keccak256}=require('ethers');
const {verifyDeployment}=require('../scripts/publish-rh20-market.cjs');
const config=require('../rh20/mainnet.json');
const core=require('../rh20/RH20.json');
const sweepConfig=require('../rh20/sweep.json');
const base='https://www.zecblocks.xyz',root=path.resolve(__dirname,'..');
const files=['rh20-sweep-deploy.html','rh20/sweep.js','rh20/sweep.json','rh20/RH20Sweep.json','rh20/sweep-compiler-input.json','contract/RH20Sweep.sol','rh20.html','rh20/ordinal/block.svg','rh20-deploy.html','rh20/mainnet.json','rh20/market.js','rh20/market.css','rh20/RH20Marketplace.json','rh20/marketplace-compiler-input.json','contract/RH20Marketplace.sol','rh20/RH20.json','index.html'];
const hash=data=>createHash('sha256').update(data).digest('hex');
async function deployed(){let failure;for(let attempt=0;attempt<12;attempt++){try{await Promise.all(files.map(async file=>{const r=await fetch(base+'/'+file+'?release='+Date.now(),{signal:AbortSignal.timeout(12000)});assert.equal(r.status,200,file);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(fs.readFileSync(path.join(root,file))),file);}));return;}catch(e){failure=e;if(attempt<11)await new Promise(r=>setTimeout(r,10000));}}throw failure;}
(async()=>{
 await deployed();
 const provider=new JsonRpcProvider(base+'/api/rh20',4663,{staticNetwork:true,batchMaxCount:1,cacheTimeout:-1});
 try{assert.equal(BigInt(await provider.send('eth_chainId',[])),4663n);assert.equal(keccak256(await provider.getCode(config.coreAddress)),core.runtimeCodeHash);if(config.contractAddress)await verifyDeployment(provider,config.deploymentTxHash);if(sweepConfig.contractAddress)await require('../scripts/publish-rh20-sweep.cjs').verifyDeployment(provider,sweepConfig.deploymentTxHash);}finally{provider.destroy();}
 const rejected=await fetch(base+'/api/rh20',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:47,method:'eth_sendRawTransaction',params:[]}),signal:AbortSignal.timeout(12000)});assert.equal(rejected.status,400);await rejected.arrayBuffer();
 const holderResponse=await fetch(base+'/index-api/functions/v1/zecblocks-rh20-holders',{signal:AbortSignal.timeout(12000)});assert.equal(holderResponse.status,200);
 const holders=await holderResponse.json();assert.equal(holders.chainId,4663);assert.equal(holders.marketplaceAddress,config.contractAddress);assert.equal(holders.status,'ready');assert(Number.isSafeInteger(holders.holders)&&holders.holders>=0);assert(Date.now()-Date.parse(holders.updatedAt)<90000);
 const referenceResponse=await fetch(base+'/api/rh20-price',{signal:AbortSignal.timeout(12000)});assert.equal(referenceResponse.status,200);const reference=await referenceResponse.json();assert.equal(reference.pair,'ETH-USD');assert(Number(reference.usd)>0);assert.equal(reference.status,'ready');
 const boardResponse=await fetch(base+'/index-api/functions/v1/zecblocks-rh20-holders?view=market&offset=0',{signal:AbortSignal.timeout(12000)});assert.equal(boardResponse.status,200);const board=await boardResponse.json();assert.equal(board.sort,'unit-price-asc');assert.equal(board.status,'ready');assert(Array.isArray(board.ids));
 const browser=await chromium.launch({headless:true}),errors=[];
 try{const page=await browser.newPage({viewport:{width:1440,height:1050}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/rh20.html');await page.waitForFunction(()=>!document.querySelector('#status').textContent.startsWith('Loading'));
  await page.waitForFunction(()=>document.querySelector('#activeCount').textContent!=='—',{timeout:20000});
  await page.waitForFunction(()=>/^[0-9,]+$/.test(document.querySelector('#holderCount').textContent));
  await page.waitForFunction(()=>document.querySelector('#priceSource').textContent.includes('Coinbase Exchange'));
  await page.waitForFunction(()=>/^[0-9,]+$/.test(document.querySelector('#totalSupply').textContent));
  const totalSupply=await page.locator('#totalSupply').innerText();assert.equal(totalSupply,'21,000,000');assert.match(await page.locator('#supplyHint').innerText(),/Fully minted/);
  assert.match(await page.locator('#buyPanel .section-heading').innerText(),/Lowest price per RHSC/);
  assert.equal(await page.locator('#sellAction').isDisabled(),!config.contractAddress);
  if(!config.contractAddress)assert.match(await page.locator('#badge').innerText(),/pending/);
  assert.equal(await page.locator('.ordinal-banner').count(),1);
  assert.equal(await page.locator('.ordinal-mint-link').getAttribute('href'),'https://mine.zecblocks.xyz/ordinal.html');
  assert.match(await page.locator('#ordinalBannerTitle').innerText(),/Robinhood Ordinal/);
  assert(await page.locator('.ordinal-banner>img').evaluate(img=>img.complete&&img.naturalWidth>0));
  await page.screenshot({path:path.join(root,'test-results/rh20/live-market.png'),fullPage:true});
  assert.equal(await page.locator('#openSweep').isDisabled(),false);
  await page.locator('#openSweep').click();await page.locator('#sweepDialog').waitFor({state:'visible'});
  if(sweepConfig.contractAddress){
    await page.waitForFunction(()=>!document.querySelector('#confirmSweep').disabled,null,{timeout:30000});
    assert.equal(await page.locator('#confirmSweep').innerText(),'Connect wallet to continue');
    assert.equal(await page.locator('#sweepLots .sweep-lot').count(),5);
    assert.match(await page.locator('#sweepAmount').innerText(),/RHSC/);
    assert.match(await page.locator('#sweepPrice').innerText(),/ETH/);
  }else assert.equal(await page.locator('#confirmSweep').isDisabled(),true);
  await page.screenshot({path:path.join(root,'test-results/rh20/live-sweep.png'),fullPage:true});
  await page.goto(base+'/rh20-sweep-deploy.html');await page.waitForFunction(()=>!document.querySelector('#status').textContent.startsWith('Loading'));
  // The status changes before the asynchronous RPC refresh enables deployment.
  await page.waitForFunction(pinned=>document.querySelector('#deploy').textContent===(pinned?'Sweep deployed':'Deploy Sweep helper') && document.querySelector('#deploy').disabled===pinned,!!sweepConfig.contractAddress,{timeout:20000});
  assert.equal(await page.locator('#deploy').isDisabled(),!!sweepConfig.contractAddress);
  await page.screenshot({path:path.join(root,'test-results/rh20/live-sweep-deploy.png'),fullPage:true});
  await page.goto(base+'/rh20-deploy.html');await page.waitForFunction(()=>!document.querySelector('#status').textContent.startsWith('Loading'));
  await page.waitForFunction(pinned=>document.querySelector('#deploy').disabled===pinned,!!config.contractAddress);
  assert.equal(await page.locator('#deploy').isDisabled(),!!config.contractAddress);
  await page.screenshot({path:path.join(root,'test-results/rh20/live-deploy.png'),fullPage:true});assert.deepEqual(errors,[]);
  console.log(JSON.stringify({live:base,verifiedFiles:files.length,chainId:4663,marketplaceAddress:config.contractAddress,coreVerified:true,sweepAddress:sweepConfig.contractAddress,sweepQuoteReady:!!sweepConfig.contractAddress,ordinalBannerVisible:true,readOnly:true,totalSupply,holders:holders.holders,holderBlock:holders.blockNumber,ethUsd:reference.usd,sortedListings:board.total,pagesVerified:4,pageErrors:0}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
