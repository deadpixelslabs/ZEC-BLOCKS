'use strict';
// Public projections only. The Edge function executes fixed statements under anon
// inside a READ ONLY transaction; no database secret is embedded in this service.
const URL='https://tvwvenyomlwvjtwxasca.supabase.co/functions/v1/zecblocks-public-read';
const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2d3ZlbnlvbWx3dmp0d3hhc2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MjIwMTcsImV4cCI6MjEwNDE5ODAxN30.RLGs8yTBd0JyRdHlv63YzLHJ7t8qPNHqZWN3WRu00VY';
const PUBLIC=new Set(['bootstrap','usdc','stats','zec_metrics','zec_states','activity','zecs_zec','zecs_market','zecs_stats','health']);
const PERSONAL=new Set(['portfolio','zecs_account','zecs_market_account','tokens']);
const cache=new Map(),inflight=new Map();
async function read(action,args){
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),8500);
 try{
  const r=await fetch(URL,{method:'POST',headers:{'content-type':'application/json',apikey:ANON,authorization:'Bearer '+ANON},body:JSON.stringify({action,...args}),signal:ac.signal});
  const j=await r.json();
  if(!r.ok||!j?.ok)throw new Error('Canonical read service unavailable');
  if(action==='health')return j;
  if(j.data===undefined||j.data===null)throw new Error('Incomplete canonical response');
  return j.data;
 }finally{clearTimeout(timer)}
}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
 let body={};try{body=typeof req.body==='string'?JSON.parse(req.body):req.body||{}}catch{return res.status(400).json({ok:false,error:'INVALID_JSON'})}
 const kind=String(req.query.kind||body.kind||'');
 if(!PUBLIC.has(kind)&&!PERSONAL.has(kind))return res.status(400).json({ok:false,error:'UNSUPPORTED_READ'});
 const personal=PERSONAL.has(kind),fresh=String(req.query.fresh||'')==='1';
 if(personal&&req.method!=='POST')return res.status(405).json({ok:false,error:'PERSONAL_READ_REQUIRES_POST'});
 const args={};
 if(personal&&kind!=='tokens'){
  args.owner=String(body.owner||'').replace(/^0x/,'').toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(args.owner))return res.status(400).json({ok:false,error:'INVALID_OWNER'});
 }
 if(kind==='tokens'){
  args.ids=Array.isArray(body.ids)?[...new Set(body.ids.map(Number))]:[];
  if(!args.ids.length||args.ids.length>100||args.ids.some(x=>!Number.isInteger(x)||x<1||x>5000))return res.status(400).json({ok:false,error:'INVALID_TOKEN_IDS'});
 }
 const key=kind+':'+JSON.stringify(args),previous=!personal?cache.get(key):null;
 try{
  let data;
  if(!personal&&!fresh&&previous&&Date.now()-previous.at<2500)data=previous.data;
  else{
   let promise=!personal&&!fresh?inflight.get(key):null;
   if(!promise){promise=read(kind,args);if(!personal&&!fresh){inflight.set(key,promise);promise.finally(()=>{if(inflight.get(key)===promise)inflight.delete(key)}).catch(()=>{})}}
   data=await promise;
   if(!personal){cache.set(key,{at:Date.now(),data});if(cache.size>30)cache.delete(cache.keys().next().value)}
  }
  if(!personal&&!fresh)res.setHeader('Cache-Control','public, max-age=0, s-maxage=3, stale-while-revalidate=10');
  else res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-ZB1-Read-Transport','postgres-readonly');
  return res.status(200).json({ok:true,data,stale:false});
 }catch(e){
  console.warn(JSON.stringify({service:'canonical-read',kind,error:e?.name||'Error'}));
  if(!personal&&!fresh&&previous&&Date.now()-previous.at<45000)return res.status(200).json({ok:true,data:previous.data,stale:true});
  res.setHeader('Retry-After','5');
  return res.status(503).json({ok:false,error:'CANONICAL_READ_UNAVAILABLE',message:'Market data is temporarily unavailable. No transaction has been sent.',retryable:true});
 }
};
