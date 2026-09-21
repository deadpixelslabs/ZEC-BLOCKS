const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const {chromium}=require('playwright');
let browser,server,url;const root=path.resolve(__dirname,'..');
const owner='a'.repeat(64),other='b'.repeat(64),evm='0x'+'c'.repeat(40);
const now=()=>Math.floor(Date.now()/1000);
function board(){return {generated_at:now(),usdc_listings:Array.from({length:52},(_,i)=>({listing_id:'0x'+String(i+1).padStart(64,'0'),token_id:i+1,status:'active',expires_at:now()+86400,intent_verified:true,ownership_valid:true,indexed_owner_commitment:other,indexed_owner_verified_level:'full',seller_commitment:other,seller_evm:evm,price_usdc:(i+1)*1000000,created_block:1000+i,updated_block:1000+i})),usdc_metrics:{listed:52,sales:128,floor_base_units:'1000000',volume_base_units:'312120000'},indexer_health:{base_usdc:{status:'ok',details:{caught_up:true}}}}}
before(async()=>{
  server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://local').pathname==='/'?'index.html':new URL(req.url,'http://local').pathname);if(!file.startsWith(root)){res.writeHead(403);return res.end()}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end('Not found')}const ext=path.extname(file);res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.webp':'image/webp'})[ext]||'application/octet-stream');res.end(data)})
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true});fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
});
after(async()=>{await browser?.close();await new Promise(resolve=>server?.close(resolve))});
async function pageFixture(){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),requests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.route('**/index-api/**',async route=>{
    const req=route.request(),u=new URL(req.url()),body=req.postDataJSON?.()||{};let data={};
    if(u.pathname.includes('zecblocks_usdc_market_board'))data=board();
    else if(u.pathname.includes('zecblocks_claim_stats'))data={claims_seen:3508,generated_at:now()};
    else if(u.pathname.includes('zecblocks_zec_market_states_snapshot'))data={zec_listing_states:[],generated_at:now()};
    else if(u.pathname.includes('zecblocks_zec_market_metrics'))data={sales:3,volume_base_units:'1100000',generated_at:now()};
    else if(u.pathname.includes('zecblocks_activity_snapshot'))data={events:[],generated_at:now()};
    else if(u.pathname.includes('zecblocks_portfolio_snapshot'))data={tokens:[],active_listings:[],owned_count:0,generated_at:now()};
    else if(u.pathname.includes('/zecblocks_tokens')){const ids=(u.searchParams.get('token_id')||'').match(/\d+/g)||[];data=ids.map(id=>({token_id:Number(id),source_hash:Number(id).toString(16).padStart(64,'f'),source_height:3000000+Number(id),owner_commitment:other,owner_verified_level:'full'}))}
    else if(u.pathname.includes('/functions/'))data=body.action==='account'?{ok:true,account:{balance:210}}:body.action==='status'?{ok:true,signer_configured:true,indexer:{status:'ok',details:{caught_up:true}}}:{ok:true,snapshot:{orders:[],sales:1,volume_usdc_base_units:500000,volume_zat:0}};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
  await page.goto(url);await page.waitForFunction(()=>document.querySelectorAll('#usdcMarketGrid .nft').length===24);
  return {page,requests,errors};
}
test('public browsing paints verified cards without wallet SDK, relays or chain scans',async()=>{
  const {page,requests,errors}=await pageFixture();
  try{assert.equal(await page.locator('#usdcListedCount').innerText(),'52');assert.equal(await page.locator('#claimCount').innerText(),'3,508');
    await page.waitForFunction(()=>document.querySelectorAll('#usdcMarketGrid img').length===24);
    assert.equal(await page.locator('#usdcMarketGrid rect').count(),0);
    assert.equal(requests.some(x=>/ethers|esm\.sh|mainnet\.base/.test(x)),false);assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(root,'test-results/desktop-dark.png'),fullPage:false});
    await page.locator('#themeToggle').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
    await page.screenshot({path:path.join(root,'test-results/desktop-light.png'),fullPage:false});
    await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  }finally{await page.close()}
});
test('USDC search, price sorting and pagination show the expected items',async()=>{
  const {page}=await pageFixture();try{
    await page.locator('#usdcSearch').fill('52');assert.equal(await page.locator('#usdcMarketGrid .nft').count(),1);assert.match(await page.locator('#usdcMarketGrid').innerText(),/#52/);
    await page.locator('#usdcSearch').fill('');await page.locator('#usdcSort').selectOption('priceHigh');assert.match(await page.locator('#usdcMarketGrid .nfttitle').first().innerText(),/#52/);
    await page.locator('#usdcPagination').getByText('Next',{exact:true}).click();assert.match(await page.locator('#usdcPagination').innerText(),/Page 2 of 3/);assert.match(await page.locator('#usdcMarketGrid .nfttitle').first().innerText(),/#28/);
  }finally{await page.close()}
});
test('failed and malformed snapshots keep the last verified board, metrics and claim count',async()=>{
  const {page}=await pageFixture();try{
    const before=await page.locator('#usdcMarketGrid').innerText();
    await page.route('**/rest/v1/rpc/zecblocks_usdc_market_board',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
    await page.evaluate(()=>hydrateServerUsdc());assert.equal(await page.locator('#usdcMarketGrid').innerText(),before);assert.equal(await page.locator('#usdcListedCount').innerText(),'52');
    assert.match(await page.locator('#marketHealth').innerText(),/Connection delayed/);
    await page.route('**/rest/v1/rpc/zecblocks_claim_stats',r=>r.fulfill({status:200,contentType:'application/json',body:'{"claims_seen":3500}'}));await page.evaluate(()=>hydrateServerClaimStats());assert.equal(await page.locator('#claimCount').innerText(),'3,500');
    await page.route('**/rest/v1/rpc/zecblocks_claim_stats',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"Unavailable"}'}));await page.evaluate(()=>hydrateServerClaimStats());assert.equal(await page.locator('#claimCount').innerText(),'3,500');
  }finally{await page.close()}
});
test('a late portfolio response cannot repopulate a disconnected or different wallet',async()=>{
  const {page}=await pageFixture();try{const result=await page.evaluate(async({owner,other})=>{
    let finish;const previous=indexRpc;indexRpc=()=>new Promise(resolve=>finish=resolve);S.ownerCommitment=owner;
    const request=hydrateServerPortfolio(owner);clearNoirSession();S.ownerCommitment=other;
    finish({tokens:[{token_id:1,source_hash:'a'.repeat(64),owner_verified_level:'full'}],active_listings:[],owned_count:1,generated_at:Date.now()});await request;indexRpc=previous;
    return {owner:S.serverPortfolioOwner,size:S.serverPortfolioTokens.size,count:S.serverPortfolioCount}
  },{owner,other});assert.deepEqual(result,{owner:null,size:0,count:0})}finally{await page.close()}
});
test('wallet action gate blocks double clicks and rejects a changed identity before signing',async()=>{
  const {page}=await pageFixture();try{const result=await page.evaluate(async({owner,other})=>{
    S.ownerCommitment=owner;let calls=0,release,entered,stopped=false;
    const started=new Promise(resolve=>entered=resolve),wait=new Promise(resolve=>release=resolve);
    const run=guardedAction(async()=>{calls++;entered();await wait;try{assertWalletAction()}catch(e){stopped=/wallet changed/.test(e.message);throw e}});
    const a=run();await started;const b=run();S.ownerCommitment=other;release();await Promise.all([a,b]);return {calls,stopped}
  },{owner,other});assert.deepEqual(result,{calls:1,stopped:true})}finally{await page.close()}
});
test('ambiguous Noir payment stays recoverable after expiry and a second click never pays again',async()=>{
  const {page}=await pageFixture();try{const result=await page.evaluate(async owner=>{
    S.ownerCommitment=owner;window.confirm=()=>true;let sends=0;
    signDerived=async()=>({pubkey:'01',signature:'02'});rpc=async()=>{sends++;throw Error('Connection lost after submission')};
    zecDirectApi=async action=>action==='buy_challenge'?{challenge_id:'c',message:'test'}:action==='reserve_buy'?{reservation:{reservation_id:'reservation-1'},payment:{to:'t1fixture',amount_zec:'0.01'}}:action==='reservation'?{reservation:{status:'expired',buyer_commitment:owner}}:{ok:true};
    await directZecBuy('ZEC_BLOCK','listing-1');await resumeDirectPayments();await directZecBuy('ZEC_BLOCK','listing-1');
    return {sends,rows:directRecoveryRead(),panel:$('pendingTransactions').textContent}
  },owner);assert.equal(result.sends,1);assert.equal(result.rows.length,1);assert.equal(result.rows[0].ownerCommitment,owner);assert.match(result.panel,/Check wallet history/)}finally{await page.close()}
});
test('browser storage failure stops a Noir payment before money is sent',async()=>{
  const {page}=await pageFixture();try{const result=await page.evaluate(async owner=>{
    S.ownerCommitment=owner;window.confirm=()=>true;let sends=0;
    signDerived=async()=>({pubkey:'01',signature:'02'});rpc=async()=>{sends++;return {txid:'f'.repeat(64)}};
    zecDirectApi=async action=>action==='buy_challenge'?{challenge_id:'c',message:'test'}:{reservation:{reservation_id:'storage-test'},payment:{to:'t1fixture',amount_zec:'0.01'}};
    const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===DIRECT_ZEC_RECOVERY_KEY)throw Error('Storage quota exceeded');return original.call(this,key,value)};
    await directZecBuy('ZEC_BLOCK','storage-listing');Storage.prototype.setItem=original;return sends
  },owner);assert.equal(result,0)}finally{await page.close()}
});
test('Base payment journal preserves the original account and prevents duplicate submissions',async()=>{
  const {page}=await pageFixture();try{const result=await page.evaluate(async({owner,other,evm})=>{
    S.ownerCommitment=owner;S.evmAddress=evm;let sends=0;const txHash='0x'+'f'.repeat(64);
    const contract={getAddress:async()=>CFG.zecsMarketContract,interface:{encodeFunctionData:()=> '0xdeadbeef'},buy:async()=>{sends++;S.ownerCommitment=other;return {hash:txHash,wait:async()=>{throw Error('receipt unavailable')}}}};
    const tx=await sendBaseTransaction(contract,'buy',[],{kind:'zecs',listingId:'order-1'});try{await waitBaseTransaction(tx)}catch{}
    S.ownerCommitment=owner;try{await sendBaseTransaction(contract,'buy',[],{kind:'zecs',listingId:'order-1'})}catch{}
    return {sends,row:baseJournal.read()[0]}
  },{owner,other,evm});assert.equal(result.sends,1);assert.equal(result.row.owner,owner);assert.equal(result.row.status,'broadcast');assert.match(result.row.txHash,/^0xf+$/)}finally{await page.close()}
});
test('an unknown Base submission remains blocked and unacknowledged ZECS receipts are not complete',async()=>{
  const {page}=await pageFixture();try{const result=await page.evaluate(async({owner,evm})=>{
    S.ownerCommitment=owner;S.evmAddress=evm;let sends=0,confirmed=true;
    const c={getAddress:async()=>CFG.zecsMarketContract,interface:{encodeFunctionData:()=> '0xabcd'},buy:async()=>{sends++;throw Error('transport unavailable')}};
    for(let i=0;i<2;i++)try{await sendBaseTransaction(c,'buy',[],{kind:'zecs',listingId:'unknown'})}catch{}
    zecsMarketIndexTx=async()=>({ok:true,contract_logs:0});try{await confirmZecsTransaction('0x'+'f'.repeat(64))}catch{confirmed=false}
    return {sends,confirmed,rows:baseJournal.read().length}
  },{owner,evm});assert.deepEqual(result,{sends:1,confirmed:false,rows:1})}finally{await page.close()}
});
test('mobile navigation, theme and accessible dialogs work without horizontal page overflow',async()=>{
  const {page,errors}=await pageFixture();try{
    await page.setViewportSize({width:390,height:844});
    for(const hash of ['#market','#zec-market','#zecs-market','#activity','#portfolio','#protocol']){await page.goto(url+hash);await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow on '+hash)}
    await page.goto(url);await page.waitForFunction(()=>document.querySelectorAll('#usdcMarketGrid .nft').length===24);
    await page.screenshot({path:path.join(root,'test-results/mobile.png'),fullPage:false});
    await page.evaluate(()=>modal('listingModal',true));assert.equal(await page.locator('#listingModal').getAttribute('aria-modal'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('#listingModal').isVisible(),false);assert.deepEqual(errors,[]);
  }finally{await page.close()}
});

test('NFT and ZECS native buys each make exactly one seller payment and clear settled recovery',async()=>{
  const {page}=await pageFixture();try{const result=await page.evaluate(async owner=>{
    S.ownerCommitment=owner;window.confirm=()=>true;const payments=[];let count=0;
    signDerived=async()=>({pubkey:'01',signature:'02'});
    rpc=async(method,params)=>{payments.push({method,...params[0]});return {txid:'f'.repeat(64)}};
    refreshDirectMarketViews=async()=>{};
    zecDirectApi=async action=>action==='buy_challenge'?{challenge_id:'c',message:'test'}:action==='reserve_buy'?{reservation:{reservation_id:'paid-'+(++count)},payment:{to:'t1SellerFixture',amount_zec:'0.01'}}:action==='submit_payment'?{pending:false,settlement:{verified:true}}:{ok:true,snapshot:{orders:[]}};
    await directZecBuy('ZEC_BLOCK','nft-order');await directZecBuy('ZECS','zecs-order');
    return {payments,pending:directRecoveryRead().length,message:$('toast').textContent}
  },owner);assert.equal(result.payments.length,2);assert.equal(result.pending,0);for(const p of result.payments){assert.equal(p.method,'zcash_sendTransaction');assert.equal(p.to,'t1SellerFixture');assert.equal(p.amount,'0.01')}assert.match(result.message,/settled/)}finally{await page.close()}
});

async function simulatedBaseBuy(page,ambiguous){
  return page.evaluate(async({owner,ambiguous})=>{
    await loadEthers();const original=window.ethers;S.ownerCommitment=owner;S.evmAddress='0x'+'d'.repeat(40);S.evmSigner={signTypedData:async()=> 'fixture'};window.confirm=()=>true;ensureBaseNetwork=async()=>{};
    let payments=0,allowanceBuys=0;
    class Contract{
      constructor(address){this.address=address;this.interface={encodeFunctionData:()=> '0xdeadbeef'}}
      async getAddress(){return this.address}async nonces(){return 0n}async name(){return 'USD Coin'}
      async buyNowWithPermit(){payments++;if(ambiguous)throw Error('RPC disconnected after submission');return {hash:'0x'+'e'.repeat(64),wait:async()=>({status:1,hash:'0x'+'e'.repeat(64),blockNumber:9999})}}
      async buyNow(){allowanceBuys++;throw Error('Unexpected second payment')}
    }
    window.ethers={...original,Contract,Signature:{from:()=>({v:27,r:'0x'+'1'.repeat(64),s:'0x'+'2'.repeat(64)})}};
    usdcListingRailGuard=async()=>({guard:{guard_token:'guard-1'}});
    indexUsdcReceipt=async()=>({ownership:[{token_id:1,owner_commitment:owner,owner_verified_level:'full'}]});
    const listing=S.serverUsdcCanonical.get(1);await buyUsdcListing(listing);
    return {payments,allowanceBuys,pending:baseJournal.read(),message:$('toast').textContent}
  },{owner,ambiguous});
}
test('USDC NFT checkout completes only after receipt and canonical buyer ownership',async()=>{
  const {page}=await pageFixture();try{const result=await simulatedBaseBuy(page,false);assert.equal(result.payments,1);assert.equal(result.allowanceBuys,0);assert.equal(result.pending.length,0);assert.match(result.message,/Purchase complete/)}finally{await page.close()}
});
test('an ambiguous USDC buy never falls back to a second allowance payment',async()=>{
  const {page}=await pageFixture();try{const result=await simulatedBaseBuy(page,true);assert.equal(result.payments,1);assert.equal(result.allowanceBuys,0);assert.equal(result.pending.length,1);assert.equal(result.pending[0].owner,owner);assert.equal(result.pending[0].txHash,undefined)}finally{await page.close()}
});
