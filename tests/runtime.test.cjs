const {test} = require('node:test');
const assert = require('node:assert/strict');
const {singleFlight,requestJSON,journal,validSnapshot}=require('../market-runtime.js');
const {receiveLink,parseNftRecipient}=require('../market-runtime.js');
const {matchesBaseRequest,discoverBaseTransaction}=require('../market-runtime.js');

test('completed Base payments without a wallet hash or nonce recover from verified indexed evidence',async()=>{
  const row={evm:'0x'+'a'.repeat(40),target:'0x'+'b'.repeat(40),data:'0x1234'},hash='0x'+'c'.repeat(64);
  const tx={hash,from:row.evm,to:row.target,data:row.data,value:0n};
  const provider={getTransaction:async()=>tx};
  assert.equal(await discoverBaseTransaction(row,provider,async()=>[hash]),hash);
  provider.getBlockNumber=async()=>{throw Error('historical RPC unavailable')};
  assert.equal(await discoverBaseTransaction({...row,nonce:7,requestBlock:100},provider,async()=>[hash]),hash);
  for(const change of [{from:'0x'+'d'.repeat(40)},{to:'0x'+'e'.repeat(40)},{data:'0x5678'},{value:1n},{value:undefined}]){
    provider.getTransaction=async()=>({...tx,...change});
    assert.equal(await discoverBaseTransaction(row,provider,async()=>[hash]),'');
  }
  assert.equal(matchesBaseRequest(row,null),false);
});

test('Base discovery retains unknown requests and rejects malformed or unrelated index hints',async()=>{
  const row={evm:'0x'+'a'.repeat(40),target:'0x'+'b'.repeat(40),data:'0x1234'},hash='0x'+'c'.repeat(64);
  let reads=0;const provider={getTransaction:async()=>{reads++;return null}};
  assert.equal(await discoverBaseTransaction(row,provider,async()=>['invalid',hash,hash]),'');
  assert.equal(reads,1);
  provider.getTransaction=async()=>({hash:'0x'+'d'.repeat(64),from:row.evm,to:row.target,data:row.data,value:0n});
  assert.equal(await discoverBaseTransaction(row,provider,async()=>[hash]),'');
  await assert.rejects(discoverBaseTransaction(row,provider,async()=>{throw Error('index offline')}),/index offline/);
});

test('overlapping reads share one job and recover after a rejected job', async()=>{
  let calls=0,release;const work=()=>{calls++;return new Promise(resolve=>release=resolve)};
  const a=singleFlight('board',work),b=singleFlight('board',work);await Promise.resolve();release(7);
  assert.deepEqual(await Promise.all([a,b]),[7,7]);assert.equal(calls,1);
  await assert.rejects(singleFlight('board',()=>Promise.reject(Error('offline'))));
  assert.equal(await singleFlight('board',()=>9),9);
});
test('malformed and failed responses are rejected without retrying mutations',async()=>{
  const original=global.fetch;let calls=0;
  try{
    global.fetch=async()=>{calls++;return {ok:true,json:async()=>{throw Error('invalid')}}};
    await assert.rejects(requestJSON('/test'),/incomplete/);assert.equal(calls,1);
    global.fetch=async()=>({ok:true,json:async()=>({ok:false,error:'NOT_READY'})});
    await assert.rejects(requestJSON('/test'),/NOT_READY/);
  }finally{global.fetch=original}
});
test('a hung request is aborted and is not retried',async()=>{
  const original=global.fetch;let aborts=0;
  try{global.fetch=(_,opts)=>new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>{aborts++;reject(Object.assign(Error('aborted'),{name:'AbortError'}))}));
    await assert.rejects(requestJSON('/test',{},10),/too long/);assert.equal(aborts,1);
  }finally{global.fetch=original}
});
test('pending payments survive updates and cannot be silently evicted',()=>{
  const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  const j=journal(storage,'pending');for(let i=0;i<65;i++)j.put({id:String(i),owner:'a',status:'unknown'});
  j.put({id:'1',txHash:'0xabc'});assert.equal(j.read().length,65);assert.equal(j.read()[1].owner,'a');
  j.remove('1');assert.equal(j.read().length,64);
});
test('storage failures stop payment preparation and corrupt records are preserved',()=>{
  const j=journal({getItem:()=>null,setItem:()=>{throw Error('quota')}},'pending');assert.throws(()=>j.put({id:'a'}),/quota/);
  const corrupt=journal({getItem:()=>'{broken',setItem:()=>assert.fail('must not overwrite')},'pending');assert.throws(()=>corrupt.put({id:'a'}));
  assert.equal(validSnapshot({},['orders']),false);assert.equal(validSnapshot({orders:[]},['orders']),true);
});
test('NFT receive links round trip only within the pinned collection and official origin',()=>{
  const owner='ab'.repeat(32),genesis='cd'.repeat(32),link=receiveLink(owner,genesis);
  assert.deepEqual(parseNftRecipient(link,genesis),{owner,source:'link'});
  assert.deepEqual(parseNftRecipient('  0x'+owner.toUpperCase()+'  ',genesis),{owner,source:'id'});
  assert.equal(new URL(link).search,''); // Identity stays in the fragment, not the HTTP request.
  assert.equal(parseNftRecipient(link.replace('www.zecblocks.xyz','zecblocks.xyz'),genesis).owner,owner);
  for(const invalid of [
    link.replace('https:','http:'),link.replace('www.zecblocks.xyz','www.zecblocks.xyz.evil.test'),
    link.replace('www.zecblocks.xyz','user@www.zecblocks.xyz'),link.replace('www.zecblocks.xyz','www.zecblocks.xyz:8443'),
    link.replace('/#','/other/#'),link.replace('/#','/?recipient='+owner+'#'),link+'/extra',
    link.replace(genesis,'ef'.repeat(32)),link.replace(owner,'0'.repeat(64)),
    'u1paymentaddress','t1paymentaddress','0x'+'a'.repeat(40),'javascript:alert(1)',owner.slice(1),'0'.repeat(64)
  ])assert.throws(()=>parseNftRecipient(invalid,genesis),'must reject '+invalid);
});
