import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as ethers from "npm:ethers@6.13.5";
import "../../../address-identity.js";

const genesis="ecf6fc3a79885f573d79de70a2de85c34667fc1a4fefe034d3a4015269379f0f";
const addresses=(globalThis as any).NftAddressTools(ethers);
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async request=>{
  if(request.method==="OPTIONS")return new Response(null,{headers});
  if(request.method!=="POST")return reply({ok:false,error:"Method not allowed"},405);
  try{
    const raw=await request.text();if(raw.length>6000)return reply({ok:false,error:"Request too large"},413);
    const body=JSON.parse(raw);
    if(body.action==="register"){
      // Both keys authorize the exact collection/address/identity. A claimed
      // originAddress from a browser is never evidence of address ownership.
      const proof=addresses.verify(body.proof,genesis);
      const {error}=await db.from("zecblocks_nft_addresses").upsert({address:proof.address,owner_commitment:proof.owner,proof},{onConflict:"address",ignoreDuplicates:true});
      if(error)throw Error("Address registration unavailable. Please retry.");
      const {data,error:readError}=await db.from("zecblocks_nft_addresses").select("proof").eq("address",proof.address).single();
      if(readError)throw Error("Address verification unavailable. Please retry.");
      const existing=addresses.verify(data.proof,genesis);
      if(existing.owner!==proof.owner)return reply({ok:false,error:"This address is already linked to a different NFT identity."},409);
      return reply({ok:true,proof:existing});
    }
    if(body.action==="resolve"){
      const address=addresses.validateAddress(String(body.address||""));
      const {data,error}=await db.from("zecblocks_nft_addresses").select("proof").eq("address",address).maybeSingle();
      if(error)throw Error("Address lookup unavailable. Please retry.");
      return reply({ok:true,proof:data?addresses.verify(data.proof,genesis):null});
    }
    return reply({ok:false,error:"Unknown action"},400);
  }catch(error){return reply({ok:false,error:error instanceof Error?error.message:"Address verification failed"},400)}
});
