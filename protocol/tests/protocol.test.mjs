import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {GENESIS,GENESIS_HEIGHT,canonical,ownerCommitment,messageDigest,eventMessage,signedEventHash,receiptMessage,anchorFor,validateEnvelope,verifySignature,identityProfile,checkRestoredIdentity,proofHash} from '../core.mjs';
import {loadManifest} from '../cli.mjs';
import {verifyAnchor,verifyBundle,verifyRecord,replayVerified,zecToZat,ReadOnlyRpc} from '../verifier.mjs';
import {buildCheckpoint,membershipProof,verifyMembership,verifyCheckpointAnchor} from '../checkpoints.mjs';
import {renderZb1Svg} from '../renderer-v1.js';
import {requestDerivedIdentity} from '../wallet-identity.mjs';
const {SigningKey}=createRequire(import.meta.url)('../../vendor/ethers-6.13.5.umd.min.js');
const {hash:manifestHash}=await loadManifest();
const fixture=JSON.parse(await readFile(new URL('pow-fixture.json',import.meta.url),'utf8'));
const key=new SigningKey('0x'+'1'.padStart(64,'0')),key2=new SigningKey('0x'+'2'.padStart(64,'0'));
const pub=key.publicKey.slice(2),pub2=key2.publicKey.slice(2),txid='aa'.repeat(32),blockHash='bb'.repeat(32);
function sign(message,k=key){const s=k.sign('0x'+messageDigest(message));return (27+s.yParity).toString(16)+s.r.slice(2)+s.s.slice(2)}
function claim(){const e={type:'CLAIM',version:4,network:'mainnet',genesis:GENESIS,manifestHash,tokenId:1,publicKey:pub,signature:'',nonce:fixture.nonce,sourceHeight:GENESIS_HEIGHT-1,sourceHash:'11'.repeat(32),proofHash:fixture.proofHash,ownerCommitment:ownerCommitment(pub)};e.signature=sign(eventMessage(e,manifestHash));return e}
function envelope(event=claim(),id=txid,k=key){return {event,txid:id,receiptSignature:sign(receiptMessage(signedEventHash(event,manifestHash),id,manifestHash),k)}}
function chainFor(records=[envelope()]){
 const blocks=new Map(),txs=new Map();
 blocks.set('cc'.repeat(32),{hash:'cc'.repeat(32),height:GENESIS_HEIGHT,tx:[GENESIS]});
 records.forEach((r,i)=>{const h=(i+200).toString(16).padStart(64,'0'),height=GENESIS_HEIGHT+100+i;blocks.set(h,{hash:h,height,tx:[r.txid]});txs.set(r.txid,{txid:r.txid,confirmations:2,blockhash:h,vout:[{value:0.00000001,scriptPubKey:{hex:anchorFor('EVENT',signedEventHash(r.event,manifestHash)).scriptPubKey}}]})});
 return {blocks,txs,info:async()=>({chain:'main',blocks:GENESIS_HEIGHT+100+records.length-1}),block:async h=>blocks.get(h),blockHash:async h=>h===GENESIS_HEIGHT-1?'11'.repeat(32):[...blocks.values()].find(x=>x.height===h)?.hash,tx:async id=>txs.get(id)};
}
function transfer(previous,to,k=key){
 const e={type:'TRANSFER',version:2,network:'mainnet',genesis:GENESIS,manifestHash,tokenId:1,publicKey:k.publicKey.slice(2),signature:'',fromCommitment:ownerCommitment(k.publicKey.slice(2)),toCommitment:to,previousTxid:previous.txid,previousEventHash:signedEventHash(previous.event,manifestHash),sequence:previous.event.type==='CLAIM'?1:previous.event.sequence+1};e.signature=sign(eventMessage(e,manifestHash),k);return e;
}
test('real 26-bit proof fixture and wallet compact-signature vector verify',()=>{
 assert.equal(proofHash(claim()),fixture.proofHash);
 const p='045dab7e794ae2779349c393ad4a8eec73fcb8b1983b5cdc06e334ec326c67c5db1d15a7163ac1826b864c8e6eb15fc7a4ae1cbfdb0f54a4192b84bf3321e1ed57';
 const s='1c6abf4d300f974e6ffeff545f20b65d538c92f7efbae7ebc5ae7cdf3af97777f061d42b5904ebcf87270fbec1e340013765e99f4e1c9e7dce46026373b57e9a7d';
 assert.equal(verifySignature(`ZB1:CLAIM:v1|G=${GENESIS}|T=1131|N=85818817|K=${p}`,s,p),true);
 assert.equal(verifySignature('different message',s,p),false);
});
test('event, manifest, signer, proof, and exact transaction cannot be substituted',()=>{
 const original=envelope();assert.doesNotThrow(()=>validateEnvelope(original,manifestHash));
 for(const change of [r=>r.event.nonce='0',r=>r.event.tokenId=2,r=>r.event.ownerCommitment='22'.repeat(32),r=>r.event.network='testnet',r=>r.event.signature='1b'+'00'.repeat(64),r=>r.txid='dd'.repeat(32),r=>r.event.manifestHash='ff'.repeat(32),r=>r.event.extra='ignored?']){
  const r=structuredClone(original);change(r);assert.throws(()=>validateEnvelope(r,manifestHash));
 }
 assert.throws(()=>canonical({n:1.5}));assert.throws(()=>canonical({n:undefined}));
 const e={...claim(),nonce:'00'};assert.throws(()=>eventMessage(e,manifestHash));
});
test('signature itself is part of the output commitment',()=>{
 const e=claim(),before=signedEventHash(e,manifestHash);e.signature='1b'+'01'.repeat(64);
 assert.notEqual(signedEventHash(e,manifestHash),before);
 assert.notEqual(anchorFor('SPEC',before).scriptPubKey,anchorFor('EVENT',before).scriptPubKey);
 assert.equal(anchorFor('EVENT','11'.repeat(32)).scriptPubKey,'6a245a423101'+'11'.repeat(32));
 assert.equal(Buffer.from(anchorFor('SPEC',before).scriptPubKey,'hex').length,38);
});
test('node verification requires exact script, value, canonical block and membership',async()=>{
 const e=envelope();const good=await verifyRecord(e,manifestHash,chainFor());assert.equal(good.txid,txid);
 for(const mutate of [c=>c.txs.get(txid).vout[0].value=0.00000002,c=>c.txs.get(txid).vout[0].scriptPubKey.hex='76a914'+'00'.repeat(20)+'88ac',c=>c.txs.get(txid).confirmations=0,c=>c.txs.get(txid).txid='00'.repeat(32),c=>c.blocks.get(c.txs.get(txid).blockhash).tx=[],c=>c.blockHash=async()=>null,c=>c.info=async()=>({chain:'test'})]){
  const c=chainFor();mutate(c);await assert.rejects(verifyRecord(e,manifestHash,c));
 }
 const duplicate=chainFor();duplicate.txs.get(txid).vout.push(duplicate.txs.get(txid).vout[0]);await assert.rejects(verifyRecord(e,manifestHash,duplicate));
 const extra=chainFor();extra.txs.get(txid).vout.push({value:0,scriptPubKey:{hex:'6a0101'}});await assert.rejects(verifyRecord(e,manifestHash,extra),/one OP_RETURN/);
 assert.equal(zecToZat(1e-8),1n);assert.throws(()=>zecToZat(0.000000001));
});
test('replay sorts chain order, rejects duplicate claims and stale A-to-B-to-A transfers',async()=>{
 const first=envelope(),ab=envelope(transfer(first,ownerCommitment(pub2)),'ab'.repeat(32));
 const ba=envelope(transfer(ab,ownerCommitment(pub),key2),'ac'.repeat(32),key2);
 const stale=envelope(ab.event,'ad'.repeat(32));
 const records=[first,ab,ba,stale],chain=chainFor(records),report=await verifyBundle([...records].reverse(),manifestHash,chain);
 assert.equal(report.owners[0].ownerCommitment,ownerCommitment(pub));assert.equal(report.owners[0].sequence,2);
 assert.equal(report.rejected.length,1);assert.match(report.rejected[0].error,/Duplicate|replay|Stale/);
 const replay=replayVerified([...report.records,report.records[0]]);assert.ok(replay.rejected.length>=2);
 const missing=await verifyBundle([ab],manifestHash,chain);assert.equal(missing.owners.length,0);assert.match(missing.rejected[0].error,/ancestry/);
});
test('replay defensively rejects distinct events sharing a TXID regardless of order',async()=>{
 const first=envelope(),ab=envelope(transfer(first,ownerCommitment(pub2)),txid);
 const position={height:GENESIS_HEIGHT+100,txIndex:0};
 const r1={...first,...position,eventHash:signedEventHash(first.event,manifestHash)},r2={...ab,...position,eventHash:signedEventHash(ab.event,manifestHash)};
 for(const input of [[r1,r2],[r2,r1]]){
  const report=replayVerified(input);assert.equal(report.owners.length,0);assert.equal(report.rejected.length,2);
  assert.ok(report.rejected.every(x=>/Ambiguous/.test(x.error)));
 }
});
test('standalone anchors check mainnet and pinned genesis independently of events',async()=>{
 const a=anchorFor('EVENT',signedEventHash(claim(),manifestHash));
 for(const change of [c=>c.info=async()=>({chain:'test'}),c=>c.blocks.get('cc'.repeat(32)).tx=[],c=>c.blocks.get('cc'.repeat(32)).hash='dd'.repeat(32)]){
  const c=chainFor();change(c);await assert.rejects(verifyAnchor(txid,a,c));
 }
});
test('legacy records and chain read failures stay unresolved and never manufacture ownership',async()=>{
 const old={txid,tokenId:1,v:1};const report=await verifyBundle([old],manifestHash,chainFor());
 assert.equal(report.owners.length,0);assert.equal(report.unresolved.length,1);
 const c=chainFor();c.tx=async()=>{throw new Error('Provider unavailable')};
 const out=await verifyBundle([envelope()],manifestHash,c);assert.equal(out.owners.length,0);assert.equal(out.unresolved.length,1);
 const rpc=new ReadOnlyRpc('http://127.0.0.1:8232');await assert.rejects(rpc.call('sendrawtransaction',[]),/Read-only/);
});
test('snapshot reorganization stops verification',async()=>{
 const c=chainFor(),original=c.blockHash;let reads=0;
 c.blockHash=async h=>{if(h===GENESIS_HEIGHT+100&&++reads>=3)return 'ee'.repeat(32);return original(h)};
 await assert.rejects(verifyBundle([envelope()],manifestHash,c),/Chain changed/);
});
test('5,000-position Merkle proofs reject altered owners, positions, context and siblings',async()=>{
 const report=await verifyBundle([envelope()],manifestHash,chainFor()),c=buildCheckpoint(report.owners,report.context);
 assert.equal(c.state.length,5000);assert.equal(c.state[1].status,'unresolved');
 for(const id of [1,2,2501,5000]){
  const p=membershipProof(c,id);assert.equal(verifyMembership(c,p),true);
  const tampered=structuredClone(p);tampered.leaf.tokenId=id===5000?1:id+1;assert.equal(verifyMembership(c,tampered),false);
  const bad=structuredClone(p);bad.siblings[0]='00'.repeat(32);assert.equal(verifyMembership(c,bad),false);
 }
 const p=membershipProof(c,1);p.leaf={...p.leaf,ownerCommitment:ownerCommitment(pub2)};assert.equal(verifyMembership(c,p),false);
 assert.equal(verifyMembership({...c,context:{...c.context,height:c.context.height+1}},membershipProof(c,1)),false);
 assert.throws(()=>buildCheckpoint([report.owners[0],report.owners[0]],report.context),/Duplicate/);
 const reordered=structuredClone(c);[reordered.state[1],reordered.state[2]]=[reordered.state[2],reordered.state[1]];
 assert.throws(()=>membershipProof(reordered,1),/positions/);
});
test('checkpoint anchoring requires the selected manifest and an earlier canonical cutoff',async()=>{
 const chain=chainFor(),report=await verifyBundle([envelope()],manifestHash,chain),checkpoint=buildCheckpoint(report.owners,report.context);
 const checkpointTxid='ff'.repeat(32),checkpointBlock='fe'.repeat(32),anchor=anchorFor('CHECKPOINT',checkpoint.checkpointHash);
 chain.blocks.set(checkpointBlock,{hash:checkpointBlock,height:report.context.height+1,tx:[checkpointTxid]});
 chain.txs.set(checkpointTxid,{txid:checkpointTxid,blockhash:checkpointBlock,confirmations:1,vout:[{value:1e-8,scriptPubKey:{hex:anchor.scriptPubKey}}]});
 assert.equal((await verifyCheckpointAnchor(checkpoint,checkpointTxid,manifestHash,chain)).anchored,true);
 await assert.rejects(verifyCheckpointAnchor(checkpoint,checkpointTxid,'00'.repeat(32),chain),/manifest/);
 const original=chain.blockHash;chain.blockHash=async h=>h===report.context.height?'00'.repeat(32):original(h);
 await assert.rejects(verifyCheckpointAnchor(checkpoint,checkpointTxid,manifestHash,chain),/cutoff/);
 chain.blockHash=original;
 chain.blocks.get(checkpointBlock).height=GENESIS_HEIGHT+50;
 await assert.rejects(verifyCheckpointAnchor(checkpoint,checkpointTxid,manifestHash,chain),/follow/);
});
test('renderer matches production SVG exactly and rejects invalid sources',async()=>{
 const source=await readFile(new URL('../../script.js',import.meta.url),'utf8');
 const code=source.match(/^function artSvg\(.*$/m)[0],context=vm.createContext({esc:x=>String(x)});vm.runInContext(code,context);
 for(const id of [1,1131,1285,5000]){
  const h=GENESIS_HEIGHT-id,hash='1234567890abcdef'.repeat(4),svg={};context.artSvg(svg,hash+':'+h,'ZB #'+id);
  assert.equal(renderZb1Svg(hash,h,id),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">'+svg.innerHTML+'</svg>');
 }
 assert.throws(()=>renderZb1Svg('xx',GENESIS_HEIGHT-1,1));
});
test('wallet identity survives receiving-address changes and rejects a different account or serialization',async()=>{
 const profile=identityProfile(pub);assert.deepEqual(checkRestoredIdentity(profile,pub),profile);
 assert.notEqual(ownerCommitment(SigningKey.computePublicKey('0x'+pub,true).slice(2)),profile.ownerCommitment);
 let calls=0;const wallet={getPublicKey:async options=>{assert.deepEqual(options,{signingMode:'derived'});calls++;return {pubkey:pub,address:'u1changing-'+calls}}};
 assert.deepEqual(await requestDerivedIdentity(wallet,profile),profile);assert.deepEqual(await requestDerivedIdentity(wallet,profile),profile);
 await assert.rejects(requestDerivedIdentity({getPublicKey:async()=>({pubkey:pub2})},profile),/differs/);
 assert.throws(()=>checkRestoredIdentity(profile,pub2),/differs/);
});
