import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decodeEventLog, parseAbi, keccak256, toBytes } from "npm:viem@2.37.6";
import { verify as secpVerify } from "npm:@noble/secp256k1@2.2.3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
const CONTRACT = "0x7674a240004fa434bb1082de28e591abb1dc645d";
const GENESIS = "ecf6fc3a79885f573d79de70a2de85c34667fc1a4fefe034d3a4015269379f0f";
const BASE_CHAIN_ID = "8453";
const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const RPC = Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
const ABI = parseAbi([
  "event ListingCreated(bytes32 indexed listingId,uint32 indexed tokenId,bytes32 indexed sellerCommitment,address seller,uint256 priceUSDC,uint64 expiresAt,bytes32 listingNonce,bytes32 zb1ListingHash)",
  "event ListingCancelled(bytes32 indexed listingId,uint32 indexed tokenId,address indexed seller)",
  "event ZB1SaleSettled(bytes32 indexed listingId,uint32 indexed tokenId,bytes32 indexed buyerCommitment,bytes32 sellerCommitment,bytes32 zb1ListingHash,address buyer,address seller,uint256 grossAmountUSDC,uint256 protocolFeeUSDC,uint256 sellerAmountUSDC,uint64 settledAt)"
]);
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession:false } }
);
const jres=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:CORS});
const lc=(v:any)=>String(v||"").toLowerCase();
const commitment=(v:any)=>lc(v).replace(/^0x/,"");
const hexBlock=(n:bigint)=>"0x"+n.toString(16);
const enc=new TextEncoder();
function hx(v:any,n=0){const s=String(v??"").trim().replace(/^0x/,"").toLowerCase();if(!/^[0-9a-f]+$/.test(s))return "";if(n&&s.length!==n)return "";return s}
function hb(s:string){s=hx(s);if(!s||s.length%2)throw new Error("INVALID_HEX");const b=new Uint8Array(s.length/2);for(let i=0;i<b.length;i++)b[i]=parseInt(s.slice(i*2,i*2+2),16);return b}
function cat(...a:Uint8Array[]){let n=0;for(const x of a)n+=x.length;const o=new Uint8Array(n);let p=0;for(const x of a){o.set(x,p);p+=x.length}return o}
function cs(n:number){if(n<=0xfc)return new Uint8Array([n]);if(n<=0xffff)return new Uint8Array([0xfd,n&255,(n>>8)&255]);const b=new Uint8Array(5);b[0]=0xfe;new DataView(b.buffer).setUint32(1,n,true);return b}
async function sha(b:Uint8Array){return new Uint8Array(await crypto.subtle.digest("SHA-256",b))}
async function dbl(b:Uint8Array){return sha(await sha(b))}
async function shahex(b:Uint8Array){return [...await sha(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function verifyMsg(message:string,sig:any,pub:any){
  try{
    const s=hx(sig),p=hx(pub);
    if(!/^[0-9a-f]{130}$/.test(s)||!(/^[0-9a-f]{66}$/.test(p)||/^[0-9a-f]{130}$/.test(p)))return false;
    const sb=hb(s),prefix="Zcash Signed Message:\n",pb=enc.encode(prefix),mb=enc.encode(message);
    const hash=await dbl(cat(cs(pb.length),pb,cs(mb.length),mb));
    return secpVerify(sb.slice(1,65),hash,hb(p),{lowS:false})
  }catch{return false}
}
function saleFields(message:string){
  if(!message.startsWith("ZB1:SALE_BASE:v1|"))throw new Error("INVALID_INTENT_MESSAGE");
  const out:Record<string,string>={};
  for(const part of message.split("|").slice(1)){const i=part.indexOf("=");if(i>0)out[part.slice(0,i)]=part.slice(i+1)}
  return out
}
async function attachIntent(intent:any,txHash:string){
  const listingId=lc(intent?.listingId),message=String(intent?.message||""),pubkey=hx(intent?.pubkey),signature=hx(intent?.signature);
  if(!/^0x[0-9a-f]{64}$/.test(listingId))throw new Error("INVALID_INTENT_LISTING_ID");
  if(!message||message.length>2048)throw new Error("INVALID_INTENT_MESSAGE");
  if(!(/^[0-9a-f]{66}$/.test(pubkey)||/^[0-9a-f]{130}$/.test(pubkey)))throw new Error("INVALID_INTENT_PUBKEY");
  if(!/^[0-9a-f]{130}$/.test(signature))throw new Error("INVALID_INTENT_SIGNATURE");

  const {data:l,error}=await supabase.from("zecblocks_usdc_listings")
    .select("listing_id,token_id,seller_commitment,seller_evm,price_usdc,expires_at,listing_nonce,zb1_listing_hash,created_tx_hash,status")
    .eq("listing_id",listingId).maybeSingle();
  if(error)throw error;if(!l)throw new Error("INTENT_LISTING_NOT_INDEXED");
  if(txHash&&lc(l.created_tx_hash)!==lc(txHash))throw new Error("INTENT_TX_MISMATCH");

  const f=saleFields(message);
  if(lc(f.G)!==GENESIS)throw new Error("INTENT_GENESIS_MISMATCH");
  if(String(f.T)!==String(l.token_id))throw new Error("INTENT_TOKEN_MISMATCH");
  if(String(f.C)!==BASE_CHAIN_ID)throw new Error("INTENT_CHAIN_MISMATCH");
  if(lc(f.U)!==BASE_USDC)throw new Error("INTENT_USDC_MISMATCH");
  if(lc(f.M)!==CONTRACT)throw new Error("INTENT_MARKET_MISMATCH");
  if(lc(f.A)!==lc(l.seller_evm))throw new Error("INTENT_SELLER_EVM_MISMATCH");
  if(String(f.P)!==String(l.price_usdc))throw new Error("INTENT_PRICE_MISMATCH");
  if(String(f.E)!==String(l.expires_at))throw new Error("INTENT_EXPIRY_MISMATCH");
  if(commitment(f.S)!==commitment(l.seller_commitment))throw new Error("INTENT_SELLER_MISMATCH");
  if(lc(f.X)!==lc(l.listing_nonce))throw new Error("INTENT_NONCE_MISMATCH");

  const msgHash=lc(keccak256(toBytes(message)));
  if(msgHash!==lc(l.zb1_listing_hash))throw new Error("INTENT_HASH_MISMATCH");
  const derived=await shahex(hb(pubkey));
  if(derived!==commitment(l.seller_commitment))throw new Error("INTENT_IDENTITY_MISMATCH");
  if(!(await verifyMsg(message,signature,pubkey)))throw new Error("INTENT_SIGNATURE_INVALID");

  const eventKey="direct-usdc-intent:"+listingId;
  const {error:ue}=await supabase.from("zecblocks_usdc_listings").update({
    intent_verified:true,intent_event_key:eventKey,intent_message:message,intent_pubkey:pubkey,intent_signature:signature,updated_at:new Date().toISOString()
  }).eq("listing_id",listingId);
  if(ue)throw ue;
  return {verified:true,listing_id:listingId,event_key:eventKey}
}

async function setHealth(status:string, extra:any={}){
  await supabase.from("zecblocks_indexer_health").upsert({
    indexer:"base_usdc",
    status,
    last_started_at: status==="running" ? new Date().toISOString() : undefined,
    last_success_at: status==="ok" ? new Date().toISOString() : undefined,
    last_error: status==="error" ? String(extra.error||"unknown") : null,
    rows_indexed:Number(extra.rows||0),
    details:extra.details||{},
    updated_at:new Date().toISOString()
  },{onConflict:"indexer"});
}
async function rpc(method:string,params:any[]=[]){
  const r=await fetch(RPC,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
  if(!r.ok)throw new Error("Base RPC HTTP "+r.status);
  const x=await r.json();if(x.error)throw new Error(x.error.message||JSON.stringify(x.error));return x.result;
}
async function processLog(log:any,ownershipTokens:Set<number>){
  let d:any;
  try{d=decodeEventLog({abi:ABI,data:log.data,topics:log.topics,strict:true})}catch{return 0}
  const a:any=d.args||{}, block=Number(BigInt(log.blockNumber)), tx=lc(log.transactionHash), logIndex=Number(BigInt(log.logIndex||"0x0"));
  if(d.eventName==="ListingCreated"){
    const row={
      listing_id:lc(a.listingId),token_id:Number(a.tokenId),seller_commitment:commitment(a.sellerCommitment),
      seller_evm:lc(a.seller),price_usdc:a.priceUSDC.toString(),expires_at:Number(a.expiresAt),
      listing_nonce:lc(a.listingNonce),zb1_listing_hash:lc(a.zb1ListingHash),status:"active",
      created_block:block,updated_block:block,created_tx_hash:tx,updated_at:new Date().toISOString()
    };
    const {error}=await supabase.from("zecblocks_usdc_listings").upsert(row,{onConflict:"listing_id"});
    if(error)throw error;
    await supabase.from("zecblocks_cross_rail_listing_guards").delete()
      .eq("token_id",Number(a.tokenId)).eq("rail","USDC").eq("seller_commitment",commitment(a.sellerCommitment));
    return 1;
  }
  if(d.eventName==="ListingCancelled"){
    const {error}=await supabase.from("zecblocks_usdc_listings").update({
      status:"cancelled",updated_block:block,updated_at:new Date().toISOString()
    }).eq("listing_id",lc(a.listingId));
    if(error)throw error; return 1;
  }
  if(d.eventName==="ZB1SaleSettled"){
    const listingId=lc(a.listingId), sellerCommit=commitment(a.sellerCommitment), buyerCommit=commitment(a.buyerCommitment), settledAt=Number(a.settledAt);
    const {error:e1}=await supabase.from("zecblocks_usdc_listings").update({
      status:"sold",buyer_evm:lc(a.buyer),buyer_commitment:buyerCommit,settled_tx_hash:tx,settled_at:settledAt,
      updated_block:block,updated_at:new Date().toISOString()
    }).eq("listing_id",listingId); if(e1)throw e1;

    const {error:e2}=await supabase.from("zecblocks_sales").upsert({
      sale_key:`base:${tx}:${logIndex}`,listing_id:listingId,token_id:Number(a.tokenId),payment_chain:"Base",currency:"USDC",
      amount_base_units:a.grossAmountUSDC.toString(),seller_evm:lc(a.seller),buyer_evm:lc(a.buyer),
      seller_commitment:sellerCommit,buyer_commitment:buyerCommit,tx_hash:tx,block_number:block,settled_at:settledAt
    },{onConflict:"sale_key"}); if(e2)throw e2;

    const {error:e3}=await supabase.from("zecblocks_ownership_events").upsert({
      event_key:`base:${tx}:${logIndex}`,token_id:Number(a.tokenId),event_type:"usdc_sale",
      from_commitment:sellerCommit,to_commitment:buyerCommit,event_timestamp:settledAt,block_height:null,tx_index:logIndex,
      chain:"base",txid:tx,verified_level:"full",
      payload:{listingId,grossAmountUSDC:a.grossAmountUSDC.toString(),sellerEvm:lc(a.seller),buyerEvm:lc(a.buyer)},
      updated_at:new Date().toISOString()
    },{onConflict:"event_key"}); if(e3)throw e3;
    ownershipTokens.add(Number(a.tokenId));return 2;
  }
  return 0;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return jres({ok:false,error:"POST only"},405);
  const body=await req.json().catch(()=>({}));
  const directTx=lc(body?.tx_hash||body?.txHash||"");
  if(directTx){
    if(!/^0x[0-9a-f]{64}$/.test(directTx))return jres({ok:false,error:"invalid tx hash"},400);
    const ownershipTokens=new Set<number>();let rows=0;
    try{
      const receipt=await rpc("eth_getTransactionReceipt",[directTx]);
      if(!receipt||!receipt.blockNumber)return jres({ok:false,error:"transaction not confirmed"},409);
      const logs=Array.isArray(receipt.logs)?receipt.logs.filter((x:any)=>lc(x?.address)===CONTRACT):[];
      for(const log of logs)rows+=await processLog(log,ownershipTokens);
      if(ownershipTokens.size){
        const {error:re}=await supabase.rpc("zecblocks_rebuild_ownership_tokens",{p_token_ids:[...ownershipTokens]});
        if(re)throw re;
      }
      const intent=body?.intent?await attachIntent(body.intent,directTx):null;
      return jres({ok:true,direct:true,tx_hash:directTx,contract_logs:logs.length,rows,ownership_tokens:ownershipTokens.size,intent});
    }catch(e){
      const msg=String(e?.message||e);console.error(e);return jres({ok:false,error:msg},500);
    }
  }
  const force=body?.force===true;
  try{
    const {data:h}=await supabase.from("zecblocks_indexer_health").select("last_started_at,status").eq("indexer","base_usdc").maybeSingle();
    const last=h?.last_started_at?new Date(h.last_started_at).getTime():0;
    if(!force&&last&&Date.now()-last<45000)return jres({ok:true,skipped:"rate_limited"});
  }catch{}
  let rows=0;const ownershipTokens=new Set<number>();
  try{
    await setHealth("running");
    const latest=BigInt(await rpc("eth_blockNumber"));
    const {data:state,error:se}=await supabase.from("zecblocks_indexer_state").select("cursor").eq("indexer","base_usdc").maybeSingle();
    if(se)throw se;
    const saved=state?.cursor?.last_block!=null?BigInt(state.cursor.last_block):null;
    let from=saved!=null?saved+1n:(latest>50000n?latest-50000n:0n);
    if(from>latest){
      await setHealth("ok",{rows:0,details:{latest:latest.toString(),caught_up:true}});
      return jres({ok:true,caught_up:true,latest:latest.toString(),scanned_to:latest.toString(),logs:0});
    }
    const maxPerRun=50000n, target=(from+maxPerRun-1n<latest)?from+maxPerRun-1n:latest, step=2000n;
    let logsSeen=0;
    while(from<=target){
      const to=(from+step-1n<target)?from+step-1n:target;
      const logs=await rpc("eth_getLogs",[{address:CONTRACT,fromBlock:hexBlock(from),toBlock:hexBlock(to)}]);
      for(const log of logs){rows+=await processLog(log,ownershipTokens);logsSeen++}
      await supabase.from("zecblocks_indexer_state").upsert({
        indexer:"base_usdc",cursor:{last_block:to.toString(),latest_seen:latest.toString()},updated_at:new Date().toISOString()
      },{onConflict:"indexer"});
      from=to+1n;
    }
    await supabase.from("zecblocks_usdc_listings").update({status:"expired",updated_at:new Date().toISOString()})
      .eq("status","active").lt("expires_at",Math.floor(Date.now()/1000));
    if(ownershipTokens.size){const {error:re}=await supabase.rpc("zecblocks_rebuild_ownership_tokens",{p_token_ids:[...ownershipTokens]});if(re)throw re}
    await setHealth("ok",{rows,details:{latest:latest.toString(),scanned_to:target.toString(),caught_up:target===latest,logs:logsSeen,ownership_tokens:ownershipTokens.size}});
    return jres({ok:true,contract:CONTRACT,scanned_to:target.toString(),latest:latest.toString(),caught_up:target===latest,logs:logsSeen,rows});
  }catch(e){
    const msg=String(e?.message||e);console.error(e);await setHealth("error",{error:msg,rows});return jres({ok:false,error:msg},500);
  }
});