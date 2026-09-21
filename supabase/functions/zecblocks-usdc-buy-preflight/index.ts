import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
const INDEXER=URL+"/functions/v1/zecblocks-index-usdc";

const clean=(v:any)=>String(v??"").trim().toLowerCase();
const commitment=(v:any)=>clean(v).replace(/^0x/,"");
const jres=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:CORS});

async function forceBaseCatchup(){
  const ac=new AbortController();
  const timer=setTimeout(()=>ac.abort(),25000);
  try{
    const r=await fetch(INDEXER,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({force:true}),
      signal:ac.signal
    });
    const j=await r.json().catch(()=>null);
    if(!r.ok||!j?.ok)throw new Error(j?.error||("Base indexer HTTP "+r.status));
    if(j.caught_up===false)throw new Error("BASE_INDEXER_NOT_CAUGHT_UP");
    return j;
  }finally{clearTimeout(timer)}
}

async function rpc(name:string,args:any){
  const {data,error}=await supabase.rpc(name,args);
  if(error)throw error;
  return data;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return jres({ok:false,error:"POST only"},405);

  try{
    const b=await req.json().catch(()=>({}));
    const action=clean(b.action||"acquire");
    const tokenId=Number(b.tokenId);

    if(!Number.isInteger(tokenId)||tokenId<1||tokenId>5000)throw new Error("INVALID_TOKEN_ID");

    if(action==="listing_acquire"){
      const seller=commitment(b.sellerCommitment);
      if(!/^[0-9a-f]{64}$/.test(seller))throw new Error("INVALID_SELLER_COMMITMENT");
      const sync=await forceBaseCatchup();
      const guard=await rpc("zecblocks_usdc_listing_guard_acquire",{
        p_token_id:tokenId,
        p_seller_commitment:seller
      });
      return jres({ok:true,action,sync,guard})
    }

    if(action==="listing_release"){
      const guardToken=String(b.guardToken||"");
      if(!/^[0-9a-f-]{36}$/i.test(guardToken))throw new Error("INVALID_GUARD_TOKEN");
      const guard=await rpc("zecblocks_usdc_listing_guard_release",{
        p_token_id:tokenId,
        p_guard_token:guardToken
      });
      return jres({ok:true,action,guard})
    }

    if(action==="acquire"){
      const listingId=clean(b.listingId);
      const seller=commitment(b.sellerCommitment);
      const buyer=commitment(b.buyerCommitment);
      if(!/^0x[0-9a-f]{64}$/.test(listingId))throw new Error("INVALID_LISTING_ID");
      if(!/^[0-9a-f]{64}$/.test(seller))throw new Error("INVALID_SELLER_COMMITMENT");
      if(!/^[0-9a-f]{64}$/.test(buyer))throw new Error("INVALID_BUYER_COMMITMENT");

      const sync=await forceBaseCatchup();
      const {data:directListing,error:dle}=await supabase
        .from("zecblocks_zec_listings")
        .select("listing_id")
        .eq("token_id",tokenId)
        .eq("status","active")
        .eq("direct_buy_enabled",true)
        .gt("expires_at",Math.floor(Date.now()/1000))
        .limit(1);
      if(dle)throw dle;
      if(directListing?.length)throw new Error("ZEC_DIRECT_LISTING_ACTIVE");
      const {data:directReservation,error:dre}=await supabase
        .from("zecblocks_zec_direct_reservations")
        .select("reservation_id")
        .eq("asset","ZEC_BLOCK")
        .eq("token_id",tokenId)
        .in("status",["active","payment_pending"])
        .limit(1);
      if(dre)throw dre;
      if(directReservation?.length)throw new Error("ZEC_DIRECT_BUY_IN_PROGRESS");
      const guard=await rpc("zecblocks_usdc_buy_guard_acquire",{
        p_listing_id:listingId,
        p_token_id:tokenId,
        p_seller_commitment:seller,
        p_buyer_commitment:buyer
      });
      return jres({ok:true,action,sync,guard})
    }

    if(action==="validate"){
      const guardToken=String(b.guardToken||"");
      if(!/^[0-9a-f-]{36}$/i.test(guardToken))throw new Error("INVALID_GUARD_TOKEN");
      const sync=await forceBaseCatchup();
      const guard=await rpc("zecblocks_usdc_buy_guard_validate",{
        p_token_id:tokenId,
        p_guard_token:guardToken
      });
      return jres({ok:true,action,sync,guard})
    }

    if(action==="broadcast"){
      const guardToken=String(b.guardToken||"");
      const txHash=clean(b.txHash);
      if(!/^[0-9a-f-]{36}$/i.test(guardToken))throw new Error("INVALID_GUARD_TOKEN");
      if(!/^0x[0-9a-f]{64}$/.test(txHash))throw new Error("INVALID_BUY_TX_HASH");
      const guard=await rpc("zecblocks_usdc_buy_guard_broadcast",{
        p_token_id:tokenId,
        p_guard_token:guardToken,
        p_tx_hash:txHash
      });
      return jres({ok:true,action,guard})
    }

    if(action==="release"){
      const guardToken=String(b.guardToken||"");
      if(!/^[0-9a-f-]{36}$/i.test(guardToken))throw new Error("INVALID_GUARD_TOKEN");
      const guard=await rpc("zecblocks_usdc_buy_guard_release",{
        p_token_id:tokenId,
        p_guard_token:guardToken
      });
      return jres({ok:true,action,guard})
    }

    throw new Error("UNSUPPORTED_ACTION");
  }catch(e){
    const msg=String((e as any)?.message||e);
    const conflict=/NOT_ACTIVE|NO_LONGER|ALREADY_IN_PROGRESS|ALREADY_LISTED|LISTING_IN_PROGRESS|PURCHASE_IN_PROGRESS|ZEC_DIRECT_BUY_IN_PROGRESS|ZEC_DIRECT_LISTING_ACTIVE|NOT_FRESH|NOT_CAUGHT_UP|EXPIRED|CANONICAL_OWNER|SELF_PURCHASE|MISMATCH|NOT_CANONICAL|GUARD/.test(msg);
    return jres({ok:false,error:msg},conflict?409:400)
  }
});