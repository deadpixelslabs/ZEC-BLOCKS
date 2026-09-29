'use strict';
// Indicative USD display only. ETH remains the exact settlement currency.
let cached=null,inflight=null;
async function readPrice(){
  const response=await fetch('https://api.exchange.coinbase.com/products/ETH-USD/ticker',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('ETH/USD reference unavailable');
  const data=await response.json(),value=Number(data.price),time=Date.parse(data.time),now=Date.now();
  if(typeof data.price!=='string'||!/^\d+(\.\d+)?$/.test(data.price)||!Number.isFinite(value)||value<=0||!Number.isFinite(time)||time>now+30000||now-time>90000)throw Error('ETH/USD reference delayed');
  return {pair:'ETH-USD',usd:data.price,source:'Coinbase Exchange',updatedAt:new Date(time).toISOString(),fetchedAt:new Date(now).toISOString()};
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'GET required'});
  try{
    if(!cached||Date.now()-Date.parse(cached.fetchedAt)>15000){
      if(!inflight)inflight=readPrice().then(value=>{cached=value;}).finally(()=>{inflight=null;});
      await inflight;
    }
    const age=Date.now()-Date.parse(cached.updatedAt);
    if(age>90000)throw Error('Reference delayed');
    res.setHeader('Cache-Control','public, max-age=0, s-maxage=15');
    return res.status(200).json({...cached,status:'ready'});
  }catch(_){
    if(cached&&Date.now()-Date.parse(cached.updatedAt)<=300000)return res.status(200).json({...cached,status:'delayed'});
    return res.status(503).json({error:'ETH/USD reference temporarily unavailable'});
  }
};
