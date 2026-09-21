
'use strict';
const CFG={
  genesisTxid:'ecf6fc3a79885f573d79de70a2de85c34667fc1a4fefe034d3a4015269379f0f',
  mailbox:'u1qqjyaypzmvgfnc9uatk5t0f6hmge6htpfck3d366nhx94450crtznujwn8kql9u39uzdqcdg8flzk3tmf32j2p4u0xvx370xwcjjsrmd',
  treasury:'t1b9PCdoCncgoc13CWwWz8tzZZLDYfMaTyz',
  supply:5000,powBits:26,freeClaims:500,paidClaimFeeZat:130000,marketFeeBps:300,
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
  atomicLockSeconds:3600,atomicPayCutoffSeconds:900,atomicAnchorZat:10000,atomicMarkerZat:10000,atomicLockConfirmations:3,atomicFeeStepConfirmations:1,atomicFinalConfirmations:6,atomicFundedGraceSeconds:3600,atomicFinalityGraceSeconds:7200
};
const INDEX_CFG={
  url:'https://tvwvenyomlwvjtwxasca.supabase.co',
  key:'sb_publishable_LoJpIG8DU4ulRJtQOTY8QA_4AWXNeVN'
};
const S={provider:null,connection:null,pubkey:null,ownerCommitment:null,balance:null,genesisHeight:null,target:null,proof:null,workers:[],mining:false,hashes:0,startMs:0,relay:null,nostr:null,events:[],claims:new Map(),transfers:[],listings:new Map(),offers:[],nostrSk:null,nostrPk:null,currentOfferListing:null,relayHealth:new Map(),didRepair:false,walletRecovered:new Map(),walletRecoveredClaims:new Map(),atomicLocks:new Map(),atomicSettlements:new Map(),confirmedLocks:new Map(),verifiedAtomic:new Map(),atomicWatchBusy:false,atomicWatchTimer:null,portfolioSourceCache:new Map(),portfolioSourcePending:new Set(),relayFetchBusy:false,lastRelayFetch:0,liveDiscoverySub:null,liveDiscoveryEvents:new Map(),liveRenderTimer:null,historicalSettlementRecoveryBusy:false,evmProvider:null,evmSigner:null,evmAddress:null,usdcEvents:new Map(),usdcOnchain:new Map(),usdcVerifiedSettlements:new Map(),usdcReconciling:false,usdcScanBlock:0,walletHistoryBusy:false,serverUsdcMetrics:null,serverZecMetrics:null,serverUsdcScannedTo:0,serverUsdcSnapshotReady:false,serverIndexing:false,serverPortfolioLoaded:new Set(),serverPortfolioOwner:null,serverPortfolioTokens:new Map(),serverClaimCount:0,serverRelayIndexing:false,serverOwners:new Map(),serverIndexerHealth:{},serverMarketEvents:new Map()};
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
  const r=await fetch(`${INDEX_CFG.url}/rest/v1/rpc/${name}`,{method:'POST',headers:indexHeaders(),body:JSON.stringify(args)});
  if(!r.ok)throw new Error(`Index API ${name}: HTTP ${r.status}`);
  return r.json()
}
async function indexFunction(name,body={}){
  const r=await fetch(`${INDEX_CFG.url}/functions/v1/${name}`,{method:'POST',headers:indexHeaders(),body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j?.ok===false)throw new Error(j?.error||`Indexer ${name}: HTTP ${r.status}`);
  return j
}

async function hydrateServerZecMetrics(){
  try{
    const snap=await indexRpc('zecblocks_zec_market_metrics',{});
    if(snap&&typeof snap==='object')S.serverZecMetrics=snap;
    updateMarketMetrics();
    return snap
  }catch(e){
    console.warn('server ZEC market metrics',e);
    return null
  }
}
async function hydrateServerClaimStats(){
  let snap=null,lastErr=null;
  try{
    const r=await fetch(`${INDEX_CFG.url}/functions/v1/zecblocks-live-stats`,{
      method:'GET',headers:{'apikey':INDEX_CFG.key},cache:'no-store'
    });
    const j=await r.json().catch(()=>null);
    if(r.ok&&j?.ok)snap=j;else lastErr=new Error(j?.error||('Live stats HTTP '+r.status))
  }catch(e){lastErr=e}
  if(!snap){
    try{snap=await indexRpc('zecblocks_claim_stats',{})}
    catch(e){lastErr=e}
  }
  const n=Number(snap?.claims_seen||0);
  if(Number.isFinite(n)&&n>0)S.serverClaimCount=Math.max(Number(S.serverClaimCount||0),n);
  const local=Number(S.claims?.size||0);
  const shown=Number(S.serverClaimCount||0)>0?Number(S.serverClaimCount):local;
  if($('claimCount'))$('claimCount').textContent=shown.toLocaleString();
  if(!snap&&lastErr)console.warn('server claim stats',lastErr);
  return shown
}
async function kickServerRelayIndexer(){
  if(S.serverRelayIndexing)return;S.serverRelayIndexing=true;
  try{
    await indexFunction('zecblocks-ingest-relay',{}).catch(e=>console.warn('relay ingest',e));
    await indexFunction('zecblocks-verify-events',{}).catch(e=>console.warn('event verifier',e));
    indexFunction('zecblocks-index-zec-sales',{}).catch(e=>console.warn('zec settlement indexer',e));
    await hydrateServerClaimStats();
    if(S.ownerCommitment)await hydrateServerPortfolio(S.ownerCommitment)
  }catch(e){console.warn('server production index pipeline',e)}finally{S.serverRelayIndexing=false}
}
function dbCommitment(v){const x=String(v||'').replace(/^0x/,'').toLowerCase();return /^[0-9a-f]{64}$/.test(x)?x:''}
function dbBytes32(v){const x=dbCommitment(v);return x?'0x'+x:'0x'+'0'.repeat(64)}
function dbStatus(v){return v==='active'?1:v==='sold'?2:v==='cancelled'?3:v==='expired'?3:Number(v)||0}
async function hydrateServerUsdc(){
  try{
    const snap=await indexRpc('zecblocks_market_snapshot',{});
    const rows=Array.isArray(snap?.usdc_listings)?snap.usdc_listings:(Array.isArray(snap?.listings)?snap.listings:[]);
    const health=snap?.indexer_health||{};
    S.serverIndexerHealth=health;
    const baseCaughtUp=health?.base_usdc?.status==='ok'&&health?.base_usdc?.details?.caught_up===true;
    S.serverUsdcSnapshotReady=baseCaughtUp;
    S.serverUsdcScannedTo=Number(health?.base_usdc?.details?.scanned_to||health?.base_usdc?.details?.latest||0);
    // Once caught up, start from a clean server snapshot. Do not merge stale browser rows.
    const merged=baseCaughtUp?new Map():new Map(S.usdcOnchain),serverIds=new Set();
    S.serverOwners.clear();
    for(const x of rows){
      const id=String(x.listing_id||'').toLowerCase();if(!/^0x[0-9a-f]{64}$/.test(id))continue;
      serverIds.add(id);
      const owner=dbCommitment(x.indexed_owner_commitment);
      if(owner)S.serverOwners.set(Number(x.token_id),{owner,level:String(x.indexed_owner_verified_level||'provisional'),source:String(x.indexed_owner_source||'server')});
      const old=merged.get(id)||{};
      merged.set(id,{...old,
        listingId:id,tokenId:Number(x.token_id),seller:String(x.seller_evm||'').toLowerCase(),
        sellerCommitment:dbBytes32(x.seller_commitment),priceUSDC:String(x.price_usdc||0),
        expiresAt:Number(x.expires_at||0),listingNonce:String(x.listing_nonce||old.listingNonce||''),
        zb1ListingHash:String(x.zb1_listing_hash||old.zb1ListingHash||''),status:dbStatus(x.status),
        buyer:String(x.buyer_evm||old.buyer||'0x0000000000000000000000000000000000000000'),
        buyerCommitment:dbBytes32(x.buyer_commitment),settledAt:Number(x.settled_at||0),
        relay:old.relay||null,verifiedIntent:!!old.verifiedIntent,serverIntentVerified:!!x.intent_verified,
        serverOwnerCommitment:owner,serverOwnerVerifiedLevel:String(x.indexed_owner_verified_level||'provisional'),serverIndexed:true
      })
    }
    if(baseCaughtUp){
      // The snapshot already contains every canonical active listing plus sold rows.
      // Anything absent from it is intentionally hidden (stale owner, duplicate,
      // cancelled/expired, or otherwise non-canonical) and must not survive locally.
      S.usdcOnchain=merged;
    }else if(rows.length){
      S.usdcOnchain=merged;
    }
    S.serverUsdcMetrics=snap?.usdc_metrics||snap?.metrics||null;
    const claims=Number(snap?.claims_seen||0);if(Number.isFinite(claims))S.serverClaimCount=Math.max(S.serverClaimCount||0,claims);

    // Mirror persistent ZEC listing states into runtime events so sparse relay history
    // cannot resurrect cancelled/sold/expired listings after refresh.
    const zstates=Array.isArray(snap?.zec_listing_states)?snap.zec_listing_states:[];
    S.serverMarketEvents.clear();
    for(const x of zstates){
      const listingId=String(x.listing_id||'');if(!listingId)continue;
      const base={protocol:'ZB1',v:1,listingId,tokenId:Number(x.token_id),sellerCommitment:dbCommitment(x.seller_commitment),timestamp:Number(x.event_timestamp)||Math.floor(new Date(x.updated_at||Date.now()).getTime()/1000),source:'supabase-index-market'};
      if(x.status==='active'){
        const e=normalizeEvent({...base,type:'SALE',eventId:String(x.event_key||listingId),price:String(x.price_zec),expires:Number(x.expires_at),pubkey:String(x.pubkey||''),signature:String(x.signature||''),serverSignatureVerified:!!x.signature_verified});
        S.serverMarketEvents.set('sale:'+listingId,e)
      }else{
        const e=normalizeEvent({...base,type:'SALE_CANCEL',eventId:'server-state:'+x.status+':'+listingId,serverState:x.status});
        S.serverMarketEvents.set('cancel:'+listingId,e)
      }
    }
    S.events=S.events.filter(e=>e.source!=='supabase-index-market');
    for(const e of S.serverMarketEvents.values())S.events.push(e);
    saveUsdcCache();rebuildState();renderUsdcMarket();updateUsdcMarketMetrics();
    return rows.length
  }catch(e){S.serverUsdcSnapshotReady=false;console.warn('server market snapshot',e);return 0}
}
async function kickServerUsdcIndexer(){
  if(S.serverIndexing)return;S.serverIndexing=true;
  try{
    await indexFunction('zecblocks-index-usdc',{});
    await hydrateServerUsdc()
  }catch(e){console.warn('server Base indexer',e)}finally{S.serverIndexing=false}
}
async function hydrateServerPortfolio(owner=S.ownerCommitment){
  owner=dbCommitment(owner);if(!owner)return 0;
  try{
    const snap=await indexRpc('zecblocks_portfolio_snapshot',{p_owner_commitment:owner});
    const rows=Array.isArray(snap?.tokens)?snap.tokens:[],ids=new Set(rows.map(x=>Number(x.token_id)));
    // A successful server snapshot is the canonical portfolio checkpoint for
    // this connected owner. Keep it separate from wallet/relay recovery so a
    // later local-history refresh can never wipe or resurrect portfolio cards.
    S.serverPortfolioOwner=owner;
    S.serverPortfolioTokens.clear();
    for(const [id,e] of [...S.walletRecoveredClaims.entries()]){
      if(e?.source==='supabase-index'&&!ids.has(Number(id))){S.walletRecoveredClaims.delete(id);if(e.eventId)S.walletRecovered.delete(e.eventId)}
    }
    for(const x of rows){
      const id=Number(x.token_id);if(!Number.isInteger(id)||id<1||id>CFG.supply)continue;
      const e=normalizeEvent({protocol:'ZB1',v:1,type:'CLAIM',eventId:x.owner_event_id||x.last_event_id||x.claim_txid||`server:${id}:${owner}`,txid:x.claim_txid||'',tokenId:id,
        ownerCommitment:owner,sourceHeight:Number(x.source_height)||null,sourceHash:String(x.source_hash||''),
        blockHeight:Number(x.owner_block_height||x.last_zcash_height)||null,txIndex:Number(x.owner_tx_index)||null,
        timestamp:Number(x.owner_event_timestamp)||Math.floor(new Date(x.updated_at||Date.now()).getTime()/1000),source:'supabase-index',
        serverLastEventType:String(x.owner_source||x.last_event_type||'claim'),serverVerifiedLevel:String(x.owner_verified_level||'provisional')});
      const k=eventKey(e)||e.eventId;
      S.serverPortfolioTokens.set(id,e);
      S.walletRecovered.set(k,e);S.walletRecoveredClaims.set(id,e)
    }
    S.serverPortfolioLoaded.add(owner);rebuildState();renderPortfolio();updateWalletUI();
    return rows.length
  }catch(e){console.warn('server portfolio snapshot',e);return 0}
}
async function pushClaimsToServerIndex(){
  const claims=[...S.walletRecoveredClaims.values()].filter(e=>e?.type==='CLAIM'&&e.tokenId&&e.nonce&&e.pubkey&&e.signature&&e.txid);
  if(!claims.length)return;
  const minimal=claims.map(e=>({tokenId:Number(e.tokenId),nonce:String(e.nonce),pubkey:String(e.pubkey),signature:String(e.signature),txid:String(e.txid)}));
  for(let i=0;i<minimal.length;i+=20){try{await indexFunction('zecblocks-cache-claims',{claims:minimal.slice(i,i+20)})}catch(e){console.warn('claim server cache',e);break}}
}
function localEvents(){try{return JSON.parse(localStorage.getItem('zb1_events_v1')||'[]')}catch{return[]}}
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
    localStorage.setItem('zb1_payment_recovery_v1',JSON.stringify(a.slice(-2000)))
  }catch(err){console.warn('payment recovery journal',err)}
}
function saveVerifiedSettlementJournal(e){
  try{
    const a=verifiedSettlementJournal(),k=e.lockId||eventKey(e);
    const i=a.findIndex(x=>(x.lockId||eventKey(x))===k);
    if(i>=0)a[i]=mergeEvent(a[i],e);else a.push(e);
    localStorage.setItem('zb1_verified_settlements_v1',JSON.stringify(a.slice(-1000)))
  }catch(err){console.warn('verified settlement journal',err)}
}
function saveDiscoveryCache(events){
  try{
    const a=[...events]
      .sort((x,y)=>(Number(x.timestamp)||0)-(Number(y.timestamp)||0))
      .slice(-12000);
    localStorage.setItem('zb1_public_discovery_v2',JSON.stringify(a));
    try{sessionStorage.setItem('zb1_public_discovery_v1',JSON.stringify(a.slice(-8000)))}catch{}
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
  try{localStorage.setItem(key,JSON.stringify([...S.walletRecovered.values()].slice(-5000)))}catch(e){console.warn('wallet cache save',e)}
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
  const a=localEvents(),k=eventKey(e);
  const i=k?a.findIndex(x=>eventKey(x)===k):-1;
  if(i>=0)a[i]=mergeEvent(a[i],e); else a.push(e);
  localStorage.setItem('zb1_events_v1',JSON.stringify(a.slice(-10000)));
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
function setNostrSecretHex(h){localStorage.setItem('zb1_nostr_sk',h)}
function provider(){const w=window.noirwallet;return w&&w.isNoirWallet&&w.zcash?w.zcash:null}
async function rpc(method,params){const p=provider();if(!p)throw new Error('Noir Wallet is not installed. Install the official mainnet extension first.');return p.request({method,...(params?{params}: {})})}
async function connectWallet(silent=false){
  try{
    const p=provider(); if(!p){if(!silent){toast('Noir Wallet not detected. Opening the official setup guide.');window.open('https://docs.zknoir.com/get-started/','_blank','noopener')}return}
    const c=await rpc(silent?'zcash_getAccounts':'zcash_requestAccounts'); if(!c)return;
    S.provider=p;S.connection=c;
    const k=await rpc('zcash_getPublicKey',[{signingMode:'derived'}]); if(!k?.pubkey)throw new Error('Noir Wallet did not return a derived public key.');
    S.pubkey=k.pubkey;S.ownerCommitment=await sha256HexBytes(hexToBytes(k.pubkey));
    const cachedClaims=hydrateWalletCache();
    await hydrateServerPortfolio(S.ownerCommitment);
    try{S.balance=await rpc('zcash_getBalance')}catch{}
    rebuildState();updateWalletUI();renderPortfolio();
    if(silent){
      loadWalletHistory().then(async()=>{try{await fetchRelay();rebuildState();renderPortfolio();updateWalletUI()}catch(e){console.warn('wallet background recovery',e)}}).catch(()=>{});
    }else{
      await loadWalletHistory(); await refreshAll();
    }
    p.on?.('accountsChanged',()=>connectWallet(true).catch(()=>{}));
  }catch(e){if(!silent)toast(e.message||String(e),7000)}
}
function updateWalletUI(){
  const connected=!!S.connection;
  $('walletBtn').textContent=connected?short(S.ownerCommitment,6):'Connect Noir Wallet';
  $('ownerCommit').textContent=connected?short(S.ownerCommitment,12):'Connect wallet';
  $('portfolioCommit').textContent=connected?S.ownerCommitment:'Connect wallet to reveal your commitment.';
  $('portfolioShielded').textContent=connected?(S.connection.shielded||'—'):'Private until you connect.';
  $('zecBalance').textContent=S.balance?.available!=null?String(S.balance.available)+' ZEC':'—';
  $('loadTargetBtn').disabled=!connected;$('startMineBtn').disabled=!connected||S.mining;$('syncPortfolioBtn').disabled=!connected;$('createListingBtn').disabled=!connected||ownedTokens().length===0;
  updateEvmUI();
}
$('walletBtn').onclick=()=>connectWallet(false);
async function loadWalletHistory(){
  if(!S.connection)return {recovered:0,seen:0,claims:[]};
  if(S.walletHistoryBusy)return {recovered:0,seen:0,claims:[...S.walletRecoveredClaims.keys()]};
  S.walletHistoryBusy=true;
  let recovered=0,seen=0;
  const recoveredClaimIds=[...S.walletRecoveredClaims.keys()];
  const statusEl=$('portfolioRecoveryStatus');
  if(statusEl)statusEl.textContent='Reading Noir Wallet transaction history and rebuilding ZB-1 claims…';
  try{
    const hist=await rpc('zcash_getTransactionHistory');
    for(const h of (hist||[])){
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
    const txid=await rpc('zcash_sendTransaction',[{to:CFG.mailbox,amount:'0.00000001',memo,fundingSource:'shielded'}]);
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
  $('claimCount').textContent=(Number(S.serverClaimCount||0)>0?Number(S.serverClaimCount):claims.size).toLocaleString();
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
function activeAtomicLockForToken(id){return tokenState(id).lock}
function tokenIsAtomicLocked(id){return !!activeAtomicLockForToken(id)}

function ownedTokens(){
  if(!S.ownerCommitment)return[];
  const mine=String(S.ownerCommitment).toLowerCase();

  // Once the canonical portfolio RPC has loaded for this wallet, render exactly
  // that ownership set. Local wallet history and relay discovery remain recovery
  // inputs, but they may not override a successful canonical server snapshot.
  if(S.serverPortfolioOwner===mine&&S.serverPortfolioLoaded.has(mine)){
    const out=[];
    for(const [id,checkpoint] of S.serverPortfolioTokens.entries()){
      const cached=S.portfolioSourceCache.get(Number(id));
      out.push({
        ...checkpoint,
        tokenId:Number(id),
        sourceHeight:checkpoint?.sourceHeight||cached?.sourceHeight||(S.genesisHeight?S.genesisHeight-Number(id):null),
        sourceHash:checkpoint?.sourceHash||cached?.sourceHash||'',
        txid:checkpoint?.txid||'',
        acquiredViaSale:String(checkpoint?.serverLastEventType||'').toLowerCase()!=='claim'
      })
    }
    return out.sort((a,b)=>a.tokenId-b.tokenId)
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
      ...base,
      tokenId:id,
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
function activeListings(){
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
  const now=Math.floor(Date.now()/1000),byToken=new Map();
  for(const x of S.listings.values()){
    if((x.expires||0)<=now||tokenIsAtomicLocked(x.tokenId))continue;
    // Do not remove a published listing merely because ownership discovery is
    // behind or temporarily contradictory. renderMarket() disables the action
    // until currentOwner() resolves to the listing seller.
    const old=byToken.get(Number(x.tokenId));
    if(!old||(x.timestamp||0)>(old.timestamp||0))byToken.set(Number(x.tokenId),x)
  }
  return [...byToken.values()]
}
function validPrice(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:0}
function settledSales(){
  return [...S.verifiedAtomic.values()]
    .filter(e=>(e.type==='ATOMIC_SETTLED'||e.type==='NOIR_SETTLED')&&Number.isInteger(Number(e.tokenId))&&Number(e.tokenId)>=1&&Number(e.tokenId)<=CFG.supply&&validPrice(e.price))
    .sort((a,b)=>(b.blockTime||b.timestamp||0)-(a.blockTime||a.timestamp||0))
}
function updateMarketMetrics(){
  const active=activeListings(),visible=visibleMarketListings(),sales=settledSales();
  const floor=active.length?Math.min(...active.map(x=>validPrice(x.price)).filter(Boolean)):0;
  let volume=sales.reduce((sum,x)=>sum+validPrice(x.price),0);
  let salesN=sales.length;
  if(S.serverZecMetrics){
    const sv=Number(S.serverZecMetrics.volume_base_units||0)/1e8;
    const sn=Number(S.serverZecMetrics.sales||0);
    if(Number.isFinite(sv))volume=sv;
    if(Number.isFinite(sn))salesN=sn;
  }
  $('floorPrice').textContent=floor?`${floor.toLocaleString(undefined,{maximumFractionDigits:8})} ZEC`:'—';
  $('totalVolume').textContent=`${volume.toLocaleString(undefined,{maximumFractionDigits:8})} ZEC`;
  $('salesCount').textContent=salesN.toLocaleString();
  $('listedCount').textContent=visible.length.toLocaleString();
}
function updateUsdcMarketMetrics(){
  const now=Math.floor(Date.now()/1000);
  const active=[...S.usdcOnchain.values()].filter(x=>Number(x.status)===1&&Number(x.expiresAt)>now&&(!S.serverUsdcSnapshotReady||x.serverIndexed===true));
  const sales=[...S.usdcOnchain.values()].filter(x=>Number(x.status)===2&&Number(x.settledAt)>0);
  let floor=active.length?active.reduce((min,x)=>{const p=Number(x.priceUSDC||0)/1e6;return !min||p<min?p:min},0):0;
  let volume=sales.reduce((sum,x)=>sum+(Number(x.priceUSDC||0)/1e6),0),salesN=sales.length,listedN=active.length;
  if(S.serverUsdcMetrics){
    const sf=Number(S.serverUsdcMetrics.floor_base_units||0)/1e6,sv=Number(S.serverUsdcMetrics.volume_base_units||0)/1e6;
    const authoritative=S.serverIndexerHealth?.base_usdc?.status==='ok'&&S.serverIndexerHealth?.base_usdc?.details?.caught_up===true;
    if(authoritative){floor=sf;volume=Number.isFinite(sv)?sv:0;salesN=Number(S.serverUsdcMetrics.sales)||0;listedN=Number(S.serverUsdcMetrics.listed)||0}
    else{if(sf>0)floor=sf;if(Number.isFinite(sv))volume=Math.max(volume,sv);salesN=Math.max(salesN,Number(S.serverUsdcMetrics.sales)||0);listedN=Math.max(listedN,Number(S.serverUsdcMetrics.listed)||0)}
  }
  $('usdcFloorPrice').textContent=floor?`${floor.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6})} USDC`:'—';
  $('usdcTotalVolume').textContent=`${volume.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6})} USDC`;
  $('usdcSalesCount').textContent=salesN.toLocaleString();
  $('usdcListedCount').textContent=listedN.toLocaleString();
}
function activityKind(e){
  if(e.type==='ATOMIC_SETTLED'||e.type==='NOIR_SETTLED')return 'sale';
  if(e.type==='SALE')return 'list';
  if(e.type==='OFFER')return 'offer';
  if(e.type==='SALE_CANCEL')return 'cancel';
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
function renderActivity(){
  updateMarketMetrics();
  const filter=$('activityFilter')?.value||'all';
  const activityMap=new Map();
  for(const e of [...S.events,...S.verifiedAtomic.values()]){
    const k=eventKey(e)||`${e.type}:${e.lockId||''}:${e.tokenId||''}:${e.timestamp||0}`;
    activityMap.set(k,mergeEvent(activityMap.get(k),e))
  }
  const events=[...activityMap.values()]
    .map(e=>({e,kind:activityKind(e)}))
    .filter(x=>x.kind&&(filter==='all'||x.kind===filter))
    .sort((a,b)=>(b.e.timestamp||0)-(a.e.timestamp||0))
    .slice(0,30);
  const body=$('activityBody'); if(!body)return;
  body.innerHTML='';
  if(!events.length){
    body.innerHTML='<tr><td colspan="7" style="padding:34px;text-align:center;color:#666">No matching marketplace activity yet.</td></tr>';
    return;
  }
  for(const {e,kind} of events){
    const tr=document.createElement('tr');
    const from=activityFrom(e,kind),to=activityTo(e,kind),price=activityPrice(e,kind);
    const tx=e.sellerPaymentTxid||e.paymentTxid||e.txid||e.transferTxid||'';
    tr.innerHTML=`<td><span class="eventBadge ${kind}">${activityLabel(kind)}</span></td>
      <td class="item">ZEC BLOCK #${esc(e.tokenId||'—')}</td>
      <td class="${price?'activityPrice':''}">${price?`${esc(String(e.price))} ZEC`:'—'}</td>
      <td>${from?esc(short(from,7)):'—'}</td>
      <td>${to?esc(short(to,7)):'—'}</td>
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
  'function name() view returns(string)'
];
function usdcConfigured(){
  return !!window.ethers && /^0x[0-9a-fA-F]{40}$/.test(String(CFG.usdcMarketContract||''))
}
function usdcFmt(v){
  try{return Number(ethers.formatUnits(BigInt(v),6)).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6})}
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
  if(!window.ethers)throw new Error('EVM library did not load.');
  return new ethers.JsonRpcProvider(CFG.baseRpc,CFG.baseChainId,{staticNetwork:true})
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
async function connectEvmWallet(silent=false){
  try{
    if(!window.ethereum){
      if(!silent)toast('MetaMask/Rabby-compatible EVM wallet not detected.',7000);
      return false
    }
    await ensureBaseNetwork();
    const bp=new ethers.BrowserProvider(window.ethereum,'any');
    const accounts=await bp.send(silent?'eth_accounts':'eth_requestAccounts',[]);
    if(!accounts?.length)return false;
    S.evmProvider=bp;
    S.evmSigner=await bp.getSigner();
    S.evmAddress=ethers.getAddress(await S.evmSigner.getAddress());
    updateEvmUI();
    window.ethereum.on?.('accountsChanged',()=>connectEvmWallet(true).catch(()=>{}));
    window.ethereum.on?.('chainChanged',()=>connectEvmWallet(true).catch(()=>{}));
    return true
  }catch(e){
    if(!silent)toast(e?.shortMessage||e?.message||String(e),8000);
    updateEvmUI();
    return false
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
function activeUsdcListingForToken(id){
  const now=Math.floor(Date.now()/1000);
  return [...S.usdcOnchain.values()].find(x=>
    Number(x.tokenId)===Number(id)&&Number(x.status)===1&&Number(x.expiresAt)>now
    &&(!S.serverUsdcSnapshotReady||x.serverIndexed===true)
  )||null
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
  // Never hydrate marketplace cards from browser storage.
  // The production index + verified Base state are authoritative across every browser.
  const c=usdcCacheRead();
  S.usdcScanBlock=Number(c.lastBlock)||0;
  return 0
}
function saveUsdcCache(lastBlock=S.usdcScanBlock){
  try{
    // Keep only the scan cursor. Persisting listing rows can resurrect stale cards
    // after ownership changes, sales, cancels, or canonical index corrections.
    localStorage.setItem('zb1_usdc_market_v3',JSON.stringify({v:4,lastBlock:Number(lastBlock)||0,at:Date.now()}))
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
async function mapLimit(items,limit,fn){
  const out=new Array(items.length);let n=0;
  async function worker(){while(true){const i=n++;if(i>=items.length)return;try{out[i]=await fn(items[i],i)}catch(e){out[i]=null}}}
  await Promise.all(Array.from({length:Math.min(limit,items.length||1)},worker));return out
}
async function reconcileUsdcMarket(){
  if(S.usdcReconciling||!usdcConfigured())return;
  S.usdcReconciling=true;
  try{
    // Fail closed for browsing until the canonical server snapshot is caught up.
    // Raw Base contract listings are payment intents only; they are NOT sufficient
    // to prove current ZB-1 ownership.
    if(!S.serverUsdcSnapshotReady)await hydrateServerUsdc();
    renderUsdcMarket();
    const serverAuthoritative=S.serverUsdcSnapshotReady
      &&S.serverIndexerHealth?.base_usdc?.status==='ok'
      &&S.serverIndexerHealth?.base_usdc?.details?.caught_up===true;
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
      return row
    })).filter(Boolean);
    if(rows.length){const merged=new Map(S.usdcOnchain);for(const x of rows)merged.set(String(x.listingId).toLowerCase(),x);S.usdcOnchain=merged}
    saveUsdcCache(discovered.lastBlock);

    // Rebuild ZB-1 ownership transitions only when the seller's Zcash ownership is known.
    S.usdcVerifiedSettlements.clear();
    const sold=[...S.usdcOnchain.values()].filter(x=>x.status===2&&x.settledAt>0).sort((a,b)=>a.settledAt-b.settledAt);
    for(const x of sold){
      const expectedSeller=String(x.sellerCommitment).slice(2).toLowerCase();
      const before=currentOwner(x.tokenId);
      if(!before||before!==expectedSeller)continue;
      const buyerCommit=String(x.buyerCommitment).slice(2).toLowerCase();
      if(!/^[0-9a-f]{64}$/.test(buyerCommit)||/^0+$/.test(buyerCommit))continue;
      S.usdcVerifiedSettlements.set(String(x.listingId).toLowerCase(),{protocol:'ZB1',v:1,type:'USDC_SETTLED',listingId:x.listingId,tokenId:x.tokenId,sellerCommitment:expectedSeller,buyerCommitment:buyerCommit,sellerEvm:x.seller,buyerEvm:x.buyer,price:usdcFmt(x.priceUSDC),priceUSDC:String(x.priceUSDC),timestamp:x.settledAt,settledAt:x.settledAt,paymentChain:'Base',paymentToken:'USDC',source:'base-contract'})
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
  g.innerHTML='';
  if(!usdcConfigured()){
    g.innerHTML='<div class="empty" style="grid-column:1/-1">USDC Buy Now code is installed, but the production Base contract address has not been inserted yet. The ZEC marketplace remains fully available above.</div>';
    return
  }
  const now=Math.floor(Date.now()/1000);
  if(!S.serverUsdcSnapshotReady){
    g.innerHTML='<div class="empty" style="grid-column:1/-1">Canonical marketplace ownership is syncing… listings are hidden until verification completes.</div>';
    return
  }
  // Canonical market rule: only rows emitted by the caught-up server snapshot
  // may render as purchasable cards. An active Base contract listing whose
  // seller is no longer the canonical ZB-1 owner stays hidden.
  const rows=[...S.usdcOnchain.values()]
    .filter(x=>x.status===1&&x.expiresAt>now&&x.serverIndexed===true)
    .sort((a,b)=>{const ap=BigInt(a.priceUSDC||0),bp=BigInt(b.priceUSDC||0);if(ap<bp)return -1;if(ap>bp)return 1;return Number(b.relay?.timestamp||0)-Number(a.relay?.timestamp||0)});
  if(!rows.length){
    g.innerHTML='<div class="empty" style="grid-column:1/-1">No canonical active Base USDC listings in the production index.</div>';
    return
  }
  for(const l of rows){
    const c=S.claims.get(Number(l.tokenId));
    const card=document.createElement('article');card.className='nft';
    card.innerHTML=`<div class="nftart"><svg class="blockArt" viewBox="0 0 600 600"></svg></div>
      <div class="nftinfo">
        <div class="nftline"><span class="nfttitle">ZEC BLOCK #${esc(l.tokenId)}</span><span class="usdcPrice">${esc(usdcFmt(l.priceUSDC))} USDC</span></div>
        <div class="meta"><span>Base seller ${esc(short(l.seller,6))}</span><span>${new Date(l.expiresAt*1000).toLocaleDateString()}</span></div>
        <div class="usdcCardTag"><span class="railBadge usdc">BASE BUY NOW</span><span class="usdcStatus">97% seller · 3% protocol</span></div>
        <div class="controls"><button class="btn usdc usdcAction">Buy Now · USDC</button></div>
      </div>`;
    artSvg(card.querySelector('svg'),(c?.sourceHash||CFG.genesisTxid)+':'+(c?.sourceHeight||l.tokenId),'ZB #'+l.tokenId);
    const b=card.querySelector('.usdcAction');
    if(S.evmAddress&&String(S.evmAddress).toLowerCase()===String(l.seller).toLowerCase()){
      b.textContent='Cancel USDC Listing';b.className='btn red usdcAction';b.onclick=()=>cancelUsdcListing(l)
    }else{
      const owner=effectiveOwner(l.tokenId),sellerCommit=String(l.sellerCommitment).slice(2).toLowerCase();
      const signedOk=!!l.verifiedIntent||!!l.serverIntentVerified;
      if(!owner){b.textContent='Ownership syncing…';b.disabled=true}
      else if(owner!==sellerCommit){b.textContent='Listing no longer valid';b.disabled=true}
      else if(!signedOk){b.textContent='Signature syncing…';b.disabled=true}
      else{b.textContent=S.evmAddress?'Buy Now · USDC':'Connect Base Wallet to Buy · USDC';b.onclick=()=>buyUsdcListing(l)}
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
$('refreshUsdcBtn').onclick=async()=>{try{await fetchRelay();rebuildState();await reconcileUsdcMarket();rebuildState()}catch(e){toast(e.message||String(e),8000)}};
async function publishUsdcListing(){
  try{
    if(!usdcConfigured())throw new Error('Production USDC settlement contract is not configured.');
    if(!S.ownerCommitment)throw new Error('Connect Noir Wallet first.');
    if(!S.evmAddress)throw new Error('Connect Base wallet first.');
    await ensureBaseNetwork();

    const tokenId=Number($('usdcListingToken').value);
    const days=Number($('usdcListingDays').value);
    const priceUSDC=usdcUnits($('usdcListingPrice').value);
    if(!ownedTokens().some(x=>Number(x.tokenId)===tokenId))throw new Error('This Noir identity is not the current owner.');
    if(activeListingForToken(tokenId))throw new Error('This NFT already has an active ZEC listing. Cancel it first.');
    if(activeUsdcListingForToken(tokenId))throw new Error('This NFT already has an active USDC listing.');
    if(tokenIsAtomicLocked(tokenId))throw new Error('This NFT is currently locked in a ZEC checkout.');
    if(!Number.isInteger(days)||days<1||days>30)throw new Error('Expiry must be 1–30 days.');

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
    // Discovery can be published before the EVM tx. Official clients still
    // require the onchain listing to exist, so an abandoned relay intent is harmless.
    await publishRelay(relayEvent,{quiet:true});

    const tx=await contract.createListing(tokenId,sellerCommitment,priceUSDC,expires,listingNonce,listingHash);
    toast('Base listing submitted · waiting for confirmation…',7000);
    const receipt=await tx.wait();
    relayEvent.baseTxid=receipt.hash;relayEvent.status='active';
    relayEvent.timestamp=Math.floor(Date.now()/1000);
    rememberRuntimeEvent(relayEvent);
    await publishRelay(relayEvent,{quiet:true});
    modal('usdcListingModal',false);
    toast(`USDC listing live · ${usdcFmt(priceUSDC)} USDC`,8000);
    kickServerUsdcIndexer().catch(()=>{});
    await reconcileUsdcMarket()
  }catch(e){toast(e?.shortMessage||e?.reason||e?.message||String(e),9000)}
}
$('publishUsdcListingBtn').onclick=publishUsdcListing;
async function cancelUsdcListing(l){
  try{
    if(!S.evmAddress)await connectEvmWallet(false);
    if(String(S.evmAddress||'').toLowerCase()!==String(l.seller).toLowerCase())throw new Error('Only the Base seller wallet can cancel this listing.');
    const c=new ethers.Contract(CFG.usdcMarketContract,USDC_MARKET_ABI,S.evmSigner);
    const tx=await c.cancelListing(l.listingId);
    toast('Cancel submitted on Base…',6000);
    await tx.wait();
    toast('USDC listing cancelled.',7000);
    kickServerUsdcIndexer().catch(()=>{});
    await reconcileUsdcMarket()
  }catch(e){toast(e?.shortMessage||e?.reason||e?.message||String(e),9000)}
}
async function buyUsdcListing(l){
  let guard=null,guardBroadcast=false,settlementReceipt=null,fresh=null;
  const guardCall=(action,extra={})=>indexFunction('zecblocks-usdc-buy-preflight',{
    action,tokenId:Number(fresh?.tokenId||l?.tokenId),guardToken:guard?.guard_token,...extra
  });
  try{
    if(!usdcConfigured())throw new Error('USDC market contract is not configured.');
    if(!S.ownerCommitment)throw new Error('Connect Noir Wallet first so the purchase can resolve to your ZB-1 identity.');
    if(!S.evmAddress){
      const ok=await connectEvmWallet(false);if(!ok)return
    }
    await ensureBaseNetwork();
    await reconcileUsdcMarket();
    fresh=S.usdcOnchain.get(String(l.listingId).toLowerCase());
    if(!fresh||fresh.status!==1||fresh.expiresAt<=Math.floor(Date.now()/1000))throw new Error('This USDC listing is no longer active.');
    const sellerCommit=String(fresh.sellerCommitment).slice(2).toLowerCase();
    if(effectiveOwner(fresh.tokenId)!==sellerCommit)throw new Error('Seller is no longer the indexed ZB-1 owner. Purchase blocked.');
    if(activeListingForToken(fresh.tokenId)||tokenIsAtomicLocked(fresh.tokenId))throw new Error('A ZEC listing/checkout is active for this NFT. Purchase blocked to prevent cross-rail double sale.');

    // Fail-closed server preflight. This forces the Base indexer to the current
    // chain tip, re-checks canonical ZB-1 ownership, and atomically reserves
    // this token so two official buyers cannot race different stale listings.
    toast('Verifying canonical ownership before payment…',5000);
    const pre=await indexFunction('zecblocks-usdc-buy-preflight',{
      action:'acquire',
      listingId:String(fresh.listingId).toLowerCase(),
      tokenId:Number(fresh.tokenId),
      sellerCommitment:sellerCommit,
      buyerCommitment:S.ownerCommitment
    });
    guard=pre?.guard||null;
    if(!guard?.guard_token)throw new Error('Canonical purchase guard was not issued. Purchase blocked.');
    if(String(guard.listing_id||'').toLowerCase()!==String(fresh.listingId).toLowerCase()
      ||Number(guard.token_id)!==Number(fresh.tokenId)
      ||String(guard.seller_commitment||'').toLowerCase()!==sellerCommit
      ||String(guard.price_usdc||'')!==String(fresh.priceUSDC)){
      throw new Error('Canonical listing changed during preflight. Refresh and try again.')
    }

    const market=new ethers.Contract(CFG.usdcMarketContract,USDC_MARKET_ABI,S.evmSigner);
    const usdc=new ethers.Contract(CFG.baseUsdc,BASE_USDC_ABI,S.evmSigner);
    const amount=BigInt(fresh.priceUSDC);
    const owner=S.evmAddress;
    const buyerCommit='0x'+S.ownerCommitment;

    // Preferred UX: EIP-2612 typed-data permit -> one onchain Buy Now tx.
    // Only the permit signature itself may fall back. Canonical validation
    // errors must never fall through to an allowance-based purchase.
    let permitSig=null,permitDeadline=null;
    try{
      const nonce=await usdc.nonces(owner);
      const name=await usdc.name();
      permitDeadline=BigInt(Math.floor(Date.now()/1000)+20*60);
      const domain={name,version:'2',chainId:CFG.baseChainId,verifyingContract:CFG.baseUsdc};
      const types={Permit:[
        {name:'owner',type:'address'},{name:'spender',type:'address'},
        {name:'value',type:'uint256'},{name:'nonce',type:'uint256'},{name:'deadline',type:'uint256'}
      ]};
      const value={owner,spender:CFG.usdcMarketContract,value:amount,nonce,deadline:permitDeadline};
      const signature=await S.evmSigner.signTypedData(domain,types,value);
      permitSig=ethers.Signature.from(signature)
    }catch(permitErr){
      console.warn('USDC permit signature unavailable, falling back to allowance',permitErr)
    }

    if(permitSig){
      // Revalidate AFTER the wallet approval, immediately before payment.
      await guardCall('validate');
      const tx=await market.buyNowWithPermit(fresh.listingId,buyerCommit,permitDeadline,permitSig.v,permitSig.r,permitSig.s);
      guardBroadcast=true;
      await guardCall('broadcast',{txHash:tx.hash}).catch(e=>console.warn('USDC guard broadcast mark',e));
      toast('USDC Buy Now submitted · waiting for Base confirmation…',7000);
      settlementReceipt=await tx.wait()
    }else{
      const allowance=await usdc.allowance(owner,CFG.usdcMarketContract);
      if(allowance<amount){
        const approveTx=await usdc.approve(CFG.usdcMarketContract,amount);
        toast('Approve USDC first · waiting for confirmation…',7000);
        await approveTx.wait()
      }
      // Approval can take time, so force a second canonical tip-sync here.
      await guardCall('validate');
      const tx=await market.buyNow(fresh.listingId,buyerCommit);
      guardBroadcast=true;
      await guardCall('broadcast',{txHash:tx.hash}).catch(e=>console.warn('USDC guard broadcast mark',e));
      toast('USDC Buy Now submitted · waiting for Base confirmation…',7000);
      settlementReceipt=await tx.wait()
    }

    // Instant sold-state UX: hide the card immediately after Base confirms,
    // then ask the server indexer to verify this exact receipt instead of waiting for cron.
    const soldId=String(fresh.listingId).toLowerCase();
    S.usdcOnchain.set(soldId,{...fresh,status:2,buyer:S.evmAddress,buyerCommitment:buyerCommit,settledAt:Math.floor(Date.now()/1000)});
    renderUsdcMarket();
    try{
      if(settlementReceipt?.hash){
        await indexFunction('zecblocks-index-usdc',{tx_hash:settlementReceipt.hash});
        await hydrateServerUsdc()
      }
    }catch(indexErr){
      console.warn('instant Base sale indexing',indexErr);
      kickServerUsdcIndexer().catch(()=>{})
    }

    const settledEvent=normalizeEvent({
      protocol:'ZB1',v:1,type:'SALE_USDC_SETTLED',
      eventId:'usdc-settled:'+String(fresh.listingId).toLowerCase(),
      listingId:String(fresh.listingId).toLowerCase(),tokenId:fresh.tokenId,
      sellerCommitment:sellerCommit,buyerCommitment:S.ownerCommitment,
      price:usdcFmt(amount),priceUSDC:String(amount),
      paymentChain:'Base',paymentToken:CFG.baseUsdc,
      timestamp:Math.floor(Date.now()/1000)
    });
    rememberRuntimeEvent(settledEvent);
    await publishRelay(settledEvent,{quiet:true});
    kickServerUsdcIndexer().catch(()=>{});
    await reconcileUsdcMarket();
    rebuildState();renderPortfolio();renderUsdcMarket();
    if(guard)await guardCall('release').catch(()=>{});
    guard=null;
    toast(`Purchase complete · ZEC BLOCK #${fresh.tokenId} · ${usdcFmt(amount)} USDC`,9000)
  }catch(e){
    // If no Base buy tx was broadcast, release immediately. If a tx was
    // broadcast but confirmation became uncertain, keep the server guard
    // until its TTL so a second buyer cannot race the pending transaction.
    if(guard&&!guardBroadcast)await guardCall('release').catch(()=>{});
    toast(e?.shortMessage||e?.reason||e?.message||String(e),10000)
  }
}

function renderMarket(){
  const q=$('marketSearch').value.trim().toLowerCase(),sort=$('marketSort').value;let a=visibleMarketListings().filter(x=>!q||String(x.tokenId).includes(q)||String(x.sellerCommitment).toLowerCase().includes(q));
  if(sort==='priceLow')a.sort((x,y)=>Number(x.price)-Number(y.price));else if(sort==='priceHigh')a.sort((x,y)=>Number(y.price)-Number(x.price));else a.sort((x,y)=>(y.timestamp||0)-(x.timestamp||0));
  const g=$('marketGrid');g.innerHTML='';if(!a.length){g.innerHTML='<div class="empty" style="grid-column:1/-1">No active listings found yet. Connect a wallet and list an owned ZEC BLOCK to open the order board.</div>';return}
  for(const l of a){const c=S.claims.get(Number(l.tokenId));const artHash=c?.sourceHash||CFG.genesisTxid;const card=document.createElement('article');card.className='nft';card.innerHTML=`<div class="nftart"><svg class="blockArt" viewBox="0 0 600 600"></svg></div><div class="nftinfo"><div class="nftline"><span class="nfttitle">ZEC BLOCK #${esc(l.tokenId)}</span><span class="price">${esc(l.price)} ZEC</span></div><div class="meta"><span>Seller ${esc(short(l.sellerCommitment,6))}</span><span>${new Date((l.expires||0)*1000).toLocaleDateString()}</span></div><div class="controls"><button class="btn offerBtn" style="min-height:32px">Make Offer</button></div></div>`;artSvg(card.querySelector('svg'),artHash+':'+(c?.sourceHeight||l.tokenId),'ZB #'+l.tokenId);const action=card.querySelector('.offerBtn');
    const resolvedOwner=currentOwner(l.tokenId);
    if(tokenIsAtomicLocked(l.tokenId)){action.textContent='ATOMIC LOCKED';action.disabled=true}
    else if(!resolvedOwner){
      action.textContent='OWNER SYNCING';action.disabled=true;
      action.title='Listing is visible, but ZB-1 ownership is still syncing. Offers stay disabled until verified.'
    }else if(resolvedOwner!==l.sellerCommitment){
      action.textContent='OWNER VERIFYING';action.disabled=true;
      action.title='The listing stays visible while ownership discovery catches up. It cannot be traded unless the seller resolves as current owner.'
    }else if(S.ownerCommitment&&l.sellerCommitment===S.ownerCommitment){
      action.textContent='Cancel Listing';action.onclick=()=>cancelListing(l);
    }else{action.textContent='Request Purchase';action.onclick=()=>openOffer(l)}
    g.appendChild(card)}
}
$('marketSearch').oninput=renderMarket;$('marketSort').onchange=renderMarket;$('refreshMarketBtn').onclick=()=>refreshAll().catch(e=>toast(e.message));
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
    const tokenId=Number($('listingToken').value),price=$('listingPrice').value.trim(),days=Number($('listingDays').value);
    if(!ownedTokens().some(x=>x.tokenId===tokenId))throw new Error('Token is not owned by this commitment.');
    if(tokenIsAtomicLocked(tokenId))throw new Error('This token is currently atomic-locked.');

    const existing=latestPublishedListingForToken(tokenId,S.ownerCommitment);
    if(existing){
      throw new Error(`ZEC BLOCK #${tokenId} is already listed at ${existing.price} ZEC. Cancel the current listing before creating a new one.`);
    }

    if(!decimalValid(price))throw new Error('Enter a valid ZEC price.');
    if(!Number.isInteger(days)||days<1||days>30)throw new Error('Expiry must be 1–30 days.');

    const nonce=crypto.randomUUID(),expires=Math.floor(Date.now()/1000)+days*86400;
    const msg=`ZB1:SALE:v1|G=${CFG.genesisTxid}|T=${tokenId}|P=${price}|E=${expires}|X=${nonce}|O=${S.ownerCommitment}`;
    const sig=await signDerived(msg);
    const e=normalizeEvent({
      protocol:'ZB1',v:1,type:'SALE',eventId:'sale:'+nonce,listingId:'sale:'+nonce,
      tokenId,price,expires,nonce,sellerCommitment:S.ownerCommitment,
      pubkey:sigPub(sig),signature:sigVal(sig),timestamp:Math.floor(Date.now()/1000)
    });

    // publishRelay saves locally first, so this listing is immediately known
    // to this seller and cannot be accidentally duplicated while relays catch up.
    const pr=await publishRelay(e);
    rememberRuntimeEvent(e);
    rebuildState();
    modal('listingModal',false);
    toast(pr.ok?`Listing published · ${pr.ok}/${pr.total} relays accepted`:'Listing saved locally. Refresh will retry relay publication.',7000);
    await fetchRelay()
  }catch(e){toast(e.message||String(e),8000)}
};
async function cancelListing(l){
  try{
    if(!S.ownerCommitment)throw new Error('Connect Noir Wallet first.');
    if(l.sellerCommitment!==S.ownerCommitment)throw new Error('Only the listing owner can cancel it.');if(tokenIsAtomicLocked(l.tokenId))throw new Error('This listing has a chain-verified atomic lock and cannot be cancelled until settlement or expiry.');
    const nonce=crypto.randomUUID();
    const msg=`ZB1:SALE_CANCEL:v1|G=${CFG.genesisTxid}|L=${l.listingId}|T=${l.tokenId}|O=${S.ownerCommitment}|X=${nonce}`;
    const sig=await signDerived(msg);
    const e=normalizeEvent({
      protocol:'ZB1',v:1,type:'SALE_CANCEL',
      eventId:'cancel:'+nonce,listingId:l.listingId,tokenId:Number(l.tokenId),
      sellerCommitment:S.ownerCommitment,nonce,pubkey:sigPub(sig),signature:sigVal(sig),
      timestamp:Math.floor(Date.now()/1000)
    });
    const r=await publishRelay(e);
    toast(r.ok?`Listing cancelled · mirrored to ${r.ok}/${r.total} relays`:'Cancel saved locally. Relay repair will retry.',7000);
    await fetchRelay();
  }catch(e){toast(e.message||String(e),7000)}
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
    const txid=await rpc('zcash_sendTransaction',[{to:base.anchorAddress,amount:zatToZec(BigInt(CFG.atomicAnchorZat)),fundingSource:'shielded'}]);
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
    const txid=String(await rpc('zcash_sendTransaction',[{to:lock.sellerPayout,amount:lock.paymentZec,fundingSource:'shielded'}])).toLowerCase();
    if(!/^[0-9a-f]{64}$/.test(txid))throw new Error('Noir Wallet did not return a valid payment TXID.');
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
    const txid=String(await rpc('zcash_sendTransaction',[{to:CFG.treasury,amount:lock.feeZec,fundingSource:'shielded'}])).toLowerCase();
    if(!/^[0-9a-f]{64}$/.test(txid))throw new Error('Noir Wallet did not return a valid fee TXID.');

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
    const txid=String(await rpc('zcash_sendTransaction',[{to:lock.sellerPayout,amount:lock.sellerZec,fundingSource:'shielded'}])).toLowerCase();
    if(!/^[0-9a-f]{64}$/.test(txid))throw new Error('Noir Wallet did not return a valid seller-payment TXID.');

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
  $('ownedCount').textContent=own.length;
  const zecCount=S.ownerCommitment?activeListings().filter(x=>x.sellerCommitment===S.ownerCommitment).length:0;
  const usdcCount=S.ownerCommitment?[...S.usdcOnchain.values()].filter(x=>Number(x.status)===1&&Number(x.expiresAt)>Math.floor(Date.now()/1000)&&String(x.sellerCommitment||'').slice(2).toLowerCase()===String(S.ownerCommitment).toLowerCase()).length:0;
  $('listingCount').textContent=zecCount+usdcCount;
  $('offerCount').textContent=S.ownerCommitment?sellerOffers().length:0;
  const g=$('portfolioGrid');g.innerHTML='';if(!S.ownerCommitment){g.innerHTML='<div class="empty" style="grid-column:1/-1">Connect Noir Wallet to calculate your ZB-1 owner commitment and load your portfolio.</div>';renderAtomicDesk();return}if(!own.length){g.innerHTML='<div class="empty" style="grid-column:1/-1">No ZEC BLOCKS are currently resolved to this owner commitment. Recover & Sync checks wallet history, public discovery, and chain-verified marketplace settlements.</div>';renderAtomicDesk();return}
  for(const c of own){
    if(!c.sourceHash)ensurePortfolioSource(c.tokenId);
    const card=document.createElement('article');card.className='nft';card.innerHTML=`<div class="nftart"><svg class="blockArt" viewBox="0 0 600 600"></svg></div><div class="nftinfo"><div class="nftline"><span class="nfttitle">ZEC BLOCK #${c.tokenId}</span><span class="badge live">OWNED</span></div><div class="meta"><span>Source ${esc(c.sourceHeight||'loading…')}</span><span>${esc(short(c.txid||'',6))}</span></div><div class="controls"><button class="btn listZecOne">List ZEC</button><button class="btn usdc listUsdcOne">List USDC</button><button class="btn transferOne">Transfer</button></div></div>`;
    if(c.sourceHash)artSvg(card.querySelector('svg'),c.sourceHash+':'+(c.sourceHeight||c.tokenId),'ZB #'+c.tokenId);
    else artSvg(card.querySelector('svg'),CFG.genesisTxid+':recover:'+c.tokenId,'ZB #'+c.tokenId);
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
      transferBtn.onclick=()=>{S.transferToken=c.tokenId;$('transferToken').value='ZEC BLOCK #'+c.tokenId;modal('transferModal',true)}
    }else{
      zecBtn.textContent='List ZEC';zecBtn.onclick=()=>{openListing();$('listingToken').value=String(c.tokenId)};
      usdcBtn.textContent=S.evmAddress?'List USDC':'Connect Base → List USDC';usdcBtn.onclick=()=>openUsdcListingForToken(c.tokenId);
      transferBtn.onclick=()=>{S.transferToken=c.tokenId;$('transferToken').value='ZEC BLOCK #'+c.tokenId;modal('transferModal',true)}
    }
    g.appendChild(card)}
  renderAtomicDesk();
}
$('syncPortfolioBtn').onclick=async()=>{try{
  S.balance=await rpc('zcash_getBalance');
  const r=await loadWalletHistory();
  await fetchRelay();
  await reconcileAtomicState();rebuildState();
  // Finish on the canonical server snapshot so wallet-history/relay ordering
  // cannot leave a seller with an empty local portfolio after one sale.
  await hydrateServerPortfolio(S.ownerCommitment);
  updateWalletUI();renderPortfolio();renderAtomicDesk();
  const canonicalOwned=ownedTokens().length;
  toast(`Portfolio synced · ${canonicalOwned} canonical ZEC BLOCK${canonicalOwned===1?'':'S'} owned.`,8000)
}catch(e){toast(e.message||String(e),7000)}};
$('submitTransferBtn').onclick=async()=>{try{const tokenId=Number(S.transferToken),to=$('recipientCommit').value.trim().toLowerCase();if(!/^[0-9a-f]{64}$/.test(to))throw new Error('Recipient commitment must be exactly 64 hex characters.');if(currentOwner(tokenId)!==S.ownerCommitment)throw new Error('This wallet is not the current owner in the discovery state.');if(tokenIsAtomicLocked(tokenId))throw new Error('This NFT has a chain-verified atomic lock. Direct transfer is invalid under ZB-1 v2 until the lock settles or expires.');const msg=`ZB1:TRANSFER:v1|G=${CFG.genesisTxid}|T=${tokenId}|F=${S.ownerCommitment}|O=${to}`;const sig=await signDerived(msg);const memo=`ZB1|T|1|I=${tokenId}|O=${to}|K=${sigPub(sig)}|S=${sigVal(sig)}`;if(enc.encode(memo).length>512)throw new Error('Transfer memo exceeds 512 bytes.');const txid=await rpc('zcash_sendTransaction',[{to:CFG.mailbox,amount:'0.00000001',memo,fundingSource:'shielded'}]);const e=normalizeEvent({protocol:'ZB1',v:1,type:'TRANSFER',txid,memo,tokenId,fromCommitment:S.ownerCommitment,toCommitment:to,pubkey:sigPub(sig),signature:sigVal(sig),timestamp:Math.floor(Date.now()/1000),status:'pending'});await publishRelay(e);modal('transferModal',false);$('recipientCommit').value='';toast('Transfer broadcast: '+txid,8000);await fetchRelay()}catch(e){toast(e.message||String(e),8000)}};
async function refreshAll(){await hydrateServerUsdc();await hydrateServerZecMetrics();if(S.ownerCommitment)await hydrateServerPortfolio(S.ownerCommitment);await hydrateServerClaimStats();kickServerRelayIndexer();kickServerUsdcIndexer();await fetchRelay();await reconcileAtomicState();rebuildState();await reconcileUsdcMarket();rebuildState();renderMarket();renderUsdcMarket();renderPortfolio();renderAtomicDesk();renderActivity();updateMarketMetrics()}
function artSvg(svg,seed,label){const gold=['#d3a84f','#e9c56e','#b98a37','#f0d690'],bg=['#080808','#0c0c0c','#11100e','#0a0a0a'],dark=['#111','#141311','#181613','#1d1a15'];const hex=((seed||'')+seed).toLowerCase().replace(/[^0-9a-f]/g,'')||'0',bits=[...hex].map(ch=>parseInt(ch,16).toString(2).padStart(4,'0')).join(''),grid=24,cell=20,pad=60,bgc=bg[parseInt(hex[0]||'0',16)%bg.length],g1=gold[parseInt(hex[1]||'0',16)%4],g2=gold[parseInt(hex[2]||'0',16)%4],g3=gold[parseInt(hex[3]||'0',16)%4],d1=dark[parseInt(hex[4]||'0',16)%4];const r=(x,y,w=1,h=1,f=d1,o=1)=>`<rect x="${pad+x*cell}" y="${pad+y*cell}" width="${w*cell}" height="${h*cell}" fill="${f}" opacity="${o}"/>`;let a=`<rect width="600" height="600" fill="${bgc}"/>`;for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){const i=(x+y*grid)%bits.length;if(((x+y)%2===0&&bits[i]==='1')||((x+y)%5===0&&bits[(i+17)%bits.length]==='1'))a+=r(x,y,1,1,dark[(x+y)%4],.35)}for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){const ed=x===0||y===0||x===grid-1||y===grid-1,inn=x===2||y===2||x===grid-3||y===grid-3;if(ed)a+=r(x,y,1,1,(x+y)%3===0?g2:g1,.96);else if(inn&&((x+y)%2===0||bits[(x*7+y*11)%bits.length]==='1'))a+=r(x,y,1,1,g3,.88)}for(let y=0;y<16;y++)for(let x=0;x<8;x++){const i=(y*8+x)%bits.length,b1=bits[i]==='1',b2=bits[(i+29)%bits.length]==='1',b3=bits[(i+61)%bits.length]==='1',ring=Math.max(Math.abs(x-3.5),Math.abs(y-7.5));let on=ring<=1.5?(b1||b2):ring<=3.5?((b1&&b2)||(b1&&((x+y)%2===0))):ring<=6.5?(b1&&b2&&(b3||((x+y)%3===0))):false;if(on){const f=(x+y)%5===0?g3:(b2&&b3?g2:g1);a+=r(4+x,4+y,1,1,f,.98)+r(grid-5-x,4+y,1,1,f,.98)}}const arm=3+(parseInt(hex[5]||'0',16)%4);a+=r(11,11-arm,2,arm*2+2,g2,.96)+r(11-arm,11,arm*2+2,2,g2,.96)+r(10,10,4,4,g1,1);svg.innerHTML=a+`<text x="36" y="46" fill="#6d665a" font-size="14" font-family="monospace">ZEC BLOCKS / ${esc(label)}</text><text x="36" y="568" fill="#45413b" font-size="11" font-family="monospace">${esc(String(seed).slice(0,34).toUpperCase())}</text>`}
artSvg($('heroArt'),CFG.genesisTxid,'ZB #1');
hydrateUsdcCache();
hydrateServerUsdc().then(()=>kickServerUsdcIndexer()).catch(()=>{});
(async()=>{await hydrateServerZecMetrics();await hydrateServerClaimStats();if(!S.claimStatsTimer)S.claimStatsTimer=setInterval(()=>hydrateServerClaimStats().catch(()=>{}),10000);kickServerRelayIndexer();await initNostr();startLiveDiscovery();try{await resolveGenesis()}catch(e){console.warn(e)}try{await connectWallet(true)}catch{}try{await connectEvmWallet(true)}catch{}await fetchRelay();await reconcileAtomicState();rebuildState();try{await reconcileUsdcMarket()}catch(e){console.warn('USDC market init',e)}rebuildState();updateWalletUI();renderUsdcMarket();renderAtomicDesk();updateMarketMetrics();
  if(!S.atomicWatchTimer)S.atomicWatchTimer=setInterval(async()=>{try{
    await hydrateServerUsdc();
    await hydrateServerZecMetrics();
    if(S.ownerCommitment)await hydrateServerPortfolio(S.ownerCommitment);
    await fetchRelay();
    await reconcileAtomicState();
    rebuildState();
    await reconcileUsdcMarket();
    rebuildState();renderAtomicDesk();renderPortfolio();renderMarket();renderUsdcMarket();renderActivity();updateMarketMetrics()
  }catch(e){console.warn('live discovery backfill',e)}},20000)
})();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshAll().catch(e=>console.warn('visibility refresh',e))});
