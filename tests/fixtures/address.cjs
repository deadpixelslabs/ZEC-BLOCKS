const {createHash}=require('node:crypto');
const E=require('../../vendor/ethers-6.13.5.umd.min.js');
const tools=require('../../address-identity.js')(E);
const genesis='ecf6fc3a79885f573d79de70a2de85c34667fc1a4fefe034d3a4015269379f0f';
// Public deterministic TEST keys; never funded or used for real assets.
const addressKey=new E.SigningKey('0x'+'01'.padStart(64,'0'));
const nftKey=new E.SigningKey('0x'+'02'.padStart(64,'0'));
function independentDigest(message){
  const compact=n=>n<253?Buffer.from([n]):Buffer.from([253,n&255,n>>8]);
  const prefix=Buffer.from('Zcash Signed Message:\n'),m=Buffer.from(message);
  const sha=b=>createHash('sha256').update(b).digest();
  return '0x'+sha(sha(Buffer.concat([compact(prefix.length),prefix,compact(m.length),m]))).toString('hex');
}
function sign(key,message){const s=key.sign(independentDigest(message));return (31+s.yParity).toString(16)+s.r.slice(2)+s.s.slice(2)}
function fixture(){
  const proof={v:1,network:'mainnet',genesis,address:tools.addressFor(addressKey.publicKey),owner:E.sha256(nftKey.publicKey).slice(2),addressPubkey:addressKey.publicKey.slice(2),nftPubkey:nftKey.publicKey.slice(2)};
  const message=tools.message(proof,genesis);
  return {...proof,addressSignature:sign(addressKey,message),nftSignature:sign(nftKey,message)};
}
module.exports={tools,E,genesis,addressKey,nftKey,independentDigest,sign,fixture};
