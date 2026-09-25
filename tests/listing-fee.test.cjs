const {test}=require('node:test');
const assert=require('node:assert/strict');
const F=require('../listing-fee.js');
const id='a'.repeat(64),address='t1Fixture',createdAt=1800000000000;
const proof={txid:id,address,createdAt};
const tx=()=>({txid:id,isCanonical:true,status:'confirmed',blockHeight:'100',blockTime:String(createdAt/1000+30),confirmations:1,inputs:[{address}],outputs:[{address:F.treasury,value:'20000'}]});
test('fee is exactly 20,000 zatoshi; chain schema integer strings remain exact',()=>{
  assert.equal(F.amount,'0.0002');assert.equal(F.zatoshi,20000n);
  assert.deepEqual(F.transactionProof(tx(),proof),{height:100,time:1800000030,confirmations:1});
  for(const value of ['19999','20001','0.0002','-20000','20000.0',Number.MAX_SAFE_INTEGER+1]){
    const t=tx();t.outputs[0].value=value;assert.throws(()=>F.transactionProof(t,proof));
  }
});
test('payment proof rejects stolen, shielded, wrong treasury, stale, reorg and mismatched TXIDs',()=>{
  const variants=[{txid:'b'.repeat(64)},{inputs:[]},{inputs:[{address:'another wallet'}]},{isCanonical:false},{isCoinbase:true},{outputs:[{address:'wrong',value:'20000'}]},{blockTime:String(createdAt/1000-181)},{status:'orphaned'},{outputs:[{address:F.treasury,value:'20000'},{address:F.treasury,value:'1'}]}];
  for(const variant of variants)assert.throws(()=>F.transactionProof({...tx(),...variant},proof));
});
test('unconfirmed payment is pending, never a failed-payment authorization',()=>{
  const t={...tx(),confirmations:0,blockHeight:null,status:'mempool',isCanonical:false};
  assert.throws(()=>F.transactionProof(t,proof,false));
  delete t.isCanonical;
  assert.equal(F.transactionProof(t,proof,false),null);
  assert.throws(()=>F.transactionProof(t,proof));
});
test('fee authorization binds collection type, listing digest, treasury and exact fee',()=>{
  const a=F.authorization('ZEC_BLOCK',id),b=F.authorization('ZECS',id);
  assert.notEqual(a,b);assert.match(a,/0.0002 ZEC/);assert.match(a,/Trading protocol fee: 0%/);
  assert.notEqual(a,F.authorization('ZEC_BLOCK','b'.repeat(64)));
  assert.throws(()=>F.authorization('USDC',id));
});
