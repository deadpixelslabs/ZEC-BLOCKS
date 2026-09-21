import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { verify as secpVerify } from "npm:@noble/secp256k1@2.2.3";
import { Wallet, AbiCoder, Interface, keccak256, toUtf8Bytes, getBytes, hexlify } from "npm:ethers@6.15.0";

const URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase=createClient(URL,SERVICE,{auth:{persistSession:false}});

const CORS={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type, apikey, authorization",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json",
  "Cache-Control":"no-store"
};

const CONTRACT="0xbf0677cd230b7835ee7e81fbe993f0389deaead8";
const VERIFIER="0xc6e64521c4fa7fcb86f66917e5507604e3f0dded";
const DEPLOY_TXID="0x5bde45c224ae58a41bdd72ab0bfdfe36a23a4d3aa5335381842e19fdac02e5ed";
const CHAIN_ID=8453n;
const INDEXER=URL+"/functions/v1/zecblocks-index-zb20-market";
const RPC=Deno.env.get("BASE_RPC_URL")||"https://mainnet.base.org";
const enc=new TextEncoder();
const abi=AbiCoder.defaultAbiCoder();
const iface=new Interface([
  "function reservedZECS(bytes32) view returns (uint256)",
  "function orders(bytes32) view returns (address seller,bytes32 sellerCommitment,uint64 amountZECS,uint128 priceUSDC,uint64 expiresAt,bytes32 orderNonce,bytes32 zb20OrderHash,uint8 status,address buyer,bytes32 buyerCommitment,uint64 settledAt)"
]);
const LIST_TAG=keccak256(toUtf8Bytes("ZB20:ZECS:BASE_USDC:LISTING_AUTH:v2"));
const BUY_TAG=keccak256(toUtf8Bytes("ZB20:ZECS:BASE_USDC:BUY_AUTH:v2"));
const ORDER_TAG="ZB20:ZECS:BASE_USDC_MARKET:v2";

const clean=(v:any)=>String(v??"").trim();
const lc=(v:any)=>clean(v).toLowerCase();
const hx=(v:any,n?:number)=>{
  const s=lc(v).replace(/^0x/,"");
  if(!/^[0-9a-f]+$/.test(s))return "";
  if(n&&s.length!==n)return "";
  return s
};
const jres=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:CORS});
const bytes32=(v:string)=>"0x"+v;
function random32(){const b=new Uint8Array(32);crypto.getRandomValues(b);return hexlify(b)}
function hb(s:any){
  const x=hx(s);if(!x||x.length%2)return new Uint8Array();
  const b=new Uint8Array(x.length/2);
  for(let i=0;i<b.length;i++)b[i]=parseInt(x.slice(i*2,i*2+2),16);
  return b
}
function cat(...a:Uint8Array[]){
  let n=0;for(const x of a)n+=x.length;
  const o=new Uint8Array(n);let p=0;
  for(const x of a){o.set(x,p);p+=x.length}
  return o
}
function cs(n:number){
  if(n<=0xfc)return new Uint8Array([n]);
  if(n<=0xffff)return new Uint8Array([0xfd,n&255,(n>>8)&255]);
  const b=new Uint8Array(5);b[0]=0xfe;new DataView(b.buffer).setUint32(1,n,true);return b
}
async function sha(b:Uint8Array){return new Uint8Array(await crypto.subtle.digest("SHA-256",b))}
async function dbl(b:Uint8Array){return sha(await sha(b))}
async function shahex(b:Uint8Array){return [...await sha(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function vsig(message:string,sig:any,pub:any){
  try{
    const s=hx(sig),p=hx(pub);
    if(!/^[0-9a-f]{130}$/.test(s)||!(/^[0-9a-f]{66}$/.test(p)||/^[0-9a-f]{130}$/.test(p)))return false;
    const sb=hb(s),prefix="Zcash Signed Message:\n",pb=enc.encode(prefix),mb=enc.encode(message);
    const hash=await dbl(cat(cs(pb.length),pb,cs(mb.length),mb));
    return secpVerify(sb.slice(1,65),hash,hb(p),{lowS:false})
  }catch{return false}
}
function evm(v:any){
  const s=lc(v);
  return /^0x[0-9a-f]{40}$/.test(s)?s:""
}
function owner(v:any){return hx(v,64)}
function u64(v:any,name:string){
  const n=Number(v);
  if(!Number.isSafeInteger(n)||n<0)throw new Error("INVALID_"+name);
  return n
}
function uintString(v:any,name:string){
  const s=clean(v);
  if(!/^\d+$/.test(s))throw new Error("INVALID_"+name);
  return BigInt(s).toString()
}
async function rpc(method:string,params:any[]=[]){
  const r=await fetch(RPC,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
  if(!r.ok)throw new Error("BASE_RPC_HTTP_"+r.status);
  const x=await r.json();
  if(x.error)throw new Error(x.error.message||"BASE_RPC_ERROR");
  return x.result
}
async function contractCall(data:string){
  return rpc("eth_call",[{to:CONTRACT,data},"latest"])
}
async function reservedZECS(commitment:string){
  const data=iface.encodeFunctionData("reservedZECS",[bytes32(commitment)]);
  const raw=await contractCall(data);
  return BigInt(iface.decodeFunctionResult("reservedZECS",raw)[0])
}
async function onchainOrder(orderId:string){
  const data=iface.encodeFunctionData("orders",[orderId]);
  const raw=await contractCall(data);
  const x:any=iface.decodeFunctionResult("orders",raw);
  return {
    seller:lc(x[0]),sellerCommitment:hx(x[1],64),amountZECS:Number(x[2]),priceUSDC:BigInt(x[3]).toString(),
    expiresAt:Number(x[4]),orderNonce:lc(x[5]),zb20OrderHash:lc(x[6]),status:Number(x[7]),
    buyer:lc(x[8]),buyerCommitment:hx(x[9],64),settledAt:Number(x[10])
  }
}
async function forceSync(){
  const ac=new AbortController();const t=setTimeout(()=>ac.abort(),25000);
  try{
    const r=await fetch(INDEXER,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({force:true}),signal:ac.signal});
    const j=await r.json().catch(()=>null);
    if(!r.ok||!j?.ok)throw new Error(j?.error||("INDEXER_HTTP_"+r.status));
    if(j.caught_up===false)throw new Error("BASE_MARKET_INDEXER_NOT_CAUGHT_UP");
    return j
  }finally{clearTimeout(t)}
}
async function account(commitment:string){
  const {data,error}=await supabase.rpc("zecblocks_zb20_market_account",{p_owner_commitment:commitment});
  if(error)throw error;
  return data
}
async function snapshot(){
  const {data,error}=await supabase.rpc("zecblocks_zb20_market_snapshot",{p_limit:100});
  if(error)throw error;
  return data
}
function signer(){
  const raw=clean(Deno.env.get("ZECS_MARKET_VERIFIER_PRIVATE_KEY"));
  if(!raw)throw new Error("VERIFIER_SECRET_NOT_CONFIGURED");
  const pk=raw.startsWith("0x")?raw:"0x"+raw;
  if(!/^0x[0-9a-fA-F]{64}$/.test(pk))throw new Error("VERIFIER_SECRET_INVALID");
  const w=new Wallet(pk);
  if(lc(w.address)!==VERIFIER)throw new Error("VERIFIER_SECRET_ADDRESS_MISMATCH");
  return w
}
function listingIntentMessage(x:any){
  return [
    "ZB20:ZECS:MARKET_LIST:v2",
    "C=8453",
    "M="+CONTRACT,
    "D="+DEPLOY_TXID,
    "S="+x.sellerEvm,
    "O="+x.ownerCommitment,
    "A="+x.amountZECS,
    "P="+x.priceUSDC,
    "E="+x.expiresAt,
    "N="+x.orderNonce,
    "Q="+x.authNonce,
    "X="+x.authDeadline
  ].join("|")
}
function buyIntentMessage(x:any){
  return [
    "ZB20:ZECS:MARKET_BUY:v2",
    "C=8453",
    "M="+CONTRACT,
    "D="+DEPLOY_TXID,
    "I="+x.orderId,
    "S="+x.sellerEvm,
    "O="+x.sellerCommitment,
    "B="+x.buyerEvm,
    "R="+x.ownerCommitment,
    "A="+x.amountZECS,
    "P="+x.priceUSDC,
    "Q="+x.authNonce,
    "X="+x.authDeadline
  ].join("|")
}
function listingDigest(seller:string,r:any){
  return keccak256(abi.encode(
    ["bytes32","uint256","address","bytes32","address","bytes32","uint64","uint64","uint128","uint64","bytes32","bytes32","uint64","bytes32"],
    [LIST_TAG,CHAIN_ID,CONTRACT,DEPLOY_TXID,seller,bytes32(r.sellerCommitment),r.canonicalBalanceZECS,r.amountZECS,r.priceUSDC,r.expiresAt,r.orderNonce,r.zb20OrderHash,r.authDeadline,r.authNonce]
  ))
}
function computeOrderId(seller:string,r:any){
  return keccak256(abi.encode(
    ["string","uint256","address","bytes32","address","bytes32","uint64","uint128","uint64","bytes32","bytes32"],
    [ORDER_TAG,CHAIN_ID,CONTRACT,DEPLOY_TXID,seller,bytes32(r.sellerCommitment),r.amountZECS,r.priceUSDC,r.expiresAt,r.orderNonce,r.zb20OrderHash]
  ))
}
function buyDigest(o:any,buyer:string,a:any){
  return keccak256(abi.encode(
    ["bytes32","uint256","address","bytes32","bytes32","address","bytes32","address","bytes32","uint64","uint128","uint64","uint64","bytes32"],
    [BUY_TAG,CHAIN_ID,CONTRACT,DEPLOY_TXID,a.orderId,o.seller,bytes32(o.sellerCommitment),buyer,bytes32(a.buyerCommitment),o.amountZECS,o.priceUSDC,a.sellerCanonicalBalanceZECS,a.authDeadline,a.authNonce]
  ))
}
async function loadChallenge(id:string,purpose:string){
  const {data,error}=await supabase.from("zecblocks_zb20_market_challenges").select("*").eq("challenge_id",id).eq("purpose",purpose).maybeSingle();
  if(error)throw error;
  if(!data)throw new Error("CHALLENGE_NOT_FOUND");
  if(data.status!=="pending")throw new Error("CHALLENGE_NOT_PENDING");
  if(Number(data.auth_deadline)<Math.floor(Date.now()/1000))throw new Error("CHALLENGE_EXPIRED");
  return data
}
async function verifyChallengeIdentity(c:any,pub:any,sig:any){
  const p=hx(pub),s=hx(sig);
  if(!(/^[0-9a-f]{66}$/.test(p)||/^[0-9a-f]{130}$/.test(p)))throw new Error("INVALID_DERIVED_PUBLIC_KEY");
  if(!/^[0-9a-f]{130}$/.test(s))throw new Error("INVALID_NOIR_SIGNATURE");
  const derived=await shahex(hb(p));
  if(derived!==c.owner_commitment)throw new Error("NOIR_IDENTITY_MISMATCH");
  if(!(await vsig(c.message,s,p)))throw new Error("INVALID_NOIR_SIGNATURE");
}
async function issueAuthorization(c:any,digest:string,signature:string,canonicalBalance:number,orderId:string|null){
  const {error:e1}=await supabase.from("zecblocks_zb20_market_authorizations").insert({
    auth_nonce:c.auth_nonce,purpose:c.purpose,challenge_id:c.challenge_id,
    owner_commitment:c.owner_commitment,evm_address:c.evm_address,order_id:orderId,
    canonical_balance_zecs:canonicalBalance,digest,signature,auth_deadline:c.auth_deadline
  });
  if(e1)throw e1;
  const {error:e2}=await supabase.from("zecblocks_zb20_market_challenges").update({status:"used",used_at:new Date().toISOString()}).eq("challenge_id",c.challenge_id).eq("status","pending");
  if(e2)throw e2
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return jres({ok:false,error:"POST only"},405);

  try{
    const b=await req.json().catch(()=>({}));
    const action=lc(b.action||"status");
    await supabase.rpc("zecblocks_zb20_market_cleanup_challenges");

    if(action==="status"){
      let configured=false,signerAddress:null|string=null,signerError:null|string=null;
      try{const w=signer();configured=true;signerAddress=lc(w.address)}catch(e){signerError=String((e as any)?.message||e)}
      const {data:h}=await supabase.from("zecblocks_indexer_health").select("*").eq("indexer","zb20_base_usdc").maybeSingle();
      return jres({ok:true,contract:CONTRACT,verifier:VERIFIER,signer_configured:configured,signer_address:signerAddress,signer_error:signerError,indexer:h})
    }

    if(action==="sync"){
      const sync=await forceSync();
      return jres({ok:true,sync,snapshot:await snapshot()})
    }

    if(action==="snapshot"){
      return jres({ok:true,snapshot:await snapshot()})
    }

    if(action==="account"){
      const o=owner(b.ownerCommitment);if(!o)throw new Error("INVALID_OWNER_COMMITMENT");
      await forceSync();
      return jres({ok:true,account:await account(o),reserved_onchain:(await reservedZECS(o)).toString()})
    }

    if(action==="listing_challenge"){
      const o=owner(b.ownerCommitment),seller=evm(b.sellerEvm);
      if(!o)throw new Error("INVALID_OWNER_COMMITMENT");
      if(!seller)throw new Error("INVALID_SELLER_EVM");
      const amount=u64(b.amountZECS,"AMOUNT_ZECS");
      if(amount<1||amount>21000000)throw new Error("INVALID_AMOUNT_ZECS");
      const price=uintString(b.priceUSDC,"PRICE_USDC");
      if(BigInt(price)<10000n)throw new Error("PRICE_TOO_LOW");
      const now=Math.floor(Date.now()/1000);
      const expires=u64(b.expiresAt,"EXPIRES_AT");
      if(expires<=now||expires>now+30*86400)throw new Error("INVALID_LISTING_EXPIRY");

      await forceSync();
      const ac=await account(o);
      const balance=Number(ac?.balance||0);
      const reserved=await reservedZECS(o);
      if(BigInt(balance)<reserved+BigInt(amount))throw new Error("INSUFFICIENT_AVAILABLE_ZECS");

      const orderNonce=random32(),authNonce=random32(),authDeadline=now+120;
      const base={sellerEvm:seller,ownerCommitment:o,amountZECS:amount,priceUSDC:price,expiresAt:expires,orderNonce,authNonce,authDeadline};
      const message=listingIntentMessage(base);
      const orderHash=keccak256(toUtf8Bytes(message));
      const payload={...base,zb20OrderHash:orderHash};
      const {data,error}=await supabase.from("zecblocks_zb20_market_challenges").insert({
        purpose:"listing",owner_commitment:o,evm_address:seller,auth_nonce:authNonce,auth_deadline:authDeadline,message,payload
      }).select("challenge_id").single();
      if(error)throw error;
      return jres({ok:true,challenge_id:data.challenge_id,message,order_nonce:orderNonce,zb20_order_hash:orderHash,auth_nonce:authNonce,auth_deadline:authDeadline,canonical_balance:balance,reserved_onchain:reserved.toString()})
    }

    if(action==="listing_authorize"){
      const c=await loadChallenge(clean(b.challengeId),"listing");
      await verifyChallengeIdentity(c,b.pubkey,b.signature);
      await forceSync();

      const p=c.payload||{},o=c.owner_commitment,seller=c.evm_address;
      const ac=await account(o);
      const balance=Number(ac?.balance||0);
      const reserved=await reservedZECS(o);
      const amount=Number(p.amountZECS);
      if(BigInt(balance)<reserved+BigInt(amount))throw new Error("INSUFFICIENT_AVAILABLE_ZECS");

      const request={
        sellerCommitment:o,canonicalBalanceZECS:balance,amountZECS:amount,
        priceUSDC:String(p.priceUSDC),expiresAt:Number(p.expiresAt),orderNonce:String(p.orderNonce),
        zb20OrderHash:String(p.zb20OrderHash),authDeadline:Number(c.auth_deadline),authNonce:String(c.auth_nonce)
      };
      const digest=listingDigest(seller,request);
      const sig=await signer().signMessage(getBytes(digest));
      const orderId=computeOrderId(seller,request);
      await issueAuthorization(c,digest,lc(sig),balance,orderId);
      return jres({ok:true,action,order_id:orderId,listing_request:request,verifier_signature:lc(sig),digest,canonical_balance:balance,reserved_onchain:reserved.toString()})
    }

    if(action==="buy_challenge"){
      const orderId=lc(b.orderId),buyerOwner=owner(b.buyerCommitment),buyer=evm(b.buyerEvm);
      if(!/^0x[0-9a-f]{64}$/.test(orderId))throw new Error("INVALID_ORDER_ID");
      if(!buyerOwner)throw new Error("INVALID_BUYER_COMMITMENT");
      if(!buyer)throw new Error("INVALID_BUYER_EVM");
      await forceSync();

      const {data:row,error}=await supabase.from("zecblocks_zb20_market_orders").select("*").eq("order_id",orderId).maybeSingle();
      if(error)throw error;if(!row||row.status!=="active")throw new Error("ORDER_NOT_ACTIVE");
      const chain=await onchainOrder(orderId);
      if(chain.status!==1)throw new Error("ORDER_NOT_ACTIVE_ONCHAIN");
      if(chain.seller===buyer)throw new Error("SELF_PURCHASE");
      if(chain.sellerCommitment===buyerOwner)throw new Error("SAME_COMMITMENT");
      if(chain.seller!==row.seller_evm||chain.sellerCommitment!==row.seller_commitment||chain.amountZECS!==Number(row.amount_zecs)||chain.priceUSDC!==String(row.price_usdc))throw new Error("ORDER_INDEX_MISMATCH");

      const sellerAccount=await account(chain.sellerCommitment);
      const sellerBalance=Number(sellerAccount?.balance||0);
      const reserved=await reservedZECS(chain.sellerCommitment);
      if(sellerBalance<chain.amountZECS||reserved>BigInt(sellerBalance))throw new Error("SELLER_BALANCE_NOT_FRESH");

      const now=Math.floor(Date.now()/1000),authNonce=random32(),authDeadline=now+60;
      const base={orderId,sellerEvm:chain.seller,sellerCommitment:chain.sellerCommitment,buyerEvm:buyer,ownerCommitment:buyerOwner,amountZECS:chain.amountZECS,priceUSDC:chain.priceUSDC,authNonce,authDeadline};
      const message=buyIntentMessage(base);
      const {data,error:e2}=await supabase.from("zecblocks_zb20_market_challenges").insert({
        purpose:"buy",owner_commitment:buyerOwner,evm_address:buyer,order_id:orderId,auth_nonce:authNonce,auth_deadline:authDeadline,message,payload:base
      }).select("challenge_id").single();
      if(e2)throw e2;
      return jres({ok:true,challenge_id:data.challenge_id,message,auth_nonce:authNonce,auth_deadline:authDeadline,order:chain,seller_canonical_balance:sellerBalance,reserved_onchain:reserved.toString()})
    }

    if(action==="buy_authorize"){
      const c=await loadChallenge(clean(b.challengeId),"buy");
      await verifyChallengeIdentity(c,b.pubkey,b.signature);
      await forceSync();

      const p=c.payload||{},orderId=String(c.order_id||p.orderId||"");
      const chain=await onchainOrder(orderId);
      if(chain.status!==1)throw new Error("ORDER_NOT_ACTIVE_ONCHAIN");
      if(chain.seller===c.evm_address)throw new Error("SELF_PURCHASE");
      if(chain.sellerCommitment===c.owner_commitment)throw new Error("SAME_COMMITMENT");

      const sellerAccount=await account(chain.sellerCommitment);
      const sellerBalance=Number(sellerAccount?.balance||0);
      const reserved=await reservedZECS(chain.sellerCommitment);
      if(sellerBalance<chain.amountZECS||reserved>BigInt(sellerBalance))throw new Error("SELLER_BALANCE_NOT_FRESH");

      const auth={
        orderId,buyerCommitment:c.owner_commitment,sellerCanonicalBalanceZECS:sellerBalance,
        authDeadline:Number(c.auth_deadline),authNonce:String(c.auth_nonce)
      };
      const digest=buyDigest(chain,c.evm_address,auth);
      const sig=await signer().signMessage(getBytes(digest));
      await issueAuthorization(c,digest,lc(sig),sellerBalance,orderId);
      return jres({ok:true,action,buy_authorization:auth,verifier_signature:lc(sig),digest,order:chain,seller_canonical_balance:sellerBalance,reserved_onchain:reserved.toString()})
    }

    throw new Error("UNSUPPORTED_ACTION");
  }catch(e){
    const msg=String((e as any)?.message||e);
    const conflict=/NOT_ACTIVE|INSUFFICIENT|BALANCE_NOT_FRESH|SELF_PURCHASE|SAME_COMMITMENT|INDEX_MISMATCH|EXPIRED|NOT_CAUGHT_UP/.test(msg);
    const config=/VERIFIER_SECRET/.test(msg);
    return jres({ok:false,error:msg},config?503:(conflict?409:400))
  }
});