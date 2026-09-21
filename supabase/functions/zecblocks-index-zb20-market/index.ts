import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decodeEventLog, parseAbi, encodeFunctionData, decodeFunctionResult } from "npm:viem@2.37.6";

const URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase=createClient(URL,SERVICE,{auth:{persistSession:false}});
const CORS={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json",
  "Cache-Control":"no-store"
};

const CONTRACT="0xbf0677cd230b7835ee7e81fbe993f0389deaead8";
const DEPLOYMENT_BLOCK=51591751n;
const INDEXER="zb20_base_usdc";
const RPC=Deno.env.get("BASE_RPC_URL")||"https://mainnet.base.org";

const ABI=parseAbi([
  "event OrderCreated(bytes32 indexed orderId,bytes32 indexed sellerCommitment,address indexed seller,uint256 amountZECS,uint256 priceUSDC,uint64 expiresAt,uint256 canonicalBalanceZECS)",
  "event OrderCancelled(bytes32 indexed orderId,bytes32 indexed sellerCommitment,address indexed seller,uint256 amountZECS)",
  "event OrderSweptExpired(bytes32 indexed orderId,bytes32 indexed sellerCommitment,uint256 amountZECS)",
  "event ZECSUSDCSettled(bytes32 indexed orderId,bytes32 indexed sellerCommitment,bytes32 indexed buyerCommitment,uint256 amountZECS,uint256 grossUSDC,uint256 protocolFeeUSDC)",
  "function orders(bytes32) view returns (address seller,bytes32 sellerCommitment,uint64 amountZECS,uint128 priceUSDC,uint64 expiresAt,bytes32 orderNonce,bytes32 zb20OrderHash,uint8 status,address buyer,bytes32 buyerCommitment,uint64 settledAt)"
]);

const jres=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:CORS});
const lc=(v:any)=>String(v??"").toLowerCase();
const commitment=(v:any)=>lc(v).replace(/^0x/,"");
const hexBlock=(n:bigint)=>"0x"+n.toString(16);

async function rpc(method:string,params:any[]=[]){
  const r=await fetch(RPC,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
  if(!r.ok)throw new Error("Base RPC HTTP "+r.status);
  const x=await r.json();
  if(x.error)throw new Error(x.error.message||JSON.stringify(x.error));
  return x.result
}
async function setHealth(status:string,extra:any={}){
  await supabase.from("zecblocks_indexer_health").upsert({
    indexer:INDEXER,status,
    last_started_at:status==="running"?new Date().toISOString():undefined,
    last_success_at:status==="ok"?new Date().toISOString():undefined,
    last_error:status==="error"?String(extra.error||"unknown"):null,
    rows_indexed:Number(extra.rows||0),
    details:extra.details||{contract:CONTRACT,deployment_block:DEPLOYMENT_BLOCK.toString()},
    updated_at:new Date().toISOString()
  },{onConflict:"indexer"})
}
async function blockTimestamp(blockHex:string){
  const b=await rpc("eth_getBlockByNumber",[blockHex,false]);
  if(!b?.timestamp)throw new Error("Base block timestamp unavailable");
  return Number(BigInt(b.timestamp))
}
async function readOrder(orderId:string){
  const data=encodeFunctionData({abi:ABI,functionName:"orders",args:[orderId as any]});
  const raw=await rpc("eth_call",[{to:CONTRACT,data},"latest"]);
  const x:any=decodeFunctionResult({abi:ABI,functionName:"orders",data:raw});
  return {
    seller:lc(x[0]),sellerCommitment:commitment(x[1]),amountZECS:Number(x[2]),
    priceUSDC:String(x[3]),expiresAt:Number(x[4]),orderNonce:lc(x[5]),
    zb20OrderHash:lc(x[6]),status:Number(x[7]),buyer:lc(x[8]),
    buyerCommitment:commitment(x[9]),settledAt:Number(x[10])
  }
}
async function processLog(log:any){
  let d:any;
  try{d=decodeEventLog({abi:ABI,data:log.data,topics:log.topics,strict:true})}catch{return 0}
  const a:any=d.args||{};
  const block=Number(BigInt(log.blockNumber));
  const tx=lc(log.transactionHash);
  const logIndex=Number(BigInt(log.logIndex||"0x0"));
  const orderId=lc(a.orderId);
  const sellerCommit=commitment(a.sellerCommitment);

  if(d.eventName==="OrderCreated"){
    const row={
      order_id:orderId,seller_commitment:sellerCommit,seller_evm:lc(a.seller),
      amount_zecs:Number(a.amountZECS),price_usdc:String(a.priceUSDC),expires_at:Number(a.expiresAt),
      canonical_balance_at_create:Number(a.canonicalBalanceZECS),status:"active",
      created_block:block,created_tx_hash:tx,created_log_index:logIndex,
      updated_block:block,updated_at:new Date().toISOString()
    };
    const {error}=await supabase.from("zecblocks_zb20_market_orders").upsert(row,{onConflict:"order_id"});
    if(error)throw error;
    return 1
  }

  if(d.eventName==="OrderCancelled"){
    const {error}=await supabase.from("zecblocks_zb20_market_orders").update({
      status:"cancelled",updated_block:block,updated_at:new Date().toISOString()
    }).eq("order_id",orderId).eq("seller_commitment",sellerCommit);
    if(error)throw error;
    return 1
  }

  if(d.eventName==="OrderSweptExpired"){
    const {error}=await supabase.from("zecblocks_zb20_market_orders").update({
      status:"expired",updated_block:block,updated_at:new Date().toISOString()
    }).eq("order_id",orderId).eq("seller_commitment",sellerCommit);
    if(error)throw error;
    return 1
  }

  if(d.eventName==="ZECSUSDCSettled"){
    const o=await readOrder(orderId);
    if(o.status!==2)throw new Error("Onchain order is not SOLD");
    if(o.sellerCommitment!==sellerCommit)throw new Error("Onchain seller commitment mismatch");
    if(o.buyerCommitment!==commitment(a.buyerCommitment))throw new Error("Onchain buyer commitment mismatch");
    if(o.amountZECS!==Number(a.amountZECS))throw new Error("Onchain amount mismatch");
    if(o.priceUSDC!==String(a.grossUSDC))throw new Error("Onchain price mismatch");
    const settledAt=o.settledAt||await blockTimestamp(log.blockNumber);
    const {data,error}=await supabase.rpc("zecblocks_zb20_apply_market_settlement",{
      p_settlement_key:"base:"+tx+":"+logIndex,
      p_order_id:orderId,
      p_seller_commitment:sellerCommit,
      p_buyer_commitment:commitment(a.buyerCommitment),
      p_seller_evm:o.seller,
      p_buyer_evm:o.buyer,
      p_amount_zecs:Number(a.amountZECS),
      p_gross_usdc:String(a.grossUSDC),
      p_protocol_fee_usdc:String(a.protocolFeeUSDC),
      p_block_number:block,
      p_tx_hash:tx,
      p_log_index:logIndex,
      p_settled_at:settledAt
    });
    if(error)throw error;
    if(!data?.ok)throw new Error("Settlement apply rejected");
    return 2
  }
  return 0
}

async function runSync(force=false){
  if(!force){
    try{
      const {data:h}=await supabase.from("zecblocks_indexer_health").select("last_started_at,status").eq("indexer",INDEXER).maybeSingle();
      const last=h?.last_started_at?new Date(h.last_started_at).getTime():0;
      if(last&&Date.now()-last<15000)return {ok:true,skipped:"rate_limited"}
    }catch{}
  }

  let rows=0,logsSeen=0;
  await setHealth("running");
  try{
    const latest=BigInt(await rpc("eth_blockNumber"));
    const {data:state,error:se}=await supabase.from("zecblocks_indexer_state").select("cursor").eq("indexer",INDEXER).maybeSingle();
    if(se)throw se;
    const saved=state?.cursor?.last_block!=null?BigInt(state.cursor.last_block):DEPLOYMENT_BLOCK-1n;
    let from=saved+1n;
    if(from<DEPLOYMENT_BLOCK)from=DEPLOYMENT_BLOCK;
    if(from>latest){
      await setHealth("ok",{rows:0,details:{contract:CONTRACT,deployment_block:DEPLOYMENT_BLOCK.toString(),latest:latest.toString(),scanned_to:saved.toString(),caught_up:true,logs:0}});
      return {ok:true,contract:CONTRACT,latest:latest.toString(),scanned_to:saved.toString(),caught_up:true,logs:0,rows:0}
    }
    const maxPerRun=50000n;
    const target=from+maxPerRun-1n<latest?from+maxPerRun-1n:latest;
    const step=2000n;
    while(from<=target){
      const to=from+step-1n<target?from+step-1n:target;
      const logs=await rpc("eth_getLogs",[{address:CONTRACT,fromBlock:hexBlock(from),toBlock:hexBlock(to)}]);
      for(const log of logs){rows+=await processLog(log);logsSeen++}
      await supabase.from("zecblocks_indexer_state").upsert({
        indexer:INDEXER,cursor:{last_block:to.toString(),latest_seen:latest.toString()},updated_at:new Date().toISOString()
      },{onConflict:"indexer"});
      from=to+1n
    }
    await setHealth("ok",{rows,details:{contract:CONTRACT,deployment_block:DEPLOYMENT_BLOCK.toString(),latest:latest.toString(),scanned_to:target.toString(),caught_up:target===latest,logs:logsSeen}});
    return {ok:true,contract:CONTRACT,latest:latest.toString(),scanned_to:target.toString(),caught_up:target===latest,logs:logsSeen,rows}
  }catch(e){
    const msg=String((e as any)?.message||e);
    console.error(e);
    await setHealth("error",{error:msg,rows,details:{contract:CONTRACT,deployment_block:DEPLOYMENT_BLOCK.toString()}});
    throw e
  }
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return jres({ok:false,error:"POST only"},405);
  try{
    const b=await req.json().catch(()=>({}));
    const txHash=lc(b.txHash||b.tx_hash||"");
    if(txHash){
      if(!/^0x[0-9a-f]{64}$/.test(txHash))throw new Error("INVALID_TX_HASH");
      await runSync(true);
      const receipt=await rpc("eth_getTransactionReceipt",[txHash]);
      if(!receipt?.blockNumber)return jres({ok:false,error:"TRANSACTION_NOT_CONFIRMED"},409);
      const logs=Array.isArray(receipt.logs)?receipt.logs.filter((x:any)=>lc(x?.address)===CONTRACT):[];
      let rows=0;for(const log of logs)rows+=await processLog(log);
      return jres({ok:true,direct:true,tx_hash:txHash,contract_logs:logs.length,rows})
    }
    return jres(await runSync(b.force===true))
  }catch(e){
    const msg=String((e as any)?.message||e);
    return jres({ok:false,error:msg},500)
  }
});