'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const R=require('../collections/robinhood-blocks/renderer.cjs');
const M=require('../collections/robinhood-blocks/manifest.json');
const origin='https://www.zecblocks.xyz/robinhood-blocks';
async function verify(){
 for(const id of [1,4444]){
  const response=await fetch(`${origin}/metadata/${id}`,{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,`Metadata #${id} HTTP status`);
  assert.match(response.headers.get('content-type'),/application\/json/);
  const metadata=await response.json();
  assert.deepEqual(metadata,R.metadata(id,M.rows[id-1]));
  const image=await fetch(metadata.image,{signal:AbortSignal.timeout(15000)});
  assert.equal(image.status,200,`Image #${id} HTTP status`);
  assert.match(image.headers.get('content-type'),/image\/svg\+xml/);
  assert.equal(createHash('sha256').update(await image.text()).digest('hex'),M.rows[id-1][10]);
 }
 const missing=await fetch(`${origin}/metadata/4445`,{signal:AbortSignal.timeout(15000)});
 assert.equal(missing.status,404);
 console.log('Production verified: metadata and exact artwork hashes for #1 and #4444; #4445 returns 404.');
}
(async()=>{for(let attempt=1;attempt<=12;attempt++){try{await verify();return;}catch(error){if(attempt===12)throw error;console.log(`Waiting for production deployment (${attempt}/12): ${error.message}`);await new Promise(resolve=>setTimeout(resolve,5000));}}})().catch(error=>{console.error(error);process.exitCode=1;});
