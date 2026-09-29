import { CONFIG } from './config.mjs';
import { synchronizeHolders } from './engine.mjs';
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const project=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const upstream=Deno.env.get('RH20_RPC_URL')||CONFIG.rpcUrl;
const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
async function db(name:string,args:Record<string,unknown>={}){
  const response=await fetch(project+'/rest/v1/rpc/'+name,{method:'POST',headers:{'Content-Type':'application/json',apikey:service,Authorization:'Bearer '+service},body:JSON.stringify(args),signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('Holder database operation failed: '+name);
  // PostgREST returns an empty body for SQL functions returning void.
  const body=await response.text();return body?JSON.parse(body):null;
}
async function rpc(method:string,params:unknown[]=[]){
  const response=await fetch(upstream,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(9000)});
  if(!response.ok)throw Error('Robinhood Chain RPC unavailable');
  const data=await response.json();if(data.error||data.jsonrpc!=='2.0'||data.id!==1||!('result'in data))throw Error('Robinhood Chain RPC read failed');
  return data.result;
}
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','POST'].includes(req.method))return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers});
  // The platform verifies the public anon JWT. Client input never controls
  // the contracts, cursor, accounts, SQL arguments or chain endpoint.
  EdgeRuntime.waitUntil(synchronizeHolders({rpc,db}).catch(error=>console.error('RHSC holder update:',error.message)));
  try{return new Response(JSON.stringify(await db('rh20_holders_snapshot')),{headers});}
  catch(_){return new Response(JSON.stringify({error:'Holder count temporarily unavailable'}),{status:503,headers});}
});
