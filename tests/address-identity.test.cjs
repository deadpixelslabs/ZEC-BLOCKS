const {test}=require('node:test');
const assert=require('node:assert/strict');
const {tools,E,genesis,addressKey,nftKey,independentDigest,fixture}=require('./fixtures/address.cjs');
test('a receiving address requires two valid Noir-compatible signatures over the exact binding',()=>{
  const p=fixture();assert.equal(tools.verify(p,genesis).owner,p.owner);
  assert.equal(tools.digest(tools.message(p,genesis)),independentDigest(tools.message(p,genesis)));
  assert.equal(tools.addressFor(addressKey.compressedPublicKey),p.address);
});
test('directory spoofing, altered destinations and single-key registrations are rejected',()=>{
  const p=fixture();
  for(const modified of [
    {...p,addressSignature:p.nftSignature}, {...p,nftSignature:p.addressSignature},
    {...p,owner:'a'.repeat(64)}, {...p,genesis:'b'.repeat(64)},
    {...p,network:'testnet'}, {...p,address:tools.addressFor(nftKey.publicKey)},
    {...p,address:p.address.slice(0,-1)+'0'}, {...p,address:'u1notverifiable'},
    {...p,nftPubkey:nftKey.compressedPublicKey.slice(2)}
  ])assert.throws(()=>tools.verify(modified,genesis));
});
test('valid high-S signatures remain compatible with Noir without changing identity encoding',()=>{
  const p=fixture(),sig=p.addressSignature,order=0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
  const header=31+((parseInt(sig.slice(0,2),16)-31)^1);
  p.addressSignature=header.toString(16)+sig.slice(2,66)+E.toBeHex(order-BigInt('0x'+sig.slice(66)),32).slice(2);
  assert.equal(tools.verify(p,genesis).owner,p.owner);
});
module.exports={fixture,genesis};
