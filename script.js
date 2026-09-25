
'use strict';
const CFG={
  genesisTxid:'ecf6fc3a79885f573d79de70a2de85c34667fc1a4fefe034d3a4015269379f0f',
  mailbox:'u1qqjyaypzmvgfnc9uatk5t0f6hmge6htpfck3d366nhx94450crtznujwn8kql9u39uzdqcdg8flzk3tmf32j2p4u0xvx370xwcjjsrmd',
  treasury:'t1b9PCdoCncgoc13CWwWz8tzZZLDYfMaTyz',
  supply:5000,claimLimit:4444,powBits:26,freeClaims:500,paidClaimFeeZat:130000,marketFeeBps:300,
  explorer:'/api/zcash',
  relays:['wss://relay.damus.io','wss://nos.lol','wss://relay.primal.net','wss://relay.nostr.band','wss://relay.snort.social','wss://nostr.mom'],
  nostrKind:30078,relayTag:'zb1-mainnet-v1',
  baseChainId:8453,
  baseChainHex:'0x2105',
  baseRpc:'https://mainnet.base.org',
  baseUsdc:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  usdcTreasury:'0x2505036508a68bacd86a4f48642fb7e9432e583d',
  // Production ZB1BaseUSDCBuyNow on Base Mainnet.
  usdcMarketContract:'0x7674a240004fa434bb1082de28e591abb1dc645d',
  // Production ZECS / ZB-20 Base USDC Market V2.
  zecsMarketContract:'0xbf0677cd230b7835ee7e81fbe993f0389deaead8',
  zecsDeployTxid:'5bde45c224ae58a41bdd72ab0bfdfe36a23a4d3aa5335381842e19fdac02e5ed',
  atomicLockSeconds:3600,atomicPayCutoffSeconds:900,atomicAnchorZat:10000,atomicMarkerZat:10000,atomicLockConfirmations:3,atomicFeeStepConfirmations:1,atomicFinalConfirmations:6,atomicFundedGraceSeconds:3600,atomicFinalityGraceSeconds:7200
};
const INDEX_CFG={
  // Same-origin canonical API. Vercel proxies /index-api/* to production Supabase
  // so browser CORS/privacy extensions cannot stall the marketplace board.
  url:'/index-api',
  key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2d3ZlbnlvbWx3dmp0d3hhc2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MjIwMTcsImV4cCI6MjEwNDE5ODAxN30.RLGs8yTBd0JyRdHlv63YzLHJ7t8qPNHqZWN3WRu00VY'
};
console.info('ZEC BLOCKS MARKETPLACE V13.0.1 · VERIFIED MARKET DATA');
const S={provider:null,connection:null,pubkey:null,ownerCommitment:null,balance:null,genesisHeight:null,target:null,proof:null,workers:[],mining:false,hashes:0,startMs:0,relay:null,nostr:null,events:[],claims:new Map(),transfers:[],listings:new Map(),offers:[],nostrSk:null,nostrPk:null,currentOfferListing:null,relayHealth:new Map(),didRepair:false,walletRecovered:new Map(),walletRecoveredClaims:new Map(),atomicLocks:new Map(),atomicSettlements:new Map(),confirmedLocks:new Map(),verifiedAtomic:new Map(),atomicWatchBusy:false,atomicWatchTimer:null,portfolioSourceCache:new Map(),portfolioSourcePending:new Set(),relayFetchBusy:false,lastRelayFetch:0,liveDiscoverySub:null,liveDiscoveryEvents:new Map(),liveRenderTimer:null,historicalSettlementRecoveryBusy:false,evmProvider:null,evmSigner:null,evmAddress:null,usdcEvents:new Map(),usdcOnchain:new Map(),usdcVerifiedSettlements:new Map(),usdcReconciling:false,usdcScanBlock:0,walletHistoryBusy:false,serverUsdcMetrics:null,serverZecMetrics:null,serverUsdcCanonical:new Map(),serverUsdcSnapshotAt:0,usdcLiveOverlay:new Map(),usdcLiveTombstones:new Map(),usdcLiveBlock:0,usdcLiveSyncing:false,usdcFastSyncing:false,usdcFastIds:new Set(),usdcFastFingerprint:'',usdcVerifiedIntentIds:new Set(),serverIndexing:false,serverPortfolioLoaded:new Set(),serverPortfolioOwner:null,serverPortfolioTokens:new Map(),serverPortfolioActiveListings:new Map(),serverPortfolioCount:0,serverPortfolioListingCount:0,serverPortfolioGeneratedAt:0,serverPortfolioTimer:null,serverRelayIndexing:false,serverOwners:new Map(),serverZecOwners:new Map(),serverZecMarketReady:false,serverIndexerHealth:{},serverUsdcScannedTo:0,serverUsdcRequestSeq:0,serverUsdcAppliedSeq:0,serverUsdcGeneratedAt:0,serverUsdcFingerprint:'',serverMarketEvents:new Map(),serverActivity:[],serverActivityGeneratedAt:0,usdcListingBusy:new Set(),usdcBuyBusy:new Set(),zecsMarketSnapshot:null,zecsMarketAccount:null,zecsMarketBackend:null,zecsMarketBusy:false,zecsZecSnapshot:null,zecDirectBusy:false};
const $=id=>document.getElementById(id); const enc=new TextEncoder();
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function toast(msg,ms=4200){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),ms)}
function short(v,n=8){v=String(v||'');return v.length>n*2+1?v.slice(0,n)+'…'+v.slice(-n):v}
function hexToBytes(hex){hex=hex.replace(/^0x/,'');if(hex.length%2)hex='0'+hex;const a=new Uint8Array(hex.length/2);for(let i=0;i<a.length;i++)a[i]=parseInt(hex.slice(i*2,i*2+2),16);return a}
function bytesToHex(a){return [...a].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function sha256Bytes(bytes){return new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))}
async function sha256HexBytes(bytes){return bytesToHex(await sha256Bytes(bytes))}
function u32le(n){const a=new Uint8Array(4);new DataView(a.buffer).setUint32(0,n,true);return a}
function u64le(n){let x=BigInt(n),a=new Uint8Array(8);for(let i=0;i<8;i++){a[i]=Number(x&255n);x>>=8n}return a}
function concat(...arr){const n=arr.reduce((s,a)=>s+a.length,0),o=new Uint8Array(n);let p=0;for(const a of arr){o.set(a,p);p+=a.length}return o}
function leadingZeroBits(bytes){let n=0;for(const b of bytes){if(b===0){n+=8;continue}for(let m=0x80;(b&m)===0;m>>=1)n++;break}return n}
function formatRate(hps){if(hps>=1e6)return (hps/1e6).toFixed(2)+' MH/s';if(hps>=1e3)return (hps/1e3).toFixed(1)+' kH/s';return Math.round(hps)+' H/s'}
function decimalValid(v){return /^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(String(v))&&Number(v)>0}
function zecToZat(v){
  const s=String(v??'').trim();
  if(!/^\d+(?:\.\d{1,8})?$/.test(s))return null;
  const [w,f='']=s.split('.');
  return BigInt(w)*100000000n+BigInt((f+'00000000').slice(0,8))
}
function zatToZec(z){
  z=BigInt(z);const w=z/100000000n,f=(z%100000000n).toString().padStart(8,'0').replace(/0+$/,'');
  return f?`${w}.${f}`:String(w)
}
function atomicSplit(price){
  const total=zecToZat(price);if(total==null||total<=1n)throw new Error('Sale price is too small.');
  let fee=(total*BigInt(CFG.marketFeeBps)+5000n)/10000n;
  if(fee<1n)fee=1n;
  if(fee>=total)throw new Error('Sale price is too small for the protocol fee.');
  const seller=total-fee;
  return {total,fee,seller,feeZec:zatToZec(fee),sellerZec:zatToZec(seller),totalZec:zatToZec(total)}
}
async function noirSettlementTagZat(lockSeed){
  const h=await sha256Bytes(enc.encode('ZB1:NOIR_SETTLEMENT_TAG:v1|'+lockSeed));
  const n=((h[0]<<8)|h[1])%9999;
  return BigInt(n+1)
}
async function noirPaymentAmount(price,lockSeed,used=[]){
  const base=zecToZat(price);if(base==null||base<=0n)throw new Error('Invalid sale price.');
  let tag=await noirSettlementTagZat(lockSeed);
  const taken=new Set(used.map(x=>String(x)));
  for(let i=0;i<9999;i++){
    const pay=base+tag;
    if(!taken.has(String(pay)))return {base,tag,pay,paymentZec:zatToZec(pay)};
    tag=(tag%9999n)+1n
  }
  throw new Error('Could not derive a unique payment amount for this seller.')
}

function sigPub(s){return s?.pubkey||s?.publicKey||''}
function sigVal(s){return s?.signature||s?.sig||''}

const B58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function bytesToBigIntBE(b){let x=0n;for(const v of b)x=(x<<8n)|BigInt(v);return x}
function bigIntTo32(x){const b=new Uint8Array(32);for(let i=31;i>=0;i--){b[i]=Number(x&255n);x>>=8n}return b}
function base58Encode(bytes){
  let x=bytesToBigIntBE(bytes),s='';
  while(x>0n){const r=Number(x%58n);s=B58[r]+s;x/=58n}
  for(let i=0;i<bytes.length&&bytes[i]===0;i++)s='1'+s;
  return s||'1'
}
async function p2pkhAddressFrom20(h20){
  if(!(h20 instanceof Uint8Array)||h20.length!==20)throw new Error('Invalid P2PKH hash.');
  const payload=concat(new Uint8Array([0x1c,0xb8]),h20);
  const c1=await sha256Bytes(payload),c2=await sha256Bytes(c1);
  return base58Encode(concat(payload,c2.slice(0,4)))
}
async function deterministicP2pkh(label){
  const h=await sha256Bytes(enc.encode(label));
  return p2pkhAddressFrom20(h.slice(0,20))
}
function compactSize(n){
  if(n<=0xfc)return new Uint8Array([n]);
  if(n<=0xffff)return new Uint8Array([0xfd,n&255,(n>>8)&255]);
  const b=new Uint8Array(5);b[0]=0xfe;new DataView(b.buffer).setUint32(1,n,true);return b
}
async function doubleSha256(b){return sha256Bytes(await sha256Bytes(b))}
const SP=0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
const SN=0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const SG={x:0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,y:0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n};
function smod(a,m){const r=a%m;return r<0n?r+m:r}
function spow(a,e,m){let r=1n;a=smod(a,m);while(e>0n){if(e&1n)r=r*a%m;a=a*a%m;e>>=1n}return r}
function sinv(a,m){if(smod(a,m)===0n)throw new Error('EC inverse of zero');return spow(a,m-2n,m)}
function pneg(P){return P?{x:P.x,y:smod(-P.y,SP)}:null}
function padd(P,Q){
  if(!P)return Q;if(!Q)return P;
  if(P.x===Q.x&&smod(P.y+Q.y,SP)===0n)return null;
  let m;
  if(P.x===Q.x&&P.y===Q.y){
    if(P.y===0n)return null;
    m=smod(3n*P.x*P.x*sinv(2n*P.y,SP),SP)
  }else m=smod((Q.y-P.y)*sinv(Q.x-P.x,SP),SP);
  const x=smod(m*m-P.x-Q.x,SP),y=smod(m*(P.x-x)-P.y,SP);
  return {x,y}
}
function pmul(k,P){
  if(!P||k===0n)return null;
  if(k<0n)return pmul(-k,pneg(P));
  let R=null,Q=P;
  while(k>0n){if(k&1n)R=padd(R,Q);Q=padd(Q,Q);k>>=1n}
  return R
}
function pointFromX(x,odd){
  if(x<0n||x>=SP)return null;
  const y2=smod(x*x*x+7n,SP),y0=spow(y2,(SP+1n)/4n,SP);
  if(smod(y0*y0-y2,SP)!==0n)return null;
  const y=Boolean(y0&1n)===Boolean(odd)?y0:SP-y0;
  return {x,y}
}
function pointFromPubkey(hex){
  const b=hexToBytes(String(hex||'').replace(/^0x/,''));
  if(b.length===33&&(b[0]===2||b[0]===3))return pointFromX(bytesToBigIntBE(b.slice(1)),b[0]===3);
  if(b.length===65&&b[0]===4){
    const P={x:bytesToBigIntBE(b.slice(1,33)),y:bytesToBigIntBE(b.slice(33,65))};
    if(smod(P.y*P.y-(P.x*P.x*P.x+7n),SP)!==0n)return null;return P
  }
  return null
}
async function verifyZcashCompactSignature(message,signature,pubkey){
  try{
    const clean=String(signature||'').toLowerCase().replace(/^0x/,'');
    if(!/^[0-9a-f]{130}$/.test(clean))return false;
    const sb=hexToBytes(clean),header=sb[0];
    if(header<27||header>34)return false;
    const compressed=header>=31,rec=compressed?header-31:header-27;
    if(rec<0||rec>3)return false;
    const r=bytesToBigIntBE(sb.slice(1,33)),s=bytesToBigIntBE(sb.slice(33,65));
    if(r<=0n||r>=SN||s<=0n||s>=SN)return false;
    const x=r+BigInt(rec>>1)*SN;if(x>=SP)return false;
    const R=pointFromX(x,(rec&1)===1);if(!R||pmul(SN,R)!==null)return false;
    const prefix='Zcash Signed Message:\n',pb=enc.encode(prefix),mb=enc.encode(message);
    const payload=concat(compactSize(prefix.length),pb,compactSize(message.length),mb);
    const h=await doubleSha256(payload),e=bytesToBigIntBE(h)%SN;
    const Q=pmul(sinv(r,SN),padd(pmul(s,R),pneg(pmul(e,SG))));
    const E=pointFromPubkey(pubkey);
    return !!Q&&!!E&&Q.x===E.x&&Q.y===E.y
  }catch(e){console.warn('signature verify',e);return false}
}

function indexHeaders(){return {'apikey':INDEX_CFG.key,'Content-Type':'application/json'}}
async function indexRpc(name,args={}){
  return MarketRuntime.singleFlight('rpc:'+name+JSON.stringify(args),()=>MarketRuntime.requestJSON(`${INDEX_CFG.url}/rest/v1/rpc/${name}`,{method:'POST',headers:indexHeaders(),body:JSON.stringify(args),cache:'no-store'}))
}
async function indexFunction(name,body={}){
  // Mutation requests are never automatically retried or deduplicated.
  const readOnly=['snapshot','account','status','reservation','resolve'].includes(body.action);
  const work=()=>MarketRuntime.requestJSON(`${INDEX_CFG.url}/functions/v1/${name}`,{method:'POST',headers:indexHeaders(),body:JSON.stringify(body)},readOnly?18000:55000);
  return readOnly?MarketRuntime.singleFlight(name+JSON.stringify(body),work):work()
}
async function indexUsdcReceipt(txHash,intent=null){
  let last=null;
  for(const delay of [0,500,1200]){
    if(delay)await new Promise(r=>setTimeout(r,delay));
    try{
      const body={tx_hash:String(txHash||'').toLowerCase()};
      if(intent)body.intent=intent;
      const j=await indexFunction('zecblocks-index-usdc',body);
      if(intent&&j?.intent?.verified!==true)throw new Error('USDC intent was not canonically verified.');
      return j
    }catch(e){last=e}
  }
  throw last||new Error('USDC canonical indexing failed.')
}
async function usdcListingRailGuard(action,tokenId,extra={}){
  return indexFunction('zecblocks-usdc-buy-preflight',{action,tokenId,...extra})
}
const USDC_PURCHASE_RECOVERY_KEY='zb1_usdc_purchase_recovery_v2';
function loadUsdcPurchaseRecoveries(){
  try{const a=JSON.parse(localStorage.getItem(USDC_PURCHASE_RECOVERY_KEY)||'[]');return Array.isArray(a)?a:[]}catch{return[]}
}
function saveUsdcPurchaseRecovery(row){
  if(!row?.txHash)return;
  const a=loadUsdcPurchaseRecoveries(),tx=String(row.txHash).toLowerCase();
  const i=a.findIndex(x=>String(x.txHash||'').toLowerCase()===tx);
  const next={...row,txHash:tx,updatedAt:Date.now()};
  if(i>=0)a[i]={...a[i],...next};else a.push(next);
  safeLocalSet(USDC_PURCHASE_RECOVERY_KEY,JSON.stringify(a.slice(-50)))
}
function dropUsdcPurchaseRecovery(txHash){
  const tx=String(txHash||'').toLowerCase(),a=loadUsdcPurchaseRecoveries().filter(x=>String(x.txHash||'').toLowerCase()!==tx);
  safeLocalSet(USDC_PURCHASE_RECOVERY_KEY,JSON.stringify(a))
}
async function finalizeUsdcCanonicalOwnership(entry,{quiet=false}={}){
  const txHash=String(entry?.txHash||'').toLowerCase(),tokenId=Number(entry?.tokenId),buyer=dbCommitment(entry?.buyerCommitment);
  if(!/^0x[0-9a-f]{64}$/.test(txHash)||!Number.isInteger(tokenId)||tokenId<1||tokenId>CFG.supply||!buyer)return false;
  let last=null;
  try{
    const idx=await indexUsdcReceipt(txHash);
    const row=(Array.isArray(idx?.ownership)?idx.ownership:[]).find(x=>Number(x.token_id)===tokenId);
    const canonical=dbCommitment(row?.owner_commitment);
    if(canonical===buyer&&String(row?.owner_verified_level||'')==='full'){
      dropUsdcPurchaseRecovery(txHash);dropBaseTransaction(txHash);
      if(S.ownerCommitment===buyer)await hydrateServerPortfolio(buyer).catch(()=>{});
      await hydrateServerUsdc().catch(()=>{});
      rebuildState();renderPortfolio();renderUsdcMarket();updateUsdcMarketMetrics();
      if(!quiet)toast(`Purchase complete · ZEC BLOCK #${tokenId} is now in the canonical buyer portfolio.`,9000);
      return true
    }
    last=new Error('Canonical ownership is still finalizing.')
  }catch(e){last=e}
  if(!quiet)toast('Payment confirmed. Your NFT is being added to your portfolio. No further payment is needed.',12000);
  console.warn('USDC purchase ownership finalization pending',entry,last);
  return false
}
async function resumeUsdcPurchaseRecoveries(){
  if(S.usdcRecoveryBusy)return;
  const mine=dbCommitment(S.ownerCommitment);
  if(!mine)return;
  const rows=loadUsdcPurchaseRecoveries().filter(x=>dbCommitment(x.buyerCommitment)===mine);
  if(!rows.length)return;
  S.usdcRecoveryBusy=true;
  try{
    for(const row of rows.slice(0,10)){
      try{await finalizeUsdcCanonicalOwnership(row,{quiet:true})}
      catch(e){console.warn('USDC purchase recovery',row?.txHash,e)}
    }
  }finally{S.usdcRecoveryBusy=false}
}

async function kickServerRelayIndexer(){
  if(S.serverRelayIndexing)return;S.serverRelayIndexing=true;
  try{
    await indexFunction('zecblocks-ingest-relay',{}).catch(e=>console.warn('relay ingest',e));
    await indexFunction('zecblocks-verify-events',{}).catch(e=>console.warn('event verifier',e));
    indexFunction('zecblocks-index-zec-sales',{}).catch(e=>console.warn('zec settlement indexer',e));
    await indexFunction('zecblocks-claim-tail',{}).catch(e=>console.warn('claim tail',e));
    if(S.ownerCommitment)await hydrateServerPortfolio(S.ownerCommitment)
  }catch(e){console.warn('server production index pipeline',e)}finally{S.serverRelayIndexing=false}
}
function dbCommitment(v){const x=String(v||'').replace(/^0x/,'').toLowerCase();return /^[0-9a-f]{64}$/.test(x)?x:''}
function dbBytes32(v){const x=dbCommitment(v);return x?'0x'+x:'0x'+'0'.repeat(64)}
function dbStatus(v){return v==='active'?1:v==='sold'?2:v==='cancelled'?3:v==='expired'?3:Number(v)||0}
async function hydrateUsdcFastListings(){
  if(S.usdcFastSyncing)return 0;
  S.usdcFastSyncing=true;
  try{
    const nowSec=Math.floor(Date.now()/1000);
    const headers={'apikey':INDEX_CFG.key,'Cache-Control':'no-cache','Pragma':'no-cache'};
    const q=new URLSearchParams({
      select:'listing_id,token_id,seller_commitment,seller_evm,price_usdc,expires_at,listing_nonce,zb1_listing_hash,status,buyer_evm,buyer_commitment,created_block,updated_block,settled_at,intent_verified,intent_message,intent_pubkey,intent_signature,intent_event_key,updated_at',
      status:'eq.active',
      intent_verified:'eq.true',
      expires_at:`gt.${nowSec}`,
      order:'created_block.desc',
      limit:'500'
    });
    const lr=await fetch(`${INDEX_CFG.url}/rest/v1/zecblocks_usdc_listings?${q}`,{headers,cache:'no-store'});
    if(!lr.ok)throw new Error(`Fast USDC listings HTTP ${lr.status}`);
    const listings=await lr.json();
    const tokenIds=[...new Set((Array.isArray(listings)?listings:[]).map(x=>Number(x.token_id)).filter(x=>Number.isInteger(x)&&x>0&&x<=CFG.supply))];

    const owners=new Map();
    for(let i=0;i<tokenIds.length;i+=100){
      const chunk=tokenIds.slice(i,i+100);
      if(!chunk.length)continue;
      const tq=new URLSearchParams({
        select:'token_id,owner_commitment,owner_verified_level,owner_source',
        token_id:`in.(${chunk.join(',')})`
      });
      const tr=await fetch(`${INDEX_CFG.url}/rest/v1/zecblocks_tokens?${tq}`,{headers,cache:'no-store'});
      if(!tr.ok)throw new Error(`Fast owner index HTTP ${tr.status}`);
      for(const t of await tr.json()){
        const owner=dbCommitment(t.owner_commitment),level=String(t.owner_verified_level||'provisional');
        if(owner)owners.set(Number(t.token_id),{owner,level,source:String(t.owner_source||'server-fast')})
      }
    }

    const nextIds=new Set(),byToken=new Map();
    for(const x of (Array.isArray(listings)?listings:[])){
      const id=String(x.listing_id||'').toLowerCase();
      const tokenId=Number(x.token_id),sellerCommit=dbCommitment(x.seller_commitment),owner=owners.get(tokenId);
      if(!/^0x[0-9a-f]{64}$/.test(id)||!sellerCommit||!owner?.owner||x.intent_verified!==true)continue;
      if(!['signature','chain','full'].includes(String(owner.level||'')))continue;
      if(owner.owner!==sellerCommit)continue;

      const prev=S.usdcOnchain.get(id)||{};
      const dbIntent={
        listingId:id,tokenId,sellerCommitment:sellerCommit,sellerEvm:String(x.seller_evm||''),
        priceUSDC:String(x.price_usdc||0),expires:Number(x.expires_at||0),
        listingNonce:String(x.listing_nonce||''),zb1ListingHash:String(x.zb1_listing_hash||''),
        message:String(x.intent_message||''),pubkey:String(x.intent_pubkey||''),signature:String(x.intent_signature||'')
      };
      const row={
        ...prev,listingId:id,tokenId,seller:String(x.seller_evm||'').toLowerCase(),
        sellerCommitment:'0x'+sellerCommit,priceUSDC:String(x.price_usdc||0),
        expiresAt:Number(x.expires_at||0),listingNonce:String(x.listing_nonce||''),
        zb1ListingHash:String(x.zb1_listing_hash||''),status:1,
        buyer:String(x.buyer_evm||'0x0000000000000000000000000000000000000000'),
        buyerCommitment:dbBytes32(x.buyer_commitment),settledAt:Number(x.settled_at||0),
        createdBlock:Number(x.created_block||0),updatedBlock:Number(x.updated_block||x.created_block||0),
        relay:prev.relay||null,verifiedIntent:!!prev.verifiedIntent,
        serverIntentVerified:!!x.intent_verified,serverOwnerCommitment:owner.owner,
        serverOwnerVerifiedLevel:owner.level,serverIndexed:true,fastCanonical:true
      };
      if(row.serverIntentVerified){
        S.usdcVerifiedIntentIds.add(id)
      }else if(dbIntent.message&&dbIntent.pubkey&&dbIntent.signature){
        row.verifiedIntent=await verifyUsdcRelayListing(dbIntent,row);
        if(row.verifiedIntent)S.usdcVerifiedIntentIds.add(id)
      }
      const old=byToken.get(tokenId);
      if(!old||usdcListingFreshness(row)>usdcListingFreshness(old)||(usdcListingFreshness(row)===usdcListingFreshness(old)&&id>String(old.listingId||'')))byToken.set(tokenId,row)
    }

    for(const row of byToken.values()){
      const id=String(row.listingId).toLowerCase();
      nextIds.add(id);
      S.usdcOnchain.set(id,row);
      S.usdcLiveTombstones.delete(id);
      S.usdcLiveOverlay.set(id,row);
      S.serverOwners.set(Number(row.tokenId),{
        owner:String(row.serverOwnerCommitment||'').toLowerCase(),
        level:String(row.serverOwnerVerifiedLevel||'full'),
        source:'server-fast'
      })
    }

    for(const id of S.usdcFastIds){
      if(nextIds.has(id))continue;
      S.usdcLiveOverlay.delete(id);
      S.usdcLiveTombstones.set(id,{status:0,block:0,at:Date.now()})
    }
    S.usdcFastIds=nextIds;
    const serverCaughtUp=S.serverIndexerHealth?.base_usdc?.status==='ok'&&S.serverIndexerHealth?.base_usdc?.details?.caught_up===true;
    if(serverCaughtUp&&S.serverUsdcScannedTo>0){
      for(const [id,row] of S.usdcLiveOverlay){
        const b=Number(row?.updatedBlock||row?.createdBlock||0);
        if(!b||b<=S.serverUsdcScannedTo)S.usdcLiveOverlay.delete(id)
      }
    }
    const fingerprint=[...byToken.values()]
      .sort((a,b)=>Number(a.tokenId)-Number(b.tokenId))
      .map(x=>[x.listingId,x.tokenId,x.priceUSDC,x.updatedBlock,S.usdcVerifiedIntentIds.has(String(x.listingId).toLowerCase())?1:0].join(':'))
      .join('|');
    const changed=fingerprint!==S.usdcFastFingerprint;
    S.usdcFastFingerprint=fingerprint;

    if(changed){
      // Reconciliation cache only. Public marketplace rendering is server-canonical.
      renderPortfolio();
    }
    return nextIds.size
  }catch(e){
    console.warn('fast canonical market feed',e);
    return 0
  }finally{S.usdcFastSyncing=false}
}

async function hydrateServerUsdc(){
  const requestSeq=++S.serverUsdcRequestSeq;
  try{
    // Lean, canonical-only board. This endpoint returns only the deduplicated
    // ACTIVE listings that already passed indexed ownership validation.
    const snap=await indexRpc('zecblocks_usdc_market_board',{});
    if(!MarketRuntime.validSnapshot(snap,['usdc_listings'])||!snap.usdc_metrics||!Number.isFinite(Number(snap.generated_at)))throw new Error('Incomplete marketplace snapshot');
    const generatedAt=Number(snap?.generated_at||0);
    if(requestSeq<S.serverUsdcAppliedSeq)return 0;
    if(generatedAt&&S.serverUsdcGeneratedAt&&generatedAt<S.serverUsdcGeneratedAt)return 0;

    const rows=Array.isArray(snap?.usdc_listings)?snap.usdc_listings:[];
    const health=snap?.indexer_health||{};
    const baseHealth=health?.base_usdc||{};
    const baseStatus=String(baseHealth?.status||'unknown').toLowerCase();
    const baseHardError=baseStatus==='error'&&!!baseHealth?.last_error;
    const lastSuccess=Date.parse(baseHealth?.last_success_at||'');
    const baseDelayed=baseHardError||baseHealth?.details?.caught_up===false||(Number.isFinite(lastSuccess)&&Date.now()-lastSuccess>180000);

    S.serverIndexerHealth={...S.serverIndexerHealth,...health};
    S.serverUsdcScannedTo=Number(baseHealth?.details?.scanned_to||baseHealth?.details?.latest||0);

    // The market-board RPC is already a canonical, ownership-validated snapshot.
    // A worker status of "running" is normal and must NOT blank the marketplace.
    // Only reject a snapshot when the backend explicitly reports a hard error
    // AND the snapshot itself contains no canonical rows/metrics to preserve.
    if(baseHardError&&rows.length===0&&!snap?.usdc_metrics){
      if($('usdcMarketStatus'))$('usdcMarketStatus').textContent='Canonical index temporarily unavailable · preserving last verified listing board.';
      return 0
    }

    const merged=new Map(S.usdcOnchain),serverIds=new Set(),nextCanonical=new Map();
    const nextOwners=new Map();

    for(const x of rows){
      const id=String(x.listing_id||'').toLowerCase();
      const tokenId=Number(x.token_id);
      if(!/^0x[0-9a-f]{64}$/.test(id)||!Number.isInteger(tokenId)||tokenId<1||tokenId>CFG.supply)continue;
      if(dbStatus(x.status)!==1||Number(x.expires_at||0)<=Math.floor(Date.now()/1000))continue;
      if(x.ownership_valid===false||x.intent_verified!==true)continue;
      const owner=dbCommitment(x.indexed_owner_commitment),ownerLevel=String(x.indexed_owner_verified_level||'provisional');
      if(!owner||owner!==dbCommitment(x.seller_commitment)||!['signature','chain','full'].includes(ownerLevel))continue;
      if(!/^\d+$/.test(String(x.price_usdc))||BigInt(x.price_usdc)<10000n)continue;

      serverIds.add(id);
      S.usdcVerifiedIntentIds.add(id);
      nextOwners.set(tokenId,{owner,level:ownerLevel,source:String(x.indexed_owner_source||'server')});

      const old=merged.get(id)||{};
      const row={...old,
        listingId:id,tokenId,seller:String(x.seller_evm||'').toLowerCase(),
        sellerCommitment:dbBytes32(x.seller_commitment),priceUSDC:String(x.price_usdc||0),
        expiresAt:Number(x.expires_at||0),listingNonce:String(x.listing_nonce||old.listingNonce||''),
        zb1ListingHash:String(x.zb1_listing_hash||old.zb1ListingHash||''),status:1,
        buyer:String(x.buyer_evm||old.buyer||'0x0000000000000000000000000000000000000000'),
        buyerCommitment:dbBytes32(x.buyer_commitment),settledAt:Number(x.settled_at||0),
        createdBlock:Number(x.created_block||old.createdBlock||0),updatedBlock:Number(x.updated_block||old.updatedBlock||0),
        relay:old.relay||null,verifiedIntent:!!old.verifiedIntent,serverIntentVerified:!!x.intent_verified,
        serverOwnerCommitment:owner,serverOwnerVerifiedLevel:String(x.indexed_owner_verified_level||'provisional'),serverIndexed:true
      };
      merged.set(id,row);
      nextCanonical.set(tokenId,row)
    }

    // Anything previously server-indexed as ACTIVE but absent from this caught-up
    // canonical board is no longer allowed to remain a public listing.
    for(const [id,x] of merged){
      if(x?.serverIndexed&&Number(x.status)===1&&!serverIds.has(id))merged.delete(id)
    }

    const nextMetrics=snap?.usdc_metrics||null;
    const fingerprint=[...nextCanonical.values()]
      .sort((a,b)=>Number(a.tokenId)-Number(b.tokenId))
      .map(x=>[x.tokenId,String(x.listingId||''),String(x.priceUSDC||''),Number(x.expiresAt||0)].join(':'))
      .join('|')+'|'+JSON.stringify(nextMetrics||{});

    // Atomic board swap: listings and metrics always come from the same
    // caught-up snapshot, so users cannot see a mixed/ghost state.
    S.serverOwners=nextOwners;
    S.usdcOnchain=merged;
    S.serverUsdcCanonical=nextCanonical;
    S.serverUsdcMetrics=nextMetrics;
    S.serverUsdcFingerprint=fingerprint;
    S.serverUsdcAppliedSeq=requestSeq;
    S.serverUsdcGeneratedAt=generatedAt||S.serverUsdcGeneratedAt;
    S.serverUsdcSnapshotAt=Date.now();

    saveUsdcCache();
    renderUsdcMarket();
    updateUsdcMarketMetrics();
    if($('usdcMarketStatus')){
      $('usdcMarketStatus').textContent=`${nextCanonical.size} verified listings · 3% marketplace fee`;
      markFeed('usdc',true,baseDelayed?'Indexer delayed; showing the last verified listings.':'')
    }
    return nextCanonical.size
  }catch(e){
    markFeed('usdc',false);console.warn('canonical USDC market board',e);
    if($('usdcMarketStatus')&&S.serverUsdcSnapshotAt<=0)$('usdcMarketStatus').textContent='Canonical market board unavailable · retrying without showing unverified listings.';
    return 0
  }
}
async function hydrateServerZecMetrics(){
  try{
    const snap=await indexRpc('zecblocks_zec_market_metrics',{});
    if(!snap||typeof snap!=='object'||!Number.isFinite(Number(snap.sales)))throw new Error('Incomplete ZEC metrics');
    S.serverZecMetrics=snap;
    updateMarketMetrics();
    return S.serverZecMetrics
  }catch(e){
    console.warn('canonical ZEC market metrics',e);
    return S.serverZecMetrics
  }
}
async function hydrateServerZecMarketStates(){
  try{
    const snap=await indexRpc('zecblocks_zec_market_states_snapshot',{});
    if(!MarketRuntime.validSnapshot(snap,['zec_listing_states']))throw new Error('Incomplete ZEC listing snapshot');
    const snapshotTime=Number(snap.generated_at||0);
    if(snapshotTime<(S.serverZecGeneratedAt||0))return 0;
    const zstates=Array.isArray(snap?.zec_listing_states)?snap.zec_listing_states:[];
    const now=Math.floor(Date.now()/1000);
    const tokenIds=[...new Set(zstates
      .filter(x=>String(x.status||'')==='active'&&Number(x.expires_at||0)>now)
      .map(x=>Number(x.token_id))
      .filter(x=>Number.isInteger(x)&&x>0&&x<=CFG.supply))];

    const headers={'apikey':INDEX_CFG.key,'Cache-Control':'no-cache','Pragma':'no-cache'};
    const nextOwners=new Map();
    for(let i=0;i<tokenIds.length;i+=100){
      const chunk=tokenIds.slice(i,i+100);if(!chunk.length)continue;
      const q=new URLSearchParams({
        select:'token_id,owner_commitment,owner_verified_level,owner_source',
        token_id:`in.(${chunk.join(',')})`
      });
      const tokens=await MarketRuntime.requestJSON(`${INDEX_CFG.url}/rest/v1/zecblocks_tokens?${q}`,{headers,cache:'no-store'});
      if(!Array.isArray(tokens))throw new Error('Incomplete owner snapshot');
      for(const t of tokens){
        const id=Number(t.token_id),owner=dbCommitment(t.owner_commitment),level=String(t.owner_verified_level||'provisional');
        if(owner&&Number.isInteger(id))nextOwners.set(id,{owner,level,source:String(t.owner_source||'zec-market-server')})
      }
    }

    const nextEvents=new Map();
    for(const x of zstates){
      const listingId=String(x.listing_id||'');if(!listingId)continue;
      const tokenId=Number(x.token_id),seller=dbCommitment(x.seller_commitment),owner=nextOwners.get(tokenId);
      const verifiedOwner=owner?.owner&&['signature','chain','full'].includes(String(owner.level||''))?String(owner.owner).toLowerCase():'';
      const base={protocol:'ZB1',v:Number(x.listing_version||1),listingId,tokenId,sellerCommitment:seller,sellerPayout:String(x.seller_payout||''),directBuyEnabled:x.direct_buy_enabled===true,listingVersion:Number(x.listing_version||1),timestamp:Number(x.event_timestamp)||Math.floor(new Date(x.updated_at||Date.now()).getTime()/1000),source:'supabase-index-market'};
      if(x.status==='active'&&Number(x.expires_at||0)>now&&seller&&verifiedOwner===seller){
        const e=normalizeEvent({...base,type:'SALE',eventId:String(x.event_key||listingId),price:String(x.price_zec),expires:Number(x.expires_at),pubkey:String(x.pubkey||''),signature:String(x.signature||''),serverSignatureVerified:!!x.signature_verified,serverOwnerCommitment:verifiedOwner,serverOwnerVerifiedLevel:String(owner.level||'')});
        nextEvents.set('sale:'+listingId,e)
      }else{
        const reason=x.status==='active'?'owner_mismatch_or_unverified':String(x.status||'inactive');
        const e=normalizeEvent({...base,type:'SALE_CANCEL',eventId:'server-state:'+reason+':'+listingId,serverState:reason});
        nextEvents.set('cancel:'+listingId,e)
      }
    }

    // Atomic swap: ownership and listing board always move together.
    if(snapshotTime<(S.serverZecGeneratedAt||0))return 0;
    S.serverZecGeneratedAt=snapshotTime;markFeed('zec',true);
    S.serverZecOwners=nextOwners;
    S.serverMarketEvents=nextEvents;
    S.serverZecMarketReady=true;
    S.events=S.events.filter(e=>e.source!=='supabase-index-market');
    for(const e of S.serverMarketEvents.values())S.events.push(e);
    rebuildState();renderMarket();updateMarketMetrics();
    return [...nextEvents.values()].filter(e=>e.type==='SALE').length
  }catch(e){
    markFeed('zec',false);console.warn('canonical ZEC market states',e);
    // Preserve the last verified board. Fresh sessions remain fail-closed.
    renderMarket();updateMarketMetrics();
    return [...S.serverMarketEvents.values()].filter(e=>e.type==='SALE').length
  }
}
async function kickServerUsdcIndexer(){
  if(S.serverIndexing)return;S.serverIndexing=true;
  try{
    await indexFunction('zecblocks-index-usdc',{});
    await hydrateServerUsdc()
  }catch(e){console.warn('server Base indexer',e)}finally{S.serverIndexing=false}
}
async function hydrateServerActivity(){
  try{
    const snap=await indexRpc('zecblocks_activity_snapshot',{});
    if(!MarketRuntime.validSnapshot(snap,['events']))throw new Error('Incomplete activity snapshot');
    if(Number(snap.generated_at||0)<S.serverActivityGeneratedAt)return S.serverActivity.length;
    const rows=Array.isArray(snap?.events)?snap.events:[];
    const clean=[];
    for(const x of rows){
      const asset=String(x.asset||'ZEC_BLOCK').toUpperCase();
      const type=String(x.type||'').toUpperCase();
      const isZecs=asset==='ZECS';
      const tokenId=Number(x.tokenId);
      if(isZecs){
        if(!['ZB20_LIST','ZB20_CANCEL','ZB20_SETTLED'].includes(type))continue;
      }else{
        if(!Number.isInteger(tokenId)||tokenId<1||tokenId>CFG.supply)continue;
        if(!['SALE','OFFER','SALE_CANCEL','TRANSFER','ATOMIC_SETTLED','NOIR_SETTLED'].includes(type))continue;
      }
      clean.push(normalizeEvent({protocol:isZecs?'ZB20':'ZB1',v:1,type,eventId:String(x.eventId||''),
        asset:isZecs?'ZECS':'ZEC_BLOCK',amount:isZecs?Number(x.amount||0):null,tokenId:isZecs?null:tokenId,
        price:x.price==null?'':String(x.price),currency:String(x.currency||'ZEC').toUpperCase(),
        sellerCommitment:dbCommitment(x.sellerCommitment),buyerCommitment:dbCommitment(x.buyerCommitment),
        fromCommitment:dbCommitment(x.fromCommitment),toCommitment:dbCommitment(x.toCommitment),
        txid:String(x.txid||''),timestamp:Number(x.timestamp||0),source:String(x.source||'supabase-activity'),
        serverVerificationStatus:String(x.verificationStatus||'')
      }))
    }
    markFeed('activity',true);S.serverActivity=clean;
    S.serverActivityGeneratedAt=Number(snap?.generated_at||0);
    renderActivity();
    return clean.length
  }catch(e){markFeed('activity',false);console.warn('server activity snapshot',e);return S.serverActivity.length}
}
async function hydrateServerPortfolio(owner=S.ownerCommitment){
  owner=dbCommitment(owner);if(!owner)return 0;
  const epoch=S.walletEpoch||0;
  try{
    const snap=await indexRpc('zecblocks_portfolio_snapshot',{p_owner_commitment:owner});
    if(owner!==dbCommitment(S.ownerCommitment)||epoch!==(S.walletEpoch||0))return 0;
    if(!MarketRuntime.validSnapshot(snap,['tokens','active_listings']))throw new Error('Incomplete portfolio snapshot');
    if(S.serverPortfolioOwner===owner&&Number(snap.generated_at||0)<S.serverPortfolioGeneratedAt)return S.serverPortfolioCount;
    const rows=Array.isArray(snap?.tokens)?snap.tokens:[];
    const listingRows=Array.isArray(snap?.active_listings)?snap.active_listings:[];
    const ids=new Set(rows.map(x=>Number(x.token_id)));

    S.serverPortfolioOwner=owner;
    S.serverPortfolioTokens.clear();
    S.serverPortfolioActiveListings.clear();
    S.serverPortfolioCount=Number(snap?.owned_count??snap?.count??rows.length)||0;
    S.serverPortfolioListingCount=Number(snap?.active_listing_count??listingRows.length)||0;
    S.serverPortfolioGeneratedAt=Number(snap?.generated_at||0);

    for(const [id,e] of [...S.walletRecoveredClaims.entries()]){
      if(e?.source==='supabase-index'&&!ids.has(Number(id))){
        S.walletRecoveredClaims.delete(id);
        if(e.eventId)S.walletRecovered.delete(e.eventId)
      }
    }

    for(const x of rows){
      const id=Number(x.token_id);if(!Number.isInteger(id)||id<1||id>CFG.supply)continue;
      const e=normalizeEvent({
        protocol:'ZB1',v:1,type:'CLAIM',
        eventId:x.owner_event_id||x.last_event_id||x.claim_txid||`server:${id}:${owner}`,
        txid:x.claim_txid||'',tokenId:id,ownerCommitment:owner,
        sourceHeight:Number(x.source_height)||null,sourceHash:String(x.source_hash||''),
        blockHeight:Number(x.owner_block_height||x.last_zcash_height)||null,
        txIndex:Number(x.owner_tx_index)||null,
        timestamp:Number(x.owner_event_timestamp)||Math.floor(new Date(x.updated_at||Date.now()).getTime()/1000),
        source:'supabase-index',
        serverLastEventType:String(x.owner_source||x.last_event_type||'claim'),
        serverVerifiedLevel:String(x.owner_verified_level||'provisional')
      });
      S.serverPortfolioTokens.set(id,e);
      S.serverOwners.set(id,{owner,level:String(x.owner_verified_level||'provisional'),source:String(x.owner_source||'portfolio-server')});
      const k=eventKey(e)||e.eventId;
      S.walletRecovered.set(k,e);
      S.walletRecoveredClaims.set(id,e)
    }

    for(const x of listingRows){
      const id=Number(x.token_id);
      if(!Number.isInteger(id)||id<1||id>CFG.supply)continue;
      S.serverPortfolioActiveListings.set(id,{
        listingId:String(x.listing_id||''),
        tokenId:id,
        sellerCommitment:dbCommitment(x.seller_commitment),
        price:String(x.price||''),
        expires:Number(x.expires_at||0),
        timestamp:Number(x.event_timestamp||0),
        rail:String(x.rail||'').toUpperCase()
      })
    }

    markFeed('portfolio',true);S.serverPortfolioLoaded.add(owner);
    rebuildState();renderPortfolio();updateWalletUI();
    return S.serverPortfolioCount
  }catch(e){if(owner===S.ownerCommitment)markFeed('portfolio',false);console.warn('server portfolio snapshot',e);return Number(S.serverPortfolioCount||0)}
}
async function pushClaimsToServerIndex(){
  const claims=[...S.walletRecoveredClaims.values()].filter(e=>e?.type==='CLAIM'&&e.tokenId&&e.nonce&&e.pubkey&&e.signature&&e.txid);
  if(!claims.length)return;
  const minimal=claims.map(e=>({tokenId:Number(e.tokenId),nonce:String(e.nonce),pubkey:String(e.pubkey),signature:String(e.signature),txid:String(e.txid)}));
  for(let i=0;i<minimal.length;i+=20){try{await indexFunction('zecblocks-cache-claims',{claims:minimal.slice(i,i+20)})}catch(e){console.warn('claim server cache',e);break}}
}
function isStorageQuotaError(e){
  return !!e&&(e.name==='QuotaExceededError'||e.name==='NS_ERROR_DOM_QUOTA_REACHED'||e.code===22||e.code===1014)
}
function compactStoredEvent(e){
  if(!e||typeof e!=='object')return e;
  const keep=[
    'protocol','v','type','eventId','txid','listingId','offerId','lockId','tokenId',
    'nonce','price','priceUSDC','expires','expiresAt','listingNonce','zb1ListingHash',
    'ownerCommitment','sellerCommitment','buyerCommitment','fromCommitment','toCommitment',
    'sellerEvm','buyerEvm','paymentChain','paymentToken','settlementContract',
    'pubkey','signature','message','memo','timestamp','settledAt','status','source',
    'sourceHeight','sourceHash','proofHash','blockHeight','txIndex','anchorTxid',
    'paymentTxid','sellerPayout','feeZat','sellerZat','paymentZat','step',
    'baseTxid','verifiedIntent','serverIntentVerified'
  ];
  const out={};
  for(const k of keep)if(e[k]!==undefined&&e[k]!==null&&e[k]!=='')out[k]=e[k];
  return out
}
function pruneNonCriticalBrowserCaches(){
  try{localStorage.removeItem('zb1_public_discovery_v2')}catch{}
  try{sessionStorage.removeItem('zb1_public_discovery_v1')}catch{}
  try{
    const raw=localStorage.getItem('zb1_usdc_market_v3');
    if(raw){
      const c=JSON.parse(raw),rows=Array.isArray(c?.rows)?c.rows.slice(-350):[];
      localStorage.setItem('zb1_usdc_market_v3',JSON.stringify({...c,rows}))
    }
  }catch{}
}
function safeLocalSet(key,value,{retryPrune=true}={}){
  try{localStorage.setItem(key,value);return true}
  catch(e){
    if(retryPrune&&isStorageQuotaError(e)){
      pruneNonCriticalBrowserCaches();
      try{localStorage.setItem(key,value);return true}catch(e2){console.warn('local storage quota after prune',key,e2);return false}
    }
    console.warn('local storage write unavailable',key,e);
    return false
  }
}
function localEvents(){
  try{
    const a=JSON.parse(localStorage.getItem('zb1_events_v1')||'[]');
    return Array.isArray(a)?a:[]
  }catch{return[]}
}
function discoveryCache(){
  try{
    const raw=localStorage.getItem('zb1_public_discovery_v2')||sessionStorage.getItem('zb1_public_discovery_v1')||'[]';
    const a=JSON.parse(raw);
    return Array.isArray(a)?a:[]
  }catch{return[]}
}
function verifiedSettlementJournal(){
  try{
    const a=JSON.parse(localStorage.getItem('zb1_verified_settlements_v1')||'[]');
    return Array.isArray(a)?a:[]
  }catch{return[]}
}
function paymentRecoveryJournal(){
  try{
    const a=JSON.parse(localStorage.getItem('zb1_payment_recovery_v1')||'[]');
    return Array.isArray(a)?a:[]
  }catch{return[]}
}
function savePaymentRecovery(e){
  try{
    const a=paymentRecoveryJournal();
    const k=`${e.lockId}:${e.step||e.type}:${e.paymentTxid||e.txid}`;
    const i=a.findIndex(x=>`${x.lockId}:${x.step||x.type}:${x.paymentTxid||x.txid}`===k);
    if(i>=0)a[i]=mergeEvent(a[i],e);else a.push(e);
    const payload=JSON.stringify(a.slice(-300).map(compactStoredEvent));
    safeLocalSet('zb1_payment_recovery_v1',payload)
  }catch(err){console.warn('payment recovery journal',err)}
}
function saveVerifiedSettlementJournal(e){
  try{
    const a=verifiedSettlementJournal(),k=e.lockId||eventKey(e);
    const i=a.findIndex(x=>(x.lockId||eventKey(x))===k);
    if(i>=0)a[i]=mergeEvent(a[i],e);else a.push(e);
    const payload=JSON.stringify(a.slice(-300).map(compactStoredEvent));
    safeLocalSet('zb1_verified_settlements_v1',payload)
  }catch(err){console.warn('verified settlement journal',err)}
}
function saveDiscoveryCache(events){
  try{
    const a=[...events]
      .sort((x,y)=>(Number(x.timestamp)||0)-(Number(y.timestamp)||0))
      .slice(-1200)
      .map(compactStoredEvent);
    const payload=JSON.stringify(a);
    if(!safeLocalSet('zb1_public_discovery_v2',payload,{retryPrune:false})){
      try{localStorage.removeItem('zb1_public_discovery_v2')}catch{}
    }
    try{sessionStorage.setItem('zb1_public_discovery_v1',JSON.stringify(a.slice(-600)))}catch{}
  }catch(e){console.warn('discovery cache full/unavailable',e)}
}
function walletCacheKey(){return S.ownerCommitment?'zb1_wallet_cache_v2_'+S.ownerCommitment:null}
function hydrateWalletCache(){
  S.walletRecovered.clear();S.walletRecoveredClaims.clear();
  const key=walletCacheKey();if(!key)return 0;
  try{
    const a=JSON.parse(localStorage.getItem(key)||'[]');
    if(!Array.isArray(a))return 0;
    for(const e0 of a){
      const e=normalizeEvent(e0),k=eventKey(e);
      if(k)S.walletRecovered.set(k,e);
      if(e.type==='CLAIM'&&Number.isInteger(Number(e.tokenId)))S.walletRecoveredClaims.set(Number(e.tokenId),e);
      rememberRuntimeEvent(e)
    }
    return S.walletRecoveredClaims.size
  }catch(e){console.warn('wallet cache hydrate',e);return 0}
}
function saveWalletCache(){
  const key=walletCacheKey();if(!key)return;
  try{
    const rows=[...S.walletRecovered.values()].slice(-1200).map(compactStoredEvent);
    safeLocalSet(key,JSON.stringify(rows))
  }catch(e){console.warn('wallet cache save',e)}
}
function eventKey(e){return e?.txid||e?.eventId||e?.listingId||null}
function mergeEvent(old,e){
  if(!old)return {...e};
  // Enriched wallet/chain fields must survive a later relay refresh.
  const merged={...old,...Object.fromEntries(Object.entries(e||{}).filter(([,v])=>v!==undefined&&v!==null&&v!==''))};
  const a=Number(old.timestamp)||0,b=Number(e?.timestamp)||0;
  if(a&&b)merged.timestamp=Math.min(a,b); else merged.timestamp=a||b||Math.floor(Date.now()/1000);
  if(old.source==='wallet-history'||e?.source==='wallet-history')merged.source='wallet-history';
  return merged;
}
function saveLocalEvent(e){
  try{
    const a=localEvents(),k=eventKey(e);
    const i=k?a.findIndex(x=>eventKey(x)===k):-1;
    if(i>=0)a[i]=mergeEvent(a[i],e); else a.push(e);
    const rows=a.slice(-600).map(compactStoredEvent);
    return safeLocalSet('zb1_events_v1',JSON.stringify(rows))
  }catch(err){
    console.warn('local event journal unavailable; continuing without blocking transaction',err);
    return false
  }
}
function rememberRuntimeEvent(e){
  saveLocalEvent(e);
  const k=eventKey(e);
  if(!k){S.events.push(e);return e}
  const i=S.events.findIndex(x=>eventKey(x)===k);
  if(i>=0)S.events[i]=mergeEvent(S.events[i],e);else S.events.push(e);
  return e
}
function nostrSecretHex(){let h=localStorage.getItem('zb1_nostr_sk');return h||null}
function setNostrSecretHex(h){if(!safeLocalSet('zb1_nostr_sk',h))throw new Error('Browser storage is unavailable for the relay signing key. Free a small amount of site storage and retry.')}
function provider(){const w=window.noirwallet;return w&&w.isNoirWallet&&w.zcash?w.zcash:null}
async function waitForNoirProvider(timeoutMs=2200){
  const end=Date.now()+timeoutMs;
  let p=provider();
  while(!p&&Date.now()<end){
    await new Promise(r=>setTimeout(r,100));
    p=provider()
  }
  return p
}
function noirLockedError(e){
  return /wallet\s*(is\s*)?not\s*unlocked|wallet\s*locked|unlock\s*(your\s*)?wallet|locked wallet/i.test(String(e?.message||e?.reason||e||''))
}
function markNoirLocked(e){
  if(!noirLockedError(e))return false;
  S.noirLocked=true;
  queueMicrotask(()=>{try{updateWalletUI()}catch{}});
  return true
}
async function noirCall(p,method,params){
  const a=Array.isArray(params)?params:[];
  // Prefer Noir's current typed provider API. Raw RPC remains a compatibility fallback.
  if(method==='zcash_requestAccounts'&&typeof p.connect==='function')return p.connect();
  if(method==='zcash_getAccounts'&&typeof p.getAccounts==='function')return p.getAccounts();
  if(method==='zcash_getPublicKey'&&typeof p.getPublicKey==='function')return p.getPublicKey(a[0]);
  if(method==='zcash_getMaxTransfer'&&typeof p.getMaxTransfer==='function')return p.getMaxTransfer(a[0]);
  if(method==='zcash_getBalance'&&typeof p.getBalance==='function')return p.getBalance(a[0]);
  if(method==='zcash_getTransactionHistory'&&typeof p.getTransactionHistory==='function')return p.getTransactionHistory();
  if(method==='zcash_signMessage'&&typeof p.signMessage==='function')return p.signMessage(a[0],a[1]);
  if(method==='zcash_sendTransaction'&&typeof p.sendTransaction==='function')return p.sendTransaction(a[0]);
  if(typeof p.request!=='function')throw new Error('Noir Wallet provider is unavailable.');
  return p.request({method,...(params?{params}: {})})
}
async function walletRpc(p,method,params,{timeoutMs=0}={}){
  const req=noirCall(p,method,params).then(v=>{
    if(method!=='zcash_getAccounts')S.noirLocked=false;
    return v
  }).catch(e=>{markNoirLocked(e);throw e});
  if(!timeoutMs)return req;
  return Promise.race([
    req,
    new Promise((_,rej)=>setTimeout(()=>rej(new Error(method+' timed out. Unlock Noir Wallet and retry.')),timeoutMs))
  ])
}
async function rpc(method,params){
  const mutation=/zcash_(signMessage|sendTransaction)/.test(method);
  if(mutation)assertWalletAction();
  const p=provider();
  if(!p)throw new Error('Noir Wallet is not installed or not ready. Unlock the extension and retry.');
  try{
    const v=await noirCall(p,method,params);
    if(method==='zcash_signMessage')assertWalletAction();
    if(method!=='zcash_getAccounts')S.noirLocked=false;
    return v
  }catch(e){
    if(markNoirLocked(e))throw new Error('Noir Wallet is locked. Open the extension, unlock it, then click Unlock Noir Wallet.');
    throw e
  }
}
function clearNoirSession(){
  S.walletEpoch=(S.walletEpoch||0)+1;
  S.serverPortfolioOwner=null;S.serverPortfolioTokens.clear();S.serverPortfolioActiveListings.clear();S.serverPortfolioLoaded.clear();
  S.serverPortfolioCount=0;S.serverPortfolioListingCount=0;S.serverPortfolioGeneratedAt=0;
  S.walletRecovered.clear();S.walletRecoveredClaims.clear();S.zecsMarketAccount=null;

  S.provider=null;S.connection=null;S.pubkey=null;S.ownerCommitment=null;S.balance=null;
  updateWalletUI();renderPortfolio()
}
function bindNoirProviderEvents(p){
  if(S.noirEventsProvider===p)return;
  try{
    if(S.noirEventsProvider&&S.noirAccountsHandler)S.noirEventsProvider.off?.('accountsChanged',S.noirAccountsHandler)
  }catch{}
  S.noirAccountsHandler=async()=>{
    clearNoirSession();
    try{await connectWallet(true)}catch(e){console.warn('Noir account refresh',e)}
  };
  try{p.on?.('accountsChanged',S.noirAccountsHandler)}catch(e){console.warn('Noir accountsChanged unavailable',e)}
  S.noirEventsProvider=p
}
function backgroundWalletSync(owner){
  MarketRuntime.singleFlight('wallet-sync:'+owner,async()=>{
    try{const balance=await walletRpc(S.provider,'zcash_getBalance',null,{timeoutMs:6000});if(S.ownerCommitment===owner){S.balance=balance;updateWalletUI()}}catch(e){console.warn('wallet balance',e)}
    if(S.ownerCommitment!==owner)return;
    await Promise.allSettled([hydrateServerPortfolio(owner),loadZecsMarketState({account:true})]);
    if(S.ownerCommitment===owner){renderPendingTransactions();resumeDirectPayments();resumeUsdcPurchaseRecoveries();resumeBaseTransactions()}
  }).catch(e=>console.warn('wallet refresh',e))
}
async function connectWallet(silent=false){
  if(S.noirConnectPromise){
    try{await S.noirConnectPromise}catch{}
    if(S.connection&&S.ownerCommitment)return true;
    if(silent)return false
  }
  const btn=$('walletBtn');
  const job=(async()=>{
    if(!silent&&btn){btn.disabled=true;btn.textContent='Connecting…'}
    const p=provider()||await waitForNoirProvider(silent?1200:2600);
    if(!p){
      if(!silent)toast('Noir Wallet was not detected. Unlock/enable the extension, then click Connect again.',7000);
      return false
    }
    let conn;
    if(silent){
      try{conn=await walletRpc(p,'zcash_getAccounts',null,{timeoutMs:3500})}
      catch(e){console.warn('silent Noir reconnect',e);return false}
    }else{
      conn=await walletRpc(p,'zcash_requestAccounts')
    }
    if(!conn||(Array.isArray(conn)&&conn.length===0))return false;

    const k=await walletRpc(p,'zcash_getPublicKey',[{signingMode:'derived'}],{timeoutMs:silent?5000:0});
    if(!k?.pubkey)throw new Error('Noir Wallet did not return a derived public key.');
    const nextOwner=await sha256HexBytes(hexToBytes(k.pubkey));

    // Commit the session only after Noir proves the wallet is actually usable.
    S.provider=p;S.connection=conn;S.pubkey=k.pubkey;S.ownerCommitment=nextOwner;S.noirLocked=false;

    hydrateWalletCache();
    bindNoirProviderEvents(p);

    // Connection is complete HERE. Network/indexer/history work must never block wallet UX.
    rebuildState();updateWalletUI();renderPortfolio();
    renderPendingTransactions();
    backgroundWalletSync(S.ownerCommitment);
    if(!silent)toast('Noir Wallet connected.',3500);
    return true
  })();

  S.noirConnectPromise=job;
  try{return await job}
  catch(e){
    if(noirLockedError(e)){
      S.noirLocked=true;
      if(!silent)toast('Noir Wallet is locked. Open Noir Wallet, unlock it, then click Unlock Noir Wallet.',8000)
    }else if(!silent)toast(e.message||String(e),7000);
    else console.warn('silent Noir connect',e);
    updateWalletUI();
    return false
  }
  finally{
    if(S.noirConnectPromise===job)S.noirConnectPromise=null;
    if(!silent&&btn){btn.disabled=false;updateWalletUI()}
  }
}
function updateWalletUI(){
  const connected=!!S.connection&&!!S.ownerCommitment&&!S.noirLocked;
  $('walletBtn').textContent=S.noirLocked?'Unlock Noir Wallet':connected?short(S.ownerCommitment,6):'Connect Noir Wallet';
  $('ownerCommit').textContent=connected?short(S.ownerCommitment,12):'Connect wallet';
  $('portfolioCommit').textContent=connected?S.ownerCommitment:'Connect wallet to view your NFT receiving ID.';
  $('portfolioShielded').textContent=connected?(S.connection.shielded||'—'):'Private until you connect.';
  $('receiveNftBtn').disabled=!connected;
  $('copyReceiveLinkBtn').disabled=!connected;
  $('receiveNftLink').value=connected?MarketRuntime.receiveLink(S.ownerCommitment,CFG.genesisTxid):'';
  $('receiveNftOwner').textContent=connected?S.ownerCommitment:'Connect Noir Wallet to create your receive link.';
  const address=connected?String(S.connection.transparent||''):'';
  const enabled=connected&&S.receivingAddress?.owner===S.ownerCommitment&&S.receivingAddress.address===address;
  $('receiveNftAddress').value=address;
  $('enableNftAddressBtn').hidden=!!enabled;$('enableNftAddressBtn').disabled=!connected||!address;
  $('copyNftAddressBtn').hidden=!enabled;
  $('receiveAddressStatus').textContent=enabled?'Ready to receive NFTs. Share this address with the sender.':connected?'Enable once to receive NFTs using this address.':'Connect Noir Wallet first.';
  updateRecipientPreview();
  $('zecBalance').textContent=S.balance?.available!=null?String(S.balance.available)+' ZEC':'—';
  $('loadTargetBtn').disabled=!connected;$('startMineBtn').disabled=!connected||S.mining;$('syncPortfolioBtn').disabled=!connected;$('createListingBtn').disabled=!connected||ownedTokens().length===0;
  updateEvmUI();updateZecsMarketUI();
}
$('walletBtn').onclick=()=>connectWallet(false);
async function loadWalletHistory(){
  if(!S.connection)return {recovered:0,seen:0,claims:[]};
  if(S.walletHistoryBusy)return {recovered:0,seen:0,claims:[...S.walletRecoveredClaims.keys()]};
  S.walletHistoryBusy=true;
  const historyOwner=S.ownerCommitment,historyEpoch=S.walletEpoch||0;
  let recovered=0,seen=0;
  const recoveredClaimIds=[...S.walletRecoveredClaims.keys()];
  const statusEl=$('portfolioRecoveryStatus');
  if(statusEl)statusEl.textContent='Reading Noir Wallet transaction history and rebuilding ZB-1 claims…';
  try{
    const hist=await readNoirHistory();
    for(const h of (hist||[])){
      if(historyOwner!==S.ownerCommitment||historyEpoch!==(S.walletEpoch||0))return {recovered:0,seen:0,claims:[]};
      const memo=typeof h.memo==='string'?h.memo.trim():'';
      if(!memo.startsWith('ZB1|'))continue;
      const e=parseMemo(memo); if(!e)continue;
      seen++;
      e.txid=String(h.txid||'').toLowerCase();
      e.status=h.status;
      let ts=Number(h.timestamp)||Math.floor(Date.now()/1000);
      if(ts>20_000_000_000)ts=Math.floor(ts/1000); // tolerate millisecond wallet timestamps
      e.timestamp=ts;
      e.source='wallet-history';

      if(e.type==='CLAIM'){
        const tokenId=Number(e.tokenId);
        if(!Number.isInteger(tokenId)||tokenId<1||tokenId>CFG.supply)continue;
        if(!/^[0-9a-fA-F]+$/.test(String(e.pubkey||''))||String(e.pubkey).length%2)continue;
        if(!/^\d+$/.test(String(e.nonce||'')))continue;

        // This is exactly the identity that the mining client committed into the PoW.
        e.ownerCommitment=await sha256HexBytes(hexToBytes(e.pubkey));

        try{
          const gh=await resolveGenesis();
          e.sourceHeight=gh-tokenId;
          const oldClaim=S.walletRecoveredClaims.get(tokenId)||localEvents().find(x=>x.type==='CLAIM'&&Number(x.tokenId)===tokenId&&String(x.txid||'').toLowerCase()===String(e.txid||'').toLowerCase());
          let sourceHash=String(oldClaim?.sourceHash||S.portfolioSourceCache.get(tokenId)?.sourceHash||'').toLowerCase();
          if(!/^[0-9a-f]{64}$/.test(sourceHash)){
            const block=await explorerFetch('block',e.sourceHeight);
            sourceHash=String(deepFind(block,['hash','block_hash','blockHash'])||'').toLowerCase();
          }
          if(!/^[0-9a-f]{64}$/.test(sourceHash))continue;
          e.sourceHash=sourceHash;
          S.portfolioSourceCache.set(tokenId,{sourceHeight:e.sourceHeight,sourceHash});

          const pre=concat(
            enc.encode('ZB1:MINE:v1'),
            hexToBytes(CFG.genesisTxid),
            u32le(tokenId),
            hexToBytes(sourceHash),
            hexToBytes(e.ownerCommitment),
            u64le(BigInt(e.nonce))
          );
          const proof=await sha256Bytes(pre);
          e.proofHash=bytesToHex(proof);
          e.proofBits=leadingZeroBits(proof);
          if(e.proofBits<CFG.powBits)continue;

          // Add chain confirmation/order metadata when explorer can resolve it.
          if(/^[0-9a-f]{64}$/.test(e.txid)){
            try{
              const tx=await explorerFetch('tx',e.txid);
              const bh=Number(deepFind(tx,['blockHeight','block_height','blockheight','height']));
              const ti=Number(deepFind(tx,['txIndex','tx_index','index']));
              if(Number.isInteger(bh)&&bh>0)e.blockHeight=bh;
              if(Number.isInteger(ti)&&ti>=0)e.txIndex=ti;
              e.confirmed=Number.isInteger(bh)&&bh>0;
            }catch{}
          }

          const normalized=normalizeEvent(e);
          const before=JSON.stringify(localEvents().find(x=>eventKey(x)===eventKey(normalized))||null);
          saveLocalEvent(normalized);
          const after=JSON.stringify(localEvents().find(x=>eventKey(x)===eventKey(normalized))||null);
          if(before!==after)recovered++;
          S.walletRecovered.set(eventKey(normalized),normalized);
          S.walletRecoveredClaims.set(tokenId,normalized);
          recoveredClaimIds.push(tokenId);
          if(recoveredClaimIds.length%4===0){saveWalletCache();rebuildState();renderPortfolio();updateWalletUI()}
        }catch(err){
          console.warn('claim reconstruction',tokenId,err);
        }
      }else if(e.type==='TRANSFER'){
        if(/^[0-9a-fA-F]+$/.test(String(e.pubkey||''))&&String(e.pubkey).length%2===0){
          e.fromCommitment=await sha256HexBytes(hexToBytes(e.pubkey));
        }
        if(/^[0-9a-f]{64}$/i.test(e.txid)){
          try{
            const tx=await explorerFetch('tx',e.txid);
            const bh=Number(deepFind(tx,['blockHeight','block_height','blockheight','height']));
            const ti=Number(deepFind(tx,['txIndex','tx_index','index']));
            if(Number.isInteger(bh)&&bh>0)e.blockHeight=bh;
            if(Number.isInteger(ti)&&ti>=0)e.txIndex=ti;
          }catch{}
        }
        const normalized=normalizeEvent(e);
        saveLocalEvent(normalized);
        S.walletRecovered.set(eventKey(normalized),normalized);
      }else if(e.type==='ATOMIC_LOCK'){
        if(/^[0-9a-fA-F]+$/.test(String(e.pubkey||''))&&String(e.pubkey).length%2===0)e.sellerCommitment=await sha256HexBytes(hexToBytes(e.pubkey));
        e.txid=e.txid||String(h.txid||'').toLowerCase();
        const normalized=normalizeEvent(e);
        saveLocalEvent(normalized);
        S.walletRecovered.set(eventKey(normalized),normalized);
      }
    }

    const ids=[...new Set(recoveredClaimIds)].sort((a,b)=>a-b);
    if(statusEl){
      if(ids.length){
        statusEl.innerHTML=`Recovered <b>${ids.length}</b> valid claim${ids.length===1?'':'s'} from Noir Wallet: <b>${ids.map(x=>'#'+x).join(', ')}</b>. Discovery events are being merged now.`;
      }else if(seen){
        statusEl.textContent=`Found ${seen} ZB-1 wallet event${seen===1?'':'s'}, but no valid CLAIM proof was reconstructed for this wallet.`;
      }else{
        statusEl.textContent='No ZB-1 memo transactions were found in the connected Noir Wallet history.';
      }
    }
    saveWalletCache();rebuildState();renderPortfolio();updateWalletUI();
    pushClaimsToServerIndex().catch(e=>console.warn('server claim sync',e));
    return {recovered,seen,claims:ids};
  }catch(e){
    console.warn('history',e);
    if(statusEl)statusEl.textContent='Noir Wallet history recovery failed: '+(e.message||String(e));
    return {recovered,seen,error:e,claims:[...S.walletRecoveredClaims.keys()]};
  }finally{S.walletHistoryBusy=false}
}
function parseMemo(m){const p=m.split('|');if(p[0]!=='ZB1'||p.length<3)return null;const type={C:'CLAIM',T:'TRANSFER',L:'ATOMIC_LOCK'}[p[1]]||p[1];const e={protocol:'ZB1',type,v:Number(p[2])||1,memo:m};for(const x of p.slice(3)){const i=x.indexOf('=');if(i>0)e[x.slice(0,i)]=x.slice(i+1)}if(type==='CLAIM'){e.tokenId=Number(e.T);e.nonce=e.N;e.pubkey=e.K;e.signature=e.S}else if(type==='TRANSFER'){e.tokenId=Number(e.I);e.toCommitment=e.O;e.pubkey=e.K;e.signature=e.S}else if(type==='ATOMIC_LOCK'){e.tokenId=Number(e.I);e.lockId=e.L;e.offerId=e.O||null;e.buyerCommitment=e.B;e.price=e.P;e.sellerPayout=e.A;e.expires=Number(e.E);e.pubkey=e.K;e.signature=e.S}return e}
function normalizeEvent(e){return {...e,eventId:e.eventId||e.txid||crypto.randomUUID(),timestamp:Number(e.timestamp)||Math.floor(Date.now()/1000)}}
const CHAIN_REQ_CACHE=new Map(),CHAIN_REQ_INFLIGHT=new Map();
function chainClientTtl(kind){
  return kind==='block'?12000:kind==='tx'?5000:kind==='health'?8000:7000
}
async function chainProxyJson(url,key,kind){
  const cached=CHAIN_REQ_CACHE.get(key),t=Date.now();
  if(cached&&cached.until>t)return cached.data;
  if(CHAIN_REQ_INFLIGHT.has(key))return CHAIN_REQ_INFLIGHT.get(key);
  const job=(async()=>{
    let r;
    try{r=await fetch(url,{headers:{accept:'application/json'}})}
    catch(e){throw new Error('Chain-data proxy unreachable. Upload the api/zcash.js file together with index.html.')}
    let j=null;try{j=await r.json()}catch{}
    if(!r.ok){
      const retry=r.status===429?' Chain provider is rate-limited; retry shortly.':'';
      throw new Error((j?.error||('Chain-data proxy error '+r.status))+retry)
    }
    const data=j?.data??j;
    CHAIN_REQ_CACHE.set(key,{data,until:Date.now()+chainClientTtl(kind)});
    if(CHAIN_REQ_CACHE.size>350){
      const first=CHAIN_REQ_CACHE.keys().next().value;
      CHAIN_REQ_CACHE.delete(first)
    }
    return data
  })().finally(()=>CHAIN_REQ_INFLIGHT.delete(key));
  CHAIN_REQ_INFLIGHT.set(key,job);
  return job
}
async function explorerFetch(kind,id){
  const url=CFG.explorer+'?kind='+encodeURIComponent(kind)+(id!=null?'&id='+encodeURIComponent(String(id)):'');
  const key=kind+'|'+String(id??'');
  return chainProxyJson(url,key,kind)
}
async function explorerAddress(address,page=1,limit=100){
  const url=CFG.explorer+'?kind=address&id='+encodeURIComponent(address)+'&page='+page+'&limit='+limit;
  const key='address|'+address+'|'+page+'|'+limit;
  return chainProxyJson(url,key,'address')
}
async function chainHeight(){
  try{
    const j=await explorerFetch('health');
    const h=Number(deepFind(j,['currentHeight','current_height','blockHeight','block_height','height']));
    return Number.isInteger(h)&&h>0?h:0
  }catch{return 0}
}
async function confirmationCount(tx,bh){
  const c=Number(deepFind(tx,['confirmations']));
  if(Number.isInteger(c)&&c>=0)return c;
  const tip=await chainHeight();return tip&&bh?Math.max(0,tip-bh+1):0
}
function deepFind(obj,keys){if(!obj||typeof obj!=='object')return null;for(const k of keys)if(obj[k]!=null)return obj[k];for(const v of Object.values(obj)){if(v&&typeof v==='object'){const x=deepFind(v,keys);if(x!=null)return x}}return null}
async function resolveGenesis(){
  if(S.genesisHeight)return S.genesisHeight;
  const cached=Number(localStorage.getItem('zb1_genesis_height')||0);
  if(cached){S.genesisHeight=cached;updateGenesisUI();return cached}
  try{
    const j=await explorerFetch('tx',CFG.genesisTxid);
    const h=Number(deepFind(j,['blockHeight','block_height','blockheight','height']));
    if(!Number.isInteger(h)||h<100000)throw new Error('Confirmed Genesis height was not present in chain-data response.');
    S.genesisHeight=h;localStorage.setItem('zb1_genesis_height',String(h));updateGenesisUI();return h;
  }catch(e){$('gHeight').textContent='Chain data unavailable';$('heroHeight').textContent='Retry mining';throw e}
}
function updateGenesisUI(){if(!S.genesisHeight)return;$('gHeight').textContent=S.genesisHeight.toLocaleString();$('heroHeight').textContent=(S.genesisHeight-1).toLocaleString();}
async function loadTarget(){
  try{
    if(!S.ownerCommitment)throw new Error('Connect Noir Wallet first.');
    const token=Number($('tokenInput').value);if(!Number.isInteger(token)||token<1||token>CFG.supply)throw new Error('Token ID must be 1–5000.');
    $('mineStatus').textContent='Loading source block…';$('hashLog').textContent='Resolving confirmed Genesis and source block from Zcash mainnet…';
    const gh=await resolveGenesis();const sh=gh-token;
    const j=await explorerFetch('block',sh);
    const hash=String(deepFind(j,['hash','block_hash','blockHash'])||'');
    if(!/^[0-9a-fA-F]{64}$/.test(hash))throw new Error('Could not resolve source block hash for height '+sh+'.');
    S.target={token,sourceHeight:sh,sourceHash:hash.toLowerCase()};S.proof=null;
    $('sourceInfo').textContent=sh.toLocaleString()+' · '+short(hash,10);$('mineStatus').textContent='Target ready';$('startMineBtn').disabled=false;$('submitClaimBtn').disabled=true;$('hashLog').textContent='Target loaded. Source hash: '+hash+'\nReady to search 26-bit SHA-256 proof.';
    artSvg($('heroArt'),hash+':'+sh,'ZB #'+token);$('heroToken').textContent='#'+token;$('heroHeight').textContent=sh.toLocaleString();
    return true;
  }catch(e){S.target=null;$('sourceInfo').textContent='Unavailable';$('mineStatus').textContent='Target load failed';$('hashLog').textContent='ERROR: '+(e.message||String(e));toast(e.message||String(e),8000);return false}
}
$('loadTargetBtn').onclick=loadTarget;
$('tokenInput').addEventListener('input',()=>{S.target=null;S.proof=null;$('sourceInfo').textContent='Select a token';$('mineStatus').textContent='Idle';$('submitClaimBtn').disabled=true;if(S.ownerCommitment&&!S.mining)$('startMineBtn').disabled=false;});
function workerSource(){return `
const K=[1116352408,1899447441,-1245643825,-373957723,961987163,1508970993,-1841331548,-1424204075,-670586216,310598401,607225278,1426881987,1925078388,-2132889090,-1680079193,-1046744716,-459576895,-272742522,264347078,604807628,770255983,1249150122,1555081692,1996064986,-1740746414,-1473132947,-1341970488,-1084653625,-958395405,-710438585,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,-2117940946,-1838011259,-1564481375,-1474664885,-1035236496,-949202525,-778901479,-694614492,-200395387,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,-2067236844,-1933114872,-1866530822,-1538233109,-1090935817,-965641998];
function rr(x,n){return(x>>>n)|(x<<(32-n))}function sha(m){const l=m.length,bit=l*8,n=((l+9+63)>>6)<<6,a=new Uint8Array(n);a.set(m);a[l]=128;const dv=new DataView(a.buffer);dv.setUint32(n-4,bit>>>0,false);dv.setUint32(n-8,Math.floor(bit/4294967296),false);let h0=1779033703,h1=-1150833019,h2=1013904242,h3=-1521486534,h4=1359893119,h5=-1694144372,h6=528734635,h7=1541459225,w=new Int32Array(64);for(let o=0;o<n;o+=64){for(let i=0;i<16;i++)w[i]=dv.getInt32(o+i*4,false);for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2],s0=rr(x,7)^rr(x,18)^(x>>>3),s1=rr(y,17)^rr(y,19)^(y>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)|0}let a0=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;for(let i=0;i<64;i++){const S1=rr(e,6)^rr(e,11)^rr(e,25),ch=(e&f)^(~e&g),t1=(h+S1+ch+K[i]+w[i])|0,S0=rr(a0,2)^rr(a0,13)^rr(a0,22),maj=(a0&b)^(a0&c)^(b&c),t2=(S0+maj)|0;h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a0;a0=(t1+t2)|0}h0=(h0+a0)|0;h1=(h1+b)|0;h2=(h2+c)|0;h3=(h3+d)|0;h4=(h4+e)|0;h5=(h5+f)|0;h6=(h6+g)|0;h7=(h7+h)|0}const out=new Uint8Array(32),od=new DataView(out.buffer);[h0,h1,h2,h3,h4,h5,h6,h7].forEach((x,i)=>od.setInt32(i*4,x,false));return out}
function zbits(b){let n=0;for(const x of b){if(x===0){n+=8;continue}for(let m=128;(x&m)===0;m>>=1)n++;break}return n}
onmessage=e=>{const {base,start,step,bits,batch}=e.data;const pre=new Uint8Array(base.length+8);pre.set(base);let nonce=BigInt(start),count=0,t=performance.now();for(;;){let x=nonce;for(let i=0;i<8;i++){pre[base.length+i]=Number(x&255n);x>>=8n}const h=sha(pre);count++;if(zbits(h)>=bits){postMessage({type:'found',nonce:nonce.toString(),hash:Array.from(h).map(x=>x.toString(16).padStart(2,'0')).join(''),count});return}nonce+=BigInt(step);if(count%batch===0){const now=performance.now();postMessage({type:'rate',count:batch,ms:now-t,nonce:nonce.toString()});t=now}}}`}
async function mineBase(){return concat(enc.encode('ZB1:MINE:v1'),hexToBytes(CFG.genesisTxid),u32le(S.target.token),hexToBytes(S.target.sourceHash),hexToBytes(S.ownerCommitment))}
async function startMining(){
  try{
    if(S.mining)return;
    if(!S.ownerCommitment)throw new Error('Connect Noir Wallet first.');
    const wanted=Number($('tokenInput').value);
    if(!S.target||S.target.token!==wanted){const ok=await loadTarget();if(!ok||!S.target)return;}
    S.mining=true;S.proof=null;S.hashes=0;S.startMs=performance.now();$('startMineBtn').disabled=true;$('stopMineBtn').disabled=false;$('submitClaimBtn').disabled=true;$('mineStatus').textContent='Mining…';$('hashLog').textContent='Starting workers…';
    const base=await mineBase(),wc=Math.max(1,Math.min(8,navigator.hardwareConcurrency||4));const src=workerSource(),url=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));let lines=[];
    for(let i=0;i<wc;i++){const w=new Worker(url);S.workers.push(w);w.onmessage=async ev=>{if(!S.mining)return;const d=ev.data;if(d.type==='rate'){S.hashes+=d.count;const secs=(performance.now()-S.startMs)/1000;$('hashrate').textContent=formatRate(S.hashes/Math.max(secs,.1));const expected=2**CFG.powBits,p=Math.min(99,(S.hashes/expected)*100);$('mineProgress').style.width=p+'%';lines.push('nonce '+d.nonce+' · '+formatRate(d.count/(d.ms/1000)));if(lines.length>8)lines=lines.slice(-8);$('hashLog').textContent=lines.join('\n')}else if(d.type==='found'){S.proof={nonce:d.nonce,hash:d.hash};stopMining(false);$('mineStatus').textContent='VALID PROOF FOUND';$('mineProgress').style.width='100%';$('hashLog').textContent+='\n\nFOUND nonce '+d.nonce+'\n'+d.hash;$('submitClaimBtn').disabled=false;toast('Valid 26-bit proof found. Review and submit the claim.')}};w.postMessage({base,start:String(i),step:wc,bits:CFG.powBits,batch:20000})}
    URL.revokeObjectURL(url);
  }catch(e){S.mining=false;toast(e.message||String(e),7000)}
}
function stopMining(mark=true){S.mining=false;for(const w of S.workers)w.terminate();S.workers=[];$('stopMineBtn').disabled=true;$('startMineBtn').disabled=!S.target;if(mark)$('mineStatus').textContent='Stopped'}
$('startMineBtn').onclick=startMining;$('stopMineBtn').onclick=()=>stopMining(true);
async function submitClaim(){
  try{
    if(!S.proof||!S.target)throw new Error('No valid proof is ready.');if(!S.ownerCommitment)throw new Error('Connect wallet first.');
    if(S.claims.size>=CFG.freeClaims)throw new Error('The free-claim window appears full in the discovery feed. Paid-claim flow is intentionally not enabled in this build until the two-transaction fee path is finalized.');
    const msg=`ZB1:CLAIM:v1|G=${CFG.genesisTxid}|T=${S.target.token}|N=${S.proof.nonce}|K=${S.pubkey}`;
    const sig=await rpc('zcash_signMessage',[msg,{signingMode:'derived'}]);
    const memo=`ZB1|C|1|T=${S.target.token}|N=${S.proof.nonce}|K=${sigPub(sig)}|S=${sigVal(sig)}`;
    if(enc.encode(memo).length>512)throw new Error('Claim memo exceeds 512 bytes.');
    $('submitClaimBtn').disabled=true;$('mineStatus').textContent='Waiting for wallet approval…';
    const claimRaw=await rpc('zcash_sendTransaction',[{to:CFG.mailbox,amount:'0.00000001',memo,fundingSource:'shielded'}]);
    const txid=await zcashTxidOrHistory(claimRaw,{memo,label:'ZB-1 claim'});
    const ev=normalizeEvent({protocol:'ZB1',v:1,type:'CLAIM',txid,memo,tokenId:S.target.token,nonce:S.proof.nonce,pubkey:sig.pubkey,ownerCommitment:S.ownerCommitment,sourceHeight:S.target.sourceHeight,sourceHash:S.target.sourceHash,proofHash:S.proof.hash,timestamp:Math.floor(Date.now()/1000),status:'pending'});
    saveLocalEvent(ev);await publishRelay(ev);S.proof=null;$('mineStatus').textContent='Claim broadcast · '+short(txid,8);toast('Claim broadcast: '+txid,8000);await refreshAll();
  }catch(e){$('submitClaimBtn').disabled=false;$('mineStatus').textContent='Claim not submitted';toast(e.message||String(e),8000)}
}
$('submitClaimBtn').onclick=submitClaim;
async function initNostr(){
  try{
    S.nostr=await import('https://esm.sh/nostr-tools@2.17.0?bundle');
    S.relay=new S.nostr.SimplePool();
    let sk=nostrSecretHex();
    if(sk){S.nostrSk=hexToBytes(sk)}
    else{S.nostrSk=S.nostr.generateSecretKey();setNostrSecretHex(bytesToHex(S.nostrSk))}
    S.nostrPk=S.nostr.getPublicKey(S.nostrSk);
    $('relayStatus').textContent='Relays: initializing…';
    setTimeout(startLiveDiscovery,0);
  }catch(e){
    console.warn(e);
    $('relayStatus').textContent='Relays: local cache only';
  }
}
function withTimeout(p,ms=6500,label='relay timeout'){
  return Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error(label)),ms))]);
}
function innerEventKey(e){return e?.txid||e?.eventId||e?.listingId||null}
function relayEventTemplate(obj){
  const d=obj.txid||obj.eventId||crypto.randomUUID();
  return S.nostr.finalizeEvent({
    kind:CFG.nostrKind,
    created_at:Math.floor(Date.now()/1000),
    tags:[
      ['t',CFG.relayTag],
      ['d',d],
      ['type',obj.type||'EVENT'],
      ['token',String(obj.tokenId||0)]
    ],
    content:JSON.stringify(obj)
  },S.nostrSk);
}
async function publishOneRelay(url,signedEvent){
  const ps=S.relay.publish([url],signedEvent);
  if(!ps||!ps.length)throw new Error('relay publish unavailable');
  return withTimeout(Promise.any(ps),6500,'publish timeout');
}
async function publishRelay(obj,{quiet=false,onlyRelays=null}={}){
  saveLocalEvent(obj);
  if(!S.nostr)await MarketRuntime.singleFlight('nostr',initNostr);
  if(!S.nostr||!S.relay||!S.nostrSk)return {ok:0,total:0};
  const signedEvent=relayEventTemplate(obj);
  const targets=onlyRelays||CFG.relays;
  const settled=await Promise.allSettled(targets.map(async url=>{
    await publishOneRelay(url,signedEvent);
    S.relayHealth.set(url,{ok:true,at:Date.now()});
    return url;
  }));
  const ok=settled.filter(x=>x.status==='fulfilled').length;
  for(let i=0;i<settled.length;i++){
    if(settled[i].status!=='fulfilled')S.relayHealth.set(targets[i],{ok:false,at:Date.now()});
  }
  if(!quiet){
    $('relayStatus').textContent=`Relays: ${ok}/${targets.length} accepted`;
    if(ok===0)toast('Listing saved locally, but no relay accepted it yet. Retry Refresh.',7000);
    else if(ok===1)toast('Published to 1 relay. The site will automatically repair redundancy.',6000);
  }
  return {ok,total:targets.length};
}
function ingestLiveRelayEvent(n){
  try{
    if(!n?.content)return;
    const o=normalizeEvent(JSON.parse(n.content));
    o._nostrId=n.id;
    const k=innerEventKey(o)||eventKey(o)||n.id;
    S.liveDiscoveryEvents.set(k,mergeEvent(S.liveDiscoveryEvents.get(k),o));

    // Merge directly into current runtime state so a later full fetch cannot
    // temporarily hide a newly arrived claim/listing.
    const i=S.events.findIndex(x=>(innerEventKey(x)||eventKey(x))===k);
    if(i>=0)S.events[i]=mergeEvent(S.events[i],o);else S.events.push(o);

    clearTimeout(S.liveRenderTimer);
    S.liveRenderTimer=setTimeout(async()=>{
      try{
        rebuildState();
        await reconcileAtomicState();
        rebuildState();
        renderMarket();renderUsdcMarket();renderPortfolio();renderAtomicDesk();updateMarketMetrics()
      }catch(e){console.warn('live relay render',e)}
    },250)
  }catch(e){console.warn('live relay event',e)}
}
function startLiveDiscovery(){
  if(!S.relay||S.liveDiscoverySub)return;
  try{
    S.liveDiscoverySub=S.relay.subscribeMany(
      CFG.relays,
      {kinds:[CFG.nostrKind,1],'#t':[CFG.relayTag],since:Math.floor(Date.now()/1000)-120},
      {onevent:ingestLiveRelayEvent}
    );
  }catch(e){console.warn('live subscription unavailable',e)}
}
async function queryOneRelay(url,since=0){
  const filter={kinds:[CFG.nostrKind,1],'#t':[CFG.relayTag],limit:since?2500:12000};
  if(since>0)filter.since=since;
  const evs=await withTimeout(
    S.relay.querySync([url],filter),
    7500,
    'query timeout'
  );
  const parsed=[];
  for(const n of (evs||[])){
    try{
      const o=normalizeEvent(JSON.parse(n.content));
      o._nostrId=n.id;
      parsed.push(o);
    }catch{}
  }
  return parsed;
}
async function repairLocalDiscovery(seenByRelay){
  if(S.didRepair||!S.nostr||!S.relay||!S.nostrSk)return 0;
  const last=Number(localStorage.getItem('zb1_relay_repair_at')||0);
  if(Date.now()-last<10*60*1000){S.didRepair=true;return 0}
  S.didRepair=true;
  const local=localEvents().filter(e=>['SALE','SALE_CANCEL','OFFER','ATOMIC_LOCK','ATOMIC_SETTLED','NOIR_LOCK','NOIR_SETTLED','NOIR_PAYMENT','NOIR_FEE_PAYMENT','NOIR_SELLER_PAYMENT','CLAIM','TRANSFER','SALE_USDC','SALE_USDC_SETTLED'].includes(e.type));
  let repaired=0;
  for(const e of local){
    const key=innerEventKey(e); if(!key)continue;
    const missing=CFG.relays.filter(url=>!(seenByRelay.get(url)||new Set()).has(key));
    if(!missing.length)continue;
    const r=await publishRelay(e,{quiet:true,onlyRelays:missing});
    repaired+=r.ok;
  }
  localStorage.setItem('zb1_relay_repair_at',String(Date.now()));
  return repaired;
}
async function fetchRelay(){
  if(S.relayFetchBusy)return;
  S.relayFetchBusy=true;
  try{

  let arr=[...S.events,...discoveryCache(),...verifiedSettlementJournal(),...paymentRecoveryJournal(),...localEvents(),...S.liveDiscoveryEvents.values()];
  const seenByRelay=new Map();
  let relayOk=0,relayEvents=0;
  if(S.nostr&&S.relay){
    const since=S.lastRelayFetch?Math.max(0,Math.floor(S.lastRelayFetch/1000)-45):0;
    const results=await Promise.allSettled(CFG.relays.map(async url=>{
      const evs=await queryOneRelay(url,since);
      return {url,evs};
    }));
    for(let i=0;i<results.length;i++){
      const url=CFG.relays[i],r=results[i];
      if(r.status==='fulfilled'){
        relayOk++;
        S.relayHealth.set(url,{ok:true,at:Date.now()});
        const seen=new Set();
        for(const o of r.value.evs){
          arr.push(o); relayEvents++;
          const k=innerEventKey(o); if(k)seen.add(k);
        }
        seenByRelay.set(url,seen);
      }else{
        S.relayHealth.set(url,{ok:false,at:Date.now()});
        seenByRelay.set(url,new Set());
      }
    }
  }
  // Wallet history is authoritative for private memo visibility on this connected wallet.
  // Merge it with relay discovery instead of allowing a sparse relay copy to replace it.
  for(const e of S.walletRecovered.values())arr.push(e);
  const ded=new Map();
  for(const e of arr){
    const k=innerEventKey(e)||eventKey(e)||JSON.stringify(e);
    ded.set(k,mergeEvent(ded.get(k),e));
  }
  S.events=[...ded.values()];
  saveDiscoveryCache(S.events);
  rebuildState();
  let repaired=0;
  try{repaired=await repairLocalDiscovery(seenByRelay)}catch(e){console.warn('relay repair',e)}
  $('relayStatus').textContent=`Relays: ${relayOk}/${CFG.relays.length} · ${S.events.length} events${repaired?` · repaired ${repaired}`:''}`;

    S.lastRelayFetch=Date.now();
  }finally{
    S.relayFetchBusy=false
  }
}
function eventOrder(a,b){
  const ah=Number(a.blockHeight),bh=Number(b.blockHeight);
  const ac=Number.isInteger(ah)&&ah>0,bc=Number.isInteger(bh)&&bh>0;
  if(ac&&bc&&ah!==bh)return ah-bh;
  if(ac!==bc)return ac?-1:1;
  const ai=Number(a.txIndex),bi=Number(b.txIndex);
  if(Number.isInteger(ai)&&Number.isInteger(bi)&&ai!==bi)return ai-bi;
  return (Number(a.timestamp)||0)-(Number(b.timestamp)||0);
}
function rebuildState(){
  const claims=new Map(),trans=[];const sorted=[...S.events].sort(eventOrder);
  for(const e of sorted){
    if(e.type==='CLAIM'&&Number.isInteger(Number(e.tokenId))){
      const id=Number(e.tokenId),old=claims.get(id);
      if(!old)claims.set(id,e);
      else if(eventKey(old)===eventKey(e))claims.set(id,mergeEvent(old,e));
    }else if(e.type==='TRANSFER')trans.push(e)
  }
  S.claims=claims;S.transfers=trans;

  const listings=new Map(),offers=[],canceled=new Set(),locks=new Map(),settled=new Map();
  for(const e of sorted){
    if(e.type==='SALE'){
      const k=e.listingId||e.eventId;if(k&&!canceled.has(k))listings.set(k,e)
    }else if(e.type==='SALE_CANCEL'){
      if(e.listingId){canceled.add(e.listingId);listings.delete(e.listingId)}
    }else if(e.type==='OFFER')offers.push(e);
    else if((e.type==='ATOMIC_LOCK'||e.type==='NOIR_LOCK')&&e.lockId)locks.set(e.lockId,e);
    else if(((e.type==='ATOMIC_SETTLED'||e.type==='NOIR_SETTLED')||e.type==='NOIR_SETTLED')&&e.lockId)settled.set(e.lockId,e)
  }
  for(const id of canceled)listings.delete(id);
  S.listings=listings;S.offers=offers;S.atomicLocks=locks;S.atomicSettlements=settled;
  renderMarket();renderUsdcMarket();renderActivity();renderPortfolio();renderAtomicDesk();updateWalletUI();
}
function eventUnix(e){return Number(e?.blockTime||e?.block_time||e?.timestamp)||0}
function tokenState(id){
  id=Number(id);

  const canonical=S.claims.get(id),walletClaim=S.walletRecoveredClaims.get(id);
  const serverOwnerCheckpoint=walletClaim?.source==='supabase-index'&&String(walletClaim?.serverLastEventType||'CLAIM')!=='CLAIM';
  const c=serverOwnerCheckpoint?walletClaim:(canonical||walletClaim||null);
  const settlements=[...S.verifiedAtomic.values(),...S.usdcVerifiedSettlements.values()]
    .filter(x=>Number(x.tokenId)===id)
    .sort(eventOrder);

  // FINAL OWNERSHIP CHECKPOINT:
  // A verified marketplace settlement is a later ownership transition than the
  // original CLAIM. Always start from the latest verified settlement when one
  // exists — even if a delayed relay later rediscovers the old seller CLAIM.
  // This fixes "NFT appears for a few seconds, then goes back to seller".
  const checkpoint=settlements.length?settlements[settlements.length-1]:null;

  let owner=null,lock=null,settlement=null;
  if(checkpoint){
    owner=String(checkpoint.buyerCommitment||'').toLowerCase()||null;
    settlement=checkpoint;
  }else if(c){
    owner=String(c.ownerCommitment||'').toLowerCase()||null;
  }else{
    return {owner:null,lock:null,settlement:null}
  }

  const now=Math.floor(Date.now()/1000),events=[];
  for(const t of S.transfers.filter(x=>Number(x.tokenId)===id))events.push({...t,_atomicKind:'transfer'});
  for(const l of S.confirmedLocks.values())if(Number(l.tokenId)===id)events.push({...l,_atomicKind:'lock'});
  for(const s of settlements)events.push({...s,_atomicKind:'settle'});
  events.sort(eventOrder);

  for(const e of events){
    // The latest verified settlement checkpoint already includes all ownership
    // history up through itself. Only events strictly after it may change owner.
    if(checkpoint&&eventOrder(e,checkpoint)<=0)continue;

    const when=eventUnix(e)||now;
    if(lock&&when>lockEffectiveExpiry(lock))lock=null;

    if(e._atomicKind==='transfer'){
      if(lock&&when<=lockEffectiveExpiry(lock))continue;
      if(e.fromCommitment&&owner&&String(e.fromCommitment).toLowerCase()!==owner)continue;
      owner=String(e.toCommitment||owner).toLowerCase()
    }else if(e._atomicKind==='lock'){
      if(lock)continue;
      if(String(e.sellerCommitment||'').toLowerCase()!==owner)continue;
      if(Number(e.expires||0)<=when)continue;
      lock=e
    }else if(e._atomicKind==='settle'){
      // All entries here are from S.verifiedAtomic, not raw relay settlement claims.
      const seller=String(e.sellerCommitment||'').toLowerCase();
      const buyer=String(e.buyerCommitment||'').toLowerCase();
      if(!buyer)continue;
      if(owner!==seller&&owner!==buyer)continue;
      owner=buyer;settlement=e;
      if(lock?.lockId===e.lockId)lock=null
    }
  }
  if(lock&&now>lockEffectiveExpiry(lock))lock=null;
  return {owner,lock,settlement}
}
function currentOwner(id){return tokenState(id).owner}
function indexedOwner(id){const x=S.serverOwners.get(Number(id));return x?.owner||null}
function effectiveOwner(id){
  const x=S.serverOwners.get(Number(id));
  if(x?.owner&&['signature','chain','full'].includes(String(x.level||'')))return x.owner;
  return currentOwner(id)||x?.owner||null
}
function canonicalZecOwner(id){
  const x=S.serverZecOwners.get(Number(id));
  if(x?.owner&&['signature','chain','full'].includes(String(x.level||'')))return String(x.owner).toLowerCase();
  return null
}
function activeAtomicLockForToken(id){return tokenState(id).lock}
function tokenIsAtomicLocked(id){return !!activeAtomicLockForToken(id)}

function ownedTokens(){
  if(!S.ownerCommitment)return[];
  const mine=String(S.ownerCommitment).toLowerCase();

  // Once the production portfolio snapshot is loaded, it is authoritative.
  // Wallet history / relay discovery may enrich metadata, but cannot add/remove
  // portfolio ownership cards on their own.
  if(S.serverPortfolioOwner===mine&&S.serverPortfolioLoaded.has(mine)){
    return [...S.serverPortfolioTokens.values()]
      .map(base=>{
        const id=Number(base.tokenId),cached=S.portfolioSourceCache.get(id);
        return {
          ...base,
          tokenId:id,
          sourceHeight:base?.sourceHeight||cached?.sourceHeight||(S.genesisHeight?S.genesisHeight-id:null),
          sourceHash:base?.sourceHash||cached?.sourceHash||'',
          txid:base?.txid||''
        }
      })
      .sort((a,b)=>a.tokenId-b.tokenId)
  }

  const ids=new Set();
  for(const id of S.claims.keys())ids.add(Number(id));
  for(const id of S.walletRecoveredClaims.keys())ids.add(Number(id));
  for(const s of S.verifiedAtomic.values())if(Number.isInteger(Number(s.tokenId)))ids.add(Number(s.tokenId));
  for(const s of S.usdcVerifiedSettlements.values())if(Number.isInteger(Number(s.tokenId)))ids.add(Number(s.tokenId));

  const out=[];
  for(const id of ids){
    if(String(currentOwner(id)||'').toLowerCase()!==mine)continue;
    const canonical=S.claims.get(id),wc=S.walletRecoveredClaims.get(id);
    const sale=[...S.verifiedAtomic.values(),...S.usdcVerifiedSettlements.values()].filter(x=>Number(x.tokenId)===id).sort(eventOrder).slice(-1)[0]||null;
    const cached=S.portfolioSourceCache.get(id);
    const base=canonical?mergeEvent(canonical,wc):wc||sale||{tokenId:id};
    out.push({
      ...base,tokenId:id,
      sourceHeight:base?.sourceHeight||sale?.sourceHeight||cached?.sourceHeight||(S.genesisHeight?S.genesisHeight-id:null),
      sourceHash:base?.sourceHash||sale?.sourceHash||cached?.sourceHash||'',
      txid:base?.txid||sale?.sellerPaymentTxid||sale?.paymentTxid||sale?.txid||'',
      acquiredViaSale:!!sale
    })
  }
  return out.sort((a,b)=>a.tokenId-b.tokenId)
}

async function ensurePortfolioSource(id){
  id=Number(id);
  if(!Number.isInteger(id)||id<1||id>CFG.supply||S.portfolioSourceCache.has(id)||S.portfolioSourcePending.has(id))return;
  S.portfolioSourcePending.add(id);
  try{
    const gh=await resolveGenesis(),sourceHeight=gh-id;
    const b=await explorerFetch('block',sourceHeight);
    const sourceHash=String(deepFind(b,['hash','block_hash','blockHash'])||'').toLowerCase();
    if(/^[0-9a-f]{64}$/.test(sourceHash)){
      S.portfolioSourceCache.set(id,{sourceHeight,sourceHash});
      renderPortfolio()
    }
  }catch(e){console.warn('portfolio source recovery',id,e)}
  finally{S.portfolioSourcePending.delete(id)}
}
function canonicalZecMarketListings(){
  if(!S.serverZecMarketReady)return null;
  const now=Math.floor(Date.now()/1000),byToken=new Map();
  for(const e of S.serverMarketEvents.values()){
    if(e?.type!=='SALE'||Number(e.expires||0)<=now)continue;
    const id=Number(e.tokenId),seller=String(e.sellerCommitment||'').toLowerCase(),owner=canonicalZecOwner(id);
    if(!Number.isInteger(id)||id<1||id>CFG.supply||!owner||owner!==seller||tokenIsAtomicLocked(id))continue;
    const old=byToken.get(id);
    if(!old||(Number(e.timestamp)||0)>(Number(old.timestamp)||0))byToken.set(id,e)
  }
  return [...byToken.values()]
}
function activeListings(){
  const canonical=canonicalZecMarketListings();
  if(canonical)return canonical;
  const now=Math.floor(Date.now()/1000),byToken=new Map();
  for(const x of S.listings.values()){
    if((x.expires||0)<=now||currentOwner(x.tokenId)!==x.sellerCommitment||tokenIsAtomicLocked(x.tokenId))continue;
    const old=byToken.get(Number(x.tokenId));
    if(!old||(x.timestamp||0)>(old.timestamp||0))byToken.set(Number(x.tokenId),x);
  }
  return [...byToken.values()];
}
function activeListingForToken(id){return activeListings().find(x=>Number(x.tokenId)===Number(id))||null}
function latestPublishedListingForToken(id,sellerCommitment=null){
  const now=Math.floor(Date.now()/1000);
  const seller=sellerCommitment?String(sellerCommitment).toLowerCase():null;
  return [...S.listings.values()]
    .filter(x=>Number(x.tokenId)===Number(id)
      && Number(x.expires||0)>now
      && (!seller||String(x.sellerCommitment||'').toLowerCase()===seller))
    .sort((a,b)=>(Number(b.timestamp)||0)-(Number(a.timestamp)||0))[0]||null
}
function currentListingForOffer(o){
  if(!o)return null;
  const current=activeListingForToken(o.tokenId);
  if(!current)return null;
  if(String(current.listingId||'')!==String(o.listingId||''))return null;
  return current
}
function visibleMarketListings(){
  const canonical=canonicalZecMarketListings();
  if(canonical)return canonical;
  // Fresh sessions fail closed until the canonical ZEC owner/listing snapshot is ready.
  // Never render relay/browser-only listings as public market inventory.
  if(!S.serverZecMarketReady)return[];
  return []
}
function validPrice(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:0}
function settledSales(){
  return [...S.verifiedAtomic.values()]
    .filter(e=>(e.type==='ATOMIC_SETTLED'||e.type==='NOIR_SETTLED')&&Number.isInteger(Number(e.tokenId))&&Number(e.tokenId)>=1&&Number(e.tokenId)<=CFG.supply&&validPrice(e.price))
    .sort((a,b)=>(b.blockTime||b.timestamp||0)-(a.blockTime||a.timestamp||0))
}
function updateMarketMetrics(){
  const active=activeListings(),visible=active,sales=settledSales();
  const floor=active.length?Math.min(...active.map(x=>validPrice(x.price)).filter(Boolean)):0;
  let volume=sales.reduce((sum,x)=>sum+validPrice(x.price),0);
  let salesN=sales.length;
  if(S.serverZecMetrics){
    const sv=Number(S.serverZecMetrics.volume_base_units||0)/1e8;
    if(Number.isFinite(sv))volume=sv;
    salesN=Number(S.serverZecMetrics.sales)||0
  }
  $('floorPrice').textContent=floor?`${floor.toLocaleString(undefined,{maximumFractionDigits:8})} ZEC`:'—';
  $('totalVolume').textContent=`${volume.toLocaleString(undefined,{maximumFractionDigits:8})} ZEC`;
  $('salesCount').textContent=salesN.toLocaleString();
  $('listedCount').textContent=visible.length.toLocaleString();
}
function updateUsdcMarketMetrics(){
  const active=canonicalActiveUsdcListings();
  let floor=active.length?active.reduce((min,x)=>{const p=Number(x.priceUSDC||0)/1e6;return !min||p<min?p:min},0):0;
  let volume=0,salesN=0,listedN=active.length;
  if(S.serverUsdcMetrics){
    const sf=Number(S.serverUsdcMetrics.floor_base_units||0)/1e6;
    const sv=Number(S.serverUsdcMetrics.volume_base_units||0)/1e6;
    floor=Number.isFinite(sf)?sf:floor;
    volume=Number.isFinite(sv)?sv:0;
    salesN=Number(S.serverUsdcMetrics.sales)||0;
    listedN=Number(S.serverUsdcMetrics.listed)||0
  }else{
    const sales=[...S.usdcOnchain.values()].filter(x=>Number(x.status)===2&&Number(x.settledAt)>0);
    volume=sales.reduce((sum,x)=>sum+(Number(x.priceUSDC||0)/1e6),0);
    salesN=sales.length
  }
  $('usdcFloorPrice').textContent=floor?`${floor.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6})} USDC`:'—';
  $('usdcTotalVolume').textContent=`${volume.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6})} USDC`;
  $('usdcSalesCount').textContent=salesN.toLocaleString();
  $('usdcListedCount').textContent=listedN.toLocaleString();
}
function activityKind(e){
  if(e.type==='ATOMIC_SETTLED'||e.type==='NOIR_SETTLED'||e.type==='ZB20_SETTLED')return 'sale';
  if(e.type==='SALE'||e.type==='ZB20_LIST')return 'list';
  if(e.type==='OFFER')return 'offer';
  if(e.type==='SALE_CANCEL'||e.type==='ZB20_CANCEL')return 'cancel';
  if(e.type==='TRANSFER')return 'transfer';
  return null;
}
function activityLabel(kind){return {sale:'SALE',list:'LIST',offer:'OFFER',cancel:'CANCEL',transfer:'TRANSFER'}[kind]||kind.toUpperCase()}
function ago(ts){
  if(!ts)return '—';
  const s=Math.max(0,Math.floor(Date.now()/1000-Number(ts)));
  if(s<60)return `${s}s ago`;
  if(s<3600)return `${Math.floor(s/60)}m ago`;
  if(s<86400)return `${Math.floor(s/3600)}h ago`;
  if(s<2592000)return `${Math.floor(s/86400)}d ago`;
  return new Date(Number(ts)*1000).toLocaleDateString();
}
function activityFrom(e,kind){
  if(kind==='sale')return e.sellerCommitment||e.fromCommitment||'';
  if(kind==='list'||kind==='cancel')return e.sellerCommitment||'';
  if(kind==='offer')return e.buyerCommitment||'';
  if(kind==='transfer')return e.fromCommitment||'';
  return '';
}
function activityTo(e,kind){
  if(kind==='sale')return e.buyerCommitment||e.toCommitment||'';
  if(kind==='offer')return e.sellerCommitment||'';
  if(kind==='transfer')return e.toCommitment||'';
  return '';
}
function activityPrice(e,kind){
  if(kind==='sale'||kind==='list'||kind==='offer')return validPrice(e.price);
  return 0;
}
// Display privacy only: never put a participant ID into public activity markup.
function activityParties(e,kind){
  const hidden='<span class="activityParty" aria-label="Participant ID hidden"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3 4 6v6c0 4 4 7 8 9 4-2 8-5 8-9V6l-8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg><span>Hidden</span></span>';
  const from=!!activityFrom(e,kind),to=!!activityTo(e,kind);
  if(!from&&!to)return '—';
  return `<span class="activityParties">${from?hidden:''}${from&&to?'<span class="activityPartyArrow" aria-hidden="true">→</span>':''}${to?hidden:''}</span>`;
}
function activityTx(e){return e.sellerPaymentTxid||e.paymentTxid||e.txid||e.transferTxid||''}
function activityIdentity(e){
  const kind=activityKind(e),tx=String(activityTx(e)||'').toLowerCase(),cur=String(e.currency||'ZEC').toUpperCase();
  if(kind==='sale'&&tx)return `sale:${cur}:${tx}`;
  return eventKey(e)||String(e.eventId||'')||`${e.type}:${e.lockId||''}:${e.tokenId||''}:${e.timestamp||0}`
}
function renderActivity(){
  updateMarketMetrics();
  const filter=$('activityFilter')?.value||'all';
  const activityMap=new Map();
  // Local/relay events remain a fallback. Persistent server activity is applied last
  // so a sparse browser relay history can never overwrite the canonical feed.
  for(const e of [...S.events,...S.verifiedAtomic.values(),...S.serverActivity]){
    const k=activityIdentity(e),old=activityMap.get(k);
    if(String(e.source||'').startsWith('supabase-activity'))activityMap.set(k,{...(old||{}),...e});
    else activityMap.set(k,mergeEvent(old,e))
  }
  const events=[...activityMap.values()]
    .map(e=>({e,kind:activityKind(e)}))
    .filter(x=>x.kind&&(filter==='all'||x.kind===filter))
    .sort((a,b)=>(b.e.timestamp||0)-(a.e.timestamp||0))
    .slice(0,30);
  const body=$('activityBody'); if(!body)return;
  body.innerHTML='';
  if(!events.length){
    body.innerHTML='<tr><td colspan="6" style="padding:34px;text-align:center;color:#666">No matching marketplace activity yet.</td></tr>';
    return;
  }
  for(const {e,kind} of events){
    const tr=document.createElement('tr');
    const price=activityPrice(e,kind);
    const tx=activityTx(e),currency=String(e.currency||'ZEC').toUpperCase();
    const isZecs=String(e.asset||'').toUpperCase()==='ZECS';
    const item=isZecs?`${Number(e.amount||0).toLocaleString()} ZECS`:`ZEC BLOCK #${e.tokenId||'—'}`;
    const label=isZecs?`ZECS ${activityLabel(kind)}`:activityLabel(kind);
    tr.innerHTML=`<td><span class="eventBadge ${kind}">${esc(label)}</span></td>
      <td class="item">${esc(item)}</td>
      <td class="${price?'activityPrice':''}">${price?`${esc(String(e.price))} ${esc(currency)}`:'—'}</td>
      <td>${activityParties(e,kind)}</td>
      <td>${esc(ago(e.timestamp))}</td>
      <td>${tx?`<span class="txlink" title="${esc(tx)}">${esc(short(tx,7))}</span>`:'—'}</td>`;
    body.appendChild(tr);
  }
}

const USDC_MARKET_ABI=[
  'function createListing(uint32 tokenId,bytes32 sellerCommitment,uint128 priceUSDC,uint64 expiresAt,bytes32 listingNonce,bytes32 zb1ListingHash) returns (bytes32)',
  'function cancelListing(bytes32 listingId)',
  'function buyNow(bytes32 listingId,bytes32 buyerCommitment) returns (uint256,uint256)',
  'function buyNowWithPermit(bytes32 listingId,bytes32 buyerCommitment,uint256 permitDeadline,uint8 v,bytes32 r,bytes32 s) returns (uint256,uint256)',
  'function computeListingId(address seller,uint32 tokenId,bytes32 sellerCommitment,uint128 priceUSDC,uint64 expiresAt,bytes32 listingNonce,bytes32 zb1ListingHash) view returns (bytes32)',
  'function listings(bytes32) view returns (address seller,bytes32 sellerCommitment,uint32 tokenId,uint64 expiresAt,uint128 priceUSDC,bytes32 listingNonce,bytes32 zb1ListingHash,uint8 status,address buyer,bytes32 buyerCommitment,uint64 settledAt)',
  'function isBuyable(bytes32) view returns (bool)',
  'event ListingCreated(bytes32 indexed listingId,uint32 indexed tokenId,bytes32 indexed sellerCommitment,address seller,uint256 priceUSDC,uint64 expiresAt,bytes32 listingNonce,bytes32 zb1ListingHash)',
  'event ListingCancelled(bytes32 indexed listingId,uint32 indexed tokenId,address indexed seller)',
  'event ZB1SaleSettled(bytes32 indexed listingId,uint32 indexed tokenId,bytes32 indexed buyerCommitment,bytes32 sellerCommitment,bytes32 zb1ListingHash,address buyer,address seller,uint256 grossAmountUSDC,uint256 protocolFeeUSDC,uint256 sellerAmountUSDC,uint64 settledAt)'
];
const BASE_USDC_ABI=[
  'function allowance(address owner,address spender) view returns(uint256)',
  'function approve(address spender,uint256 value) returns(bool)',
  'function nonces(address owner) view returns(uint256)',
  'function name() view returns(string)',
  'function balanceOf(address owner) view returns(uint256)'
];
const DIRECT_ZEC_RECOVERY_KEY='zecblocks_direct_zec_recovery_v1';
const nftTransferJournal=MarketRuntime.journal(localStorage,'zb1_nft_transfers_v1');
async function resumeNftTransfers(){
  return MarketRuntime.singleFlight('nft-transfer-recovery',async()=>{
    const owner=S.ownerCommitment,epoch=S.walletEpoch||0;if(!owner||activeWalletAction)return;
    for(const row of nftTransferJournal.read().filter(x=>x.owner===owner)){
      try{
        const rows=await MarketRuntime.requestJSON(`${INDEX_CFG.url}/rest/v1/zecblocks_tokens?token_id=eq.${Number(row.tokenId)}&select=owner_commitment,owner_verified_level`,{headers:indexHeaders(),cache:'no-store'});
        if(S.ownerCommitment!==owner||(S.walletEpoch||0)!==epoch)return;
        if(rows?.[0]?.owner_verified_level==='full'&&dbCommitment(rows[0].owner_commitment)===row.to){nftTransferJournal.remove(row.id);await hydrateServerPortfolio(owner);continue}
        if(!row.txid&&Array.isArray(row.historyBefore)){
          const history=await readNoirHistory();
          if(S.ownerCommitment!==owner||(S.walletEpoch||0)!==epoch)return;
          const matches=Array.isArray(history)?[...new Set(history.filter(h=>h.memo===row.memo&&!row.historyBefore.includes(zcashTxidFromResult(h))).map(zcashTxidFromResult).filter(x=>/^[0-9a-f]{64}$/.test(x)))]:[];
          if(matches.length===1){row.txid=matches[0];nftTransferJournal.put(row)}
        }
        if(!row.txid||Date.now()-Number(row.lastPublishAt||0)<60000)continue;
        const event=normalizeEvent({protocol:'ZB1',v:1,type:'TRANSFER',txid:row.txid,memo:row.memo,tokenId:row.tokenId,fromCommitment:row.owner,toCommitment:row.to,pubkey:row.pubkey,signature:row.signature,timestamp:row.timestamp,status:'pending'});
        rememberRuntimeEvent(event);const published=await publishRelay(event);
        if(published?.ok)nftTransferJournal.put({...row,lastPublishAt:Date.now()});
      }catch(error){console.warn('NFT transfer confirmation pending',error)}
    }
    renderPendingTransactions();
  });
}
function beginTransactionFlow(summary){
  S.transactionFlow={action:activeWalletAction,owner:actionOwner()};
  $('transactionSummary').textContent=summary;$('transactionTitle').textContent='Complete your purchase';
  updateTransactionFlow('prepare','Checking the item and preparing your purchase…');modal('transactionModal',true);
}
function updateTransactionFlow(stage,message,recoveryKey=''){
  if(!S.transactionFlow||S.transactionFlow.owner!==S.ownerCommitment||S.transactionFlow.action!==activeWalletAction&&(!recoveryKey||recoveryKey!==S.transactionFlow.recoveryKey))return;
  const stages=['prepare','wallet','network','done'],current=stages.indexOf(stage);
  $('transactionStatus').textContent=message;
  for(const el of document.querySelectorAll('.transactionSteps li')){const i=stages.indexOf(el.dataset.stage);el.classList.toggle('active',i===current);el.classList.toggle('complete',i<current)}
}
async function zecDirectApi(action,body={}){return indexFunction('zecblocks-zec-direct-market',{action,...body})}
const listingFeeJournal=MarketRuntime.journal(localStorage,'zb1_listing_fees_v1');
function pendingListingFees(){return listingFeeJournal.read().filter(x=>x.owner===S.ownerCommitment&&!['rejected','complete'].includes(x.status))}
async function publishPaidZecListing(action,fields,message,asset){
  const owner=actionOwner();
  const unresolved=pendingListingFees().find(x=>!x.txid||(x.asset===asset&&(asset==='ZECS'||x.fields.tokenId===fields.tokenId)));
  if(unresolved)throw Error('This listing has a saved fee request. Check Listing payments in Portfolio before paying again.');
  const tools=await nftAddressTools(),hash=await sha256HexBytes(enc.encode(message));
  const signature=await rpc('zcash_signMessage',[ListingFee.authorization(asset,hash),{signingMode:'current'}]);
  fields={...fields,feePubkey:sigPub(signature),feeSignature:sigVal(signature)};
  if(tools.addressFor(fields.feePubkey)!==fields.sellerPayout)throw Error('The selected payment address changed. Reconnect your wallet.');
  const prepared=await zecDirectApi(action,fields);assertWalletAction();
  if(prepared.listing||prepared.order)return prepared;
  if(!prepared.fee_required||prepared.payment?.to!==ListingFee.treasury||prepared.payment.amount_zec!==ListingFee.amount||prepared.payment.funding_source!=='transparent')throw Error('Listing fee request does not match the displayed fee.');
  const max=await rpc('zcash_getMaxTransfer',[{to:ListingFee.treasury,fundingSource:'transparent'}]);assertWalletAction();
  const spendable=zecToZat(String(max?.maxAmount??''));
  if(spendable==null||spendable<ListingFee.zatoshi)throw Error('You need 0.0002 ZEC plus the network fee in Noir’s transparent balance. No listing payment was sent.');
  let historyBefore=null;try{const h=await readNoirHistory();if(Array.isArray(h))historyBefore=h.map(zcashTxidFromResult)}catch{}
  assertWalletAction();
  let row={id:prepared.payment.listing_id,owner,asset,action,fields,payment:prepared.payment,historyBefore,startedAt:Date.now(),status:'broadcasting'};
  listingFeeJournal.put(row);renderListingFeeRecoveries();
  let raw;
  try{raw=await rpc('zcash_sendTransaction',[{to:ListingFee.treasury,amount:ListingFee.amount,fundingSource:'transparent'}])}
  catch(error){if(walletRejected(error))listingFeeJournal.put({...row,status:'rejected'});else await zecDirectApi(action,{...fields,recoverFee:true}).catch(()=>{});throw error}
  const txid=zcashTxidFromResult(raw);
  if(/^[0-9a-f]{64}$/.test(txid)){row={...row,txid,status:'confirmation'};listingFeeJournal.put(row)}
  assertWalletAction();
  modal(asset==='ZECS'?'zecsZecListingModal':'listingModal',false);
  if(!row.txid)toast('Listing payment saved. Checking Noir history; no second fee will be sent.',10000);
  return finishListingFee(row);
}
async function finishListingFee(row,silent=false){
  const epoch=S.walletEpoch||0,owner=S.ownerCommitment;
  if(owner!==row.owner)return {pending:true};
  const result=await zecDirectApi(row.action,{...row.fields,feeTxid:row.txid,recoverFee:!row.txid});
  if(S.ownerCommitment!==owner||(S.walletEpoch||0)!==epoch)return {pending:true};
  const current=listingFeeJournal.read().find(x=>x.id===row.id);
  if(!current||current.status==='complete')return result;
  if(result.listing||result.order){
    listingFeeJournal.put({...current,status:'complete',error:''});
    await refreshDirectMarketViews();toast('Listing published. Listing fee paid: 0.0002 ZEC. Trading fee: 0%.',9000);
  }else{listingFeeJournal.put({...current,status:current.txid?'confirmation':'broadcasting',error:''});if(!silent)toast('Listing fee is awaiting confirmation. Your listing will publish after verification.',7500)}
  renderListingFeeRecoveries();return result;
}
async function recoverListingFeeTx(row){
  if(!Array.isArray(row.historyBefore))return '';
  const owner=S.ownerCommitment,epoch=S.walletEpoch||0;
  const history=await readNoirHistory();if(!Array.isArray(history))return '';
  const all=listingFeeJournal.read();
  if(all.some(x=>x.owner===owner&&x.id!==row.id&&!x.txid&&x.status==='broadcasting'))return '';
  const before=new Set(row.historyBefore),used=new Set(all.filter(x=>x.id!==row.id).map(x=>x.txid));
  const candidates=[...new Set(history.filter(x=>{
    const id=zcashTxidFromResult(x),raw=Number(x.timestamp),time=raw<1e12?raw*1000:raw;
    return /^[0-9a-f]{64}$/.test(id)&&!before.has(id)&&!used.has(id)&&time>=row.startedAt-180000&&time<=row.startedAt+3600000&&!/failed|rejected|cancelled|canceled|incoming|received/i.test(String(x.status||'')+' '+String(x.type||''));
  }).map(zcashTxidFromResult))];
  if(candidates.length>12)return '';
  const matches=[];
  for(const txid of candidates){
    const tx=await explorerFetch('tx',txid); // An unavailable candidate leaves the request unresolved.
    try{ListingFee.transactionProof(tx,{txid,address:row.fields.sellerPayout,createdAt:Date.parse(row.payment.created_at)},false);matches.push(txid)}catch{}
  }
  if(owner!==S.ownerCommitment||(S.walletEpoch||0)!==epoch)return '';
  return matches.length===1?matches[0]:'';
}
async function resumeListingFees(){
  return MarketRuntime.singleFlight('listing-fees',async()=>{
    if(activeWalletAction||!S.ownerCommitment)return;
    const owner=S.ownerCommitment,epoch=S.walletEpoch||0;
    for(let row of pendingListingFees()){
      try{
        if(!row.txid){let txid='';try{txid=await recoverListingFeeTx(row)}catch{}
          if(!txid){await finishListingFee(row,true);continue;}
          if(S.ownerCommitment!==owner||(S.walletEpoch||0)!==epoch)return;
          const current=listingFeeJournal.read().find(x=>x.id===row.id);if(!current||current.status==='complete')continue;
          row={...current,txid,status:'confirmation'};listingFeeJournal.put(row);
        }
        await finishListingFee(row,true);
      }catch(error){
        if(S.ownerCommitment!==owner||(S.walletEpoch||0)!==epoch)return;
        const current=listingFeeJournal.read().find(x=>x.id===row.id);
        if(current&&current.status!=='complete')listingFeeJournal.put({...current,error:error.message||String(error)});
      }
    }
    renderListingFeeRecoveries();
  })
}
function renderListingFeeRecoveries(){
  const host=$('listingFeeRecoveries');if(!host)return;
  let rows;try{rows=S.ownerCommitment?pendingListingFees():[]}catch(error){host.hidden=false;host.textContent=error.message;return}
  host.hidden=!rows.length;host.replaceChildren();if(!rows.length)return;
  const heading=document.createElement('h3');heading.textContent='Listing payments';host.append(heading);
  for(const row of rows){
    const item=document.createElement('div');item.className='pendingRow';
    const note=document.createElement('p');note.textContent=(row.asset==='ZECS'?'ZECS listing':'ZEC BLOCK #'+row.fields.tokenId)+' · '+(row.error|| (row.txid?'Fee sent; waiting for confirmation and publication.':'Checking wallet payment. Do not pay this listing fee again.'));item.append(note);
    const button=document.createElement('button');button.className='btn';button.textContent='Check listing payment';button.onclick=async()=>{button.disabled=true;try{await resumeListingFees()}catch(error){toast(error.message,9000)}finally{renderListingFeeRecoveries()}};item.append(button);
    if(row.txid){const link=document.createElement('a');link.href='https://zcashblockexplorer.com/transactions/'+row.txid;link.target='_blank';link.rel='noopener noreferrer';link.textContent='View fee payment ↗';item.append(link)}
    host.append(item);
  }
}

async function readNoirHistory(){
  let timer;
  try{return await Promise.race([rpc('zcash_getTransactionHistory'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Wallet history is still syncing. We will check again.')),6000)})])}
  finally{clearTimeout(timer)}
}
function zcashTxidFromResult(v){
  const raw=typeof v==='string'?v:
    v?.txid??v?.txId??v?.tx_hash??v?.transactionId??v?.transaction_id??v?.transactionHash??v?.transaction_hash??v?.hash??v?.id??
    (typeof v?.result==='string'?v.result:null)??v?.result?.txid??v?.result?.txId??v?.result?.transactionHash??
    (typeof v?.data==='string'?v.data:null)??v?.data?.txid??v?.data?.txId??v?.data?.transactionHash??'';
  return String(raw||'').replace(/^0x/,'').trim().toLowerCase()
}
async function zcashTxidOrHistory(raw,{memo='',label='Zcash transaction'}={}){
  let txid=zcashTxidFromResult(raw);
  if(/^[0-9a-f]{64}$/.test(txid))return txid;
  if(memo){
    try{
      const hist=await readNoirHistory();
      const rows=(Array.isArray(hist)?hist:[]).filter(h=>String(h?.memo||'').trim()===String(memo).trim());
      const hit=rows.sort((a,b)=>Number(b?.timestamp||0)-Number(a?.timestamp||0))[0];
      txid=zcashTxidFromResult(hit);
      if(/^[0-9a-f]{64}$/.test(txid))return txid
    }catch(e){console.warn(label+' history recovery',e)}
  }
  throw new Error(label+' may already have been broadcast, but Noir did not return a recognizable TXID. Do NOT submit it again until wallet history is checked.')
}
function hideDirectListingLocally(asset,listingId){
  if(asset==='ZECS'&&Array.isArray(S.zecsZecSnapshot?.orders)){
    S.zecsZecSnapshot={...S.zecsZecSnapshot,orders:S.zecsZecSnapshot.orders.filter(x=>String(x.order_id)!==String(listingId))};
    renderZecsZecMarket()
  }else if(asset==='ZEC_BLOCK'){
    S.serverMarketEvents.delete('sale:'+String(listingId));
    renderMarket();updateMarketMetrics()
  }
}
function walletRejected(e){return Number(e?.code)===4001||e?.code==='ACTION_REJECTED'||/user (?:rejected|denied|declined|cancelled|canceled)|request rejected by (?:the )?user/i.test(String(e?.shortMessage||e?.message||e?.reason||e||''))}

function directRecoveryRead(){const a=JSON.parse(localStorage.getItem(DIRECT_ZEC_RECOVERY_KEY)||'[]');if(!Array.isArray(a))throw new Error('Payment recovery data is unreadable. Check your wallet history before continuing.');return a}
function directRecoveryWrite(rows){MarketRuntime.writeVerified(localStorage,DIRECT_ZEC_RECOVERY_KEY,rows);renderPendingTransactions()}
function saveDirectRecovery(row){const rows=directRecoveryRead(),old=rows.find(x=>x.reservationId===row.reservationId)||{};directRecoveryWrite([...rows.filter(x=>x.reservationId!==row.reservationId),{...old,...row,ownerCommitment:old.ownerCommitment||row.ownerCommitment||actionOwner(),updatedAt:Date.now()}])}
function dropDirectRecovery(id){directRecoveryWrite(directRecoveryRead().filter(x=>x.reservationId!==id))}
function directRecoveryNeedsReview(row){return ['expired','failed','cancelled'].includes(row.reservationStatus)}
function directReservationMatches(row,reservation,owner){
  return reservation&&dbCommitment(reservation.buyer_commitment)===owner&&reservation.reservation_id===row.reservationId&&reservation.asset===row.asset&&reservation.listing_id===row.listingId;
}
function currentDirectRecovery(row,owner,epoch){
  if(dbCommitment(S.ownerCommitment)!==owner||(S.walletEpoch||0)!==epoch)return null;
  return directRecoveryRead().find(x=>x.reservationId===row.reservationId&&(!x.ownerCommitment||x.ownerCommitment===owner))||null;
}
async function refreshDirectMarketViews(){
  await Promise.allSettled([hydrateServerZecMarketStates(),hydrateServerActivity(),loadZecsMarketState({account:!!S.ownerCommitment}),loadZecsZecMarketState()]);
  if(S.ownerCommitment)await hydrateServerPortfolio(S.ownerCommitment).catch(()=>{})
}
async function watchDirectReservation(){return resumeDirectPayments()}
async function findDirectPayment(row,reservation,owner,epoch){
  // Only new wallet-history entries from this exact request window qualify.
  // Old recovery rows without a pre-send baseline remain protected, never guessed.
  if(!Array.isArray(row.historyBefore)||!row.payment||!row.startedAt)return '';
  if(String(reservation.seller_payout)!==row.payment.to||String(reservation.price_zat)!==String(zecToZat(row.payment.amount)))return '';
  if(directRecoveryRead().some(x=>x.reservationId!==row.reservationId&&x.ownerCommitment===owner&&!x.txid&&x.payment?.to===row.payment.to&&x.payment?.amount===row.payment.amount))return '';
  const history=await readNoirHistory();
  if(S.ownerCommitment!==owner||(S.walletEpoch||0)!==epoch||!Array.isArray(history))return '';
  const before=new Set(row.historyBefore),used=new Set(directRecoveryRead().filter(x=>x.reservationId!==row.reservationId).map(x=>x.txid));
  const candidates=[...new Set(history.filter(h=>{
    const txid=zcashTxidFromResult(h),raw=Number(h?.timestamp),time=raw<1e12?raw*1000:raw;
    return /^[0-9a-f]{64}$/.test(txid)&&!before.has(txid)&&!used.has(txid)&&Number.isFinite(time)&&time>=row.startedAt-300000&&time<=row.startedAt+3600000&&!/failed|rejected|cancelled|canceled/i.test(String(h.status||''));
  }).map(zcashTxidFromResult))];
  if(!candidates.length||candidates.length>12)return '';
  const matches=[];
  // Every candidate must be readable before a unique match can be selected.
  for(const txid of candidates){
    const tx=await explorerFetch('tx',txid);
    const actual=String(tx?.txid||tx?.hash||'').toLowerCase();if(actual&&actual!==txid)throw Error('Transaction lookup mismatch.');
    const outs=Array.isArray(tx?.outputs)?tx.outputs:deepFind(tx,['outputs','vout']);
    if(!Array.isArray(outs))throw Error('Waiting for transaction outputs.');
    if(outputSum(outs,row.payment.to)===zecToZat(row.payment.amount))matches.push(txid);
  }
  if(S.ownerCommitment!==owner||(S.walletEpoch||0)!==epoch)return '';
  return matches.length===1?matches[0]:'';
}
async function resumeDirectPayments(){
  return MarketRuntime.singleFlight('direct-recovery',async()=>{
    const owner=dbCommitment(S.ownerCommitment),epoch=S.walletEpoch||0;if(!owner)return;
    let changed=false;
    for(let row of directRecoveryRead().filter(x=>!x.ownerCommitment||x.ownerCommitment===owner)){
      if(S.ownerCommitment!==owner||(S.walletEpoch||0)!==epoch)break;
      if(!row.reservationId)continue;
      try{
        const q=await zecDirectApi('reservation',{reservationId:row.reservationId}),r=q?.reservation;
        row=currentDirectRecovery(row,owner,epoch);
        if(!row||!directReservationMatches(row,r,owner))continue;
        if(r?.status==='settled'){dropDirectRecovery(row.reservationId);updateTransactionFlow('done','Purchase complete. Your portfolio is updated.','direct:'+row.reservationId);changed=true;continue}
        if(!['active','payment_pending','expired','failed','cancelled'].includes(r.status))continue;
        // Only a matching server reservation may move a purchase out of active pending.
        // Keep the full journal: a closed reservation is not proof that no money was sent.
        row={...row,ownerCommitment:owner,reservationStatus:r.status,statusCheckedAt:Date.now(),tokenId:r.token_id||row.tokenId};
        saveDirectRecovery(row);
        hideDirectListingLocally(row.asset,row.listingId);
        // An expired reservation does not prove that an ambiguous wallet payment never happened.
        if(!row.txid){
          if(S.zecDirectBusy)continue;
          const existing=zcashTxidFromResult(r.payment_txid);
          const recovered=/^[0-9a-f]{64}$/.test(existing)?existing:await findDirectPayment(row,r,owner,epoch);
          if(!recovered)continue;
          row=currentDirectRecovery(row,owner,epoch);if(!row)continue;
          row={...row,txid:recovered,recoveryRequired:false};saveDirectRecovery(row);
        }
        row=currentDirectRecovery(row,owner,epoch);if(!row||directRecoveryNeedsReview(row))continue;
        const x=await zecDirectApi('submit_payment',{reservationId:row.reservationId,txid:row.txid});
        if(!currentDirectRecovery(row,owner,epoch))continue;
        if(x?.settlement||x?.pending===false){dropDirectRecovery(row.reservationId);updateTransactionFlow('done','Purchase complete. Your portfolio is updated.','direct:'+row.reservationId);changed=true}
      }catch(e){console.warn('ZEC payment confirmation pending',e)}
    }
    if(changed)await refreshDirectMarketViews();
    renderPendingTransactions()
  })
}
async function directZecBuy(asset,listingId,summary=''){
  if(S.zecDirectBusy)return;
  const saved=directRecoveryRead().find(x=>(!x.ownerCommitment||x.ownerCommitment===actionOwner())&&x.asset===asset&&x.listingId===listingId);
  if(saved)return toast(directRecoveryNeedsReview(saved)?'This earlier purchase needs review. Open Portfolio → Purchases needing review. Do not pay again.':'Your purchase is being checked automatically. See Pending transactions for progress.',10000);
  let reservationId='',walletRequestStarted=false;
  try{
    if(!S.ownerCommitment){await connectWallet(false);if(!S.ownerCommitment)return}
    S.zecDirectBusy=true;
    beginTransactionFlow(summary||'Buy '+(asset==='ZECS'?'ZECS':'ZEC BLOCK'));
    updateTransactionFlow('wallet','Approve the purchase identity, then review the payment in Noir Wallet. No IDs need to be entered.');
    toast('Preparing your purchase. Review the request in Noir Wallet…',8000);

    const ch=await zecDirectApi('buy_challenge',{asset,listingId,buyerCommitment:S.ownerCommitment});
    const sig=await signDerived(ch.message);
    const r=await zecDirectApi('reserve_buy',{challengeId:ch.challenge_id,pubkey:sigPub(sig),signature:sigVal(sig)});
    reservationId=String(r.reservation?.reservation_id||'');
    if(!reservationId)throw new Error('Reservation was not created.');
    S.transactionFlow.recoveryKey='direct:'+reservationId;

    let historyBefore=null;
    try{const history=await readNoirHistory();if(Array.isArray(history))historyBefore=history.map(zcashTxidFromResult).filter(x=>/^[0-9a-f]{64}$/.test(x))}catch{}
    assertWalletAction();saveDirectRecovery({reservationId,asset,listingId,historyBefore,startedAt:Date.now(),payment:{to:r.payment.to,amount:r.payment.amount_zec}});
    hideDirectListingLocally(asset,listingId);
    if(asset==='ZECS')loadZecsZecMarketState().catch(()=>{});
    else hydrateServerZecMarketStates().catch(()=>{});
    toast('Reserved for this wallet. This item is now locked globally. Approve one ZEC payment to the seller…',8000);

    let walletResult;
    try{
      assertWalletAction();walletRequestStarted=true;
      walletResult=await rpc('zcash_sendTransaction',[{to:r.payment.to,amount:r.payment.amount_zec,fundingSource:'shielded'}])
    }catch(walletErr){
      if(!walletRejected(walletErr)&&reservationId){
        await zecDirectApi('payment_unknown',{reservationId}).catch(()=>{});
        saveDirectRecovery({reservationId,asset,listingId,recoveryRequired:true});
        hideDirectListingLocally(asset,listingId)
      }
      if(walletRejected(walletErr))dropDirectRecovery(reservationId);
      throw walletErr
    }

    const txid=zcashTxidFromResult(walletResult);
    if(!/^[0-9a-f]{64}$/.test(txid)){
      await zecDirectApi('payment_unknown',{reservationId}).catch(()=>{});
      saveDirectRecovery({reservationId,asset,listingId,recoveryRequired:true});
      hideDirectListingLocally(asset,listingId);
      throw new Error('Checking your payment in Noir Wallet automatically. Your purchase is saved; no second payment will be sent.')
    }

    saveDirectRecovery({reservationId,asset,listingId,txid});
    updateTransactionFlow('network','Payment sent. Waiting for Zcash confirmation and ownership verification…');
    const out=await zecDirectApi('submit_payment',{reservationId,txid});
    if(out?.settlement||out?.pending===false){
      dropDirectRecovery(reservationId);
      await refreshDirectMarketViews();
      toast('Purchase settled · '+short(txid,8),9000)
      updateTransactionFlow('done','Purchase complete. Your portfolio is updated.');
    }else{
      hideDirectListingLocally(asset,listingId);
      toast('Payment broadcast · '+short(txid,8)+' · item locked while waiting for Zcash confirmation. Do not pay again.',11000);
      watchDirectReservation(reservationId,asset)
    }
  }catch(e){
    if(!walletRequestStarted&&reservationId){try{dropDirectRecovery(reservationId)}catch{}}
    if(walletRequestStarted&&!walletRejected(e)&&reservationId){
      hideDirectListingLocally(asset,listingId)
    }
    toast(e?.message||String(e),11000)
    updateTransactionFlow(walletRequestStarted&&!walletRejected(e)?'network':'prepare',walletRequestStarted&&!walletRejected(e)?'Your purchase is saved. We are checking the existing payment automatically; no second payment will be sent.':e?.message||String(e));
  }finally{
    S.zecDirectBusy=false;
    if(walletRequestStarted&&reservationId)resumeDirectPayments().catch(e=>console.warn('payment recovery',e));
  }
}
async function upgradeZecListing(l){
  try{
    if(!S.ownerCommitment)throw new Error('Connect seller Noir Wallet first.');
    if(String(l.sellerCommitment||'').toLowerCase()!==String(S.ownerCommitment).toLowerCase())throw new Error('Only the seller can upgrade this listing.');
    const to=String(S.connection?.transparent||'');if(!/^t[13][A-Za-z0-9]{20,}$/.test(to))throw new Error('Noir Wallet did not expose a transparent payout address.');
    const nonce=crypto.randomUUID(),z=zecToZat(String(l.price));if(z==null)throw new Error('Invalid listing price.');
    const price=zatToZec(z),expiresAt=Number(l.expires);
    const msg='ZB1:SALE_DIRECT_UPGRADE:v1|G='+CFG.genesisTxid+'|L='+l.listingId+'|T='+l.tokenId+'|P='+price+'|E='+expiresAt+'|O='+S.ownerCommitment+'|A='+to+'|X='+nonce;
    const sig=await signDerived(msg);
    await zecDirectApi('upgrade_zb1_listing',{listingId:l.listingId,sellerCommitment:S.ownerCommitment,sellerPayout:to,nonce,pubkey:sigPub(sig),signature:sigVal(sig)});
    await hydrateServerZecMarketStates();toast('Buy Now enabled · 0% fee · one ZEC payment.',8000)
  }catch(e){toast(e?.message||String(e),10000)}
}
async function loadZecsZecMarketState(){
  try{const snapshot=await indexRpc('zecblocks_zecs_zec_market_snapshot',{});if(!MarketRuntime.validSnapshot(snapshot,['orders']))throw new Error('Incomplete ZECS / ZEC snapshot');S.zecsZecSnapshot=snapshot;markFeed('zecs-zec',true);renderZecsZecMarket();updateZecsMarketUI();return {ok:true,snapshot}}catch(e){markFeed('zecs-zec',false);console.warn('ZECS/ZEC market',e);return null}
}
function renderZecsZecMarket(){
  const s=S.zecsZecSnapshot||{},rows=Array.isArray(s.orders)?s.orders:[],now=Math.floor(Date.now()/1000),valid=rows.filter(o=>Number(o.amount_zecs)>0&&Number(o.expires_at)>now);
  let floor=null;for(const o of valid){const u=(Number(o.price_zat)/1e8)/Number(o.amount_zecs);if(Number.isFinite(u)&&(floor==null||u<floor))floor=u}
  if($('zecsZecFloor'))$('zecsZecFloor').textContent=floor==null?'—':floor.toLocaleString(undefined,{maximumFractionDigits:8})+' ZEC';
  if($('zecsZecVolume'))$('zecsZecVolume').textContent=(Number(s.volume_zat||0)/1e8).toLocaleString(undefined,{maximumFractionDigits:8})+' ZEC';
  if($('zecsZecSales'))$('zecsZecSales').textContent=Number(s.sales||0).toLocaleString();if($('zecsZecOrders'))$('zecsZecOrders').textContent=valid.length.toLocaleString();
  if($('zecsZecMyBalance'))$('zecsZecMyBalance').textContent=S.ownerCommitment?(Number(S.zecsMarketAccount?.balance||0).toLocaleString()+' ZECS'):'Connect Noir';
  const g=$('zecsZecMarketGrid');if(!g)return;g.innerHTML='';if(!valid.length){g.innerHTML='<div class="zecsEmpty">No active ZECS / ZEC orders yet.</div>';return}
  valid.sort((a,b)=>(Number(a.price_zat)/Number(a.amount_zecs))-(Number(b.price_zat)/Number(b.amount_zecs)));
  for(const o of valid){
    const amount=Number(o.amount_zecs),total=Number(o.price_zat)/1e8,unit=total/amount,own=String(o.seller_commitment||'').toLowerCase()===String(S.ownerCommitment||'').toLowerCase();
    const card=document.createElement('article');card.className='zecsOrder';
    card.innerHTML='<div class="zecsOrderTop"><div><div class="zecsAmount">'+esc(amount.toLocaleString())+' ZECS</div><div class="zecsUnit">'+esc(unit.toLocaleString(undefined,{maximumFractionDigits:8}))+' ZEC / ZECS</div></div><div class="zecsTotal">'+esc(total.toLocaleString(undefined,{maximumFractionDigits:8}))+' ZEC</div></div><div class="zecsOrderMeta">0% protocol fee · seller receives 100%<br>Expires '+esc(new Date(Number(o.expires_at)*1000).toLocaleString())+'</div><button class="btn '+(own?'red':'gold')+' zecsZecAction">'+(own?'Cancel Order':'Buy Now · ZEC')+'</button>';
    card.querySelector('.zecsZecAction').onclick=()=>own?cancelZecsZecOrder(o):directZecBuy('ZECS',String(o.order_id),'Buy '+amount.toLocaleString()+' ZECS for '+total.toLocaleString(undefined,{maximumFractionDigits:8})+' ZEC');g.appendChild(card)
  }
}
async function publishZecsZecListing(){
  if(S.zecDirectBusy)return;try{
    if(!S.ownerCommitment)throw new Error('Connect Noir Wallet first.');const to=String(S.connection?.transparent||'');if(!/^t[13][A-Za-z0-9]{20,}$/.test(to))throw new Error('Noir Wallet did not expose a transparent payout address.');
    const amount=Number($('zecsZecListingAmount').value),raw=$('zecsZecListingPrice').value.trim(),hours=Number($('zecsZecListingHours').value),z=zecToZat(raw);
    if(!Number.isSafeInteger(amount)||amount<1)throw new Error('Enter a valid whole ZECS amount.');if(z==null||z<=0n)throw new Error('Enter a valid ZEC price.');if(!Number.isFinite(hours)||hours<1||hours>720)throw new Error('Expiry must be 1–720 hours.');
    const price=zatToZec(z),expiresAt=Math.floor(Date.now()/1000+hours*3600),nonce=crypto.randomUUID(),msg='ZB20:ZECS:ZEC_LIST:v1|D='+CFG.zecsDeployTxid+'|O='+S.ownerCommitment+'|A='+amount+'|P='+price+'|TO='+to+'|E='+expiresAt+'|N='+nonce;
    const sig=await signDerived(msg);S.zecDirectBusy=true;await publishPaidZecListing('create_zecs_order',{sellerCommitment:S.ownerCommitment,sellerPayout:to,amountZECS:amount,priceZec:price,expiresAt,nonce,pubkey:sigPub(sig),signature:sigVal(sig)},msg,'ZECS');
  }catch(e){toast(e?.message||String(e),10000)}finally{S.zecDirectBusy=false;updateZecsMarketUI()}
}
async function cancelZecsZecOrder(o){
  try{if(!S.ownerCommitment)throw new Error('Connect seller Noir Wallet first.');if(String(o.seller_commitment||'').toLowerCase()!==String(S.ownerCommitment).toLowerCase())throw new Error('Only the seller can cancel this order.');
    const nonce=crypto.randomUUID(),msg='ZB20:ZECS:ZEC_CANCEL:v1|D='+CFG.zecsDeployTxid+'|L='+o.order_id+'|O='+S.ownerCommitment+'|N='+nonce,sig=await signDerived(msg);
    await zecDirectApi('cancel_zecs_order',{orderId:o.order_id,sellerCommitment:S.ownerCommitment,nonce,pubkey:sigPub(sig),signature:sigVal(sig)});await Promise.all([loadZecsZecMarketState(),hydrateServerActivity()]);toast('ZECS / ZEC order cancelled.',7000)
  }catch(e){toast(e?.message||String(e),9000)}
}
function setZecsRail(rail){document.querySelectorAll('[data-zecs-rail]').forEach(b=>b.classList.toggle('active',b.dataset.zecsRail===rail));document.querySelectorAll('[data-zecs-rail-view]').forEach(v=>v.classList.toggle('active',v.dataset.zecsRailView===rail));try{localStorage.setItem('zecblocks_zecs_rail',rail)}catch{}}
document.querySelectorAll('[data-zecs-rail]').forEach(b=>b.addEventListener('click',()=>{setZecsRail(b.dataset.zecsRail);if(b.dataset.zecsRail==='zec')loadZecsZecMarketState().catch(()=>{})}));
try{setZecsRail(localStorage.getItem('zecblocks_zecs_rail')||'usdc')}catch{setZecsRail('usdc')}
const ZECS_MARKET_ABI=[
  'function createOrder((bytes32 sellerCommitment,uint64 canonicalBalanceZECS,uint64 amountZECS,uint128 priceUSDC,uint64 expiresAt,bytes32 orderNonce,bytes32 zb20OrderHash,uint64 authDeadline,bytes32 authNonce) r,bytes verifierSignature) returns(bytes32)',
  'function cancelOrder(bytes32 orderId)',
  'function buyNowWithPermit((bytes32 orderId,bytes32 buyerCommitment,uint64 sellerCanonicalBalanceZECS,uint64 authDeadline,bytes32 authNonce) a,bytes verifierSignature,uint256 permitDeadline,uint8 v,bytes32 r,bytes32 s) returns(uint256,uint256)',
  'function listingAuthorizationDigest(address seller,(bytes32 sellerCommitment,uint64 canonicalBalanceZECS,uint64 amountZECS,uint128 priceUSDC,uint64 expiresAt,bytes32 orderNonce,bytes32 zb20OrderHash,uint64 authDeadline,bytes32 authNonce) r) view returns(bytes32)',
  'function buyAuthorizationDigest((bytes32 orderId,bytes32 buyerCommitment,uint64 sellerCanonicalBalanceZECS,uint64 authDeadline,bytes32 authNonce) a,address buyer) view returns(bytes32)'
];
function zecsMarketConfigured(){return /^0x[0-9a-f]{40}$/.test(String(CFG.zecsMarketContract||''))}
async function zecsMarketApi(action,body={}){return indexFunction('zecblocks-zb20-market',{action,...body})}
async function zecsMarketIndexTx(txHash){return indexFunction('zecblocks-index-zb20-market',{txHash})}
function zecsUsdcUnits(v){const s=String(v||'').trim();if(!/^\d+(?:\.\d{1,6})?$/.test(s))throw new Error('USDC price supports up to 6 decimals.');const x=ethers.parseUnits(s,6);if(x<10000n)throw new Error('Minimum total price is 0.01 USDC.');return x}
function zecsBytes32(v){const x=String(v||'').replace(/^0x/,'').toLowerCase();if(!/^[0-9a-f]{64}$/.test(x))throw new Error('Invalid ZB-20 commitment.');return '0x'+x}
async function loadZecsMarketState({sync=false,account=false}={}){
  const owner=S.ownerCommitment,epoch=S.walletEpoch||0;
  try{
    const out=sync?await zecsMarketApi('sync',{}):{ok:true,snapshot:await indexRpc('zecblocks_zb20_market_snapshot',{})};
    if(!MarketRuntime.validSnapshot(out.snapshot,['orders']))throw new Error('Incomplete ZECS market snapshot');
    S.zecsMarketSnapshot=out.snapshot||S.zecsMarketSnapshot||{};
    markFeed('zecs',true);renderZecsMarket();updateZecsMarketUI();
    // Public orders must not wait for a cold transaction-authorizer edge function.
    if(!S.zecsMarketBackend||sync)zecsMarketApi('status',{}).then(value=>{S.zecsMarketBackend=value;updateZecsMarketUI()}).catch(e=>console.warn('ZECS market status',e));
    if(account&&owner){try{const a=await zecsMarketApi('account',{ownerCommitment:owner});if(owner===S.ownerCommitment&&epoch===(S.walletEpoch||0)&&a.account)S.zecsMarketAccount=a.account}catch(e){console.warn('ZECS market account',e)}}
    else if(!S.ownerCommitment)S.zecsMarketAccount=null;
    markFeed('zecs',true);renderZecsMarket();updateZecsMarketUI();return out
  }catch(e){markFeed('zecs',false);console.warn('ZECS market state',e);if($('zecsMarketStatus'))$('zecsMarketStatus').textContent='ZECS market temporarily unavailable · '+(e.message||String(e));throw e}
}
function updateZecsMarketUI(){
  const list=$('zecsListBtn'),bal=Number(S.zecsMarketAccount?.balance||0);
  if(list)list.disabled=!zecsMarketConfigured()||!S.ownerCommitment||!S.evmAddress||bal<=0||S.zecsMarketBusy;
  const zlist=$('zecsZecListBtn');if(zlist)zlist.disabled=!S.ownerCommitment||bal<=0||S.zecDirectBusy;
  if($('zecsMyBalance'))$('zecsMyBalance').textContent=S.ownerCommitment?(bal.toLocaleString()+' ZECS'):'Connect Noir';
  const h=S.zecsMarketBackend?.indexer;if($('zecsMarketStatus')){const ok=S.zecsMarketBackend?.signer_configured===true&&h?.status==='ok'&&h?.details?.caught_up===true;$('zecsMarketStatus').textContent=ok?'Verified ZECS orders · 3% marketplace fee':'Verifying the latest orders. Availability is checked again before payment.'}
}
function renderZecsMarket(){
  const snap=S.zecsMarketSnapshot||{},rows=Array.isArray(snap.orders)?snap.orders:[],now=Math.floor(Date.now()/1000),valid=rows.filter(o=>Number(o.amount_zecs)>0&&BigInt(String(o.price_usdc||0))>=10000n&&Number(o.expires_at)>now);
  let floor=null;for(const o of valid){const u=Number(o.price_usdc)/1e6/Number(o.amount_zecs);if(Number.isFinite(u)&&(floor==null||u<floor))floor=u}
  if($('zecsFloor'))$('zecsFloor').textContent=floor==null?'—':floor.toLocaleString(undefined,{maximumFractionDigits:8})+' USDC';
  if($('zecsVolume'))$('zecsVolume').textContent=(Number(snap.volume_usdc_base_units||0)/1e6).toLocaleString(undefined,{maximumFractionDigits:6})+' USDC';
  if($('zecsSales'))$('zecsSales').textContent=Number(snap.sales||0).toLocaleString();
  if($('zecsOrders'))$('zecsOrders').textContent=valid.length.toLocaleString();
  const g=$('zecsMarketGrid');if(!g)return;g.innerHTML='';if(!valid.length){g.innerHTML='<div class="zecsEmpty">No active ZECS orders. Connect Noir + Base Wallet to create the first listing.</div>';return}
  valid.sort((a,b)=>(Number(a.price_usdc)/Number(a.amount_zecs))-(Number(b.price_usdc)/Number(b.amount_zecs)));
  for(const o of valid){
    const amount=Number(o.amount_zecs),total=Number(o.price_usdc)/1e6,unit=total/amount,own=String(S.ownerCommitment||'').toLowerCase()===String(o.seller_commitment||'').toLowerCase(),ownEvm=String(S.evmAddress||'').toLowerCase()===String(o.seller_evm||'').toLowerCase();
    const card=document.createElement('article');card.className='zecsOrder';
    const label=own?(ownEvm?'Cancel Order':'Seller Order · Connect Base'):'Buy Now · USDC',cls=own&&ownEvm?'red':(own?'':'usdc');
    card.innerHTML=`<div class="zecsOrderTop"><div><div class="zecsAmount">${esc(amount.toLocaleString())} ZECS</div><div class="zecsUnit">${esc(unit.toLocaleString(undefined,{maximumFractionDigits:8}))} USDC / ZECS</div></div><div class="zecsTotal">${esc(total.toLocaleString(undefined,{maximumFractionDigits:6}))} USDC</div></div><div class="zecsOrderMeta">Expires ${esc(new Date(Number(o.expires_at)*1000).toLocaleString())}</div><button class="btn ${cls} zecsOrderAction">${label}</button>`;
    const action=card.querySelector('.zecsOrderAction');action.onclick=()=>own?(ownEvm?cancelZecsOrder(o):connectEvmWallet(false).then(()=>renderZecsMarket())):buyZecsOrder(o);g.appendChild(card)
  }
}
async function openZecsListing(){
  try{if(!S.ownerCommitment){await connectWallet(false);if(!S.ownerCommitment)return}if(!S.evmAddress){await connectEvmWallet(false);if(!S.evmAddress)return}await loadZecsMarketState({sync:true,account:true});if(Number(S.zecsMarketAccount?.balance||0)<=0)throw new Error('This Noir identity has no available ZECS.');modal('zecsListingModal',true)}catch(e){toast(e.message||String(e),9000)}
}
async function publishZecsListing(){
  if(S.zecsMarketBusy)return;S.zecsMarketBusy=true;updateZecsMarketUI();const btn=$('publishZecsListingBtn');if(btn)btn.disabled=true;
  try{
    if(!S.ownerCommitment)throw new Error('Connect Noir Wallet first.');if(!S.evmAddress||!S.evmSigner)throw new Error('Connect Base Wallet first.');
    const amount=Number($('zecsListingAmount').value),price=zecsUsdcUnits($('zecsListingPrice').value),hours=Number($('zecsListingHours').value);if(!Number.isSafeInteger(amount)||amount<1||amount>21000000)throw new Error('Enter a valid whole ZECS amount.');if(!Number.isFinite(hours)||hours<1||hours>720)throw new Error('Expiry must be 1–720 hours.');
    const expiresAt=Math.floor(Date.now()/1000+hours*3600),ch=await zecsMarketApi('listing_challenge',{ownerCommitment:S.ownerCommitment,sellerEvm:S.evmAddress,amountZECS:amount,priceUSDC:price.toString(),expiresAt}),ns=await signDerived(ch.message),auth=await zecsMarketApi('listing_authorize',{challengeId:ch.challenge_id,pubkey:sigPub(ns),signature:sigVal(ns)});
    const r=auth.listing_request,req={sellerCommitment:zecsBytes32(r.sellerCommitment),canonicalBalanceZECS:r.canonicalBalanceZECS,amountZECS:r.amountZECS,priceUSDC:r.priceUSDC,expiresAt:r.expiresAt,orderNonce:r.orderNonce,zb20OrderHash:r.zb20OrderHash,authDeadline:r.authDeadline,authNonce:r.authNonce},c=new ethers.Contract(CFG.zecsMarketContract,ZECS_MARKET_ABI,S.evmSigner),digest=String(await c.listingAuthorizationDigest(S.evmAddress,req)).toLowerCase();
    if(digest!==String(auth.digest).toLowerCase())throw new Error('ZECS listing authorization mismatch. Transaction stopped.');
    toast('Approve ZECS listing on Base…',7000);const tx=await sendBaseTransaction(c,'createOrder',[req,auth.verifier_signature],{kind:'zecs',listingId:auth.order_id});await waitBaseTransaction(tx);await confirmZecsTransaction(tx.hash);dropBaseTransaction(tx.hash);modal('zecsListingModal',false);await loadZecsMarketState({account:true});toast('ZECS listing live · '+short(auth.order_id,8),8000)
  }catch(e){toast(e?.shortMessage||e?.reason||e?.message||String(e),10000)}finally{S.zecsMarketBusy=false;if(btn)btn.disabled=false;updateZecsMarketUI()}
}
async function cancelZecsOrder(o){
  if(S.zecsMarketBusy)return;
  try{if(!S.evmAddress)await connectEvmWallet(false);if(String(S.evmAddress||'').toLowerCase()!==String(o.seller_evm||'').toLowerCase())throw new Error('Connect the Base seller wallet to cancel this order.');if(!window.confirm('Cancel this ZECS order?'))return;S.zecsMarketBusy=true;updateZecsMarketUI();const c=new ethers.Contract(CFG.zecsMarketContract,ZECS_MARKET_ABI,S.evmSigner),tx=await sendBaseTransaction(c,'cancelOrder',[String(o.order_id)],{kind:'zecs',listingId:o.order_id});await waitBaseTransaction(tx);await confirmZecsTransaction(tx.hash);dropBaseTransaction(tx.hash);await loadZecsMarketState({account:true});toast('ZECS order cancelled.',7000)}catch(e){toast(e?.shortMessage||e?.reason||e?.message||String(e),10000)}finally{S.zecsMarketBusy=false;updateZecsMarketUI()}
}
async function buyZecsOrder(o){
  if(S.zecsMarketBusy)return;
  try{
    if(!S.ownerCommitment){await connectWallet(false);if(!S.ownerCommitment)return}if(!S.evmAddress){await connectEvmWallet(false);if(!S.evmAddress)return}
    const amount=Number(o.amount_zecs),total=BigInt(String(o.price_usdc||0));beginTransactionFlow(`Buy ${amount.toLocaleString()} ZECS · ${ethers.formatUnits(total,6)} USDC`);
    updateTransactionFlow('wallet','Approve the purchase in Noir, then review the USDC payment in your Base wallet.');
    S.zecsMarketBusy=true;updateZecsMarketUI();const ch=await zecsMarketApi('buy_challenge',{orderId:String(o.order_id),buyerCommitment:S.ownerCommitment,buyerEvm:S.evmAddress}),ns=await signDerived(ch.message),auth=await zecsMarketApi('buy_authorize',{challengeId:ch.challenge_id,pubkey:sigPub(ns),signature:sigVal(ns)});
    const a=auth.buy_authorization,req={orderId:a.orderId,buyerCommitment:zecsBytes32(a.buyerCommitment),sellerCanonicalBalanceZECS:a.sellerCanonicalBalanceZECS,authDeadline:a.authDeadline,authNonce:a.authNonce},c=new ethers.Contract(CFG.zecsMarketContract,ZECS_MARKET_ABI,S.evmSigner),digest=String(await c.buyAuthorizationDigest(req,S.evmAddress)).toLowerCase();
    if(digest!==String(auth.digest).toLowerCase())throw new Error('ZECS buy authorization mismatch. Payment stopped.');
    const usdc=new ethers.Contract(CFG.baseUsdc,BASE_USDC_ABI,S.evmSigner),bal=BigInt(await usdc.balanceOf(S.evmAddress));if(bal<total)throw new Error('Insufficient USDC balance on Base.');
    const nonce=await usdc.nonces(S.evmAddress),name=await usdc.name(),deadline=Math.floor(Date.now()/1000)+300,domain={name,version:'2',chainId:CFG.baseChainId,verifyingContract:CFG.baseUsdc},types={Permit:[{name:'owner',type:'address'},{name:'spender',type:'address'},{name:'value',type:'uint256'},{name:'nonce',type:'uint256'},{name:'deadline',type:'uint256'}]};
    toast('Sign USDC Permit, then approve one Base Buy transaction…',8000);const ps=ethers.Signature.from(await S.evmSigner.signTypedData(domain,types,{owner:S.evmAddress,spender:CFG.zecsMarketContract,value:total,nonce,deadline})),tx=await sendBaseTransaction(c,'buyNowWithPermit',[req,auth.verifier_signature,deadline,ps.v,ps.r,ps.s],{kind:'zecs',listingId:o.order_id});await waitBaseTransaction(tx);await confirmZecsTransaction(tx.hash);dropBaseTransaction(tx.hash);await loadZecsMarketState({account:true});toast(`ZECS purchase complete · +${amount.toLocaleString()} ZECS`,9000);updateTransactionFlow('done','Purchase complete. Your ZECS balance is updated.')
  }catch(e){updateTransactionFlow('network',e?.shortMessage||e?.message||String(e));toast(e?.shortMessage||e?.reason||e?.message||String(e),11000)}finally{S.zecsMarketBusy=false;updateZecsMarketUI()}
}
function usdcConfigured(){
  return /^0x[0-9a-fA-F]{40}$/.test(String(CFG.usdcMarketContract||''))
}
function usdcFmt(v){
  try{return (Number(BigInt(v))/1e6).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6})}
  catch{return '—'}
}
function usdcUnits(v){
  const s=String(v||'').trim();
  if(!/^\d+(?:\.\d{1,6})?$/.test(s))throw new Error('USDC price supports up to 6 decimals.');
  const x=ethers.parseUnits(s,6);
  if(x<10000n)throw new Error('Minimum USDC listing price is 0.01 USDC.');
  return x
}
async function baseReadProvider(){
  await loadEthers();
  const request=new ethers.FetchRequest(CFG.baseRpc);request.timeout=12000;
  return new ethers.JsonRpcProvider(request,CFG.baseChainId,{staticNetwork:true})
}
async function ensureBaseNetwork(){
  if(!window.ethereum)throw new Error('MetaMask/Rabby-compatible EVM wallet not detected.');
  const chain=await window.ethereum.request({method:'eth_chainId'});
  if(String(chain).toLowerCase()===CFG.baseChainHex)return;
  try{
    await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:CFG.baseChainHex}]})
  }catch(e){
    if(Number(e?.code)!==4902)throw e;
    await window.ethereum.request({method:'wallet_addEthereumChain',params:[{
      chainId:CFG.baseChainHex,
      chainName:'Base',
      nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},
      rpcUrls:[CFG.baseRpc],
      blockExplorerUrls:['https://basescan.org']
    }]})
  }
}
function clearEvmSession(){
  S.evmEpoch=(S.evmEpoch||0)+1;
  S.evmProvider=null;S.evmSigner=null;S.evmAddress=null;updateEvmUI()
}
function bindEvmProviderEvents(){
  const eth=window.ethereum;
  if(!eth||S.evmEventsProvider===eth)return;
  try{
    if(S.evmEventsProvider&&S.evmAccountsHandler)S.evmEventsProvider.removeListener?.('accountsChanged',S.evmAccountsHandler);
    if(S.evmEventsProvider&&S.evmChainHandler)S.evmEventsProvider.removeListener?.('chainChanged',S.evmChainHandler)
  }catch{}
  S.evmAccountsHandler=async accounts=>{
    if(!accounts?.length){clearEvmSession();return}
    clearEvmSession();
    await connectEvmWallet(true).catch(e=>console.warn('Base account refresh',e))
  };
  S.evmChainHandler=async chainId=>{
    if(String(chainId||'').toLowerCase()!==CFG.baseChainHex){clearEvmSession();return}
    clearEvmSession();
    await connectEvmWallet(true).catch(e=>console.warn('Base chain refresh',e))
  };
  eth.on?.('accountsChanged',S.evmAccountsHandler);
  eth.on?.('chainChanged',S.evmChainHandler);
  S.evmEventsProvider=eth
}
async function connectEvmWallet(silent=false){
  if(S.evmConnectPromise){
    try{await S.evmConnectPromise}catch{}
    if(S.evmAddress)return true;
    if(silent)return false
  }
  const b=$('evmWalletBtn');
  const job=(async()=>{
    if(!window.ethereum){
      if(!silent)toast('MetaMask/Rabby-compatible EVM wallet not detected.',7000);
      return false
    }
    await loadEthers();
    if(!silent&&b){b.disabled=true;b.textContent='Connecting Base…'}

    const chain=String(await window.ethereum.request({method:'eth_chainId'})).toLowerCase();
    if(silent&&chain!==CFG.baseChainHex)return false;
    if(!silent&&chain!==CFG.baseChainHex)await ensureBaseNetwork();

    const bp=new ethers.BrowserProvider(window.ethereum,'any');
    const accounts=await bp.send(silent?'eth_accounts':'eth_requestAccounts',[]);
    if(!accounts?.length)return false;

    S.evmProvider=bp;
    S.evmSigner=await bp.getSigner();
    S.evmAddress=ethers.getAddress(await S.evmSigner.getAddress());
    bindEvmProviderEvents();
    updateEvmUI();
    loadZecsMarketState({account:!!S.ownerCommitment}).catch(e=>console.warn('Base account background sync',e));
    if(!silent)toast('Base wallet connected.',3000);
    return true
  })();

  S.evmConnectPromise=job;
  try{return await job}
  catch(e){
    if(!silent)toast(e?.shortMessage||e?.message||String(e),8000);
    else console.warn('silent Base connect',e);
    clearEvmSession();
    return false
  }finally{
    if(S.evmConnectPromise===job)S.evmConnectPromise=null;
    if(!silent&&b){b.disabled=false;updateEvmUI()}
  }
}
function updateEvmUI(){
  const b=$('evmWalletBtn');
  if(b)b.textContent=S.evmAddress?`Base ${short(S.evmAddress,5)}`:'Connect Base Wallet';
  const configured=usdcConfigured();
  const st=$('usdcMarketStatus');
  if(st){
    if(!configured){st.textContent='USDC module ready · waiting for production settlement contract address.';st.className='usdcStatus warn'}
    else{st.textContent=`Base USDC · contract ${short(CFG.usdcMarketContract,6)}${S.evmAddress?' · wallet '+short(S.evmAddress,5):''}`;st.className='usdcStatus live'}
  }
  const canList=configured&&!!S.ownerCommitment&&!!S.evmAddress&&ownedTokens().length>0;
  const list=$('createUsdcListingBtn');
  if(list)list.disabled=!canList;
  const topList=$('createUsdcListingTopBtn');
  if(topList)topList.disabled=!canList
}
$('evmWalletBtn').onclick=()=>connectEvmWallet(false);
function usdcListingOwnershipState(x){
  const owner=effectiveOwner(x?.tokenId);
  const seller=String(x?.sellerCommitment||'').replace(/^0x/,'').toLowerCase();
  if(!owner||!/^[0-9a-f]{64}$/.test(seller))return null;
  return owner===seller
}
function usdcListingFreshness(x){
  return Number(x?.createdBlock||x?.updatedBlock||x?.relay?.timestamp||x?.expiresAt||0)
}
function activeUsdcListingsForToken(id){
  const now=Math.floor(Date.now()/1000);
  return [...S.usdcOnchain.values()]
    .filter(x=>Number(x.tokenId)===Number(id)&&Number(x.status)===1&&Number(x.expiresAt)>now&&usdcListingOwnershipState(x)!==false)
    .sort((a,b)=>usdcListingFreshness(b)-usdcListingFreshness(a)||String(b.listingId||'').localeCompare(String(a.listingId||'')))
}
function activeUsdcListingForToken(id){return activeUsdcListingsForToken(id)[0]||null}
function canonicalActiveUsdcListings(){
  // The server board already passed ownership validation and deduplication.
  // Do not re-filter it using browser/local ownership state.
  if(S.serverUsdcSnapshotAt<=0)return [];
  const now=Math.floor(Date.now()/1000),rows=[];
  for(const x of S.serverUsdcCanonical.values()){
    if(!x)continue;
    if(Number(x.status)!==1||Number(x.expiresAt)<=now)continue;
    if(x.serverIntentVerified!==true)continue;
    const tombstone=S.usdcLiveTombstones.get(String(x.listingId).toLowerCase());
    if(tombstone&&[2,3].includes(Number(tombstone.status))&&Number(tombstone.block)>=Number(x.updatedBlock||0))continue;
    if(!x.serverOwnerCommitment||!['signature','chain','full'].includes(String(x.serverOwnerVerifiedLevel||'')))continue;
    rows.push(x)
  }
  return rows
}
function usdcRelayListings(){
  const m=new Map();
  for(const e of S.events){
    if(e.type!=='SALE_USDC'||!e.listingId)continue;
    const old=m.get(String(e.listingId).toLowerCase());
    if(!old||(Number(e.timestamp)||0)>=(Number(old.timestamp)||0))m.set(String(e.listingId).toLowerCase(),e)
  }
  return [...m.values()]
}
async function verifyUsdcRelayListing(e,onchain){
  try{
    if(!e||!onchain||!e.message)return false;
    const sellerCommit=String(e.sellerCommitment||'').toLowerCase();
    if(!/^[0-9a-f]{64}$/.test(sellerCommit))return false;
    if(!/^[0-9a-fA-F]+$/.test(String(e.pubkey||'')))return false;
    const derived=await sha256HexBytes(hexToBytes(e.pubkey));
    if(derived!==sellerCommit)return false;
    if(!(await verifyZcashCompactSignature(e.message,e.signature,e.pubkey)))return false;
    if(String(onchain.sellerCommitment).slice(2).toLowerCase()!==sellerCommit)return false;
    if(Number(onchain.tokenId)!==Number(e.tokenId))return false;
    if(String(onchain.seller).toLowerCase()!==String(e.sellerEvm||'').toLowerCase())return false;
    if(String(onchain.priceUSDC)!==String(e.priceUSDC))return false;
    if(Number(onchain.expiresAt)!==Number(e.expires))return false;
    if(String(onchain.listingNonce).toLowerCase()!==String(e.listingNonce||'').toLowerCase())return false;
    if(String(onchain.zb1ListingHash).toLowerCase()!==String(e.zb1ListingHash||'').toLowerCase())return false;
    const h=ethers.keccak256(ethers.toUtf8Bytes(e.message));
    if(h.toLowerCase()!==String(e.zb1ListingHash||'').toLowerCase())return false;
    return true
  }catch{return false}
}
function usdcCacheRead(){
  try{const x=JSON.parse(localStorage.getItem('zb1_usdc_market_v3')||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}
}
function hydrateUsdcCache(){
  const c=usdcCacheRead();
  S.usdcScanBlock=Number(c.lastBlock)||0;
  // Do not hydrate listing rows from browser storage. Production index + direct
  // Base delta are authoritative, so every browser starts from the same state.
  return 0
}
function saveUsdcCache(lastBlock=S.usdcScanBlock){
  try{
    const rows=[...S.usdcOnchain.values()].slice(-2000).map(x=>({...x,priceUSDC:String(x.priceUSDC),relay:x.relay||null}));
    localStorage.setItem('zb1_usdc_market_v3',JSON.stringify({v:3,lastBlock:Number(lastBlock)||0,at:Date.now(),rows}))
  }catch(e){console.warn('USDC cache save',e)}
}
async function discoverUsdcListingIds(contract,rp){
  const ids=new Set([...S.usdcOnchain.keys()]);
  for(const e of usdcRelayListings())if(e.listingId)ids.add(String(e.listingId).toLowerCase());
  let latest=0;try{latest=await rp.getBlockNumber()}catch{return {ids,lastBlock:S.usdcScanBlock}}
  // Listings can live up to 30 days. On a cold browser scan enough Base history to recover all still-live listings,
  // then persist the cursor so refreshes only scan new blocks.
  let from=S.usdcScanBlock>0?S.usdcScanBlock+1:Math.max(0,latest-1400000);
  if(from>latest)return {ids,lastBlock:latest};
  const step=25000;
  for(let a=from;a<=latest;a+=step){
    const b=Math.min(latest,a+step-1);
    try{
      const logs=await contract.queryFilter(contract.filters.ListingCreated(),a,b);
      for(const ev of logs){const id=String(ev.args?.listingId||'').toLowerCase();if(/^0x[0-9a-f]{64}$/.test(id))ids.add(id)}
      S.usdcScanBlock=b;
    }catch(e){console.warn('Base listing log scan',a,b,e);break}
  }
  return {ids,lastBlock:S.usdcScanBlock||latest}
}
async function syncUsdcLiveChain(){
  if(S.usdcLiveSyncing||!usdcConfigured())return 0;
  S.usdcLiveSyncing=true;
  try{
    const rp=await baseReadProvider();
    const c=new ethers.Contract(CFG.usdcMarketContract,USDC_MARKET_ABI,rp);
    const latest=await rp.getBlockNumber();
    let from=S.usdcLiveBlock>0?S.usdcLiveBlock+1:Math.max(0,latest-600);
    if(from>latest)return 0;
    const relayMap=new Map(usdcRelayListings().map(e=>[String(e.listingId||'').toLowerCase(),e]));
    let touchedN=0;
    for(let a=from;a<=latest;a+=1000){
      const b=Math.min(latest,a+999);
      const logs=await rp.getLogs({address:CFG.usdcMarketContract,fromBlock:a,toBlock:b});
      const touched=new Map();
      for(const log of logs){
        let parsed=null;
        try{parsed=c.interface.parseLog(log)}catch{}
        const name=String(parsed?.name||'');
        if(!['ListingCreated','ListingCancelled','ZB1SaleSettled'].includes(name))continue;
        const id=String(parsed.args?.listingId||'').toLowerCase();
        if(/^0x[0-9a-f]{64}$/.test(id))touched.set(id,Number(log.blockNumber)||0)
      }
      if(touched.size){
        const rows=(await mapLimit([...touched],6,async ([id,eventBlock])=>{
          const oc=await c.listings(id);
          const seller=String(oc.seller||'');
          if(!seller||/^0x0{40}$/i.test(seller))return null;
          const prev=S.usdcOnchain.get(id)||{};
          const relay=relayMap.get(id)||prev.relay||null;
          const row={...prev,listingId:id,seller:oc.seller,sellerCommitment:oc.sellerCommitment,tokenId:Number(oc.tokenId),expiresAt:Number(oc.expiresAt),priceUSDC:String(oc.priceUSDC),listingNonce:oc.listingNonce,zb1ListingHash:oc.zb1ListingHash,status:Number(oc.status),buyer:oc.buyer,buyerCommitment:oc.buyerCommitment,settledAt:Number(oc.settledAt),createdBlock:Number(prev.createdBlock||eventBlock||0),updatedBlock:Number(eventBlock||prev.updatedBlock||0),relay,verifiedIntent:!!prev.verifiedIntent,serverIntentVerified:!!prev.serverIntentVerified,serverOwnerCommitment:prev.serverOwnerCommitment||'',serverOwnerVerifiedLevel:prev.serverOwnerVerifiedLevel||'',serverIndexed:!!prev.serverIndexed};
          if(relay&&!row.verifiedIntent)row.verifiedIntent=await verifyUsdcRelayListing(relay,row);
          if(row.verifiedIntent||row.serverIntentVerified)S.usdcVerifiedIntentIds.add(String(id).toLowerCase());
          return row
        })).filter(Boolean);
        for(const row of rows){
          const id=String(row.listingId).toLowerCase();
          S.usdcOnchain.set(id,row);
          if(Number(row.status)===1&&Number(row.expiresAt)>Math.floor(Date.now()/1000)){
            S.usdcLiveTombstones.delete(id);
            S.usdcLiveOverlay.set(id,row)
          }else{
            S.usdcLiveOverlay.delete(id);
            S.usdcLiveTombstones.set(id,{status:Number(row.status)||0,block:Number(row.updatedBlock)||0,at:Date.now()})
          }
        }
        touchedN+=rows.length
      }
      S.usdcLiveBlock=b
    }
    // Keep tombstones bounded; contract listings live for at most 30 days.
    const cutoff=Date.now()-31*86400*1000;
    for(const [id,t] of S.usdcLiveTombstones)if(Number(t?.at||0)<cutoff)S.usdcLiveTombstones.delete(id);
    saveUsdcCache(Math.max(Number(S.usdcScanBlock)||0,Number(S.usdcLiveBlock)||0));
    if(touchedN){renderUsdcMarket();updateUsdcMarketMetrics();renderPortfolio()}
    return touchedN
  }catch(e){
    console.warn('Base live market sync',e);
    return 0
  }finally{S.usdcLiveSyncing=false}
}

async function mapLimit(items,limit,fn){
  const out=new Array(items.length);let n=0;
  async function worker(){while(true){const i=n++;if(i>=items.length)return;try{out[i]=await fn(items[i],i)}catch(e){out[i]=null}}}
  await Promise.all(Array.from({length:Math.min(limit,items.length||1)},worker));return out
}
async function reconcileUsdcMarket(){
  if(S.usdcReconciling||!usdcConfigured())return;
  S.usdcReconciling=true;
  try{
    // Production rule: once the server Base index is caught up, it is the authoritative
    // browsing snapshot. Critical Buy Now still re-reads the contract immediately before payment.
    renderUsdcMarket();
    await syncUsdcLiveChain();
    const serverAuthoritative=S.serverIndexerHealth?.base_usdc?.status==='ok'&&S.serverIndexerHealth?.base_usdc?.details?.caught_up===true;
    if(serverAuthoritative&&S.serverUsdcMetrics){updateEvmUI();return}
    const rp=await baseReadProvider();
    const c=new ethers.Contract(CFG.usdcMarketContract,USDC_MARKET_ABI,rp);
    const discovered=await discoverUsdcListingIds(c,rp);
    const relayMap=new Map(usdcRelayListings().map(e=>[String(e.listingId).toLowerCase(),e]));
    const ids=[...discovered.ids].slice(-2000);
    const rows=(await mapLimit(ids,6,async id=>{
      const oc=await c.listings(id);
      const seller=String(oc.seller||'');
      if(!seller||/^0x0{40}$/i.test(seller))return null;
      const prev=S.usdcOnchain.get(String(id).toLowerCase())||{};
      const relay=relayMap.get(String(id).toLowerCase())||prev.relay||null;
      const row={...prev,listingId:id,seller:oc.seller,sellerCommitment:oc.sellerCommitment,tokenId:Number(oc.tokenId),expiresAt:Number(oc.expiresAt),priceUSDC:String(oc.priceUSDC),listingNonce:oc.listingNonce,zb1ListingHash:oc.zb1ListingHash,status:Number(oc.status),buyer:oc.buyer,buyerCommitment:oc.buyerCommitment,settledAt:Number(oc.settledAt),relay,verifiedIntent:!!prev.verifiedIntent,serverIntentVerified:!!prev.serverIntentVerified,serverOwnerCommitment:prev.serverOwnerCommitment||'',serverOwnerVerifiedLevel:prev.serverOwnerVerifiedLevel||'',serverIndexed:!!prev.serverIndexed};
      if(relay)row.verifiedIntent=await verifyUsdcRelayListing(relay,row);
      if(row.verifiedIntent||row.serverIntentVerified)S.usdcVerifiedIntentIds.add(String(id).toLowerCase());
      return row
    })).filter(Boolean);
    if(rows.length){const merged=new Map(S.usdcOnchain);for(const x of rows)merged.set(String(x.listingId).toLowerCase(),x);S.usdcOnchain=merged}
    saveUsdcCache(discovered.lastBlock);

    // Rebuild ZB-1 ownership transitions only when the seller's Zcash ownership is known.
    S.usdcVerifiedSettlements.clear();
    const sold=[...S.usdcOnchain.values()].filter(x=>x.status===2&&x.settledAt>0).sort((a,b)=>a.settledAt-b.settledAt);
    for(const x of sold){
      const expectedSeller=String(x.sellerCommitment).slice(2).toLowerCase();
      const buyerCommit=String(x.buyerCommitment).slice(2).toLowerCase();
      if(!/^[0-9a-f]{64}$/.test(expectedSeller)||! /^[0-9a-f]{64}$/.test(buyerCommit)||/^0+$/.test(buyerCommit))continue;
      // A confirmed Base contract settlement is a FULL ownership checkpoint.
      // Never discard it because a delayed historical CLAIM changed local replay state.
      S.usdcVerifiedSettlements.set(String(x.listingId).toLowerCase(),{protocol:'ZB1',v:1,type:'USDC_SETTLED',listingId:x.listingId,tokenId:x.tokenId,sellerCommitment:expectedSeller,buyerCommitment:buyerCommit,sellerEvm:x.seller,buyerEvm:x.buyer,price:usdcFmt(x.priceUSDC),priceUSDC:String(x.priceUSDC),timestamp:x.settledAt,settledAt:x.settledAt,paymentChain:'Base',paymentToken:'USDC',source:'base-contract',verifiedLevel:'full'})
    }
    renderUsdcMarket();updateEvmUI()
  }catch(e){
    console.warn('USDC reconcile',e);
    renderUsdcMarket();
    throw e
  }finally{S.usdcReconciling=false}
}
function renderUsdcMarket(){
  updateUsdcMarketMetrics();
  const g=$('usdcMarketGrid');if(!g)return;
  if(!usdcConfigured()){
    g.innerHTML='<div class="empty" style="grid-column:1/-1">USDC Buy Now code is installed, but the production Base contract address has not been inserted yet. The ZEC marketplace remains fully available above.</div>';
    return
  }
  const now=Math.floor(Date.now()/1000);
  const query=($('usdcSearch')?.value||'').trim().toLowerCase(),sort=$('usdcSort')?.value||'priceLow';
  let rows=canonicalActiveUsdcListings().filter(x=>!query||String(x.tokenId).includes(query))
    .sort((a,b)=>{const ap=BigInt(a.priceUSDC||0),bp=BigInt(b.priceUSDC||0);if(ap<bp)return -1;if(ap>bp)return 1;return usdcListingFreshness(b)-usdcListingFreshness(a)});
  const viewKey=JSON.stringify([query,sort,boardPages.get('usdc')?.page||1,S.ownerCommitment,S.evmAddress,!!S.serverUsdcSnapshotAt,rows.map(x=>[x.listingId,x.tokenId,x.priceUSDC,x.expiresAt,x.seller,x.sellerCommitment,x.serverOwnerCommitment,x.serverIntentVerified,pendingListing(x.listingId)])]);
  if(boardViewKeys.get(g)===viewKey){hydrateTokenSources([...g.querySelectorAll('[data-art-token]')].map(x=>x.dataset.artToken));return}boardViewKeys.set(g,viewKey);g.innerHTML='';
  if(!rows.length){
    pageRows('usdc',[],query+'|'+sort,renderUsdcMarket);
    g.innerHTML=S.serverUsdcSnapshotAt<=0
      ?'<div class="empty" style="grid-column:1/-1">Loading verified listings…</div>'
      :'<div class="empty" style="grid-column:1/-1">No matching listings. Try another item number or clear your search.</div>';
    return
  }
  if(sort==='priceHigh')rows.reverse();else if(sort==='new')rows.sort((a,b)=>usdcListingFreshness(b)-usdcListingFreshness(a));
  rows=pageRows('usdc',rows,query+'|'+sort,renderUsdcMarket);hydrateTokenSources(rows.map(x=>x.tokenId));
  for(const l of rows){
    const c=tokenSource(l.tokenId);
    const card=document.createElement('article');card.className='nft';
    card.innerHTML=`<div class="nftart"><svg class="blockArt" viewBox="0 0 600 600"></svg></div>
      <div class="nftinfo">
        <div class="nftline"><span class="nfttitle">ZEC BLOCK #${esc(l.tokenId)}</span><span class="usdcPrice">${esc(usdcFmt(l.priceUSDC))} USDC</span></div>
        <div class="meta"><span>Expires ${new Date(l.expiresAt*1000).toLocaleDateString()}</span></div>
        <div class="usdcCardTag"><span class="railBadge usdc">BASE</span><span class="usdcStatus">3% fee</span></div>
        <div class="controls"><button class="btn usdc usdcAction">Buy Now · USDC</button></div>
      </div>`;
    renderTokenArt(card.querySelector('svg'),l.tokenId,c);
    const b=card.querySelector('.usdcAction');
    if(pendingListing(l.listingId)){b.textContent='Transaction pending';b.disabled=true}
    else if(S.evmAddress&&String(S.evmAddress).toLowerCase()===String(l.seller).toLowerCase()){
      b.textContent='Cancel USDC Listing';b.className='btn red usdcAction';b.onclick=()=>cancelUsdcListing(l)
    }else{
      const sellerCommit=String(l.sellerCommitment).slice(2).toLowerCase();
      const serverOwner=String(l.serverOwnerCommitment||'').toLowerCase();
      const serverOwnerTrusted=['signature','chain','full'].includes(String(l.serverOwnerVerifiedLevel||''));
      const owner=serverOwnerTrusted&&serverOwner?serverOwner:effectiveOwner(l.tokenId);
      const signedOk=!!l.verifiedIntent||!!l.serverIntentVerified||S.usdcVerifiedIntentIds.has(String(l.listingId||'').toLowerCase());
      if(!owner){b.textContent='Ownership syncing…';b.disabled=true}
      else if(owner!==sellerCommit){b.textContent='Ownership verifying…';b.disabled=true}
      else if(!signedOk){b.textContent='Signature syncing…';b.disabled=true}
      else{b.textContent=S.evmAddress?'Buy Now · USDC':'Buy with USDC';b.onclick=()=>buyUsdcListing(l)}
    }
    g.appendChild(card)
  }
}
function openUsdcListing(){
  if(!usdcConfigured())return toast('USDC settlement contract is not configured yet.',7000);
  if(!S.ownerCommitment)return toast('Connect Noir Wallet first.');
  if(!S.evmAddress)return toast('Connect Base wallet first.');
  const own=ownedTokens().filter(x=>!activeUsdcListingForToken(x.tokenId)&&!activeListingForToken(x.tokenId)&&!tokenIsAtomicLocked(x.tokenId));
  if(!own.length)return toast('No unlocked ZEC BLOCK is available for a USDC listing.');
  $('usdcListingToken').innerHTML=own.map(x=>`<option value="${x.tokenId}">ZEC BLOCK #${x.tokenId}</option>`).join('');
  modal('usdcListingModal',true)
}
$('createUsdcListingBtn').onclick=openUsdcListing;
$('createUsdcListingTopBtn').onclick=openUsdcListing;
$('refreshUsdcBtn').onclick=()=>refreshMarketplace(true);
async function publishUsdcListing(){
  const tokenId=Number($('usdcListingToken').value);
  const btn=$('publishUsdcListingBtn');
  if(S.usdcListingBusy.has(tokenId))return toast(`ZEC BLOCK #${tokenId} listing is already being submitted.`,7000);

  const execute=async()=>{
    const oldText=btn?.textContent||'Sign with Noir & List on Base';
    let listingGuardToken='',baseListingSubmitted=false,canonicalVerified=false;
    S.usdcListingBusy.add(tokenId);
    if(btn){btn.disabled=true;btn.textContent='Submitting listing…'}
    try{
      if(!usdcConfigured())throw new Error('Production USDC settlement contract is not configured.');
      if(!S.ownerCommitment)throw new Error('Connect Noir Wallet first.');
      if(!S.evmAddress)throw new Error('Connect Base wallet first.');
      await ensureBaseNetwork();

      // Refresh the canonical server snapshot immediately before creating a listing.
      // This prevents a second listing when another tab/session has already listed the token.
      await hydrateServerUsdc().catch(()=>{});

      const days=Number($('usdcListingDays').value);
      const priceUSDC=usdcUnits($('usdcListingPrice').value);
      if(!ownedTokens().some(x=>Number(x.tokenId)===tokenId))throw new Error('This Noir identity is not the current owner.');
      if(activeListingForToken(tokenId))throw new Error('This NFT already has an active ZEC listing. Cancel it first.');
      const existing=activeUsdcListingForToken(tokenId);
      if(existing)throw new Error(`ZEC BLOCK #${tokenId} already has an active USDC listing. Cancel it first.`);
      if(tokenIsAtomicLocked(tokenId))throw new Error('This NFT is currently locked in a ZEC checkout.');
      if(!Number.isInteger(days)||days<1||days>30)throw new Error('Expiry must be 1–30 days.');

      // Server-enforced single-rail lock. This is authoritative even if this browser
      // has a stale ZEC/USDC snapshot or the user tries two tabs at once.
      const railGuard=await usdcListingRailGuard('listing_acquire',tokenId,{sellerCommitment:S.ownerCommitment});
      listingGuardToken=String(railGuard?.guard?.guard_token||'');
      if(!listingGuardToken)throw new Error('Unable to lock this NFT for USDC listing.');

      const expires=Math.floor(Date.now()/1000)+days*86400;
      const listingNonce=ethers.hexlify(crypto.getRandomValues(new Uint8Array(32)));
      const sellerCommitment='0x'+S.ownerCommitment;
      const msg=`ZB1:SALE_BASE:v1|G=${CFG.genesisTxid}|T=${tokenId}|C=${CFG.baseChainId}|U=${CFG.baseUsdc}|M=${CFG.usdcMarketContract}|A=${S.evmAddress}|P=${priceUSDC}|E=${expires}|S=${S.ownerCommitment}|X=${listingNonce}`;
      const sig=await signDerived(msg);
      const listingHash=ethers.keccak256(ethers.toUtf8Bytes(msg));

      const contract=new ethers.Contract(CFG.usdcMarketContract,USDC_MARKET_ABI,S.evmSigner);
      const listingId=await contract.computeListingId(S.evmAddress,tokenId,sellerCommitment,priceUSDC,expires,listingNonce,listingHash);

      const relayEvent=normalizeEvent({
        protocol:'ZB1',v:1,type:'SALE_USDC',
        eventId:'usdc-sale:'+String(listingId).toLowerCase(),
        listingId:String(listingId).toLowerCase(),
        tokenId,sellerCommitment:S.ownerCommitment,sellerEvm:S.evmAddress,
        price:usdcFmt(priceUSDC),priceUSDC:String(priceUSDC),expires,
        listingNonce,zb1ListingHash:listingHash,message:msg,
        pubkey:sigPub(sig),signature:sigVal(sig),
        paymentChain:'Base',chainId:CFG.baseChainId,paymentToken:CFG.baseUsdc,
        settlementContract:CFG.usdcMarketContract,
        timestamp:Math.floor(Date.now()/1000),status:'pending_onchain'
      });
      await publishRelay(relayEvent,{quiet:true});

      // The in-memory + Web Lock guards make this operation one-shot per token.
      const tx=await sendBaseTransaction(contract,'createListing',[tokenId,sellerCommitment,priceUSDC,expires,listingNonce,listingHash],{kind:'nft-list',tokenId,listingId,intent:{listingId:String(listingId).toLowerCase(),message:msg,pubkey:sigPub(sig),signature:sigVal(sig)}});
      baseListingSubmitted=true;
      toast('Base listing submitted · waiting for confirmation…',7000);
      const receipt=await waitBaseTransaction(tx);
      relayEvent.baseTxid=receipt.hash;relayEvent.status='active';
      relayEvent.timestamp=Math.floor(Date.now()/1000);
      let canonicalIndex=null;
      try{
        canonicalIndex=await indexUsdcReceipt(receipt.hash,{
          listingId:String(listingId).toLowerCase(),
          message:msg,pubkey:sigPub(sig),signature:sigVal(sig)
        })
      }catch(indexErr){console.warn('USDC direct canonical index',indexErr)}
      canonicalVerified=canonicalIndex?.intent?.verified===true;
      if(canonicalVerified)dropBaseTransaction(receipt.hash);
      const localRow={listingId:String(listingId).toLowerCase(),seller:S.evmAddress,sellerCommitment,tokenId,expiresAt:expires,priceUSDC:String(priceUSDC),listingNonce,zb1ListingHash:listingHash,status:1,buyer:'0x0000000000000000000000000000000000000000',buyerCommitment:'0x'+'0'.repeat(64),settledAt:0,createdBlock:Number(receipt.blockNumber||0),updatedBlock:Number(receipt.blockNumber||0),relay:relayEvent,verifiedIntent:true,serverIntentVerified:canonicalVerified,serverOwnerCommitment:S.ownerCommitment,serverOwnerVerifiedLevel:'signature',serverIndexed:canonicalVerified};
      S.usdcOnchain.set(localRow.listingId,localRow);
      S.usdcLiveTombstones.delete(localRow.listingId);
      S.usdcLiveOverlay.set(localRow.listingId,localRow);
      S.usdcLiveBlock=Math.max(Number(S.usdcLiveBlock)||0,Number(receipt.blockNumber)||0);
      rememberRuntimeEvent(relayEvent);
      renderUsdcMarket();updateUsdcMarketMetrics();renderPortfolio();
      await publishRelay(relayEvent,{quiet:true});
      modal('usdcListingModal',false);
      toast(canonicalVerified?`USDC listing live · ${usdcFmt(priceUSDC)} USDC`:'Base confirmed · canonical listing verification is retrying in the background.',canonicalVerified?8000:10000);
      await hydrateServerUsdc().catch(()=>{});
      await hydrateServerPortfolio(S.ownerCommitment)
    }catch(e){
      let m=e?.shortMessage||e?.reason||e?.message||String(e);
      if(String(m).includes('TOKEN_ALREADY_LISTED_ZEC'))m='This NFT is already listed in the ZEC market. Cancel the ZEC listing before listing it for USDC.';
      else if(String(m).includes('TOKEN_ALREADY_LISTED_USDC'))m='This NFT already has an active USDC listing. Cancel it before creating another listing.';
      else if(String(m).includes('ZEC_PURCHASE_IN_PROGRESS'))m='A ZEC purchase is currently in progress for this NFT. USDC listing is temporarily locked.';
      else if(String(m).includes('CROSS_RAIL_LISTING_IN_PROGRESS'))m='Another listing operation is already in progress for this NFT.';
      toast(m,9000)
    }
    finally{
      if(listingGuardToken&&(!baseListingSubmitted||canonicalVerified)){
        await usdcListingRailGuard('listing_release',tokenId,{guardToken:listingGuardToken}).catch(()=>{})
      }
      S.usdcListingBusy.delete(tokenId);
      if(btn){btn.disabled=false;btn.textContent=oldText}
    }
  };

  if(navigator.locks?.request){
    return navigator.locks.request(`zecblocks-usdc-list-${tokenId}`,{ifAvailable:true},async lock=>{
      if(!lock)return toast(`ZEC BLOCK #${tokenId} is already being listed in another tab.`,8000);
      return execute()
    })
  }
  return execute()
}
$('publishUsdcListingBtn').onclick=publishUsdcListing;
async function cancelUsdcListing(l){
  try{
    if(!S.evmAddress)await connectEvmWallet(false);
    if(String(S.evmAddress||'').toLowerCase()!==String(l.seller).toLowerCase())throw new Error('Only the Base seller wallet can cancel this listing.');

    // Clean every active duplicate for this token owned by the same Base seller.
    // Older duplicates stay in chain history but cannot reappear after cancelling the visible card.
    await hydrateServerUsdc().catch(()=>{});
    const seller=String(l.seller||'').toLowerCase();
    const targets=activeUsdcListingsForToken(l.tokenId)
      .filter(x=>String(x.seller||'').toLowerCase()===seller);
    if(!targets.some(x=>String(x.listingId).toLowerCase()===String(l.listingId).toLowerCase()))targets.unshift(l);

    const unique=[...new Map(targets.map(x=>[String(x.listingId).toLowerCase(),x])).values()];
    const c=new ethers.Contract(CFG.usdcMarketContract,USDC_MARKET_ABI,S.evmSigner);
    let cancelled=0;
    for(const x of unique){
      const fresh=await c.listings(x.listingId);
      if(Number(fresh.status)!==1)continue;
      toast(unique.length>1?`Cleaning duplicate listing ${cancelled+1}/${unique.length}…`:'Cancel submitted on Base…',6000);
      const tx=await sendBaseTransaction(c,'cancelListing',[x.listingId],{kind:'nft-cancel',tokenId:x.tokenId,listingId:x.listingId});
      const receipt=await waitBaseTransaction(tx);
      await indexUsdcReceipt(receipt.hash).then(()=>dropBaseTransaction(receipt.hash)).catch(e=>console.warn('USDC cancel confirmation pending',e));
      const id=String(x.listingId).toLowerCase();
      const cancelledRow={...x,status:3,updatedBlock:Number(receipt.blockNumber||x.updatedBlock||0)};
      S.usdcOnchain.set(id,cancelledRow);
      S.usdcLiveOverlay.delete(id);
      S.usdcLiveTombstones.set(id,{status:3,block:Number(receipt.blockNumber||0),at:Date.now()});
      S.usdcLiveBlock=Math.max(Number(S.usdcLiveBlock)||0,Number(receipt.blockNumber)||0);
      renderUsdcMarket();updateUsdcMarketMetrics();renderPortfolio();
      cancelled++
    }
    toast(cancelled>1?`${cancelled} duplicate USDC listings cancelled.`:'USDC listing cancelled.',7000);
    await hydrateServerUsdc().catch(()=>{});
    await hydrateServerPortfolio(S.ownerCommitment)
  }catch(e){toast(e?.shortMessage||e?.reason||e?.message||String(e),9000)}
}
async function buyUsdcListing(l){
  const tokenId=Number(l?.tokenId);
  if(S.usdcBuyBusy.has(tokenId))return toast(`Purchase for ZEC BLOCK #${tokenId} is already in progress.`,7000);
  const buyerOwner=actionOwner(),buyerEvm=String(S.evmAddress||'');
  let guardToken='',txHash='',broadcasted=false,walletBuyPromptStarted=false;
  S.usdcBuyBusy.add(tokenId);
  beginTransactionFlow('ZEC BLOCK #'+tokenId+' · USDC on Base');
  try{
    if(!usdcConfigured())throw new Error('USDC market contract is not configured.');
    if(!S.ownerCommitment)throw new Error('Connect Noir Wallet first so the purchase resolves to your ZB-1 identity.');
    if(!S.evmAddress){const ok=await connectEvmWallet(false);if(!ok)return}
    await ensureBaseNetwork();

    // Refresh both chain inventory and canonical ownership immediately before taking money.
    await hydrateServerUsdc();
    const fresh=S.usdcOnchain.get(String(l.listingId).toLowerCase());
    if(!fresh||fresh.status!==1||fresh.expiresAt<=Math.floor(Date.now()/1000))throw new Error('This USDC listing is no longer active.');

    const sellerCommit=String(fresh.sellerCommitment).slice(2).toLowerCase();
    const canonical=S.serverUsdcCanonical.get(Number(fresh.tokenId));
    if(!canonical||String(canonical.listingId||'').toLowerCase()!==String(fresh.listingId||'').toLowerCase()||canonical.serverIntentVerified!==true)throw new Error('This listing is not in the canonical verified market board.');
    const canonicalOwner=String(canonical.serverOwnerCommitment||'').toLowerCase();
    if(!canonicalOwner||canonicalOwner!==sellerCommit)throw new Error('Seller is no longer the canonical ZB-1 owner. Purchase blocked.');
    if(activeListingForToken(fresh.tokenId)||tokenIsAtomicLocked(fresh.tokenId))throw new Error('A ZEC listing/checkout is active for this NFT. Purchase blocked.');

    // Server-side single-flight guard. The server rebuilds canonical ownership before granting it.
    const guarded=await usdcListingRailGuard('acquire',fresh.tokenId,{
      listingId:String(fresh.listingId).toLowerCase(),
      sellerCommitment:sellerCommit,
      buyerCommitment:buyerOwner
    });
    guardToken=String(guarded?.guard?.guard_token||'');
    if(!guardToken)throw new Error('Could not acquire canonical purchase guard.');

    const market=new ethers.Contract(CFG.usdcMarketContract,USDC_MARKET_ABI,S.evmSigner);
    const usdc=new ethers.Contract(CFG.baseUsdc,BASE_USDC_ABI,S.evmSigner);
    const amount=BigInt(fresh.priceUSDC),owner=S.evmAddress,buyerCommit='0x'+buyerOwner;
    $('transactionSummary').textContent='ZEC BLOCK #'+tokenId+' · '+usdcFmt(amount)+' USDC';
    updateTransactionFlow('wallet','Review the USDC permission and purchase in your Base wallet. Your NFT destination is filled automatically.');

    // Prepare permit separately. If the permit SIGNING capability is unavailable we
    // may use allowance. Once a buy transaction is submitted we NEVER fall back/send again.
    let permit=null;
    try{
      const nonce=await usdc.nonces(owner),name=await usdc.name(),deadline=BigInt(Math.floor(Date.now()/1000)+20*60);
      const domain={name,version:'2',chainId:CFG.baseChainId,verifyingContract:CFG.baseUsdc};
      const types={Permit:[
        {name:'owner',type:'address'},{name:'spender',type:'address'},
        {name:'value',type:'uint256'},{name:'nonce',type:'uint256'},{name:'deadline',type:'uint256'}
      ]};
      const value={owner,spender:CFG.usdcMarketContract,value:amount,nonce,deadline};
      assertWalletAction();
      const signature=await S.evmSigner.signTypedData(domain,types,value);
      assertWalletAction();
      const sig=ethers.Signature.from(signature);
      permit={deadline,v:sig.v,r:sig.r,s:sig.s}
    }catch(e){
      if(/reject|denied|declined|cancel|4001/i.test(String(e?.shortMessage||e?.message||e)))throw e;
      console.warn('USDC permit signing unavailable; using allowance path',e)
    }

    let tx;
    if(permit){
      await usdcListingRailGuard('validate',fresh.tokenId,{guardToken});
      walletBuyPromptStarted=true;
      tx=await sendBaseTransaction(market,'buyNowWithPermit',[fresh.listingId,buyerCommit,permit.deadline,permit.v,permit.r,permit.s],{kind:'nft-buy',listingId:fresh.listingId,tokenId:fresh.tokenId})
    }else{
      const allowance=await usdc.allowance(owner,CFG.usdcMarketContract);
      if(allowance<amount){
        assertWalletAction();
        const approveTx=await sendBaseTransaction(usdc,'approve',[CFG.usdcMarketContract,amount],{kind:'approval',listingId:fresh.listingId});
        toast('USDC approval submitted · this does not buy the NFT yet.',7000);
        await waitBaseTransaction(approveTx);dropBaseTransaction(approveTx.hash)
      }
      // Approval may take long enough for the guard to expire. Revalidate owner/listing now.
      await usdcListingRailGuard('validate',fresh.tokenId,{guardToken});
      walletBuyPromptStarted=true;
      tx=await sendBaseTransaction(market,'buyNow',[fresh.listingId,buyerCommit],{kind:'nft-buy',listingId:fresh.listingId,tokenId:fresh.tokenId})
    }

    txHash=String(tx?.hash||'').toLowerCase();
    if(!/^0x[0-9a-f]{64}$/.test(txHash))throw new Error('Base wallet did not return a purchase transaction hash.');
    broadcasted=true;
    saveUsdcPurchaseRecovery({
      txHash,listingId:String(fresh.listingId).toLowerCase(),tokenId:fresh.tokenId,
      buyerCommitment:buyerOwner,buyerEvm:buyerEvm,amountUSDC:String(amount),status:'broadcast'
    });
    await usdcListingRailGuard('broadcast',fresh.tokenId,{guardToken,txHash}).catch(e=>console.warn('purchase guard broadcast record',e));
    toast('USDC Buy Now submitted · waiting for Base confirmation. Do not submit this purchase again.',9000);

    let receipt;
    try{receipt=await waitBaseTransaction(tx)}
    catch(e){
      saveUsdcPurchaseRecovery({txHash,listingId:fresh.listingId,tokenId:fresh.tokenId,buyerCommitment:buyerOwner,buyerEvm:buyerEvm,amountUSDC:String(amount),status:'broadcast_wait'});
      toast(`Purchase transaction ${short(txHash,8)} was submitted. Confirmation/recovery will continue automatically; do not pay again.`,12000);
      console.warn('USDC purchase wait pending',e);
      return
    }

    if(Number(receipt?.status??1)!==1)throw new Error('Base purchase transaction reverted.');
    saveUsdcPurchaseRecovery({txHash,listingId:fresh.listingId,tokenId:fresh.tokenId,buyerCommitment:buyerOwner,buyerEvm:buyerEvm,amountUSDC:String(amount),status:'confirmed'});

    // Hide sold inventory immediately, but don't say "complete" until server ownership agrees.
    const soldId=String(fresh.listingId).toLowerCase();
    const soldLocal={...fresh,status:2,settledAt:Math.floor(Date.now()/1000),buyer:buyerEvm,buyerCommitment:'0x'+buyerOwner,updatedBlock:Number(receipt.blockNumber||fresh.updatedBlock||0)};
    S.usdcOnchain.set(soldId,soldLocal);
    S.usdcLiveOverlay.delete(soldId);
    S.usdcLiveTombstones.set(soldId,{status:2,block:Number(receipt.blockNumber||0),at:Date.now()});
    renderUsdcMarket();updateUsdcMarketMetrics();
    toast('Base payment confirmed · finalizing canonical NFT ownership…',9000);

    const ready=await finalizeUsdcCanonicalOwnership({
      txHash,listingId:soldId,tokenId:fresh.tokenId,buyerCommitment:buyerOwner,buyerEvm:buyerEvm,amountUSDC:String(amount)
    });
    updateTransactionFlow(ready?'done':'network',ready?'Purchase complete. Your NFT is in your portfolio.':'Payment confirmed. Updating NFT ownership automatically…');
    if(!ready){
      // Durable recovery worker owns this from now on. No second payment is required.
      saveUsdcPurchaseRecovery({txHash,listingId:soldId,tokenId:fresh.tokenId,buyerCommitment:buyerOwner,buyerEvm:buyerEvm,amountUSDC:String(amount),status:'canonical_pending'})
    }
  }catch(e){
    const msg=e?.shortMessage||e?.reason||e?.message||String(e);
    const rejected=/reject|denied|declined|cancel|4001/i.test(String(msg));
    updateTransactionFlow(!rejected&&(broadcasted||walletBuyPromptStarted)?'network':'prepare',!rejected&&(broadcasted||walletBuyPromptStarted)?'Checking the wallet transaction automatically. See Pending transactions for progress.':msg);
    // Once a buy submission prompt started, an ambiguous provider error must not
    // reopen inventory immediately. Keep the server guard until it expires unless
    // the user explicitly rejected the wallet request.
    if(!broadcasted&&guardToken&&(!walletBuyPromptStarted||rejected)){
      await usdcListingRailGuard('release',tokenId,{guardToken}).catch(()=>{})
    }
    if(!broadcasted&&walletBuyPromptStarted&&!rejected){
      toast('The Base wallet response is ambiguous. Do not submit another purchase yet; the server purchase guard remains locked while chain state is checked.',12000)
    }else if(broadcasted&&txHash){
      saveUsdcPurchaseRecovery({txHash,listingId:String(l?.listingId||''),tokenId,buyerCommitment:buyerOwner,buyerEvm:buyerEvm,status:'recovery'});
      toast(`Purchase TX ${short(txHash,8)} was already submitted. Do not pay again; canonical recovery is automatic.`,12000)
    }else toast(msg,10000)
  }finally{
    S.usdcBuyBusy.delete(tokenId)
  }
}

if($('zecsListBtn'))$('zecsListBtn').onclick=openZecsListing;
if($('publishZecsListingBtn'))$('publishZecsListingBtn').onclick=publishZecsListing;
if($('zecsRefreshBtn'))$('zecsRefreshBtn').onclick=()=>loadZecsMarketState({account:!!S.ownerCommitment}).catch(e=>toast(e.message||String(e),9000));
if($('zecsZecRefreshBtn'))$('zecsZecRefreshBtn').onclick=()=>Promise.allSettled([loadZecsZecMarketState(),loadZecsMarketState({account:!!S.ownerCommitment})]);
if($('zecsZecListBtn'))$('zecsZecListBtn').onclick=async()=>{try{if(!S.ownerCommitment){await connectWallet(false);if(!S.ownerCommitment)return}await loadZecsMarketState({account:true});if(Number(S.zecsMarketAccount?.available_indexed||S.zecsMarketAccount?.balance||0)<=0)throw new Error('No available ZECS to list.');modal('zecsZecListingModal',true)}catch(e){toast(e.message||String(e),9000)}};
if($('publishZecsZecListingBtn'))$('publishZecsZecListingBtn').onclick=publishZecsZecListing;

function renderMarket(){
  const q=$('marketSearch').value.trim().toLowerCase(),sort=$('marketSort').value;let a=visibleMarketListings().filter(x=>!q||String(x.tokenId).includes(q));
  if(sort==='priceLow')a.sort((x,y)=>Number(x.price)-Number(y.price));else if(sort==='priceHigh')a.sort((x,y)=>Number(y.price)-Number(x.price));else a.sort((x,y)=>(y.timestamp||0)-(x.timestamp||0));
  const g=$('marketGrid'),viewKey=JSON.stringify([q,sort,boardPages.get('zec')?.page||1,S.ownerCommitment,S.serverZecMarketReady,a.map(x=>[x.listingId,x.tokenId,x.price,x.expires,x.directBuyEnabled,x.sellerCommitment,canonicalZecOwner(x.tokenId),tokenIsAtomicLocked(x.tokenId),pendingListing(x.listingId)])]);
  if(boardViewKeys.get(g)===viewKey){hydrateTokenSources([...g.querySelectorAll('[data-art-token]')].map(x=>x.dataset.artToken));return}boardViewKeys.set(g,viewKey);g.innerHTML='';
  if(!a.length){pageRows('zec',[],q+'|'+sort,renderMarket);g.innerHTML='<div class="empty" style="grid-column:1/-1">'+(S.serverZecMarketReady?'No matching ZEC listings. Try another search.':'Loading verified ZEC listings…')+'</div>';return}
  a=pageRows('zec',a,q+'|'+sort,renderMarket);hydrateTokenSources(a.map(x=>x.tokenId));
  for(const l of a){
    const c=tokenSource(l.tokenId),artHash=c?.sourceHash,card=document.createElement('article');card.className='nft';
    card.innerHTML='<div class="nftart"><svg class="blockArt" viewBox="0 0 600 600"></svg></div><div class="nftinfo"><div class="nftline"><span class="nfttitle">ZEC BLOCK #'+esc(l.tokenId)+'</span><span class="price">'+esc(l.price)+' ZEC</span></div><div class="meta"><span>Expires '+new Date((l.expires||0)*1000).toLocaleDateString()+'</span></div><div class="meta"><span>'+(l.directBuyEnabled?'0% marketplace fee':'Seller needs to enable Buy Now')+'</span></div><div class="controls"><button class="btn offerBtn" style="min-height:32px">Buy Now · ZEC</button></div></div>';
    renderTokenArt(card.querySelector('svg'),l.tokenId,c);
    const controls=card.querySelector('.controls'),action=card.querySelector('.offerBtn'),resolvedOwner=canonicalZecOwner(l.tokenId),mine=S.ownerCommitment&&l.sellerCommitment===S.ownerCommitment;
    if(pendingListing(l.listingId)){action.textContent='Payment pending';action.disabled=true}
    else if(tokenIsAtomicLocked(l.tokenId)){action.textContent='LEGACY LOCKED';action.disabled=true}
    else if(!resolvedOwner){action.textContent='OWNER UNVERIFIED';action.disabled=true}
    else if(resolvedOwner!==l.sellerCommitment){action.textContent='STALE LISTING';action.disabled=true}
    else if(mine){if(l.directBuyEnabled){action.textContent='Cancel Listing';action.className='btn red offerBtn';action.onclick=()=>cancelListing(l)}else{action.textContent='Enable Buy Now';action.className='btn gold offerBtn';action.onclick=()=>upgradeZecListing(l);const cancel=document.createElement('button');cancel.className='btn red';cancel.textContent='Cancel';cancel.onclick=()=>cancelListing(l);controls.appendChild(cancel)}}
    else if(l.directBuyEnabled){action.textContent='Buy Now · ZEC';action.className='btn gold offerBtn';action.onclick=()=>directZecBuy('ZEC_BLOCK',String(l.listingId),'Buy ZEC BLOCK #'+l.tokenId+' for '+l.price+' ZEC')}
    else{action.textContent='Seller upgrade required';action.disabled=true}
    g.appendChild(card)
  }
}
$('marketSearch').oninput=renderMarket;$('marketSort').onchange=renderMarket;$('refreshMarketBtn').onclick=()=>refreshMarketplace(true);
$('activityFilter').onchange=renderActivity;$('refreshActivityBtn').onclick=()=>refreshAll().catch(e=>toast(e.message));
function modal(id,on=true){$(id).classList.toggle('show',on)}document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>modal(b.dataset.close,false));
function openListing(){
  const mine=String(S.ownerCommitment||'').toLowerCase();
  const own=ownedTokens().filter(x=>!latestPublishedListingForToken(x.tokenId,mine)&&!activeUsdcListingForToken(x.tokenId));
  if(!own.length)return toast('No unlisted ZEC BLOCKS available. Cancel the existing ZEC/USDC listing first.');
  const s=$('listingToken');
  s.innerHTML=own.map(x=>`<option value="${x.tokenId}">ZEC BLOCK #${x.tokenId}</option>`).join('');
  modal('listingModal',true)
}
$('createListingBtn').onclick=openListing;
async function signDerived(msg){const r=await rpc('zcash_signMessage',[msg,{signingMode:'derived'}]);if(!sigPub(r)||!sigVal(r))throw new Error('Noir Wallet did not return a usable derived signature.');return r}
$('publishListingBtn').onclick=async()=>{
  try{
    if(!S.ownerCommitment)throw new Error('Connect Noir Wallet first.');
    const tokenId=Number($('listingToken').value),raw=$('listingPrice').value.trim(),days=Number($('listingDays').value),to=String(S.connection?.transparent||''),z=zecToZat(raw);
    if(!ownedTokens().some(x=>x.tokenId===tokenId))throw new Error('Token is not owned by this commitment.');if(!/^t[13][A-Za-z0-9]{20,}$/.test(to))throw new Error('Noir Wallet did not expose a transparent seller payout address.');
    if(z==null||z<=0n)throw new Error('Enter a valid ZEC price.');if(!Number.isInteger(days)||days<1||days>30)throw new Error('Expiry must be 1–30 days.');
    const existing=latestPublishedListingForToken(tokenId,S.ownerCommitment);if(existing)throw new Error('This ZEC BLOCK already has an active ZEC listing.');if(activeUsdcListingForToken(tokenId))throw new Error('Cancel the active USDC listing first.');
    const price=zatToZec(z),nonce=crypto.randomUUID(),expires=Math.floor(Date.now()/1000)+days*86400,msg='ZB1:SALE:v2|G='+CFG.genesisTxid+'|T='+tokenId+'|P='+price+'|E='+expires+'|X='+nonce+'|O='+S.ownerCommitment+'|A='+to,sig=await signDerived(msg);
    await publishPaidZecListing('create_zb1_listing',{tokenId,sellerCommitment:S.ownerCommitment,sellerPayout:to,priceZec:price,expiresAt:expires,nonce,pubkey:sigPub(sig),signature:sigVal(sig)},msg,'ZEC_BLOCK');
  }catch(e){toast(e?.message||String(e),9000)}
};
async function cancelListing(l){
  try{
    if(!S.ownerCommitment)throw new Error('Connect Noir Wallet first.');if(String(l.sellerCommitment||'').toLowerCase()!==String(S.ownerCommitment).toLowerCase())throw new Error('Only the listing owner can cancel it.');
    if(l.directBuyEnabled){const nonce=crypto.randomUUID(),msg='ZB1:SALE_CANCEL:v1|G='+CFG.genesisTxid+'|L='+l.listingId+'|T='+l.tokenId+'|O='+S.ownerCommitment+'|X='+nonce,sig=await signDerived(msg);await zecDirectApi('cancel_zb1_listing',{listingId:l.listingId,sellerCommitment:S.ownerCommitment,nonce,pubkey:sigPub(sig),signature:sigVal(sig)});await Promise.all([hydrateServerZecMarketStates(),hydrateServerActivity(),hydrateServerPortfolio(S.ownerCommitment)]);toast('ZEC listing cancelled.',7000);return}
    if(tokenIsAtomicLocked(l.tokenId))throw new Error('This legacy listing has an active lock and cannot be cancelled yet.');
    const nonce=crypto.randomUUID(),msg='ZB1:SALE_CANCEL:v1|G='+CFG.genesisTxid+'|L='+l.listingId+'|T='+l.tokenId+'|O='+S.ownerCommitment+'|X='+nonce,sig=await signDerived(msg),e=normalizeEvent({protocol:'ZB1',v:1,type:'SALE_CANCEL',eventId:'cancel:'+nonce,listingId:l.listingId,tokenId:Number(l.tokenId),sellerCommitment:S.ownerCommitment,nonce,pubkey:sigPub(sig),signature:sigVal(sig),timestamp:Math.floor(Date.now()/1000)}),r=await publishRelay(e);toast(r.ok?'Legacy listing cancelled.':'Cancel saved locally; relay retry will continue.',7000);await fetchRelay()
  }catch(e){toast(e?.message||String(e),8000)}
}
function sameZecAmount(a,b){
  try{
    const x=zecToZat(String(a)),y=zecToZat(String(b));
    return x!=null&&y!=null&&x===y
  }catch{return false}
}
function offerMatchesListing(o,l){
  return !!o&&!!l
    && String(o.listingId||'')===String(l.listingId||'')
    && Number(o.tokenId)===Number(l.tokenId)
    && String(o.sellerCommitment||'').toLowerCase()===String(l.sellerCommitment||'').toLowerCase()
    && sameZecAmount(o.price,l.price)
}
function openOffer(l){
  if(!S.ownerCommitment)return toast('Connect Noir Wallet first.');
  const current=l?activeListingForToken(l.tokenId):null;
  if(!current)return toast('This NFT no longer has an active listing.');
  if(String(current.listingId||'')!==String(l.listingId||''))return toast('This listing was updated. Please use the newest marketplace card.');
  if(tokenIsAtomicLocked(l.tokenId))return toast('This NFT is already locked to a selected buyer.');
  const owner=currentOwner(l.tokenId);
  if(!owner||owner!==String(l.sellerCommitment||'').toLowerCase())return toast('Seller ownership is still syncing. Try again shortly.');
  S.currentOfferListing=l;
  $('offerToken').value='ZEC BLOCK #'+l.tokenId;
  $('offerPrice').value=String(l.price);
  modal('offerModal',true)
}
$('publishOfferBtn').onclick=async()=>{
  try{
    const l=S.currentOfferListing;
    if(!l)throw new Error('No listing selected.');
    const live=activeListingForToken(l.tokenId);
    if(!live)throw new Error('This NFT no longer has an active listing.');
    if(String(live.listingId||'')!==String(l.listingId||'')){
      throw new Error('The seller updated this listing. Close this window and click Request Purchase on the current listing.');
    }
    if(tokenIsAtomicLocked(l.tokenId))throw new Error('This NFT is already locked to a selected buyer.');
    if(currentOwner(l.tokenId)!==String(l.sellerCommitment||'').toLowerCase())throw new Error('Seller is no longer the verified current owner.');

    // Protocol rule: buyer request price is ALWAYS copied from the signed SALE.
    // Ignore the DOM field completely so a modified browser/client cannot change it.
    const price=String(l.price);
    if(!decimalValid(price))throw new Error('Listing has an invalid price.');

    const nonce=crypto.randomUUID();
    const msg=`ZB1:OFFER:v2|L=${l.listingId}|T=${l.tokenId}|P=${price}|B=${S.ownerCommitment}|S=${l.sellerCommitment}|X=${nonce}`;
    const sig=await signDerived(msg);
    const e=normalizeEvent({
      protocol:'ZB1',v:2,type:'OFFER',eventId:'offer:'+nonce,
      listingId:l.listingId,tokenId:l.tokenId,price,
      fixedListingPrice:true,
      buyerCommitment:S.ownerCommitment,sellerCommitment:l.sellerCommitment,
      pubkey:sigPub(sig),signature:sigVal(sig),timestamp:Math.floor(Date.now()/1000)
    });
    rememberRuntimeEvent(e);
    const pr=await publishRelay(e);
    modal('offerModal',false);
    toast(pr.ok?`Purchase request published at fixed list price ${price} ZEC · ${pr.ok}/${pr.total} relays`:'Purchase request saved locally. Relay retry will continue.',8000);
    await fetchRelay();rebuildState();renderAtomicDesk();renderPortfolio()
  }catch(e){toast(e.message||String(e),8000)}
};

function atomicLockId(o){const x=String(o.eventId||o.offerId||'').replace(/[^a-zA-Z0-9]/g,'');return 'L'+x.slice(-24)}
function atomicLockMessage(x){
  if(Number(x.v)>=4){
    return `ZB1:NOIR_LOCK:v4|G=${CFG.genesisTxid}|L=${x.lockId}|I=${Number(x.tokenId)}|B=${x.buyerCommitment}|P=${x.price}|F=${x.feeZat}|PAY=${x.sellerZat}|R=${CFG.treasury}|A=${x.sellerPayout}|E=${Number(x.expires)}|S=${x.sellerCommitment}`
  }
  return `ZB1:NOIR_LOCK:v3|G=${CFG.genesisTxid}|L=${x.lockId}|I=${Number(x.tokenId)}|B=${x.buyerCommitment}|P=${x.price}|PAY=${x.paymentZat}|A=${x.sellerPayout}|E=${Number(x.expires)}|S=${x.sellerCommitment}`
}
async function atomicLockAnchorAddress(x){
  const v=Number(x.v)>=4?4:3;
  return deterministicP2pkh(`ZB1:NOIR_LOCK_ANCHOR:v${v}|M=${atomicLockMessage(x)}|K=${x.pubkey}|SIG=${x.signature}`)
}
async function atomicSettlementMarkerAddress(x){
  return deterministicP2pkh(`ZB1:UNUSED_SETTLEMENT_MARKER:v3|L=${x.lockId}|I=${Number(x.tokenId)}|B=${x.buyerCommitment}|P=${x.price}|S=${x.sellerCommitment}|A=${x.sellerPayout}`)
}
function lockForOffer(o){
  const id=atomicLockId(o);return S.confirmedLocks.get(id)||S.atomicLocks.get(id)||null
}
function sellerOffers(){
  if(!S.ownerCommitment)return[];
  const latest=new Map();
  for(const o of S.offers){
    const l=currentListingForOffer(o);
    if(!l)continue; // stale request from an older/cancelled/superseded listing
    if(String(l.sellerCommitment||'').toLowerCase()!==String(S.ownerCommitment).toLowerCase())continue;
    if(currentOwner(o.tokenId)!==String(S.ownerCommitment).toLowerCase())continue;
    if(tokenIsAtomicLocked(o.tokenId))continue;
    if(S.verifiedAtomic.has(atomicLockId(o)))continue;

    // Fixed-price rule remains mandatory.
    if(!offerMatchesListing(o,l))continue;

    // One actionable request per buyer per current listing.
    const k=`${o.listingId}:${String(o.buyerCommitment||'').toLowerCase()}`;
    const old=latest.get(k);
    if(!old||(Number(o.timestamp)||0)>(Number(old.timestamp)||0))latest.set(k,o)
  }
  return [...latest.values()].sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))
}
function buyerLocks(){
  if(!S.ownerCommitment)return[];
  return [...S.confirmedLocks.values()].filter(l=>{
    const active=activeAtomicLockForToken(l.tokenId);
    return active&&active.lockId===l.lockId&&String(l.buyerCommitment||'').toLowerCase()===String(S.ownerCommitment).toLowerCase()&&!S.verifiedAtomic.has(l.lockId)
  }).sort((a,b)=>(b.blockTime||b.timestamp||0)-(a.blockTime||a.timestamp||0))
}
function buildNoirPaymentSummary(lock){
  if(Number(lock.v)>=4)return `Step 1: ${lock.feeZec} ZEC protocol fee · Step 2: ${lock.sellerZec} ZEC seller payout`;
  return `Pay exactly ${lock.paymentZec} ZEC to ${lock.sellerPayout}`
}
function lockEffectiveExpiry(lock){
  let e=Number(lock?.expires)||0;
  if(lock?.feeSeen?.blockTime)e=Math.max(e,Number(lock.feeSeen.blockTime)+CFG.atomicFundedGraceSeconds);
  if(lock?.sellerSeen?.blockTime)e=Math.max(e,Number(lock.sellerSeen.blockTime)+CFG.atomicFinalityGraceSeconds);
  return e
}
function rawNotice(lock,type){
  return [...S.events]
    .filter(e=>e.type===type&&e.lockId===lock.lockId&&String(e.buyerCommitment||'').toLowerCase()===String(lock.buyerCommitment||'').toLowerCase())
    .sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))[0]||null
}

function txOutputZat(o){
  const v=o?.valueZat??o?.value_zat??o?.satoshis??o?.value??o?.amount;
  if(v==null)return null;
  if(typeof v==='string'&&/^\d+$/.test(v))return BigInt(v);
  if(typeof v==='number'&&Number.isInteger(v))return BigInt(v);
  if(typeof v==='number'&&Number.isFinite(v))return BigInt(Math.round(v*1e8));
  if(typeof v==='string'&&/^\d+\.\d+$/.test(v))return zecToZat(v);
  return null
}
function outputAddress(o){return String(o?.address||o?.addr||o?.scriptPubKey?.addresses?.[0]||o?.scriptPubKey?.address||'')}
function outputSum(outs,address){
  let n=0n;for(const o of outs){if(outputAddress(o)!==address)continue;const v=txOutputZat(o);if(v!=null)n+=v}return n
}
async function txOrder(tx,bh,txid){
  let ti=Number(deepFind(tx,['txIndex','tx_index','index']));
  if(Number.isInteger(ti)&&ti>=0)return ti;
  try{
    const b=await explorerFetch('block',bh),a=deepFind(b,['transactions','tx']);
    if(Array.isArray(a)){
      ti=a.findIndex(x=>String(typeof x==='string'?x:(x?.txid||x?.hash||'')).toLowerCase()===String(txid).toLowerCase());
      if(ti>=0)return ti
    }
  }catch{}
  return 0
}
async function confirmLockEvent(lock){
  try{
    if(!lock?.anchorTxid&&!lock?.txid)return null;
    const txid=String(lock.anchorTxid||lock.txid).toLowerCase();
    if(!/^[0-9a-f]{64}$/.test(txid))return null;
    if(!Number.isInteger(Number(lock.tokenId))||Number(lock.tokenId)<1||Number(lock.tokenId)>CFG.supply)return null;
    if(!/^[0-9a-f]{64}$/i.test(String(lock.sellerCommitment||''))||!/^[0-9a-f]{64}$/i.test(String(lock.buyerCommitment||'')))return null;
    if(!decimalValid(lock.price)||!/^t[13][A-Za-z0-9]{20,}$/.test(String(lock.sellerPayout||'')))return null;
    if(!/^[0-9a-f]+$/i.test(String(lock.pubkey||''))||!/^[0-9a-f]{130}$/i.test(String(lock.signature||'').replace(/^0x/,'')))return null;

    if(Number(lock.v)>=4){
      const sp=atomicSplit(lock.price);
      if(BigInt(String(lock.feeZat||'0'))!==sp.fee)return null;
      if(BigInt(String(lock.sellerZat||'0'))!==sp.seller)return null;
      if(String(lock.feeZec||'')!==sp.feeZec||String(lock.sellerZec||'')!==sp.sellerZec)return null;
      if(String(lock.treasury||CFG.treasury)!==CFG.treasury)return null
    }else{
      const base=zecToZat(lock.price),pay=BigInt(String(lock.paymentZat||'0'));
      if(base==null||pay<=base||pay-base<1n||pay-base>9999n)return null;
      if(zatToZec(pay)!==String(lock.paymentZec||''))return null
    }

    const derivedOwner=await sha256HexBytes(hexToBytes(String(lock.pubkey).replace(/^0x/,'')));
    if(derivedOwner.toLowerCase()!==String(lock.sellerCommitment).toLowerCase())return null;
    if(!(await verifyZcashCompactSignature(atomicLockMessage(lock),lock.signature,lock.pubkey)))return null;

    const anchor=await atomicLockAnchorAddress(lock);
    if(lock.anchorAddress&&lock.anchorAddress!==anchor)return null;
    const tx=await explorerFetch('tx',txid);
    const bh=Number(deepFind(tx,['blockHeight','block_height','blockheight','height']));
    if(!Number.isInteger(bh)||bh<=0)return null;
    const conf=await confirmationCount(tx,bh);
    if(conf<CFG.atomicLockConfirmations)return null;
    const bt=Number(deepFind(tx,['blockTime','block_time','time','timestamp']))||Number(lock.timestamp)||0;
    if(Number(lock.expires||0)<=bt)return null;
    const outs=Array.isArray(tx?.outputs)?tx.outputs:(deepFind(tx,['outputs','vout'])||[]);
    if(!Array.isArray(outs))return null;
    if(outputSum(outs,anchor)!==BigInt(CFG.atomicAnchorZat))return null;
    const ti=await txOrder(tx,bh,txid);
    return {...lock,txid,anchorTxid:txid,anchorAddress:anchor,blockHeight:bh,blockTime:bt,txIndex:ti,confirmations:conf,confirmed:true,validatedSignature:true}
  }catch(e){console.warn('lock verify',e);return null}
}
function paymentAuthMessage(lock,step){
  if(step==='fee')return `ZB1:NOIR_FEE_AUTH:v3|L=${lock.lockId}|I=${lock.tokenId}|A=${lock.feeZec}|TO=${CFG.treasury}|B=${lock.buyerCommitment}`;
  return `ZB1:NOIR_SELLER_AUTH:v3|L=${lock.lockId}|I=${lock.tokenId}|A=${lock.sellerZec}|TO=${lock.sellerPayout}|B=${lock.buyerCommitment}`
}
function paymentNoticeMessage(lock,step,txid){
  if(step==='fee')return `ZB1:NOIR_FEE_PAYMENT:v2|L=${lock.lockId}|I=${lock.tokenId}|X=${txid}|A=${lock.feeZec}|B=${lock.buyerCommitment}`;
  return `ZB1:NOIR_SELLER_PAYMENT:v2|L=${lock.lockId}|I=${lock.tokenId}|X=${txid}|A=${lock.sellerZec}|B=${lock.buyerCommitment}`
}
async function verifyBuyerPaymentNotice(lock,n,step){
  try{
    if(!n||String(n.buyerCommitment||'').toLowerCase()!==String(lock.buyerCommitment||'').toLowerCase())return false;
    if(!/^[0-9a-f]+$/i.test(String(n.pubkey||''))||!/^[0-9a-f]{130}$/i.test(String(n.signature||'').replace(/^0x/,'')))return false;
    const derived=await sha256HexBytes(hexToBytes(String(n.pubkey).replace(/^0x/,'')));
    if(derived.toLowerCase()!==String(lock.buyerCommitment).toLowerCase())return false;
    const txid=String(n.paymentTxid||n.txid||'').toLowerCase();
    if(!/^[0-9a-f]{64}$/.test(txid))return false;

    const msg=Number(n.authVersion)>=3
      ?paymentAuthMessage(lock,step)
      :paymentNoticeMessage(lock,step,txid);

    return await verifyZcashCompactSignature(msg,n.signature,n.pubkey)
  }catch{return false}
}
async function verifyNoirStepTx(lock,txid,step,{requireFinal=false}={}){
  if(!/^[0-9a-f]{64}$/i.test(String(txid||'')))throw new Error('Invalid Zcash payment TXID.');
  const tx=await explorerFetch('tx',txid);
  const bh=Number(deepFind(tx,['blockHeight','block_height','blockheight','height']));
  if(!Number.isInteger(bh)||bh<=0)throw new Error('Payment is not confirmed yet.');
  const conf=await confirmationCount(tx,bh);
  if(requireFinal&&conf<CFG.atomicFinalConfirmations)throw new Error(`Waiting for finality: ${conf}/${CFG.atomicFinalConfirmations} confirmations.`);
  const bt=Number(deepFind(tx,['blockTime','block_time','time','timestamp']))||0;
  if(lock.blockHeight&&bh<=Number(lock.blockHeight))throw new Error('Payment must confirm after the seller lock.');

  const isFee=step==='fee';
  const deadline=isFee?Number(lock.expires||0):lockEffectiveExpiry(lock);
  if(bt&&deadline&&bt>deadline)throw new Error('Payment confirmed after the allowed payment window.');

  const address=isFee?CFG.treasury:lock.sellerPayout;
  const want=BigInt(String(isFee?lock.feeZat:lock.sellerZat));
  const outs=Array.isArray(tx?.outputs)?tx.outputs:(deepFind(tx,['outputs','vout'])||[]);
  if(!Array.isArray(outs))throw new Error('Explorer did not return transparent outputs.');
  const paid=outputSum(outs,address);
  if(paid!==want)throw new Error(`${isFee?'Protocol fee':'Seller payout'} must equal exactly ${isFee?lock.feeZec:lock.sellerZec} ZEC.`);

  const ti=await txOrder(tx,bh,txid);
  return {txid:String(txid).toLowerCase(),paymentTxid:String(txid).toLowerCase(),blockHeight:bh,blockTime:bt,txIndex:ti,confirmations:conf,paidZat:paid.toString(),step}
}
async function findVerifiedStep(lock,type,step){
  const candidates=[...S.events]
    .filter(e=>e.type===type&&e.lockId===lock.lockId&&String(e.buyerCommitment||'').toLowerCase()===String(lock.buyerCommitment||'').toLowerCase());
  const valid=[];
  for(const n of candidates){
    if(!(await verifyBuyerPaymentNotice(lock,n,step)))continue;
    try{
      const txid=String(n.paymentTxid||n.txid).toLowerCase();
      const v=await verifyNoirStepTx(lock,txid,step,{requireFinal:false});
      valid.push({...v,notice:n})
    }catch{}
  }
  valid.sort(eventOrder);
  return valid[0]||null
}
async function verifyLegacyAtomicPaymentTx(lock,txid,{requireFinal=true}={}){
  if(!/^[0-9a-f]{64}$/i.test(String(txid||'')))throw new Error('Invalid Zcash payment TXID.');
  const tx=await explorerFetch('tx',txid);
  const bh=Number(deepFind(tx,['blockHeight','block_height','blockheight','height']));
  if(!Number.isInteger(bh)||bh<=0)throw new Error('Buyer payment is not confirmed yet.');
  const conf=await confirmationCount(tx,bh);
  if(requireFinal&&conf<CFG.atomicFinalConfirmations)throw new Error(`Waiting for finality: ${conf}/${CFG.atomicFinalConfirmations} confirmations.`);
  const bt=Number(deepFind(tx,['blockTime','block_time','time','timestamp']))||0;
  if(lock.blockHeight&&bh<=Number(lock.blockHeight))throw new Error('Payment must confirm after the seller lock.');
  if(bt&&Number(lock.expires||0)&&bt>Number(lock.expires))throw new Error('Payment confirmed after lock expiry.');
  const outs=Array.isArray(tx?.outputs)?tx.outputs:(deepFind(tx,['outputs','vout'])||[]);
  if(!Array.isArray(outs))throw new Error('Explorer did not return transparent outputs.');
  const paid=outputSum(outs,lock.sellerPayout),want=BigInt(String(lock.paymentZat||'0'));
  if(paid!==want)throw new Error(`Seller output must equal exactly ${lock.paymentZec} ZEC for this lock.`);
  const ti=await txOrder(tx,bh,txid);
  return {txid:String(txid).toLowerCase(),paymentTxid:String(txid).toLowerCase(),blockHeight:bh,blockTime:bt,txIndex:ti,confirmations:conf,sellerPaid:paid.toString(),legacy:true}
}
async function sellerAddressCandidates(lock){
  const out=[],seen=new Set(),floor=(Number(lock.blockTime)||Number(lock.timestamp)||0)-300;
  for(let page=1;page<=5;page++){
    let j;try{j=await explorerAddress(lock.sellerPayout,page,100)}catch(e){console.warn('address scan',e);break}
    const txs=deepFind(j,['transactions','txs','history'])||[];
    if(!Array.isArray(txs)||!txs.length)break;
    let oldEnough=false;
    for(const x of txs){
      const id=String(x?.txid||x?.hash||'').toLowerCase(),ts=Number(x?.timestamp||x?.blockTime||x?.block_time||0);
      if(ts&&ts<floor)oldEnough=true;
      if(/^[0-9a-f]{64}$/.test(id)&&!seen.has(id)&&(!ts||ts>=floor)){seen.add(id);out.push({txid:id,timestamp:ts})}
    }
    if(oldEnough||txs.length<100)break
  }
  return out.sort((a,b)=>(a.timestamp||0)-(b.timestamp||0))
}
async function matchingUnresolvedLocksForSellerPayment(candidate,lock){
  const matches=[];
  for(const l0 of S.confirmedLocks.values()){
    if(Number(l0.v)<4||S.verifiedAtomic.has(l0.lockId))continue;
    if(String(l0.sellerPayout)!==String(lock.sellerPayout))continue;
    if(String(l0.sellerZat)!==String(lock.sellerZat))continue;

    let fee=l0.feeSeen;
    if(!fee){
      try{fee=await findVerifiedStep(l0,'NOIR_FEE_PAYMENT','fee')}catch{}
      if(fee)l0.feeSeen=fee
    }
    if(!fee||fee.confirmations<CFG.atomicFeeStepConfirmations)continue;
    if(candidate.blockHeight<=fee.blockHeight)continue;
    if(candidate.blockTime&&candidate.blockTime>lockEffectiveExpiry(l0))continue;
    matches.push(l0)
  }
  return matches
}
async function recoverUnnoticedSellerPayment(lock){
  // Recovery is only authorized from the connected BUYER identity. The chain
  // scan discovers the missing TXID; Noir signs a v3 authorization for the
  // already-locked destination/amount so the repair becomes portable to relays.
  if(!S.ownerCommitment||String(S.ownerCommitment).toLowerCase()!==String(lock.buyerCommitment||'').toLowerCase())return null;
  if(Number(lock.v)<4||!lock.feeSeen)return null;

  const used=new Set([...S.verifiedAtomic.values()].map(x=>String(x.sellerPaymentTxid||x.paymentTxid||x.txid||'').toLowerCase()).filter(Boolean));
  let candidates=[];
  try{candidates=await sellerAddressCandidates(lock)}catch(e){console.warn('seller payment recovery scan',e);return null}

  for(const c of candidates){
    if(used.has(c.txid))continue;
    let v;
    try{v=await verifyNoirStepTx(lock,c.txid,'seller',{requireFinal:false})}catch{continue}
    if(v.blockHeight<=lock.feeSeen.blockHeight)continue;

    const locks=await matchingUnresolvedLocksForSellerPayment(v,lock);
    if(locks.length!==1||locks[0].lockId!==lock.lockId)continue;

    // Create a portable signed repair event. Signing happens AFTER discovery but
    // does not spend funds; if Noir is slow, the payment stays safe and Check
    // Payments can retry later without another transfer.
    try{
      const sig=await signDerived(paymentAuthMessage(lock,'seller'));
      const e=normalizeEvent({
        protocol:'ZB1',v:3,authVersion:3,type:'NOIR_SELLER_PAYMENT',
        eventId:'noir-seller-payment:'+lock.lockId+':'+v.txid,
        lockId:lock.lockId,tokenId:Number(lock.tokenId),paymentTxid:v.txid,txid:v.txid,
        price:lock.price,paymentZec:lock.sellerZec,paymentZat:lock.sellerZat,
        buyerCommitment:S.ownerCommitment,sellerCommitment:lock.sellerCommitment,
        sellerPayout:lock.sellerPayout,pubkey:sigPub(sig),signature:sigVal(sig),
        timestamp:v.blockTime||Math.floor(Date.now()/1000),status:'recovered',step:'seller',
        recoveredFromChain:true
      });
      rememberRuntimeEvent(e);savePaymentRecovery(e);
      try{await publishRelay(e)}catch{}
      return {...v,notice:e,recoveredFromChain:true}
    }catch(e){
      console.warn('seller payment repair signing',e);
      return null
    }
  }
  return null
}
async function autoFindAtomicPayment(lock){
  if(Number(lock.v)>=4){
    const fee=await findVerifiedStep(lock,'NOIR_FEE_PAYMENT','fee');
    if(fee)lock.feeSeen=fee;

    let seller=fee&&fee.confirmations>=CFG.atomicFeeStepConfirmations
      ?await findVerifiedStep(lock,'NOIR_SELLER_PAYMENT','seller'):null;

    // Important repair path for a transaction that was already sent but whose
    // payment notice was lost because Noir stalled during the post-send step.
    if(!seller&&fee&&fee.confirmations>=CFG.atomicFeeStepConfirmations){
      seller=await recoverUnnoticedSellerPayment(lock)
    }
    if(seller)lock.sellerSeen=seller;

    if(!fee||!seller)return {fee,seller,pending:true};
    if(seller.blockHeight<=fee.blockHeight)return {fee,seller,pending:true,invalidOrder:true};
    const minConf=Math.min(fee.confirmations,seller.confirmations);
    return {fee,seller,confirmations:minConf,pendingFinality:minConf<CFG.atomicFinalConfirmations,txid:seller.txid}
  }

  const notices=[...S.events].filter(e=>e.type==='NOIR_PAYMENT'&&e.lockId===lock.lockId&&String(e.buyerCommitment||'').toLowerCase()===String(lock.buyerCommitment||'').toLowerCase());
  const ids=[];
  for(const n of notices){const x=String(n.paymentTxid||n.txid||'').toLowerCase();if(/^[0-9a-f]{64}$/.test(x)&&!ids.includes(x))ids.push(x)}
  try{
    const candidates=await sellerAddressCandidates(lock);
    for(const c of candidates)if(!ids.includes(c.txid))ids.push(c.txid)
  }catch(e){console.warn('seller address scan',e)}
  let pending=null;
  for(const txid of ids){
    try{
      const v=await verifyLegacyAtomicPaymentTx(lock,txid,{requireFinal:false});
      if(v.confirmations>=CFG.atomicFinalConfirmations)return v;
      if(!pending||v.confirmations>pending.confirmations)pending=v
    }catch{}
  }
  return pending?{...pending,pendingFinality:true}:null
}
async function recoverOneHistoricalSettlement(raw){
  try{
    if(!raw?.lockId||S.verifiedAtomic.has(raw.lockId))return null;
    const rawLock=S.atomicLocks.get(raw.lockId);
    if(!rawLock)return null;

    const lock=await confirmLockEvent(rawLock);
    if(!lock)return null;

    // The settlement hint must describe the exact buyer/seller/token bound into
    // the seller-signed lock. These fields are not accepted from the hint alone.
    if(Number(raw.tokenId)!==Number(lock.tokenId))return null;
    if(String(raw.buyerCommitment||'').toLowerCase()!==String(lock.buyerCommitment||'').toLowerCase())return null;
    if(String(raw.sellerCommitment||'').toLowerCase()!==String(lock.sellerCommitment||'').toLowerCase())return null;

    if(Number(lock.v)>=4){
      const feeTxid=String(raw.feeTxid||'').toLowerCase();
      const sellerTxid=String(raw.sellerPaymentTxid||raw.paymentTxid||raw.txid||'').toLowerCase();
      if(!/^[0-9a-f]{64}$/.test(feeTxid)||!/^[0-9a-f]{64}$/.test(sellerTxid))return null;

      const fee=await verifyNoirStepTx(lock,feeTxid,'fee',{requireFinal:true});
      // seller step's allowed grace is derived from the actually confirmed fee.
      lock.feeSeen=fee;
      const seller=await verifyNoirStepTx(lock,sellerTxid,'seller',{requireFinal:true});
      if(seller.blockHeight<=fee.blockHeight)return null;

      const e=normalizeEvent({
        protocol:'ZB1',v:4,type:'NOIR_SETTLED',eventId:'noir-settled:'+lock.lockId,lockId:lock.lockId,
        tokenId:Number(lock.tokenId),price:lock.price,
        sellerCommitment:lock.sellerCommitment,buyerCommitment:lock.buyerCommitment,
        sourceHeight:lock.sourceHeight||raw.sourceHeight||null,
        sourceHash:lock.sourceHash||raw.sourceHash||null,
        claimTxid:lock.claimTxid||raw.claimTxid||null,
        feeTxid:fee.txid,sellerPaymentTxid:seller.txid,paymentTxid:seller.txid,txid:seller.txid,
        protocolFeeZec:lock.feeZec,sellerZec:lock.sellerZec,protocolFeeBps:CFG.marketFeeBps,
        listingId:lock.listingId,offerId:lock.offerId,
        timestamp:seller.blockTime||Number(raw.timestamp)||Math.floor(Date.now()/1000),
        blockTime:seller.blockTime,blockHeight:seller.blockHeight,txIndex:seller.txIndex,
        confirmations:Math.min(fee.confirmations,seller.confirmations),derivedFromChain:true,recoveredHistorical:true
      });
      return e
    }

    // Legacy V9 single-payment sale.
    const txid=String(raw.paymentTxid||raw.txid||'').toLowerCase();
    if(!/^[0-9a-f]{64}$/.test(txid))return null;
    const pay=await verifyLegacyAtomicPaymentTx(lock,txid,{requireFinal:true});
    const e=normalizeEvent({
      protocol:'ZB1',v:3,type:'NOIR_SETTLED',eventId:'noir-settled:'+lock.lockId,lockId:lock.lockId,
      tokenId:Number(lock.tokenId),price:lock.price,
      sellerCommitment:lock.sellerCommitment,buyerCommitment:lock.buyerCommitment,
      sourceHeight:lock.sourceHeight||raw.sourceHeight||null,
      sourceHash:lock.sourceHash||raw.sourceHash||null,
      claimTxid:lock.claimTxid||raw.claimTxid||null,
      paymentTxid:pay.txid,txid:pay.txid,listingId:lock.listingId,offerId:lock.offerId,
      timestamp:pay.blockTime||Number(raw.timestamp)||Math.floor(Date.now()/1000),
      derivedFromChain:true,recoveredHistorical:true,...pay
    });
    return e
  }catch(e){
    console.warn('historical settlement verify',raw?.lockId,e);
    return null
  }
}
async function recoverHistoricalSettlements(){
  if(S.historicalSettlementRecoveryBusy)return 0;
  S.historicalSettlementRecoveryBusy=true;
  let recovered=0;
  try{
    const hints=new Map();
    for(const e of [...S.atomicSettlements.values(),...verifiedSettlementJournal()]){
      if(e?.lockId)hints.set(e.lockId,mergeEvent(hints.get(e.lockId),e))
    }
    for(const raw of hints.values()){
      if(S.verifiedAtomic.has(raw.lockId))continue;
      const e=await recoverOneHistoricalSettlement(raw);
      if(!e)continue;
      S.verifiedAtomic.set(e.lockId,e);
      rememberRuntimeEvent(e);
      saveVerifiedSettlementJournal(e);
      recovered++
    }
    return recovered
  }finally{
    S.historicalSettlementRecoveryBusy=false
  }
}
async function reconcileAtomicState(){
  if(S.atomicWatchBusy)return;
  S.atomicWatchBusy=true;
  try{
    const locks=[...S.atomicLocks.values()].slice(-300);
    for(const l of locks){
      const old=S.confirmedLocks.get(l.lockId);
      if(old&&old.confirmations>=CFG.atomicLockConfirmations)continue;
      const c=await confirmLockEvent(l);if(c)S.confirmedLocks.set(l.lockId,c)
    }

    // Critical for reloads after an old sale lock has expired:
    // re-verify completed settlement history before deciding which locks are
    // currently active. Otherwise a valid historical SALE can disappear from
    // Portfolio / Volume simply because its original lock is no longer active.
    await recoverHistoricalSettlements();

    const ordered=[...S.confirmedLocks.values()].sort(eventOrder),winner=new Map();
    for(const l of ordered){
      const id=Number(l.tokenId),existing=winner.get(id);
      // Keep the lock that produced a verified settlement as historical
      // verification evidence. Ownership is already final to the buyer.
      if(S.verifiedAtomic.has(l.lockId)){winner.set(id,l);continue}
      if(existing&&Number(l.blockTime||0)<=lockEffectiveExpiry(existing))continue;
      if(currentOwner(id)!==String(l.sellerCommitment).toLowerCase()&&!existing)continue;
      winner.set(id,l)
    }
    S.confirmedLocks=new Map([...S.confirmedLocks].filter(([id,l])=>winner.get(Number(l.tokenId))?.lockId===id || lockEffectiveExpiry(l)<Math.floor(Date.now()/1000)));

    for(const lock of [...S.confirmedLocks.values()]){
      if(S.verifiedAtomic.has(lock.lockId))continue;
      const active=activeAtomicLockForToken(lock.tokenId);
      if(!active||active.lockId!==lock.lockId)continue;
      const found=await autoFindAtomicPayment(lock);
      if(!found)continue;

      if(Number(lock.v)>=4){
        if(found.fee)lock.feeSeen=found.fee;
        if(found.seller)lock.sellerSeen=found.seller;
        if(found.pending||found.pendingFinality||found.invalidOrder)continue;

        const e=normalizeEvent({
          protocol:'ZB1',v:4,type:'NOIR_SETTLED',eventId:'noir-settled:'+lock.lockId,lockId:lock.lockId,
          tokenId:Number(lock.tokenId),price:lock.price,sellerCommitment:lock.sellerCommitment,buyerCommitment:lock.buyerCommitment,
          sourceHeight:lock.sourceHeight||null,sourceHash:lock.sourceHash||null,claimTxid:lock.claimTxid||null,
          feeTxid:found.fee.txid,sellerPaymentTxid:found.seller.txid,paymentTxid:found.seller.txid,txid:found.seller.txid,
          protocolFeeZec:lock.feeZec,sellerZec:lock.sellerZec,protocolFeeBps:CFG.marketFeeBps,
          listingId:lock.listingId,offerId:lock.offerId,
          timestamp:found.seller.blockTime||Math.floor(Date.now()/1000),blockTime:found.seller.blockTime,
          blockHeight:found.seller.blockHeight,txIndex:found.seller.txIndex,confirmations:found.confirmations,
          derivedFromChain:true
        });
        S.verifiedAtomic.set(lock.lockId,e);
        rememberRuntimeEvent(e);
        saveVerifiedSettlementJournal(e);
        try{await publishRelay(e)}catch{}
        continue
      }

      if(found.pendingFinality){lock.paymentSeen=found;continue}
      const e=normalizeEvent({
        protocol:'ZB1',v:3,type:'NOIR_SETTLED',eventId:'noir-settled:'+lock.lockId,lockId:lock.lockId,
        tokenId:Number(lock.tokenId),price:lock.price,sellerCommitment:lock.sellerCommitment,buyerCommitment:lock.buyerCommitment,
        sourceHeight:lock.sourceHeight||null,sourceHash:lock.sourceHash||null,claimTxid:lock.claimTxid||null,
        paymentTxid:found.txid,txid:found.txid,listingId:lock.listingId,offerId:lock.offerId,
        timestamp:found.blockTime||Math.floor(Date.now()/1000),derivedFromChain:true,...found
      });
      S.verifiedAtomic.set(lock.lockId,e);
      rememberRuntimeEvent(e);
      saveVerifiedSettlementJournal(e);
      try{await publishRelay(e)}catch{}
    }
  }finally{S.atomicWatchBusy=false}
}
async function atomicAcceptAndLock(o){
  try{
    if(!S.ownerCommitment)throw new Error('Connect seller Noir Wallet first.');
    if(String(o.sellerCommitment).toLowerCase()!==String(S.ownerCommitment).toLowerCase())throw new Error('Only the seller can accept this offer.');
    if(currentOwner(o.tokenId)!==S.ownerCommitment)throw new Error('Seller is no longer the current owner.');
    if(tokenIsAtomicLocked(o.tokenId))throw new Error('This token is already locked to another buyer.');
    const l=activeListingForToken(o.tokenId);
    if(!l)throw new Error('This NFT no longer has an active listing.');
    if(String(l.listingId||'')!==String(o.listingId||'')){
      throw new Error('This purchase request belongs to an older listing. The buyer must click Request Purchase again on the current listing.');
    }
    if(!offerMatchesListing(o,l))throw new Error('Rejected: buyer request does not exactly match the current signed listing price.');
    const payout=String(S.connection?.transparent||'');
    if(!/^t[13][A-Za-z0-9]{20,}$/.test(payout))throw new Error('Noir Wallet did not expose a transparent seller payout address.');

    // Never derive lock economics from buyer-controlled offer data.
    // The seller's signed listing is the only price authority.
    const fixedPrice=String(l.price);
    const lockId=atomicLockId(o),expires=Math.floor(Date.now()/1000)+CFG.atomicLockSeconds,sp=atomicSplit(fixedPrice);
    const provenance=S.claims.get(Number(o.tokenId))||S.walletRecoveredClaims.get(Number(o.tokenId))||{};
    const base={
      protocol:'ZB1',v:4,type:'NOIR_LOCK',eventId:'noir-lock:'+lockId,lockId,
      listingId:o.listingId,offerId:o.eventId,tokenId:Number(o.tokenId),price:fixedPrice,
      feeZat:String(sp.fee),feeZec:sp.feeZec,sellerZat:String(sp.seller),sellerZec:sp.sellerZec,treasury:CFG.treasury,
      sellerCommitment:S.ownerCommitment,buyerCommitment:o.buyerCommitment,sellerPayout:payout,expires,
      sourceHeight:provenance.sourceHeight||null,sourceHash:provenance.sourceHash||null,claimTxid:provenance.txid||null,
      timestamp:Math.floor(Date.now()/1000),status:'pending'
    };
    const sig=await signDerived(atomicLockMessage(base));
    base.pubkey=sigPub(sig);base.signature=sigVal(sig);
    base.anchorAddress=await atomicLockAnchorAddress(base);

    toast(`FIXED PRICE ${fixedPrice} ZEC · Locking ZEC BLOCK #${o.tokenId} to ${short(o.buyerCommitment,7)} for up to ${Math.floor(CFG.atomicLockSeconds/60)} min. Buyer has NOT paid yet. Approve the lock anchor to continue.`,13000);
    const lockRaw=await rpc('zcash_sendTransaction',[{to:base.anchorAddress,amount:zatToZec(BigInt(CFG.atomicAnchorZat)),fundingSource:'shielded'}]);
    const txid=zcashTxidFromResult(lockRaw);
    if(!/^[0-9a-f]{64}$/.test(txid))throw new Error('Seller lock may already have been broadcast but Noir returned an unsupported TX result. Do not approve another lock until Noir history is checked.');
    const ev=normalizeEvent({...base,txid,anchorTxid:txid});
    rememberRuntimeEvent(ev);
    const pr=await publishRelay(ev);
    toast(`Seller lock broadcast: ${short(txid,8)} · buyer pays 3% protocol fee then 97% seller payout.`,10000);
    await fetchRelay();await reconcileAtomicState();rebuildState();renderAtomicDesk();renderPortfolio();renderMarket();renderActivity()
  }catch(e){toast(e.message||String(e),10000)}
}
async function payLegacyLockedSaleWithNoir(lock){
  try{
    if(!S.ownerCommitment)throw new Error('Connect buyer Noir Wallet first.');
    if(String(lock.buyerCommitment||'').toLowerCase()!==String(S.ownerCommitment).toLowerCase())throw new Error('This lock belongs to another buyer.');
    const active=activeAtomicLockForToken(lock.tokenId);
    if(!active||active.lockId!==lock.lockId)throw new Error('This seller lock is no longer active.');
    const now=Math.floor(Date.now()/1000);
    if(now>Number(lock.expires)-CFG.atomicPayCutoffSeconds)throw new Error('Payment window is too close to expiry. Do not pay.');

    toast(`Legacy V9 lock: approve exactly ${lock.paymentZec} ZEC to the seller.`,9000);
    const paymentRaw=await rpc('zcash_sendTransaction',[{to:lock.sellerPayout,amount:lock.paymentZec,fundingSource:'shielded'}]);
    const txid=zcashTxidFromResult(paymentRaw);
    if(!/^[0-9a-f]{64}$/.test(txid))throw new Error('Legacy payment may already have been broadcast but Noir returned an unsupported TX result. Do not pay again; use Check Payments.');
    const msg=`ZB1:NOIR_PAYMENT:v1|L=${lock.lockId}|I=${lock.tokenId}|X=${txid}|A=${lock.paymentZec}|B=${S.ownerCommitment}`;
    const sig=await signDerived(msg);
    const e=normalizeEvent({protocol:'ZB1',v:1,type:'NOIR_PAYMENT',eventId:'noir-payment:'+lock.lockId+':'+txid,lockId:lock.lockId,tokenId:Number(lock.tokenId),paymentTxid:txid,txid,price:lock.price,paymentZec:lock.paymentZec,paymentZat:lock.paymentZat,buyerCommitment:S.ownerCommitment,sellerCommitment:lock.sellerCommitment,sellerPayout:lock.sellerPayout,pubkey:sigPub(sig),signature:sigVal(sig),timestamp:Math.floor(Date.now()/1000),status:'pending'});
    rememberRuntimeEvent(e);try{await publishRelay(e)}catch{}
    toast(`Legacy payment broadcast: ${short(txid,8)}. Waiting for ${CFG.atomicFinalConfirmations} confirmations.`,9000);
    await reconcileAtomicState();rebuildState();renderAtomicDesk();renderPortfolio();renderMarket();renderActivity()
  }catch(e){toast(e.message||String(e),11000)}
}
async function payProtocolFeeWithNoir(lock){
  try{
    if(!S.ownerCommitment)throw new Error('Connect buyer Noir Wallet first.');
    if(Number(lock.v)<4)return payLegacyLockedSaleWithNoir(lock);
    if(String(lock.buyerCommitment||'').toLowerCase()!==String(S.ownerCommitment).toLowerCase())throw new Error('This lock belongs to another buyer.');
    const active=activeAtomicLockForToken(lock.tokenId);
    if(!active||active.lockId!==lock.lockId)throw new Error('This seller lock is no longer active.');
    if(rawNotice(lock,'NOIR_FEE_PAYMENT'))throw new Error('Protocol-fee transaction was already broadcast for this lock. Use Check Payments instead of paying twice.');
    const now=Math.floor(Date.now()/1000);
    if(now>Number(lock.expires)-CFG.atomicPayCutoffSeconds)throw new Error('Too close to lock expiry to safely start the 2-step payment.');

    // Sign BEFORE spending. Noir slowness after payment can no longer erase the
    // protocol evidence that this buyer authorized this exact lock/amount.
    toast('Preparing Step 1 authorization…',5000);
    const sig=await signDerived(paymentAuthMessage(lock,'fee'));

    toast(`STEP 1/2 · Approve exactly ${lock.feeZec} ZEC protocol fee to the ZEC BLOCKS treasury.`,10000);
    const feeRaw=await rpc('zcash_sendTransaction',[{to:CFG.treasury,amount:lock.feeZec,fundingSource:'shielded'}]);
    const txid=zcashTxidFromResult(feeRaw);
    if(!/^[0-9a-f]{64}$/.test(txid))throw new Error('Protocol-fee payment may already have been broadcast but Noir returned an unsupported TX result. Do not pay again; use Check Payments.');

    const e=normalizeEvent({
      protocol:'ZB1',v:3,authVersion:3,type:'NOIR_FEE_PAYMENT',
      eventId:'noir-fee:'+lock.lockId+':'+txid,lockId:lock.lockId,tokenId:Number(lock.tokenId),
      paymentTxid:txid,txid,price:lock.price,paymentZec:lock.feeZec,paymentZat:lock.feeZat,
      buyerCommitment:S.ownerCommitment,sellerCommitment:lock.sellerCommitment,treasury:CFG.treasury,
      pubkey:sigPub(sig),signature:sigVal(sig),timestamp:Math.floor(Date.now()/1000),
      status:'pending',step:'fee'
    });

    // FIRST operation after the TXID exists: durable local recovery.
    rememberRuntimeEvent(e);savePaymentRecovery(e);
    try{await publishRelay(e)}catch{}
    toast(`Step 1 broadcast: ${short(txid,8)}. Wait for ${CFG.atomicFeeStepConfirmations} confirmation, then Step 2 will unlock.`,10000);
    await reconcileAtomicState();rebuildState();renderAtomicDesk();renderPortfolio();renderMarket();renderActivity()
  }catch(e){toast(e.message||String(e),11000)}
}
async function paySellerWithNoir(lock){
  try{
    if(!S.ownerCommitment)throw new Error('Connect buyer Noir Wallet first.');
    if(Number(lock.v)<4)return payLegacyLockedSaleWithNoir(lock);
    if(String(lock.buyerCommitment||'').toLowerCase()!==String(S.ownerCommitment).toLowerCase())throw new Error('This lock belongs to another buyer.');
    const active=activeAtomicLockForToken(lock.tokenId);
    if(!active||active.lockId!==lock.lockId)throw new Error('This seller lock is no longer active.');
    if(rawNotice(lock,'NOIR_SELLER_PAYMENT'))throw new Error('Seller payment was already broadcast for this lock. Use Check Payments instead of paying twice.');
    if(!lock.feeSeen||lock.feeSeen.confirmations<CFG.atomicFeeStepConfirmations)throw new Error(`Protocol fee needs ${CFG.atomicFeeStepConfirmations} confirmation before Step 2.`);
    if(Math.floor(Date.now()/1000)>lockEffectiveExpiry(lock)-120)throw new Error('Payment completion window is too close to expiry.');

    // Sign authorization BEFORE sending ZEC. This removes the old failure mode:
    // payment succeeds -> Noir becomes slow -> post-payment sign fails -> UI
    // forgets the payment and leaves "Pay Seller" enabled.
    toast('Preparing Step 2 authorization…',5000);
    const sig=await signDerived(paymentAuthMessage(lock,'seller'));

    toast(`STEP 2/2 · Approve exactly ${lock.sellerZec} ZEC to the seller. After both payments reach finality, the NFT transfers automatically.`,11000);
    const sellerRaw=await rpc('zcash_sendTransaction',[{to:lock.sellerPayout,amount:lock.sellerZec,fundingSource:'shielded'}]);
    const txid=zcashTxidFromResult(sellerRaw);
    if(!/^[0-9a-f]{64}$/.test(txid))throw new Error('Seller payment may already have been broadcast but Noir returned an unsupported TX result. Do not pay again; use Check Payments.');

    const e=normalizeEvent({
      protocol:'ZB1',v:3,authVersion:3,type:'NOIR_SELLER_PAYMENT',
      eventId:'noir-seller-payment:'+lock.lockId+':'+txid,
      lockId:lock.lockId,tokenId:Number(lock.tokenId),paymentTxid:txid,txid,price:lock.price,
      paymentZec:lock.sellerZec,paymentZat:lock.sellerZat,buyerCommitment:S.ownerCommitment,
      sellerCommitment:lock.sellerCommitment,sellerPayout:lock.sellerPayout,
      pubkey:sigPub(sig),signature:sigVal(sig),timestamp:Math.floor(Date.now()/1000),
      status:'pending',step:'seller'
    });

    // Persist before any relay/network follow-up. A page refresh cannot expose
    // the Pay Seller button again for this same transaction.
    rememberRuntimeEvent(e);savePaymentRecovery(e);
    try{await publishRelay(e)}catch{}
    toast(`Step 2 broadcast: ${short(txid,8)}. No seller action is required. Waiting for ${CFG.atomicFinalConfirmations} confirmations on both payments.`,11000);
    await reconcileAtomicState();rebuildState();renderAtomicDesk();renderPortfolio();renderMarket();renderActivity()
  }catch(e){toast(e.message||String(e),11000)}
}

async function manualAtomicCheck(lock){
  try{
    toast('Checking Zcash confirmations and recovering any already-sent payment. Do NOT pay again while this check is running…',7000);
    await reconcileAtomicState();rebuildState();renderAtomicDesk();renderPortfolio();renderMarket();renderActivity();
    if(S.verifiedAtomic.has(lock.lockId))toast(`Settlement final. ZEC BLOCK #${lock.tokenId} now belongs to the buyer and the SALE was added to Activity.`,9000);
    else if(Number(lock.v)>=4){
      const f=lock.feeSeen,s=lock.sellerSeen;
      if(f&&s)toast(`Fee ${f.confirmations}/${CFG.atomicFinalConfirmations} · Seller ${s.confirmations}/${CFG.atomicFinalConfirmations}. NFT transfers automatically at finality.`,9000);
      else if(f)toast(`Protocol fee confirmed (${f.confirmations}). Step 2 seller payment is ready.`,9000);
      else toast('Protocol fee not confirmed yet.',7000)
    }else if(lock.paymentSeen)toast(`Legacy payment detected · ${lock.paymentSeen.confirmations}/${CFG.atomicFinalConfirmations} confirmations.`,9000);
    else toast('No matching payment found yet.',7000)
  }catch(e){toast(e.message||String(e),9000)}
}
function renderAtomicDesk(){
  const sl=$('atomicSellerList'),bl=$('atomicBuyerList');if(!sl||!bl)return;
  sl.innerHTML='';bl.innerHTML='';
  if(!S.ownerCommitment){
    sl.innerHTML='<div class="empty">Connect Noir Wallet to load seller offers.</div>';
    bl.innerHTML='<div class="empty">Connect Noir Wallet to load locked purchases.</div>';return
  }

  const offers=sellerOffers();
  if(!offers.length)sl.innerHTML='<div class="empty">No actionable offers.</div>';
  for(const o of offers){
    const raw=lockForOffer(o),confirmed=raw&&S.confirmedLocks.has(raw.lockId),locked=confirmed?S.confirmedLocks.get(raw.lockId):raw;
    const item=document.createElement('div');item.className='atomicItem';
    const listing=S.listings.get(o.listingId),fixed=listing?.price||o.price;
    item.innerHTML=`<div class="atomicTop"><b>ZEC BLOCK #${esc(o.tokenId)} · ${esc(fixed)} ZEC</b><span class="atomicState ${confirmed?'atomicLocked':''}">${confirmed?'LOCKED TO BUYER':raw?'LOCK CONFIRMING':'FIXED PRICE REQUEST'}</span></div>
      <div class="atomicInfo"><span>Buyer ${esc(short(o.buyerCommitment,7))}</span><span>Exact listing price</span><span>3% protocol · 97% seller</span><span>${Math.floor(CFG.atomicLockSeconds/60)} min unpaid lock window</span>${confirmed?`<span>${esc(String(locked.confirmations||CFG.atomicLockConfirmations))}+ lock conf</span>`:''}</div><div class="notice" style="margin-top:8px"><b>Seller protection:</b> this buyer cannot change the listing price. Accepting only locks the NFT to this buyer; it does not mean the buyer has paid yet.</div><div class="controls"></div>`;
    const ctl=item.querySelector('.controls'),b=document.createElement('button');b.className='btn '+(raw?'':'green')+' small';
    b.textContent=confirmed?'Waiting for Selected Buyer':raw?'Lock Confirmation Pending':`Accept ${fixed} ZEC & Lock`;
    b.disabled=!!raw;b.onclick=()=>atomicAcceptAndLock(o);ctl.appendChild(b);sl.appendChild(item)
  }

  const locks=buyerLocks();
  if(!locks.length)bl.innerHTML='<div class="empty">No confirmed seller lock for this buyer identity.</div>';
  for(const lock of locks){
    const item=document.createElement('div');item.className='atomicItem';

    if(Number(lock.v)<4){
      const left=Number(lock.expires)-Math.floor(Date.now()/1000),safe=left>CFG.atomicPayCutoffSeconds,pending=lock.paymentSeen;
      const state=pending?`PAYMENT ${pending.confirmations}/${CFG.atomicFinalConfirmations} CONF`:safe?'LEGACY V9 · READY':'EXPIRING · DO NOT PAY';
      item.innerHTML=`<div class="atomicTop"><b>ZEC BLOCK #${esc(lock.tokenId)} · ${esc(lock.price)} ZEC</b><span class="atomicState ${pending?'atomicLocked':safe?'atomicReady':''}">${esc(state)}</span></div>
        <div class="atomicInfo"><span>Legacy seller payment ${esc(lock.paymentZec)} ZEC</span><span>Old V9 lock</span><span>${Math.max(0,Math.floor(left/60))} min left</span></div><div class="controls atomicControls"></div>`;
      const ctl=item.querySelector('.atomicControls'),pay=document.createElement('button'),ck=document.createElement('button');
      pay.className='btn green small';pay.textContent=`Pay ${lock.paymentZec} ZEC with Noir`;pay.disabled=!safe||!!pending;pay.onclick=()=>payLegacyLockedSaleWithNoir(lock);
      ck.className='btn small';ck.textContent='Check Payment';ck.onclick=()=>manualAtomicCheck(lock);ctl.append(pay,ck);bl.appendChild(item);continue
    }

    const now=Math.floor(Date.now()/1000),deadline=lockEffectiveExpiry(lock),left=deadline-now;
    const rawFee=rawNotice(lock,'NOIR_FEE_PAYMENT'),rawSeller=rawNotice(lock,'NOIR_SELLER_PAYMENT');
    const fee=lock.feeSeen,seller=lock.sellerSeen;
    let state='STEP 1 · PROTOCOL FEE';
    if(fee&&!seller)state=`STEP 1 OK · ${fee.confirmations} CONF`;
    if(rawSeller&&!seller)state='STEP 2 · CONFIRMING';
    if(seller)state=`FINALITY · ${Math.min(fee?.confirmations||0,seller.confirmations)}/${CFG.atomicFinalConfirmations}`;
    const safeStart=now<=Number(lock.expires)-CFG.atomicPayCutoffSeconds;

    item.innerHTML=`<div class="atomicTop"><b>ZEC BLOCK #${esc(lock.tokenId)} · ${esc(lock.price)} ZEC</b><span class="atomicState ${seller?'atomicLocked':fee?'atomicReady':''}">${esc(state)}</span></div>
      <div class="atomicInfo"><span>Step 1 fee ${esc(lock.feeZec)} ZEC (3%)</span><span>Step 2 seller ${esc(lock.sellerZec)} ZEC (97%)</span><span>Total ${esc(lock.price)} ZEC + network fees</span><span>${Math.max(0,Math.floor(left/60))} min window</span></div>
      <div class="notice" style="margin-top:8px"><b>2-step Noir checkout.</b> First pay the protocol treasury. After that transaction gets ${CFG.atomicFeeStepConfirmations} confirmation, the seller-payment button unlocks. The NFT transfers automatically only after <b>both</b> transactions reach ${CFG.atomicFinalConfirmations} confirmations. <b>If you already approved Step 2 in Noir, do not click Pay Seller again.</b> Use Check Payments; V9.7 can recover an already-sent seller payment from chain.</div>
      <div class="controls atomicControls"></div>`;

    const ctl=item.querySelector('.atomicControls');
    const feeBtn=document.createElement('button');feeBtn.className='btn gold small';
    feeBtn.textContent=fee?`Fee Paid · ${fee.confirmations} conf`:rawFee?'Fee Broadcast · Checking':`1. Pay 3% Fee · ${lock.feeZec} ZEC`;
    feeBtn.disabled=!!rawFee||!!fee||!safeStart;feeBtn.onclick=()=>payProtocolFeeWithNoir(lock);

    const sellerBtn=document.createElement('button');sellerBtn.className='btn green small';
    sellerBtn.textContent=seller?`Seller Paid · ${seller.confirmations} conf`:rawSeller?'Seller Payment Broadcast':`2. Pay Seller · ${lock.sellerZec} ZEC`;
    sellerBtn.disabled=!!rawSeller||!!seller||!fee||fee.confirmations<CFG.atomicFeeStepConfirmations||left<=120;
    sellerBtn.onclick=()=>paySellerWithNoir(lock);

    const ck=document.createElement('button');ck.className='btn small';ck.textContent='Check Payments';ck.onclick=()=>manualAtomicCheck(lock);
    ctl.append(feeBtn,sellerBtn,ck);bl.appendChild(item)
  }

  const mine=[...S.verifiedAtomic.values()].filter(x=>String(x.buyerCommitment||'').toLowerCase()===String(S.ownerCommitment).toLowerCase()).slice(-5);
  for(const s of mine){
    const done=document.createElement('div');done.className='atomicItem';
    const detail=Number(s.v)>=4?`Fee ${esc(short(s.feeTxid||'',7))} · Seller ${esc(short(s.sellerPaymentTxid||'',7))}`:`Payment ${esc(short(s.paymentTxid||s.txid,7))}`;
    done.innerHTML=`<div class="atomicTop"><b>ZEC BLOCK #${esc(s.tokenId)} · ${esc(s.price)} ZEC</b><span class="atomicState atomicDone">SALE FINAL</span></div><div class="atomicInfo"><span>${detail}</span><span>${esc(String(s.confirmations||CFG.atomicFinalConfirmations))}+ confirmations</span><span>Owner: buyer</span><span>Activity: SALE</span></div>`;
    bl.appendChild(done)
  }
}
async function openUsdcListingForToken(tokenId){
  if(!S.ownerCommitment)return toast('Connect Noir Wallet first.');
  if(!S.evmAddress){
    const ok=await connectEvmWallet(false);
    if(!ok)return
  }
  openUsdcListing();
  const sel=$('usdcListingToken');
  if(sel&&[...sel.options].some(o=>Number(o.value)===Number(tokenId)))sel.value=String(tokenId)
}
function renderPortfolio(){
  const own=ownedTokens();
  const mine=String(S.ownerCommitment||'').toLowerCase();
  const serverReady=!!mine&&S.serverPortfolioOwner===mine&&S.serverPortfolioLoaded.has(mine);
  $('ownedCount').textContent=serverReady?Number(S.serverPortfolioCount||0):own.length;
  if(serverReady){
    $('listingCount').textContent=Number(S.serverPortfolioListingCount||0)
  }else{
    const zecCount=S.ownerCommitment?activeListings().filter(x=>x.sellerCommitment===S.ownerCommitment).length:0;
    const usdcCount=S.ownerCommitment?canonicalActiveUsdcListings().filter(x=>String(x.sellerCommitment||'').slice(2).toLowerCase()===mine).length:0;
    $('listingCount').textContent=zecCount+usdcCount
  }
  $('offerCount').textContent=S.ownerCommitment?sellerOffers().length:0;
  const g=$('portfolioGrid');g.innerHTML='';if(!S.ownerCommitment){g.innerHTML='<div class="empty" style="grid-column:1/-1">Connect Noir Wallet to calculate your ZB-1 owner commitment and load your portfolio.</div>';renderAtomicDesk();return}if(!own.length){g.innerHTML='<div class="empty" style="grid-column:1/-1">No ZEC BLOCKS are currently resolved to this owner commitment. Recover & Sync checks wallet history, public discovery, and chain-verified marketplace settlements.</div>';renderAtomicDesk();return}
  for(const c of pageRows('portfolio',own,mine,renderPortfolio)){
    if(!c.sourceHash)hydrateTokenSources([c.tokenId]);
    const card=document.createElement('article');card.className='nft';card.innerHTML=`<div class="nftart"><svg class="blockArt" viewBox="0 0 600 600"></svg></div><div class="nftinfo"><div class="nftline"><span class="nfttitle">ZEC BLOCK #${c.tokenId}</span><span class="badge live">OWNED</span></div><div class="meta"><span>Source ${esc(c.sourceHeight||'loading…')}</span><span>${esc(short(c.txid||'',6))}</span></div><div class="controls"><button class="btn listZecOne">List ZEC</button><button class="btn usdc listUsdcOne">List USDC</button><button class="btn transferOne">Transfer</button></div></div>`;
    renderTokenArt(card.querySelector('svg'),c.tokenId,c);
    const zecBtn=card.querySelector('.listZecOne'),usdcBtn=card.querySelector('.listUsdcOne'),liveListing=activeListingForToken(c.tokenId);
    const usdcListing=activeUsdcListingForToken(c.tokenId);
    const atomicLock=activeAtomicLockForToken(c.tokenId),transferBtn=card.querySelector('.transferOne');
    if(usdcListing){
      zecBtn.textContent='USDC LISTED';zecBtn.disabled=true;
      usdcBtn.textContent='Cancel USDC';usdcBtn.className='btn red listUsdcOne';usdcBtn.onclick=()=>cancelUsdcListing(usdcListing);
      transferBtn.textContent='CANCEL USDC FIRST';transferBtn.disabled=true
    }else if(atomicLock){
      zecBtn.textContent='ATOMIC LOCKED';zecBtn.disabled=true;
      usdcBtn.textContent='LOCKED';usdcBtn.disabled=true;
      transferBtn.textContent='LOCKED';transferBtn.disabled=true
    }else if(liveListing){
      zecBtn.textContent='Cancel ZEC Listing';zecBtn.onclick=()=>cancelListing(liveListing);
      usdcBtn.textContent='ZEC LISTED';usdcBtn.disabled=true;
      transferBtn.textContent='CANCEL ZEC FIRST';transferBtn.disabled=true
    }else{
      zecBtn.textContent='List ZEC';zecBtn.onclick=()=>{openListing();$('listingToken').value=String(c.tokenId)};
      usdcBtn.textContent=S.evmAddress?'List USDC':'Connect Base → List USDC';usdcBtn.onclick=()=>openUsdcListingForToken(c.tokenId);
      transferBtn.onclick=()=>openNftTransfer(c.tokenId)
    }
    g.appendChild(card)}
  renderAtomicDesk();
}
$('syncPortfolioBtn').onclick=async()=>{try{
  await MarketRuntime.singleFlight('nostr',initNostr);
  S.balance=await rpc('zcash_getBalance');
  const r=await loadWalletHistory();
  await fetchRelay();
  await reconcileAtomicState();
  await hydrateServerPortfolio(S.ownerCommitment);
  rebuildState();updateWalletUI();renderPortfolio();renderAtomicDesk();
  toast(r?.claims?.length?`Recovered ZEC BLOCKS ${r.claims.map(x=>'#'+x).join(', ')}.`:`Portfolio synced · ${r?.seen||0} wallet ZB-1 events found, 0 valid claims reconstructed.`,8000)
}catch(e){toast(e.message||String(e),7000)}};
let sharedNftRecipient=null;
let resolvedNftRecipient=null,recipientLookupSequence=0,recipientLookupTimer=null;
async function nftAddressTools(){return NftAddressTools(await loadEthers())}
async function resolveNftAddress(address){
  const tools=await nftAddressTools();tools.validateAddress(address);
  const response=await indexFunction('zecblocks-nft-address',{action:'resolve',address});
  if(!response.proof)throw new Error('This address has not enabled NFT receiving. The recipient can enable it once in Portfolio → Receive NFT.');
  const proof=tools.verify(response.proof,CFG.genesisTxid);
  if(proof.address!==address)throw new Error('Address lookup returned a different recipient. Transfer stopped.');
  return {owner:proof.owner,address,source:'address'};
}
function recipientForTransfer(){
  const input=$('recipientCommit').value.trim();
  const result=/^t1/.test(input)?resolvedNftRecipient?.address===input?resolvedNftRecipient:null:MarketRuntime.parseNftRecipient(input,CFG.genesisTxid);
  if(!result)throw new Error('Verifying the recipient address…');
  if(result.owner===S.ownerCommitment)throw new Error('This is your connected wallet. Use the recipient’s receive link or switch to the sending account.');
  return result;
}
function updateRecipientPreview(){
  clearTimeout(recipientLookupTimer);const sequence=++recipientLookupSequence;
  const input=$('recipientCommit'),status=$('recipientStatus'),preview=$('recipientPreview');
  preview.hidden=true;input.removeAttribute('aria-invalid');
  $('submitTransferBtn').disabled=true;
  if(!input.value.trim()){status.textContent='Paste an enabled Zcash t1 address. Receive links are also accepted.';status.className='recipientHelp';return}
  const address=input.value.trim();
  if(/^t1/.test(address)&&resolvedNftRecipient?.address!==address){
    status.className='recipientHelp';status.textContent='Verifying recipient…';
    recipientLookupTimer=setTimeout(async()=>{
      try{const result=await resolveNftAddress(address);if(sequence!==recipientLookupSequence)return;resolvedNftRecipient=result;updateRecipientPreview()}
      catch(error){if(sequence!==recipientLookupSequence)return;status.textContent=error.message;status.className='recipientHelp red';input.setAttribute('aria-invalid','true')}
    },250);return;
  }
  if(/^u1/i.test(address)){status.textContent='Shielded u1 addresses cannot receive NFTs through this wallet API yet. Use the recipient’s enabled t1 address.';status.className='recipientHelp red';input.setAttribute('aria-invalid','true');return}
  try{
    const target=recipientForTransfer();$('recipientNftId').textContent=target.address||target.owner;preview.hidden=false;
    status.className='recipientHelp';status.textContent=target.address?'Receiving wallet verified. Ready to send.':'Check the receiving ID below with the recipient before sending.';
    $('submitTransferBtn').disabled=!!S.noirLocked;
  }catch(e){status.textContent=e.message;status.className='recipientHelp red';input.setAttribute('aria-invalid','true')}
}
function openNftTransfer(tokenId){
  if(activeWalletAction)return toast('Complete the current wallet request before selecting another NFT.',6500);
  S.transferToken=tokenId;$('transferToken').value='ZEC BLOCK #'+tokenId;
  $('recipientCommit').value=sharedNftRecipient?MarketRuntime.receiveLink(sharedNftRecipient,CFG.genesisTxid):'';
  updateRecipientPreview();modal('transferModal',true);
}
function importNftReceiveLink(){
  if(!location.hash.startsWith('#portfolio/receive/'))return;
  const banner=$('sharedRecipientBanner');banner.hidden=false;
  try{
    sharedNftRecipient=MarketRuntime.parseNftRecipient('https://www.zecblocks.xyz/'+location.hash,CFG.genesisTxid).owner;
    $('sharedRecipientStatus').textContent='Receive link opened. Connect the sending wallet, choose one of your NFTs below, then select Transfer.';
    $('sharedRecipientId').textContent=sharedNftRecipient;
  }catch(e){sharedNftRecipient=null;$('sharedRecipientStatus').textContent=e.message;$('sharedRecipientId').textContent=''}
}
function clearNftRecipient(){
  sharedNftRecipient=null;$('sharedRecipientBanner').hidden=true;$('recipientCommit').value='';updateRecipientPreview();
  if(location.hash.startsWith('#portfolio/receive/'))history.replaceState(null,'','#portfolio');
}
$('receiveNftBtn').onclick=async()=>{
  updateWalletUI();if(!S.connection||S.noirLocked||!S.ownerCommitment)return;modal('receiveNftModal',true);
  const owner=S.ownerCommitment,address=String(S.connection.transparent||'');
  try{const target=await resolveNftAddress(address);if(S.ownerCommitment!==owner||S.connection?.transparent!==address)return;
    if(target.owner!==owner)throw Error('This address is linked to another NFT identity. Check the selected wallet account.');
    S.receivingAddress=target;updateWalletUI();
  }catch(error){if(S.ownerCommitment===owner)$('receiveAddressStatus').textContent=error.message}
};
$('enableNftAddressBtn').onclick=async()=>{
  try{
    const owner=actionOwner(),address=String(S.connection?.transparent||''),tools=await nftAddressTools();
    const current=await rpc('zcash_getPublicKey',[{signingMode:'current'}]);assertWalletAction();
    const proof=tools.identity({v:1,network:'mainnet',genesis:CFG.genesisTxid,address,owner,addressPubkey:current.pubkey,nftPubkey:S.pubkey},CFG.genesisTxid);
    const message=tools.message(proof,CFG.genesisTxid);
    $('receiveAddressStatus').textContent='Approve address ownership in Noir Wallet (1 of 2)…';
    const addressSignature=await rpc('zcash_signMessage',[message,{signingMode:'current'}]);
    $('receiveAddressStatus').textContent='Approve your NFT receiving identity (2 of 2)…';
    const nftSignature=await signDerived(message);assertWalletAction();
    proof.addressSignature=sigVal(addressSignature);proof.nftSignature=sigVal(nftSignature);tools.verify(proof,CFG.genesisTxid);
    $('receiveAddressStatus').textContent='Saving your verified receiving address…';
    const result=await indexFunction('zecblocks-nft-address',{action:'register',proof});assertWalletAction();
    const verified=tools.verify(result.proof,CFG.genesisTxid);
    if(verified.address!==address||verified.owner!==owner)throw Error('Receiving address verification failed.');
    S.receivingAddress=verified;updateWalletUI();toast('Address receiving enabled. No transaction fee was charged.',7000);
  }catch(error){$('receiveAddressStatus').textContent=error.message;throw error}
};
$('copyNftAddressBtn').onclick=async()=>{
  const address=$('receiveNftAddress').value;if(!address||S.receivingAddress?.owner!==S.ownerCommitment)return;
  try{await navigator.clipboard.writeText(address);toast('Receiving address copied.')}
  catch{$('receiveNftAddress').select();toast('Copy the selected address.')}
};
$('copyReceiveLinkBtn').onclick=async()=>{
  if(!S.connection||S.noirLocked||!S.ownerCommitment)return;
  const owner=S.ownerCommitment,field=$('receiveNftLink');field.value=MarketRuntime.receiveLink(owner,CFG.genesisTxid);
  try{await navigator.clipboard.writeText(field.value);toast('Receive link copied for NFT ID '+short(owner,8)+'.',5000)}
  catch{field.focus();field.select();toast('Select Copy from your browser menu, or press Ctrl+C to copy the highlighted link.',7000)}
};
$('clearNftRecipientBtn').onclick=clearNftRecipient;
$('recipientCommit').addEventListener('input',updateRecipientPreview);
window.addEventListener('hashchange',importNftReceiveLink);
importNftReceiveLink();
$('submitTransferBtn').onclick=async()=>{
  let transferId='',sent=false;
  try{
    const address=$('recipientCommit').value.trim();
    if(/^t1/.test(address)){resolvedNftRecipient=await resolveNftAddress(address);assertWalletAction();if($('recipientCommit').value.trim()!==address)throw Error('The recipient changed. Review the address and try again.')}
    const tokenId=Number(S.transferToken),to=recipientForTransfer().owner;
    if(!S.ownerCommitment)throw new Error('Connect Noir Wallet first.');
    transferId=actionOwner()+':'+tokenId;
    if(nftTransferJournal.read().some(x=>x.id===transferId))throw Error('This NFT transfer is already being checked. See Pending transactions; no second transfer fee is needed.');
    $('recipientCommit').disabled=true;

    // Canonical server preflight: a listed, reserved, sold, or stale token can never
    // be transferred from a browser cache view.
    await usdcListingRailGuard('transfer_check',tokenId,{ownerCommitment:S.ownerCommitment});
    if(tokenIsAtomicLocked(tokenId))throw new Error('This NFT has a chain-verified atomic lock. Transfer is blocked until it settles or expires.');

    const msg=`ZB1:TRANSFER:v1|G=${CFG.genesisTxid}|T=${tokenId}|F=${S.ownerCommitment}|O=${to}`;
    const sig=await signDerived(msg);
    const memo=`ZB1|T|1|I=${tokenId}|O=${to}|K=${sigPub(sig)}|S=${sigVal(sig)}`;
    if(enc.encode(memo).length>512)throw new Error('Transfer memo exceeds 512 bytes.');
    let historyBefore=null;try{const history=await readNoirHistory();if(Array.isArray(history))historyBefore=history.map(zcashTxidFromResult)}catch{}
    assertWalletAction();
    const pending={id:transferId,owner:actionOwner(),to,tokenId,memo,pubkey:sigPub(sig),signature:sigVal(sig),timestamp:Math.floor(Date.now()/1000),historyBefore};
    nftTransferJournal.put(pending);renderPendingTransactions();sent=true;
    const raw=await rpc('zcash_sendTransaction',[{to:CFG.mailbox,amount:'0.00000001',memo,fundingSource:'shielded'}]);
    const txid=zcashTxidFromResult(raw);
    if(!/^[0-9a-f]{64}$/.test(txid))throw Error('Checking your transfer in Noir Wallet automatically. The request is saved; do not send it again.');
    nftTransferJournal.put({...pending,txid});
    const e=normalizeEvent({protocol:'ZB1',v:1,type:'TRANSFER',txid,memo,tokenId,fromCommitment:pending.owner,toCommitment:to,pubkey:sigPub(sig),signature:sigVal(sig),timestamp:pending.timestamp,status:'pending'});
    rememberRuntimeEvent(e);
    await publishRelay(e);
    modal('transferModal',false);clearNftRecipient();
    toast('Transfer broadcast · '+short(txid,8)+' · canonical ownership will update after chain verification.',9000);
    await fetchRelay();
    await hydrateServerPortfolio(S.ownerCommitment).catch(()=>{})
  }catch(e){if(sent&&walletRejected(e))nftTransferJournal.remove(transferId);toast(e.message||String(e),10000)}
  finally{$('recipientCommit').disabled=false;updateRecipientPreview()}
};
async function refreshAll(){return refreshMarketplace(true)}
function artSvg(svg,seed,label){const gold=['#d3a84f','#e9c56e','#b98a37','#f0d690'],bg=['#080808','#0c0c0c','#11100e','#0a0a0a'],dark=['#111','#141311','#181613','#1d1a15'];const hex=((seed||'')+seed).toLowerCase().replace(/[^0-9a-f]/g,'')||'0',bits=[...hex].map(ch=>parseInt(ch,16).toString(2).padStart(4,'0')).join(''),grid=24,cell=20,pad=60,bgc=bg[parseInt(hex[0]||'0',16)%bg.length],g1=gold[parseInt(hex[1]||'0',16)%4],g2=gold[parseInt(hex[2]||'0',16)%4],g3=gold[parseInt(hex[3]||'0',16)%4],d1=dark[parseInt(hex[4]||'0',16)%4];const r=(x,y,w=1,h=1,f=d1,o=1)=>`<rect x="${pad+x*cell}" y="${pad+y*cell}" width="${w*cell}" height="${h*cell}" fill="${f}" opacity="${o}"/>`;let a=`<rect width="600" height="600" fill="${bgc}"/>`;for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){const i=(x+y*grid)%bits.length;if(((x+y)%2===0&&bits[i]==='1')||((x+y)%5===0&&bits[(i+17)%bits.length]==='1'))a+=r(x,y,1,1,dark[(x+y)%4],.35)}for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){const ed=x===0||y===0||x===grid-1||y===grid-1,inn=x===2||y===2||x===grid-3||y===grid-3;if(ed)a+=r(x,y,1,1,(x+y)%3===0?g2:g1,.96);else if(inn&&((x+y)%2===0||bits[(x*7+y*11)%bits.length]==='1'))a+=r(x,y,1,1,g3,.88)}for(let y=0;y<16;y++)for(let x=0;x<8;x++){const i=(y*8+x)%bits.length,b1=bits[i]==='1',b2=bits[(i+29)%bits.length]==='1',b3=bits[(i+61)%bits.length]==='1',ring=Math.max(Math.abs(x-3.5),Math.abs(y-7.5));let on=ring<=1.5?(b1||b2):ring<=3.5?((b1&&b2)||(b1&&((x+y)%2===0))):ring<=6.5?(b1&&b2&&(b3||((x+y)%3===0))):false;if(on){const f=(x+y)%5===0?g3:(b2&&b3?g2:g1);a+=r(4+x,4+y,1,1,f,.98)+r(grid-5-x,4+y,1,1,f,.98)}}const arm=3+(parseInt(hex[5]||'0',16)%4);a+=r(11,11-arm,2,arm*2+2,g2,.96)+r(11-arm,11,arm*2+2,2,g2,.96)+r(10,10,4,4,g1,1);svg.innerHTML=a+`<text x="36" y="46" fill="#6d665a" font-size="14" font-family="monospace">ZEC BLOCKS / ${esc(label)}</text><text x="36" y="568" fill="#45413b" font-size="11" font-family="monospace">${esc(String(seed).slice(0,34).toUpperCase())}</text>`}
// Marketplace V13: canonical reads, wallet-scoped recovery and bounded rendering.
// Render keys include wallet identities; keep them out of DOM attributes.
const boardViewKeys=new WeakMap();
const feedState=new Map(),boardPages=new Map(),artCache=new Map();
let activeWalletAction=null,refreshTimer=null,lastPortfolioAt=0;
const baseJournal=MarketRuntime.journal(localStorage,'zb1_base_pending_v1');
function actionOwner(){return activeWalletAction?.owner||S.ownerCommitment||''}
function assertWalletAction(){
  const a=activeWalletAction;if(!a)return;
  if(a.connecting)throw new Error('Wait for the wallet connection to finish.');
  if(a.owner!==String(S.ownerCommitment||'')||a.evm!==String(S.evmAddress||'')||a.noirEpoch!==(S.walletEpoch||0)||a.evmEpoch!==(S.evmEpoch||0))throw new Error('Your wallet changed during this action. Review the current account and try again.');
}
function guardedAction(fn,{noir=true,base=false}={}){
  return async function(...args){
    if(activeWalletAction)return toast('Complete the current wallet request before starting another action.',6500);
    const execute=async()=>{
      activeWalletAction={connecting:true};
      try{
        if(noir&&!S.ownerCommitment){if(!await connectWallet(false))return}
        if(base){await loadEthers();if(!S.evmAddress&&!await connectEvmWallet(false))return;await ensureBaseNetwork()}
        activeWalletAction={owner:String(S.ownerCommitment||''),evm:String(S.evmAddress||''),noirEpoch:S.walletEpoch||0,evmEpoch:S.evmEpoch||0};
        document.body.classList.add('wallet-action');
        return await fn.apply(this,args)
      }catch(e){toast(e?.shortMessage||e?.message||String(e),10000)}
      finally{activeWalletAction=null;document.body.classList.remove('wallet-action');renderPendingTransactions();updateWalletUI()}
    };
    if(navigator.locks)return navigator.locks.request('zecblocks-wallet-action',{ifAvailable:true},lock=>lock?execute():toast('A wallet action is already open in another tab.',7000));
    return execute()
  }
}
function loadEthers(){
  if(window.ethers)return Promise.resolve(window.ethers);
  return MarketRuntime.singleFlight('ethers-sdk',()=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='/vendor/ethers-6.13.5.umd.min.js';script.async=true;
    const timer=setTimeout(()=>{script.remove();reject(new Error('Wallet tools could not load. Please retry.'))},15000);
    script.onload=()=>{clearTimeout(timer);window.ethers?resolve(window.ethers):reject(new Error('Wallet tools unavailable.'))};
    script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('Wallet tools could not load. Please retry.'))};document.head.appendChild(script)
  }))
}
function markFeed(name,ok,detail=''){
  const old=feedState.get(name)||{};feedState.set(name,{...old,ok,detail,at:ok?Date.now():old.at});renderFeedStatus()
}
function activeFeed(){
  if(location.hash==='#portfolio'||location.hash.startsWith('#portfolio/receive/'))return 'portfolio';if(location.hash==='#activity')return 'activity';
  if(document.querySelector('[data-market-asset="zecs"].active'))return document.querySelector('[data-zecs-rail="zec"].active')?'zecs-zec':'zecs';
  return document.querySelector('[data-market-rail="zec"].active')?'zec':'usdc'
}
function renderFeedStatus(){
  const el=$('marketHealth');if(!el)return;const name=activeFeed(),s=feedState.get(name);
  el.dataset.state=!navigator.onLine?'offline':s?.ok&&!s.detail?'live':s?'delayed':'loading';
  const label=!navigator.onLine?'Offline · reconnect to update':s?.ok?(s.detail||'Live market data'):s?'Connection delayed · keeping the last verified data':'Loading market data…';
  el.querySelector('span').textContent=label;
  el.querySelector('time').textContent=s?.at?'Updated '+new Date(s.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'';
  el.querySelector('button').hidden=!!s?.ok&&navigator.onLine&&!s.detail
}
function tokenSource(id){return S.claims.get(Number(id))?.sourceHash?S.claims.get(Number(id)):S.portfolioSourceCache.get(Number(id))||S.serverPortfolioTokens.get(Number(id))}
async function hydrateTokenSources(ids){
  ids=[...new Set(ids.map(Number))].filter(id=>Number.isInteger(id)&&id>0&&id<=CFG.supply&&!tokenSource(id)?.sourceHash&&!S.portfolioSourcePending.has(id));
  if(!ids.length)return;
  ids.forEach(id=>S.portfolioSourcePending.add(id));
  try{
    for(let i=0;i<ids.length;i+=100){
      const query=new URLSearchParams({select:'token_id,source_hash,source_height',token_id:`in.(${ids.slice(i,i+100).join(',')})`});
      const rows=await MarketRuntime.requestJSON(`${INDEX_CFG.url}/rest/v1/zecblocks_tokens?${query}`,{headers:indexHeaders(),cache:'no-store'});
      if(!Array.isArray(rows))throw new Error('Artwork metadata is unavailable');
      for(const row of rows){const hash=String(row.source_hash||'').replace(/^0x/,'');if(/^[0-9a-f]{64}$/i.test(hash))S.portfolioSourceCache.set(Number(row.token_id),{sourceHash:hash,sourceHeight:Number(row.source_height)})}
    }
    document.querySelectorAll('[data-art-token]').forEach(svg=>{const id=Number(svg.dataset.artToken),source=tokenSource(id);if(source?.sourceHash)renderTokenArt(svg,id,source)})
  }catch(e){console.warn('Artwork metadata pending',e)}finally{ids.forEach(id=>S.portfolioSourcePending.delete(id))}
}
function renderTokenArt(svg,id,source){
  if(!svg)return;
  if(!source?.sourceHash){svg.dataset.artToken=String(id);svg.setAttribute('role','img');svg.setAttribute('aria-label',`Artwork for ZEC BLOCK ${id} is loading`);svg.innerHTML='<rect width="600" height="600" fill="#17202b"/><text x="300" y="310" text-anchor="middle" fill="#a2afbf" font-size="24" font-family="system-ui">Loading artwork…</text>';return}
  const key=source.sourceHash+':'+(source.sourceHeight||id)+':'+id;
  let uri=artCache.get(key);
  if(!uri){const temp=document.createElementNS('http://www.w3.org/2000/svg','svg');temp.setAttribute('xmlns','http://www.w3.org/2000/svg');temp.setAttribute('viewBox','0 0 600 600');artSvg(temp,source.sourceHash+':'+(source.sourceHeight||id),'ZB #'+id);uri='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(temp.outerHTML);if(artCache.size>=120)artCache.delete(artCache.keys().next().value);artCache.set(key,uri)}
  const img=document.createElement('img');img.className='blockArt';img.src=uri;img.alt='ZEC BLOCK #'+id;img.width=600;img.height=600;img.loading='lazy';img.decoding='async';svg.replaceWith(img)
}
function pageRows(name,rows,query,render){
  let state=boardPages.get(name)||{page:1,query:''};if(state.query!==query)state={page:1,query};
  const total=Math.max(1,Math.ceil(rows.length/24));state.page=Math.max(1,Math.min(state.page,total));boardPages.set(name,state);
  const host=$(name+'Pagination');if(host){host.hidden=rows.length<=24;host.replaceChildren();
    if(rows.length>24){const prev=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');prev.className=next.className='btn';prev.textContent='Previous';next.textContent='Next';prev.disabled=state.page<=1;next.disabled=state.page>=total;label.textContent=`Page ${state.page} of ${total} · ${rows.length} items`;
      prev.onclick=()=>{state.page--;render()};next.onclick=()=>{state.page++;render()};host.append(prev,label,next)}
  }
  return rows.slice((state.page-1)*24,state.page*24)
}
function pendingBaseRows(){try{return baseJournal.read()}catch(e){console.warn('Transaction recovery storage',e);return []}}
function pendingListing(id){try{return directRecoveryRead().some(x=>x.listingId===id)||baseJournal.read().some(x=>String(x.listingId).toLowerCase()===String(id).toLowerCase())}catch{return true}}
function dropBaseTransaction(txHash){if(!/^0x[0-9a-f]{64}$/i.test(txHash||''))return;for(const row of baseJournal.read())if(String(row.txHash).toLowerCase()===String(txHash).toLowerCase())baseJournal.remove(row.id);renderPendingTransactions()}
async function sendBaseTransaction(contract,method,args,context){
  assertWalletAction();
  const owner=actionOwner(),evm=String(S.evmAddress||'').toLowerCase(),target=String(await contract.getAddress()).toLowerCase();assertWalletAction();
  const data=contract.interface.encodeFunctionData(method,args),id=[evm,target,context.kind,context.tokenId||context.listingId||method].join(':');
  if(baseJournal.read().some(x=>x.id===id))throw new Error('This transaction is awaiting confirmation. Use Pending transactions to recover it without paying again.');
  const row={id,owner,evm,target,data,method,...context,status:'wallet_request',startedAt:Date.now()};
  if(S.transactionFlow?.action===activeWalletAction)S.transactionFlow.recoveryKey='base:'+id;
  // Optional discovery data. Missing wallet history must never cause a resend.
  try{const p=S.evmSigner?.provider;if(p){row.requestBlock=await p.getBlockNumber();row.nonce=await p.getTransactionCount(evm,'pending')}}catch{}
  assertWalletAction();
  baseJournal.put(row);renderPendingTransactions();
  try{
    updateTransactionFlow('wallet','Review this transaction in your Base wallet.');
    assertWalletAction();const tx=await contract[method](...args);
    if(!/^0x[0-9a-f]{64}$/i.test(tx?.hash||''))throw new Error('The wallet did not return a transaction hash. Check Pending transactions before retrying.');
    baseJournal.put({...row,nonce:Number.isSafeInteger(tx.nonce)?tx.nonce:row.nonce,txHash:tx.hash.toLowerCase(),status:'broadcast'});renderPendingTransactions();updateTransactionFlow('network','Transaction sent. Waiting for Base confirmation…');return tx
  }catch(e){
    if(walletRejected(e)){baseJournal.remove(id);renderPendingTransactions();updateTransactionFlow('prepare','Transaction cancelled in your wallet.');throw e}
    // A provider error can happen after submission. Retain the journal and never send again.
    throw new Error((e?.shortMessage||e?.message||'Wallet response unavailable')+' Check Pending transactions before retrying; payment may already be submitted.')
  }
}
async function waitBaseTransaction(tx){
  let timer;try{
    const receipt=await Promise.race([tx.wait(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Transaction submitted. Confirmation will continue in Pending transactions; no further payment is needed.')),45000)})]);
    if(Number(receipt?.status)!==1){dropBaseTransaction(tx.hash);throw new Error('The Base transaction reverted. No purchase was completed.')}
    return receipt
  }catch(e){if(e?.receipt&&Number(e.receipt.status)===0)dropBaseTransaction(tx.hash);throw e}finally{clearTimeout(timer)}
}
async function confirmZecsTransaction(txHash){
  const result=await zecsMarketIndexTx(txHash);
  if(result?.ok!==true||Number(result.contract_logs)<1)throw new Error('Base confirmed. ZECS settlement is still being verified; recovery will continue automatically.');
  return result
}
async function indexedBaseCandidates(row,provider){
  const hints=loadUsdcPurchaseRecoveries().filter(x=>String(x.listingId).toLowerCase()===String(row.listingId).toLowerCase()&&dbCommitment(x.buyerCommitment)===row.owner).map(x=>x.txHash);
  const nft=['nft-buy','nft-list','nft-cancel'].includes(row.kind)&&row.target===CFG.usdcMarketContract.toLowerCase();
  const zecs=row.kind==='zecs'&&row.target===CFG.zecsMarketContract.toLowerCase();
  if((!nft&&!zecs)||!/^0x[0-9a-f]{64}$/i.test(row.listingId||''))return hints;
  const table=nft?'zecblocks_usdc_listings':'zecblocks_zb20_market_orders',key=nft?'listing_id':'order_id';
  const query=new URLSearchParams({select:nft?'created_tx_hash,settled_tx_hash,updated_block':'created_tx_hash,updated_block',[key]:'eq.'+row.listingId.toLowerCase(),limit:'1'});
  try{
    const records=await MarketRuntime.requestJSON(`${INDEX_CFG.url}/rest/v1/${table}?${query}`,{headers:indexHeaders(),cache:'no-store'});
    if(!Array.isArray(records))throw new Error('Transaction index is temporarily unavailable.');
    const record=records[0];if(!record)return hints;
    hints.push(record.settled_tx_hash,record.created_tx_hash);
    // Cancellations and ZECS settlements retain their event block in the index.
    // Read only that block, then independently match the full transaction below.
    if((zecs||row.kind==='nft-cancel')&&Number.isSafeInteger(Number(record.updated_block))&&Number(record.updated_block)>0){
      const block=Number(record.updated_block),logs=await provider.getLogs({address:row.target,topics:[null,row.listingId.toLowerCase()],fromBlock:block,toBlock:block});
      for(const log of logs)hints.push(log.transactionHash)
    }
  }catch(e){if(!hints.some(x=>/^0x[0-9a-f]{64}$/i.test(x||'')))throw e}
  return hints
}
async function findBaseTransaction(row,provider){
  return MarketRuntime.discoverBaseTransaction(row,provider,()=>indexedBaseCandidates(row,provider))
}
async function resumeBaseTransactions(){
  return MarketRuntime.singleFlight('base-recovery',async()=>{
    const owner=String(S.ownerCommitment||''),evm=String(S.evmAddress||'').toLowerCase();
    const rows=baseJournal.read().filter(x=>x.owner?x.owner===owner:!!evm&&x.evm===evm);if(!rows.length)return;
    const provider=await baseReadProvider();let changed=false;
    for(const row of rows){
      try{
        if(!row.txHash){
          if(activeWalletAction)continue;const hash=await findBaseTransaction(row,provider);if(!hash)continue;
          const current=baseJournal.read().find(x=>x.id===row.id);if(!current)continue;
          row.txHash=current.txHash||hash;baseJournal.put({...current,txHash:row.txHash,status:'broadcast'});renderPendingTransactions()
        }
        let receipt=await provider.getTransactionReceipt(row.txHash);
        if(!receipt&&!activeWalletAction){
          // A wallet speed-up replaces the hash while preserving the request.
          // Recover only an exact match; a cancellation/different call is not a purchase.
          const hash=await findBaseTransaction(row,provider);
          if(hash&&hash!==row.txHash){
            const current=baseJournal.read().find(x=>x.id===row.id);if(!current)continue;
            const previous=row.txHash;row.txHash=hash;baseJournal.put({...current,txHash:hash,status:'broadcast'});
            dropUsdcPurchaseRecovery(previous);renderPendingTransactions();receipt=await provider.getTransactionReceipt(hash)
          }
        }
        if(!receipt||receipt.status==null)continue;
        if(Number(receipt.status)===0){baseJournal.remove(row.id);dropUsdcPurchaseRecovery(row.txHash);renderPendingTransactions();changed=true;continue}
        if(Number(receipt.status)!==1)continue;
        if(row.kind==='nft-buy'){
          const ready=await finalizeUsdcCanonicalOwnership({txHash:row.txHash,tokenId:row.tokenId,buyerCommitment:row.owner},{quiet:true});if(!ready)continue
        }else if(row.kind==='zecs')await confirmZecsTransaction(row.txHash);
        else if(row.kind!=='approval')await indexUsdcReceipt(row.txHash,row.intent||null);
        baseJournal.remove(row.id);renderPendingTransactions();updateTransactionFlow('done',row.kind==='approval'?'USDC permission confirmed. Return to the item to continue checkout.':'Transaction complete. Your portfolio is updated.','base:'+row.id);changed=true
      }catch(e){console.warn('Base confirmation pending',row.txHash,e)}
    }
    renderPendingTransactions();if(changed)await refreshMarketplace(true)
  })
}
async function useDirectRecoveryTransaction(row,txid){
  const owner=dbCommitment(S.ownerCommitment),epoch=S.walletEpoch||0;
  const current=currentDirectRecovery(row,owner,epoch);
  if(!owner||!current)throw new Error('Reconnect the original wallet to check this purchase.');
  const q=await zecDirectApi('reservation',{reservationId:row.reservationId}),r=q?.reservation;
  if(!currentDirectRecovery(row,owner,epoch)||!directReservationMatches(current,r,owner))throw new Error('The wallet or purchase changed. Please check again.');
  if(r.status==='settled'){dropDirectRecovery(row.reservationId);return}
  if(['expired','failed','cancelled'].includes(r.status)){
    // This is supporting evidence for review, not a successful settlement.
    saveDirectRecovery({...current,txid,reservationStatus:r.status,ownerCommitment:owner,statusCheckedAt:Date.now()});
    toast('Transaction saved for review. This purchase has not been confirmed. Do not pay again.',10000);
    return;
  }
  if(!['active','payment_pending'].includes(r.status))throw new Error('The purchase status could not be verified. Please check again.');
  const result=await zecDirectApi('submit_payment',{reservationId:row.reservationId,txid});
  const latest=currentDirectRecovery(row,owner,epoch);if(!latest)return;
  if(result?.settlement||result?.pending===false)dropDirectRecovery(row.reservationId);
  else saveDirectRecovery({...latest,txid,reservationStatus:r.status,ownerCommitment:owner});
}
function directRecoveryLabel(row){return row.asset==='ZEC_BLOCK'&&Number.isInteger(Number(row.tokenId))&&Number(row.tokenId)>0?'ZEC BLOCK #'+Number(row.tokenId):row.asset==='ZECS'?'ZECS purchase':'Zcash purchase'}
function renderDirectReviewHistory(rows){
  const host=$('purchaseRecoveryHistory'),notice=$('purchaseReviewNotice');if(!host||!notice)return;
  const review=rows.filter(directRecoveryNeedsReview);
  host.hidden=notice.hidden=!review.length;host.replaceChildren();notice.replaceChildren();if(!review.length)return;
  const link=document.createElement('a');link.href='#portfolio';link.dataset.appTab='portfolio';link.textContent=review.length+' earlier purchase'+(review.length===1?' needs':'s need')+' review · View in Portfolio';link.onclick=()=>{host.open=true};notice.append(link);
  const summary=document.createElement('summary');summary.textContent='Purchases needing review ('+review.length+')';host.append(summary);
  const intro=document.createElement('p');intro.textContent='These reservations are closed, but a payment may have been sent. The saved records remain protected from duplicate payment. They are not confirmed purchases.';host.append(intro);
  const check=document.createElement('button');check.className='btn';check.textContent='Check status';check.onclick=async()=>{check.disabled=true;check.textContent='Checking…';try{await resumeDirectPayments()}catch(e){toast(e.message||String(e),10000)}finally{renderPendingTransactions()}};host.append(check);
  for(const row of review){
    const item=document.createElement('div');item.className='pendingRow';
    const info=document.createElement('div'),title=document.createElement('strong'),note=document.createElement('p');
    title.textContent=directRecoveryLabel(row)+' · '+(row.reservationStatus==='expired'?'Reservation expired':'Payment needs review');
    note.textContent=row.txid?'A transaction is saved, but the purchase is not confirmed. Do not pay again.':'No transaction ID was recovered. Check your wallet history before paying again.';
    info.append(title,note);const reference=document.createElement('small');reference.textContent='Reference: '+row.reservationId;info.append(reference);item.append(info);
    if(row.txid){const tx=document.createElement('a');tx.href='https://zcashblockexplorer.com/transactions/'+row.txid;tx.target='_blank';tx.rel='noopener noreferrer';tx.textContent='View saved transaction ↗';item.append(tx)}
    else{const btn=document.createElement('button');btn.className='btn';btn.textContent='Save wallet transaction';btn.onclick=async()=>{
      const value=window.prompt('Paste the transaction ID from your wallet history to keep it with this review. This does not send funds or confirm the purchase.');if(!value)return;
      const tx=value.trim().toLowerCase();if(!/^[0-9a-f]{64}$/.test(tx))return toast('Enter a valid Zcash transaction ID.');
      btn.disabled=true;try{await useDirectRecoveryTransaction(row,tx)}catch(e){toast(e.message||String(e),10000)}finally{renderPendingTransactions()}
    };item.append(btn)}
    host.append(item);
  }
}
function renderPendingTransactions(){
  renderListingFeeRecoveries();
  const host=$('pendingTransactions');if(!host)return;
  const owner=String(S.ownerCommitment||''),evm=String(S.evmAddress||'').toLowerCase();
  const base=pendingBaseRows().filter(x=>x.owner?x.owner===owner:!!evm&&x.evm===evm);
  let direct=[];try{direct=owner?directRecoveryRead().filter(x=>!x.ownerCommitment||x.ownerCommitment===owner):[]}catch(e){renderDirectReviewHistory([]);host.hidden=false;host.textContent=e.message;return}
  renderDirectReviewHistory(direct);direct=direct.filter(x=>!directRecoveryNeedsReview(x));
  let transfers=[];try{transfers=owner?nftTransferJournal.read().filter(x=>x.owner===owner):[]}catch(e){host.hidden=false;host.textContent=e.message;return}
  host.hidden=!base.length&&!direct.length&&!transfers.length;host.replaceChildren();if(host.hidden)return;
  const title=document.createElement('h3');title.textContent='Pending transactions';host.append(title);
  const help=document.createElement('p');help.textContent='Your purchases are saved. We check wallet history and network confirmation automatically. You can keep browsing.';host.append(help);
  const check=document.createElement('button');check.className='btn';check.textContent='Check progress';check.onclick=async()=>{check.disabled=true;check.textContent='Checking…';try{await Promise.allSettled([resumeDirectPayments(),resumeBaseTransactions(),resumeUsdcPurchaseRecoveries(),resumeNftTransfers()])}finally{renderPendingTransactions()}};host.append(check);
  for(const row of [...transfers.map(x=>({...x,network:'NFT transfer #'+x.tokenId,transfer:true})),...direct.map(x=>({...x,network:directRecoveryLabel(x)})),...base.map(x=>({...x,network:'Base'}))]){
    const item=document.createElement('div');item.className='pendingRow';const text=document.createElement('span');
    text.textContent=row.network+' · '+(row.txHash||row.txid?'Waiting for network confirmation':'Checking wallet payment — no need to pay again');item.append(text);
    const hash=row.txHash||row.txid;if(hash){const link=document.createElement('a');link.href=row.network==='Base'?'https://basescan.org/tx/'+hash:'https://zcashblockexplorer.com/transactions/'+hash;link.target='_blank';link.rel='noopener noreferrer';link.textContent=short(hash,8)+' ↗';item.append(link)}
    else if(!row.transfer){const details=document.createElement('details'),summary=document.createElement('summary');details.className='receiveDetails';summary.textContent='Advanced recovery';details.append(summary);
      const note=document.createElement('p');note.textContent='Only needed if automatic checks cannot identify your payment. This checks an existing transaction and never sends funds.';details.append(note);
      const btn=document.createElement('button');btn.className='btn';btn.textContent='Use wallet transaction';btn.onclick=async()=>{
      const value=window.prompt('Paste the transaction ID from your wallet history. This checks the existing transaction and never sends another payment.');if(!value)return;
      try{
        const tx=value.trim().toLowerCase();
        if(row.network==='Base'){
          if(!/^0x[0-9a-f]{64}$/.test(tx))throw new Error('Enter a valid Base transaction hash.');
          const provider=await baseReadProvider(),existing=await provider.getTransaction(tx);
          if(!MarketRuntime.matchesBaseRequest(row,existing))throw new Error('This transaction does not match the original wallet request.');
          baseJournal.put({...row,txHash:tx,status:'broadcast'});await resumeBaseTransactions()
        }else{
          if(!/^[0-9a-f]{64}$/.test(tx))throw new Error('Enter a valid Zcash transaction ID.');
          await useDirectRecoveryTransaction(row,tx);await resumeDirectPayments()
        }
        renderPendingTransactions()
      }catch(e){toast(e.message||String(e),10000)}
    };details.append(btn);item.append(details)}host.append(item)
  }
}
async function refreshMarketplace(force=false){
  return MarketRuntime.singleFlight('market-refresh',async()=>{
    const now=Date.now(),feed=activeFeed(),jobs=[];
    if(feed==='usdc'||force)jobs.push(hydrateServerUsdc());
    if(feed==='zec'||force)jobs.push(hydrateServerZecMarketStates(),hydrateServerZecMetrics());
    if(feed==='zecs'||force)jobs.push(loadZecsMarketState({account:!!S.ownerCommitment}));
    if(feed==='zecs-zec'||force)jobs.push(loadZecsZecMarketState());
    if(feed==='activity'||force)jobs.push(hydrateServerActivity());
    if(S.ownerCommitment&&(force||feed==='portfolio'||now-lastPortfolioAt>45000)){lastPortfolioAt=now;jobs.push(hydrateServerPortfolio(S.ownerCommitment))}
    await Promise.allSettled(jobs);renderFeedStatus()
  })
}
async function pollMarketplace(){
  return MarketRuntime.singleFlight('market-poll',async()=>{
    clearTimeout(refreshTimer);
    try{if(!document.hidden&&navigator.onLine){await Promise.allSettled([refreshMarketplace(),resumeListingFees(),resumeDirectPayments(),resumeUsdcPurchaseRecoveries(),resumeBaseTransactions(),resumeNftTransfers()])}}
    finally{if(!document.hidden)refreshTimer=setTimeout(pollMarketplace,20000)}
  })
}
function installMarketplaceGuards(){
  // Acquiring this gate happens before connecting or opening any wallet prompt.
  directZecBuy=guardedAction(directZecBuy);upgradeZecListing=guardedAction(upgradeZecListing);cancelListing=guardedAction(cancelListing);
  publishZecsZecListing=guardedAction(publishZecsZecListing);cancelZecsZecOrder=guardedAction(cancelZecsZecOrder);
  publishZecsListing=guardedAction(publishZecsListing,{base:true});cancelZecsOrder=guardedAction(cancelZecsOrder,{noir:false,base:true});buyZecsOrder=guardedAction(buyZecsOrder,{base:true});
  publishUsdcListing=guardedAction(publishUsdcListing,{base:true});cancelUsdcListing=guardedAction(cancelUsdcListing,{noir:false,base:true});buyUsdcListing=guardedAction(buyUsdcListing,{base:true});
  for(const [id,fn] of [['publishUsdcListingBtn',publishUsdcListing],['publishZecsListingBtn',publishZecsListing],['publishZecsZecListingBtn',publishZecsZecListing]])if($(id))$(id).onclick=fn;
  for(const id of ['publishListingBtn','submitTransferBtn','publishOfferBtn','enableNftAddressBtn'])if($(id)?.onclick)$(id).onclick=guardedAction($(id).onclick);
  // Coalesce complete snapshot jobs, including owner lookups and state application.
  for(const name of ['hydrateServerUsdc','hydrateServerZecMarketStates','hydrateServerZecMetrics','hydrateServerActivity','loadZecsZecMarketState']){
    const original=window[name];window[name]=(...args)=>MarketRuntime.singleFlight('snapshot:'+name,()=>original(...args))
  }
}
installMarketplaceGuards();
artSvg($('heroArt'),CFG.genesisTxid,'ZB #1');
if($('usdcSearch'))$('usdcSearch').oninput=renderUsdcMarket;
if($('usdcSort'))$('usdcSort').onchange=renderUsdcMarket;
if($('marketHealth'))$('marketHealth').querySelector('button').onclick=()=>refreshMarketplace(true);
function setTheme(theme){document.documentElement.dataset.theme=theme;try{localStorage.setItem('zb1_theme',theme)}catch{}const button=$('themeToggle');if(button){button.textContent=theme==='dark'?'☀':'☾';button.setAttribute('aria-label',theme==='dark'?'Switch to light mode':'Switch to dark mode')}}
let initialTheme='dark';try{initialTheme=localStorage.getItem('zb1_theme')||'dark'}catch{}setTheme(initialTheme);
if($('themeToggle'))$('themeToggle').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
// Accessible dialogs: Escape, focus restoration and a bounded Tab order.
const originalModal=modal;let dialogTrigger=null;
modal=function(id,on=true){if(on)dialogTrigger=document.activeElement;originalModal(id,on);const el=$(id);el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');const title=el.querySelector('h3');if(title)el.setAttribute('aria-label',title.textContent);if(on)el.querySelector('input:not([disabled]),select,button')?.focus();else dialogTrigger?.focus()};
document.addEventListener('keydown',event=>{
  const open=document.querySelector('.modal.show');if(!open)return;
  if(event.key==='Escape'){modal(open.id,false);return}
  if(event.key==='Tab'){const items=[...open.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea,a[href]')].filter(x=>x.getClientRects().length);const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}
});
document.querySelectorAll('.xbtn').forEach(x=>x.setAttribute('aria-label','Close dialog'));
$('toast').setAttribute('role','status');$('toast').setAttribute('aria-live','polite');
renderUsdcMarket();renderMarket();renderPortfolio();renderPendingTransactions();
// First paint and public data never wait for a wallet, SDK, relay or chain scan.
setTimeout(()=>{pollMarketplace();connectWallet(true).catch(()=>{});if(window.ethereum)connectEvmWallet(true).catch(()=>{})},0);
window.addEventListener('online',()=>pollMarketplace());window.addEventListener('offline',renderFeedStatus);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(refreshTimer);else pollMarketplace()});
window.addEventListener('hashchange',()=>setTimeout(()=>refreshMarketplace(),0));
document.addEventListener('click',e=>{if(e.target.closest('[data-market-rail],[data-market-asset],[data-zecs-rail]'))setTimeout(()=>refreshMarketplace(),0)});
window.addEventListener('storage',e=>{if(e.key===DIRECT_ZEC_RECOVERY_KEY||e.key==='zb1_base_pending_v1'||e.key==='zb1_nft_transfers_v1'){renderPendingTransactions();renderUsdcMarket();renderMarket()}});
