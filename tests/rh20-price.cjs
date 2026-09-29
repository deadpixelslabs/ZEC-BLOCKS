'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
test('USD reference validates source age, preserves a delayed quote, and expires it without changing settlement',async()=>{
  const originalFetch=global.fetch,originalNow=Date.now;let now=originalNow(),calls=0;Date.now=()=>now;
  delete require.cache[require.resolve('../api/rh20-price.js')];const handler=require('../api/rh20-price.js');
  const request=async(method='GET')=>{const output={headers:{}};const res={setHeader:(k,v)=>{output.headers[k]=v;},status:code=>{output.status=code;return res;},json:value=>{output.body=value;return res;}};await handler({method},res);return output;};
  try{
    global.fetch=async url=>{calls++;assert.equal(url,'https://api.exchange.coinbase.com/products/ETH-USD/ticker');return new Response(JSON.stringify({price:'3000.25',time:new Date(now).toISOString()}));};
    let result=await request();assert.equal(result.status,200);assert.equal(result.body.usd,'3000.25');assert.equal(result.body.status,'ready');
    await request();assert.equal(calls,1);
    global.fetch=async()=>{throw Error('Outage');};now+=20000;result=await request();assert.equal(result.body.status,'delayed');assert.equal(result.body.usd,'3000.25');assert.equal(result.headers['Cache-Control'],'no-store');
    now+=300000;result=await request();assert.equal(result.status,503);assert.equal(result.body.usd,undefined);
    assert.equal((await request('POST')).status,405);
    global.fetch=async()=>new Response(JSON.stringify({price:'1',time:new Date(now-120000).toISOString()}));assert.equal((await request()).status,503);
    global.fetch=async()=>new Response(JSON.stringify({price:'NaN',time:new Date(now).toISOString()}));assert.equal((await request()).status,503);
  }finally{global.fetch=originalFetch;Date.now=originalNow;}
});
