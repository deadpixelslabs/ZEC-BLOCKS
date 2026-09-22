import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {SigningKey}=createRequire(import.meta.url)('../vendor/ethers-6.13.5.umd.min.js');
export const GENESIS='ecf6fc3a79885f573d79de70a2de85c34667fc1a4fefe034d3a4015269379f0f';
export const GENESIS_HEIGHT=3488573, SUPPLY=5000, POW_BITS=26;
const ORDER=BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
export function requireThat(ok,message){if(!ok)throw new Error(message)}
export function hex(value,bytes,label='hex'){
  requireThat(typeof value==='string'&&new RegExp('^[0-9a-f]{'+bytes*2+'}$').test(value),'Invalid '+label);return value;
}
export function integer(value,min,max,label){requireThat(Number.isSafeInteger(value)&&value>=min&&value<=max,'Invalid '+label);return value}
export const sha=value=>createHash('sha256').update(value).digest();
export const sha256Hex=value=>sha(value).toString('hex');
export function canonical(value){
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'){requireThat(Number.isSafeInteger(value),'Non-integer JSON number');return JSON.stringify(value)}
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  requireThat(value&&Object.getPrototypeOf(value)===Object.prototype,'Non-JSON value');
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
}
function exactKeys(o,keys){requireThat(o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join('|')===keys.sort().join('|'),'Unexpected or missing fields')}
export function publicKey(value){
  requireThat(typeof value==='string'&&/^(02|03)[0-9a-f]{64}$|^04[0-9a-f]{128}$/.test(value),'Invalid public key');
  SigningKey.computePublicKey('0x'+value,false);return value;
}
// Exact serialization preserves existing Noir commitments. Compression is NOT normalized.
export const ownerCommitment=pub=>sha256Hex(Buffer.from(publicKey(pub),'hex'));
function compactSize(n){
  requireThat(n<65536,'Message too large');
  if(n<253)return Buffer.from([n]);const b=Buffer.alloc(3);b[0]=253;b.writeUInt16LE(n,1);return b;
}
export function messageDigest(message){
  const p=Buffer.from('Zcash Signed Message:\n'),m=Buffer.from(message);
  return sha(sha(Buffer.concat([compactSize(p.length),p,compactSize(m.length),m]))).toString('hex');
}
export function verifySignature(message,signature,pub){
  try{
    hex(signature,65,'compact signature');publicKey(pub);
    const h=parseInt(signature.slice(0,2),16),compressed=pub.length===66;
    const recovery=h-(compressed?31:27);
    if(recovery<0||recovery>1)return false;
    const r=signature.slice(2,66),s=signature.slice(66);
    if(BigInt('0x'+s)>ORDER/2n||BigInt('0x'+s)===0n)return false;
    const got=SigningKey.recoverPublicKey('0x'+messageDigest(message),{r:'0x'+r,s:'0x'+s,yParity:recovery});
    return got.toLowerCase()===SigningKey.computePublicKey('0x'+pub,false).toLowerCase();
  }catch{return false}
}
export function anchorFor(domain,hash,amountZat='1'){
  hex(hash,32,'commitment');requireThat(amountZat==='1','Unsupported anchor amount');
  requireThat(['EVENT','SPEC','CHECKPOINT'].includes(domain),'Unknown anchor domain');
  const tag={EVENT:'01',SPEC:'02',CHECKPOINT:'03'}[domain];
  // OP_RETURN, one minimal 36-byte push: ASCII ZB1, domain byte, full digest.
  return {domain,hash,scriptPubKey:'6a24'+'5a4231'+tag+hash,amountZat};
}
export function eventBody(event,manifestHash){
  hex(manifestHash,32,'manifest hash');
  const common=['type','version','network','genesis','manifestHash','tokenId','publicKey','signature'];
  if(event.type==='CLAIM')exactKeys(event,[...common,'nonce','sourceHeight','sourceHash','proofHash','ownerCommitment']);
  else if(event.type==='TRANSFER')exactKeys(event,[...common,'fromCommitment','toCommitment','previousTxid','previousEventHash','sequence']);
  else throw new Error('Unsupported event type');
  requireThat(event.network==='mainnet'&&event.genesis===GENESIS&&event.manifestHash===manifestHash,'Wrong network, genesis or manifest');
  integer(event.tokenId,1,SUPPLY,'token ID');publicKey(event.publicKey);
  if(event.type==='CLAIM'){
    requireThat(event.version===4,'Unsupported claim version');
    requireThat(typeof event.nonce==='string'&&/^(0|[1-9][0-9]{0,19})$/.test(event.nonce)&&BigInt(event.nonce)<2n**64n,'Invalid nonce');
    requireThat(event.sourceHeight===GENESIS_HEIGHT-event.tokenId,'Wrong source height');
    hex(event.sourceHash,32);hex(event.proofHash,32);hex(event.ownerCommitment,32);
    requireThat(ownerCommitment(event.publicKey)===event.ownerCommitment,'Wrong owner commitment');
  }else{
    requireThat(event.version===2,'Unsupported transfer version');
    hex(event.fromCommitment,32);hex(event.toCommitment,32);hex(event.previousTxid,32);hex(event.previousEventHash,32);
    integer(event.sequence,1,Number.MAX_SAFE_INTEGER,'sequence');
    requireThat(ownerCommitment(event.publicKey)===event.fromCommitment,'Wrong transfer signer');
    requireThat(event.toCommitment!==event.fromCommitment,'Self transfer');
  }
  const {signature,...body}=event;return body;
}
export const eventMessage=(event,mh)=>'ZB1:PUBLIC_EVENT:v1|'+canonical(eventBody(event,mh));
export function signedEventHash(event,mh){
  const body=eventBody(event,mh);hex(event.signature,65);
  return sha256Hex(Buffer.from('ZB1:SIGNED_EVENT:v1|'+canonical({...body,signature:event.signature})));
}
export const receiptMessage=(eventHash,txid,mh)=>'ZB1:TX_RECEIPT:v1|M='+hex(mh,32)+'|E='+hex(eventHash,32)+'|X='+hex(txid,32);
export function proofHash(event){
  const id=Buffer.alloc(4),nonce=Buffer.alloc(8);id.writeUInt32LE(event.tokenId);nonce.writeBigUInt64LE(BigInt(event.nonce));
  return sha256Hex(Buffer.concat([Buffer.from('ZB1:MINE:v1'),Buffer.from(GENESIS,'hex'),id,Buffer.from(event.sourceHash,'hex'),Buffer.from(event.ownerCommitment,'hex'),nonce]));
}
export function leadingZeroBits(hash){let n=0;for(const byte of Buffer.from(hex(hash,32),'hex')){if(byte===0){n+=8;continue}for(let bit=128;!(byte&bit);bit>>=1)n++;break}return n}
export function validateSignedEvent(event,mh){
  const message=eventMessage(event,mh);
  requireThat(verifySignature(message,event.signature,event.publicKey),'Invalid event signature');
  if(event.type==='CLAIM')requireThat(proofHash(event)===event.proofHash&&leadingZeroBits(event.proofHash)>=POW_BITS,'Invalid mining proof');
  return signedEventHash(event,mh);
}
export function validateEnvelope(envelope,mh){
  exactKeys(envelope,['event','txid','receiptSignature']);hex(envelope.txid,32,'TXID');
  const hash=validateSignedEvent(envelope.event,mh);
  requireThat(verifySignature(receiptMessage(hash,envelope.txid,mh),envelope.receiptSignature,envelope.event.publicKey),'Invalid TXID receipt');
  return {eventHash:hash,anchor:anchorFor('EVENT',hash)};
}
export function identityProfile(pub){return {schema:'zb1-identity-1',network:'mainnet',genesis:GENESIS,signingMode:'derived',publicKey:publicKey(pub),ownerCommitment:ownerCommitment(pub)}}
export function checkRestoredIdentity(profile,pub){
  const got=identityProfile(pub);requireThat(canonical(profile)===canonical(got),'Restored identity differs: do not replace the existing commitment');return got;
}
